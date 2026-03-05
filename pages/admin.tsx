// pages/admin.tsx - Admin Dashboard to Approve Clients
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, CheckCircle, XCircle, Phone, Mail, Building, Clock } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Admin() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchClients();
    }
  }, [isAuthenticated]);

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Error fetching clients');
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }

  async function approveClient(clientId: string) {
    const { error } = await supabase
      .from('clients')
      .update({ status: 'active' })
      .eq('id', clientId);

    if (error) {
      alert('Error approving client');
    } else {
      fetchClients();
    }
  }

  async function rejectClient(clientId: string) {
    const { error } = await supabase
      .from('clients')
      .update({ status: 'cancelled' })
      .eq('id', clientId);

    if (error) {
      alert('Error rejecting client');
    } else {
      fetchClients();
    }
  }

  function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    // Simple admin check - in production, use proper auth
    if (adminEmail === 'admin@bizai.com' && adminPassword === 'admin123') {
      setIsAuthenticated(true);
    } else {
      setError('Invalid admin credentials');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
          <div className="text-center mb-6">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Admin Email"
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingClients = clients.filter(c => c.status === 'pending');
  const activeClients = clients.filter(c => c.status === 'active');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            Pending Approvals ({pendingClients.length})
          </h2>
          {pendingClients.length === 0 ? (
            <p className="text-gray-500">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingClients.map((client) => (
                <div key={client.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      {client.business_name}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {client.email}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveClient(client.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectClient(client.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Clients */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Active Clients ({activeClients.length})
          </h2>
          {activeClients.length === 0 ? (
            <p className="text-gray-500">No active clients</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeClients.map((client) => (
                <div key={client.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{client.business_name}</h3>
                  <p className="text-sm text-gray-600">{client.email}</p>
                  <p className="text-sm text-gray-600">{client.phone}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    {client.plan}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
