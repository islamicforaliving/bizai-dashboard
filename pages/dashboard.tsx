// pages/dashboard.tsx - Enhanced Client Dashboard
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Phone, 
  Users, 
  Calendar,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  Play,
  LogOut,
  TrendingUp,
  DollarSign,
  BarChart3,
  Headphones,
  MessageSquare
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Call {
  id: string;
  phone_number: string;
  start_time: string;
  duration_seconds: number;
  outcome: string;
  lead_score: number;
  transcript_summary: string;
  recording_url: string;
  sentiment: string;
}

interface DailyStats {
  date: string;
  total_calls: number;
  appointments_booked: number;
  leads_captured: number;
  voicemails_left: number;
}

interface ClientInfo {
  business_name: string;
  email: string;
  plan: string;
  vapi_assistant_id: string;
  vapi_phone_number: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalLeads: 0,
    totalBookings: 0,
    totalVoicemails: 0,
    avgDuration: 0,
    conversionRate: 0
  });
  const [chartData, setChartData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingCall, setPlayingCall] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const clientId = localStorage.getItem('client_id');
    if (!clientId) {
      router.push('/login');
      return;
    }
    fetchData(clientId);
  }, []);

  async function fetchData(clientId: string) {
    try {
      // Fetch client info
      const { data: clientData } = await supabase
        .from('clients')
        .select('business_name, email, plan, vapi_assistant_id, vapi_phone_number')
        .eq('id', clientId)
        .single();

      if (clientData) setClientInfo(clientData);

      // Fetch recent calls for this client only
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch stats for this client only
      const { data: statsData } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(7);

      if (callsData) setCalls(callsData);
      
      if (statsData) {
        const total = statsData.reduce((acc, day) => ({
          totalCalls: acc.totalCalls + day.total_calls,
          totalLeads: acc.totalLeads + day.leads_captured,
          totalBookings: acc.totalBookings + day.appointments_booked,
          totalVoicemails: acc.totalVoicemails + day.voicemails_left,
          avgDuration: acc.avgDuration + day.avg_duration_seconds
        }), { totalCalls: 0, totalLeads: 0, totalBookings: 0, totalVoicemails: 0, avgDuration: 0 });

        const conversionRate = total.totalCalls > 0 
          ? Math.round(((total.totalBookings + total.totalLeads) / total.totalCalls) * 100)
          : 0;

        setStats({
          ...total,
          avgDuration: Math.round(total.avgDuration / (statsData.length || 1)),
          conversionRate
        });

        setChartData(statsData.reverse().map(day => ({
          date: format(new Date(day.date), 'MMM dd'),
          total_calls: day.total_calls,
          appointments_booked: day.appointments_booked,
          leads_captured: day.leads_captured,
          voicemails_left: day.voicemails_left
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('client_id');
    localStorage.removeItem('client_email');
    localStorage.removeItem('client_name');
    router.push('/login');
  }

  function getLeadIcon(score: number) {
    if (score >= 70) return <Flame className="w-5 h-5 text-red-500" />;
    if (score >= 40) return <Thermometer className="w-5 h-5 text-yellow-500" />;
    return <Snowflake className="w-5 h-5 text-blue-500" />;
  }

  function getLeadLabel(score: number) {
    if (score >= 70) return 'Hot Lead';
    if (score >= 40) return 'Warm Lead';
    return 'Cold Lead';
  }

  function getOutcomeBadge(outcome: string) {
    const styles: Record<string, string> = {
      appointment_booked: 'bg-green-100 text-green-800 border-green-200',
      lead_captured: 'bg-blue-100 text-blue-800 border-blue-200',
      voicemail: 'bg-gray-100 text-gray-800 border-gray-200',
      hangup: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return styles[outcome] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function getOutcomeIcon(outcome: string) {
    switch (outcome) {
      case 'appointment_booked': return <Calendar className="w-4 h-4" />;
      case 'lead_captured': return <Users className="w-4 h-4" />;
      case 'voicemail': return <MessageSquare className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg font-semibold text-gray-700">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {clientInfo?.business_name || 'BIZ AI Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  {clientInfo?.plan === 'starter' ? 'Starter Plan' :
                   clientInfo?.plan === 'growth' ? 'Growth Plan' : 'Pro Plan'}
                  {clientInfo?.vapi_phone_number && (
                    <span className="ml-2 text-blue-600">
                      • AI: {clientInfo.vapi_phone_number}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 hidden sm:block">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </span>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {clientInfo?.business_name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-blue-100">
                Your AI receptionist has been working hard. Here's what's happening today.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/20 backdrop-blur rounded-xl p-4">
                <div className="text-3xl font-bold">{stats.conversionRate}%</div>
                <div className="text-sm text-blue-100">Conversion Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            icon={<Phone className="w-5 h-5 text-blue-600" />}
            label="Total Calls"
            value={stats.totalCalls}
            color="blue"
          />
          <StatCard 
            icon={<Calendar className="w-5 h-5 text-green-600" />}
            label="Bookings"
            value={stats.totalBookings}
            color="green"
          />
          <StatCard 
            icon={<Users className="w-5 h-5 text-purple-600" />}
            label="Leads"
            value={stats.totalLeads}
            color="purple"
          />
          <StatCard 
            icon={<Clock className="w-5 h-5 text-orange-600" />}
            label="Avg Duration"
            value={`${Math.round(stats.avgDuration / 60)}m`}
            color="orange"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Call Volume Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Call Volume (Last 7 Days)</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Calls
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span> Bookings
                </span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total_calls" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{fill: '#3B82F6', strokeWidth: 2}}
                    name="Total Calls"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="appointments_booked" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{fill: '#10B981', strokeWidth: 2}}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Quality Distribution */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Lead Quality</h3>
            <div className="space-y-4">
              <LeadQualityRow 
                icon={<Flame className="w-5 h-5 text-red-500" />}
                label="Hot Leads"
                count={calls.filter(c => c.lead_score >= 70).length}
                total={calls.length}
                color="bg-red-500"
              />
              <LeadQualityRow 
                icon={<Thermometer className="w-5 h-5 text-yellow-500" />}
                label="Warm Leads"
                count={calls.filter(c => c.lead_score >= 40 && c.lead_score < 70).length}
                total={calls.length}
                color="bg-yellow-500"
              />
              <LeadQualityRow 
                icon={<Snowflake className="w-5 h-5 text-blue-500" />}
                label="Cold Leads"
                count={calls.filter(c => c.lead_score < 40).length}
                total={calls.length}
                color="bg-blue-500"
              />
            </div>
            
            {/* Mini Chart */}
            <div className="mt-6 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Hot', value: calls.filter(c => c.lead_score >= 70).length, fill: '#ef4444' },
                  { name: 'Warm', value: calls.filter(c => c.lead_score >= 40 && c.lead_score < 70).length, fill: '#eab308' },
                  { name: 'Cold', value: calls.filter(c => c.lead_score < 40).length, fill: '#3b82f6' },
                ]}>
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <Headphones className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Calls →
            </button>
          </div>
          
          {calls.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h4>
              <p className="text-gray-500">Your AI receptionist is ready to answer calls!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.slice(0, 10).map((call) => (
                <div key={call.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getLeadIcon(call.lead_score)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-gray-900">
                            {call.phone_number || 'Unknown Number'}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getOutcomeBadge(call.outcome)} flex items-center gap-1`}>
                            {getOutcomeIcon(call.outcome)}
                            {call.outcome.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {getLeadLabel(call.lead_score)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {format(new Date(call.start_time), 'MMM d, h:mm a')} • {Math.round(call.duration_seconds / 60)}m • Score: {call.lead_score}/100
                        </p>
                        {call.transcript_summary && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            "{call.transcript_summary}"
                          </p>
                        )}
                        {playingCall === call.id && call.recording_url && (
                          <div className="mt-3">
                            <audio 
                              controls 
                              className="w-full max-w-md"
                              src={call.recording_url}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {call.recording_url && (
                        <button 
                          onClick={() => setPlayingCall(playingCall === call.id ? null : call.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {playingCall === call.id ? 'Hide' : 'Listen'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number | string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function LeadQualityRow({ icon, label, count, total, color }: { 
  icon: React.ReactNode; 
  label: string; 
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-gray-700 font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900">{count}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{percentage}% of total</p>
    </div>
  );
}
