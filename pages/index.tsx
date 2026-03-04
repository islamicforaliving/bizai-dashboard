// pages/index.tsx - Main Dashboard
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Phone, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  Play,
  Download
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

interface DailyStats {
  date: string;
  total_calls: number;
  appointments_booked: number;
  leads_captured: number;
}

export default function Dashboard() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalLeads: 0,
    totalBookings: 0,
    avgDuration: 0
  });
  const [chartData, setChartData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingCall, setPlayingCall] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch recent calls
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch stats
      const { data: statsData } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

      if (callsData) setCalls(callsData);
      
      if (statsData) {
        const total = statsData.reduce((acc, day) => ({
          totalCalls: acc.totalCalls + day.total_calls,
          totalLeads: acc.totalLeads + day.leads_captured,
          totalBookings: acc.totalBookings + day.appointments_booked,
          avgDuration: acc.avgDuration + day.avg_duration_seconds
        }), { totalCalls: 0, totalLeads: 0, totalBookings: 0, avgDuration: 0 });

        setStats({
          ...total,
          avgDuration: Math.round(total.avgDuration / statsData.length)
        });

        setChartData(statsData.reverse().map(day => ({
          date: format(new Date(day.date), 'MMM dd'),
          total_calls: day.total_calls,
          appointments_booked: day.appointments_booked,
          leads_captured: day.leads_captured
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getLeadIcon(score: number) {
    if (score >= 70) return <Flame className="w-5 h-5 text-red-500" />;
    if (score >= 40) return <Thermometer className="w-5 h-5 text-yellow-500" />;
    return <Snowflake className="w-5 h-5 text-blue-500" />;
  }

  function getOutcomeBadge(outcome: string) {
    const styles = {
      appointment_booked: 'bg-green-100 text-green-800',
      lead_captured: 'bg-blue-100 text-blue-800',
      voicemail: 'bg-gray-100 text-gray-800',
      hangup: 'bg-red-100 text-red-800'
    };
    return styles[outcome] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl font-semibold">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">BIZ AI Dashboard</h1>
              <p className="text-sm text-gray-500">All In One Solution - Never Miss a Call Again</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            icon={<Phone className="w-6 h-6 text-blue-600" />}
            label="Total Calls"
            value={stats.totalCalls}
            trend="+12%"
          />
          <StatCard 
            icon={<Users className="w-6 h-6 text-green-600" />}
            label="Leads Captured"
            value={stats.totalLeads}
            trend="+8%"
          />
          <StatCard 
            icon={<Calendar className="w-6 h-6 text-purple-600" />}
            label="Appointments"
            value={stats.totalBookings}
            trend="+15%"
          />
          <StatCard 
            icon={<Clock className="w-6 h-6 text-orange-600" />}
            label="Avg Duration"
            value={`${Math.round(stats.avgDuration / 60)}m`}
            trend="+5%"
          />
        </div>

        {/* Charts & Recent Calls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Call Volume Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">Call Volume (Last 7 Days)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="total_calls" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Total Calls"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="appointments_booked" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Quality */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">Lead Quality</h2>
            <div className="space-y-4">
              <LeadQualityRow 
                icon={<Flame className="w-5 h-5 text-red-500" />}
                label="Hot Leads"
                count={calls.filter(c => c.lead_score >= 70).length}
                color="bg-red-500"
              />
              <LeadQualityRow 
                icon={<Thermometer className="w-5 h-5 text-yellow-500" />}
                label="Warm Leads"
                count={calls.filter(c => c.lead_score >= 40 && c.lead_score < 70).length}
                color="bg-yellow-500"
              />
              <LeadQualityRow 
                icon={<Snowflake className="w-5 h-5 text-blue-500" />}
                label="Cold Leads"
                count={calls.filter(c => c.lead_score < 40).length}
                color="bg-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Calls</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="divide-y">
            {calls.map((call) => (
              <div key={call.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getLeadIcon(call.lead_score)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {call.phone_number || 'Unknown Number'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(call.start_time), 'MMM d, h:mm a')} • {Math.round(call.duration_seconds / 60)}m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOutcomeBadge(call.outcome)}`}>
                      {call.outcome.replace('_', ' ')}
                    </span>
                    {call.recording_url && (
                      <button 
                        onClick={() => setPlayingCall(playingCall === call.id ? null : call.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-600">Listen</span>
                      </button>
                    )}
                  </div>
                </div>
                {call.transcript_summary && (
                  <p className="mt-2 text-sm text-gray-600 ml-9">
                    {call.transcript_summary}
                  </p>
                )}
                {playingCall === call.id && call.recording_url && (
                  <div className="mt-3 ml-9">
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
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: number | string, trend: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
        <span className="text-sm font-medium text-green-600">{trend}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function LeadQualityRow({ icon, label, count, color }: { icon: React.ReactNode, label: string, count: number, color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-32 h-2 rounded-full bg-gray-100 overflow-hidden`}>
          <div className={`h-full ${color}`} style={{ width: `${Math.min(count * 20, 100)}%` }} />
        </div>
        <span className="font-semibold w-8 text-right">{count}</span>
      </div>
    </div>
  );
}
