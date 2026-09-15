'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/providers/ThemeProvider';
import {
  Search, X, RefreshCw, Users, UserPlus, Building2,
  Plus, CheckCircle2, AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnimatedProgress } from '@/components/ui/animated-progress';

// Minimal blue shades for avatars - matches the rest of the app
const BLUE_SHADES = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#bfdbfe', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7'];

export default function ClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userClients, setUserClients] = useState<number[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  const bgColor = isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#131726]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputText = isDark ? 'text-white' : 'text-gray-800';
  const placeholder = isDark ? 'placeholder-white/20' : 'placeholder-gray-400';
  const activeBg = isDark ? 'bg-blue-500/10' : 'bg-blue-50';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, clientsRes] = await Promise.all([
        fetch('http://localhost:8000/api/users', { headers }),
        fetch('http://localhost:8000/api/clients', { headers }),
      ]);
      
      const usersData = await usersRes.json();
      const clientsData = await clientsRes.json();
      
      setUsersList(Array.isArray(usersData) ? usersData : []);
      setClientsList(Array.isArray(clientsData) ? clientsData : []);
      
      if (usersData && usersData.length > 0) {
        setSelectedUser(usersData[0]);
        fetchUserClients(usersData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchUserClients = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/user-clients/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserClients(Array.isArray(data) ? data.map((c: any) => c.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch user clients:', err);
    }
  };

  const handleUserSelect = (selected: any) => {
    setSelectedUser(selected);
    fetchUserClients(selected.id);
  };

  const handleAssignClient = async (clientId: number) => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/assign-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedUser.id, client_id: clientId })
      });
      
      if (response.ok) {
        setUserClients([...userClients, clientId]);
        setSuccess(`Client assigned to ${selectedUser.name}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to assign client');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to assign client');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveClient = async (clientId: number) => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/remove-client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedUser.id, client_id: clientId })
      });
      
      if (response.ok) {
        setUserClients(userClients.filter(id => id !== clientId));
        setSuccess(`Client removed from ${selectedUser.name}`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to remove client');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to remove client');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsersList([...usersList, data]);
        setIsDialogOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        setSuccess('User created successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create user');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Failed to create user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredClients = Array.isArray(clientsList) 
    ? clientsList.filter((c: any) => 
        c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'admin': isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
      'supervisor': isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      'user': isDark ? 'bg-gray-500/15 text-gray-400' : 'bg-gray-200 text-gray-600',
    };
    return colors[role] || colors['user'];
  };

  const filteredUsers = usersList.filter((u: any) =>
    (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const roleCounts = usersList.reduce((acc: Record<string, number>, u: any) => {
    const role = u.role || 'user';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h1 className={`text-lg font-semibold ${textColor}`}>Client Access</h1>
            <p className={`text-xs ${textMuted}`}>Manage user access and client permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className={`${cardBg} ${borderColor} border`}>
                <DialogHeader>
                  <DialogTitle className={textColor}>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Name *</label>
                    <Input
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className={`mt-1 ${inputBg} ${inputBorder} border ${inputText} ${placeholder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Email *</label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className={`mt-1 ${inputBg} ${inputBorder} border ${inputText} ${placeholder}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Password *</label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className={`mt-1 ${inputBg} ${inputBorder} border ${inputText} ${placeholder}`}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Role</label>
                    <Select 
                      value={newUser.role} 
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger className={`mt-1 ${inputBg} ${inputBorder} border ${inputText}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className={cardBg}>
                        <SelectItem value="user" className="text-xs">User</SelectItem>
                        <SelectItem value="supervisor" className="text-xs">Supervisor</SelectItem>
                        <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create User</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData} 
              className={`h-8 w-8 p-0 ${cardBg} ${borderColor} border`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${textMuted}`} />
            </Button>
          </div>
        </div>

        {success && (
          <div className="mb-3 flex items-center gap-2 p-2 text-sm bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {error && (
          <div className="mb-3 flex items-center gap-2 p-2 text-sm bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Users List */}
          <Card className={`${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-xs font-medium ${textColor} flex items-center gap-2`}>
                  <Users className="h-3.5 w-3.5" />
                  Users ({usersList.length})
                </CardTitle>
              </div>
              {usersList.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {Object.entries(roleCounts).map(([role, count]) => (
                    <span key={role} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getRoleBadge(role)}`}>
                      {count} {role}{(count as number) !== 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              )}
              <div className="relative mt-2">
                <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${textMuted}`} />
                <input
                  type="text"
                  placeholder="Search users..."
                  className={`w-full pl-7 pr-2 py-1.5 text-xs ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-2 max-h-[380px] overflow-y-auto space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-8">
                  <Users className={`h-5 w-5 ${textMuted} opacity-40`} />
                  <p className={`text-xs ${textMuted}`}>{usersList.length === 0 ? 'No users found' : 'No users match your search'}</p>
                </div>
              ) : (
                filteredUsers.map((u, idx) => (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                      selectedUser?.id === u.id
                        ? `${activeBg} border-l-2 border-blue-500`
                        : `border-l-2 border-transparent ${hoverBg}`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: BLUE_SHADES[idx % BLUE_SHADES.length] }}
                      >
                        {u.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${textColor} truncate`}>{u.name}</p>
                        <p className={`text-[10px] ${textMuted} truncate`}>{u.email}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${getRoleBadge(u.role)}`}>
                        {u.role || 'user'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Client Management */}
          <Card className={`md:col-span-2 ${cardBg} ${borderColor} border`}>
            <CardHeader className="p-3 pb-1">
              {selectedUser ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: BLUE_SHADES[usersList.findIndex((u: any) => u.id === selectedUser.id) % BLUE_SHADES.length] }}
                    >
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <CardTitle className={`text-xs font-medium ${textColor}`}>{selectedUser.name}</CardTitle>
                      <span className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${getRoleBadge(selectedUser.role)}`}>
                        {selectedUser.role || 'user'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium ${textColor}`}>
                      {userClients.length} / {clientsList.length} clients
                    </span>
                    <div className="w-28 mt-1">
                      <AnimatedProgress value={userClients.length} max={Math.max(clientsList.length, 1)} color="bg-blue-500" duration={800} />
                    </div>
                  </div>
                </div>
              ) : (
                <CardTitle className={`text-xs font-medium ${textColor}`}>Select a user</CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {selectedUser ? (
                <div>
                  {/* Assigned Clients */}
                  <div className="mb-4">
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-1.5`}>Assigned Clients</p>
                    {userClients.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {userClients.map((id) => {
                          const client = clientsList.find((c: any) => c.id === id);
                          return client ? (
                            <div key={id} className={`flex items-center gap-1.5 pl-2 pr-1 py-1 ${isDark ? 'bg-green-500/10' : 'bg-green-50'} border border-green-500/20 rounded-full text-xs`}>
                              <Building2 className="h-3 w-3 text-green-500 shrink-0" />
                              <span className={textColor}>{client.client_name}</span>
                              <button
                                onClick={() => handleRemoveClient(id)}
                                className="p-0.5 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                aria-label={`Remove ${client.client_name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className={`text-xs ${textMuted} italic`}>No clients assigned yet</p>
                    )}
                  </div>

                  {/* Available Clients */}
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${textMuted} mb-1.5`}>Available Clients</p>
                    <div className="relative mb-2">
                      <Search className={`absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${textMuted}`} />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        className={`w-full pl-7 pr-2 py-1.5 text-xs ${inputBg} ${inputBorder} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${inputText} ${placeholder}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className={`p-2 rounded-lg border ${borderColor} ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>
                      <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                        {filteredClients
                          .filter((c: any) => !userClients.includes(c.id))
                          .map((client: any) => (
                            <button
                              key={client.id}
                              onClick={() => handleAssignClient(client.id)}
                              className={`flex items-center gap-1 pl-2 pr-1.5 py-1 ${cardBg} hover:bg-blue-500/10 border ${borderColor} hover:border-blue-500/40 rounded-full text-xs transition-colors`}
                            >
                              <Building2 className={`h-3 w-3 ${textMuted}`} />
                              <span className={textColor}>{client.client_name}</span>
                              <Plus className="h-3 w-3 text-blue-400" />
                            </button>
                          ))}
                        {filteredClients.filter((c: any) => !userClients.includes(c.id)).length === 0 && (
                          <p className={`text-xs ${textMuted} py-1`}>
                            {searchTerm ? 'No matching clients' : 'All clients assigned'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className={`h-8 w-8 mx-auto ${textMuted} mb-2 opacity-40`} />
                  <p className={`text-sm ${textMuted}`}>Select a user to manage their client access</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
