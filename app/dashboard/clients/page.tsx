'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Search, X, Users, UserPlus, Building2, Plus, ShieldCheck, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/api';
import {
  useUi, PageHeader, RefreshButton, StatGrid, Card, Avatar, Badge, EmptyState, Modal, Field,
  GradientButton, GhostButton, Spinner, PageSkeleton, type BadgeTone,
} from '@/components/app/ui';

// Must match roles.role_name exactly - the backend looks the role up by name.
const ROLES = ['Admin', 'Finance', 'Supervisor'] as const;
const ROLE_TONE: Record<string, BadgeTone> = { admin: 'purple', finance: 'amber', supervisor: 'blue' };
const roleTone = (role?: string) => ROLE_TONE[(role || '').toLowerCase()] || 'gray';

export default function ClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ui = useUi();

  const [usersList, setUsersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userClients, setUserClients] = useState<number[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [loadingUserClients, setLoadingUserClients] = useState(false);
  const [busyClientId, setBusyClientId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Supervisor' });

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
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/clients`, { headers }),
      ]);

      const usersData = await usersRes.json();
      const clientsData = await clientsRes.json();

      setUsersList(Array.isArray(usersData) ? usersData : []);
      setClientsList(Array.isArray(clientsData) ? clientsData : []);

      if (Array.isArray(usersData) && usersData.length > 0) {
        const keep = selectedUser && usersData.find((u: any) => u.id === selectedUser.id);
        const next = keep || usersData[0];
        setSelectedUser(next);
        fetchUserClients(next.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load users and clients');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchUserClients = async (userId: number) => {
    setLoadingUserClients(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/user-clients/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserClients(Array.isArray(data) ? data.map((c: any) => c.id) : []);
      }
    } catch (err) {
      console.error('Failed to fetch user clients:', err);
    } finally {
      setLoadingUserClients(false);
    }
  };

  const handleUserSelect = (selected: any) => {
    setSelectedUser(selected);
    fetchUserClients(selected.id);
  };

  const handleAssignClient = async (clientId: number) => {
    if (!selectedUser) return;
    setBusyClientId(clientId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/assign-client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedUser.id, client_id: clientId })
      });

      if (response.ok) {
        setUserClients([...userClients, clientId]);
        const name = clientsList.find((c: any) => c.id === clientId)?.client_name;
        toast.success(`${name ?? 'Client'} assigned to ${selectedUser.name}`);
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to assign client');
      }
    } catch (err) {
      toast.error('Failed to assign client');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleRemoveClient = async (clientId: number) => {
    if (!selectedUser) return;
    setBusyClientId(clientId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/remove-client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: selectedUser.id, client_id: clientId })
      });

      if (response.ok) {
        setUserClients(userClients.filter(id => id !== clientId));
        const name = clientsList.find((c: any) => c.id === clientId)?.client_name;
        toast.success(`${name ?? 'Client'} removed from ${selectedUser.name}`);
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to remove client');
      }
    } catch (err) {
      toast.error('Failed to remove client');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users`, {
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
        toast.success(`User ${newUser.name} created`);
        setNewUser({ name: '', email: '', password: '', role: 'Supervisor' });
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create user');
      }
    } catch (err) {
      toast.error('Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = Array.isArray(clientsList)
    ? clientsList.filter((c: any) =>
        c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  const availableClients = filteredClients.filter((c: any) => !userClients.includes(c.id));

  const filteredUsers = usersList.filter((u: any) =>
    (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const roleCounts = usersList.reduce((acc: Record<string, number>, u: any) => {
    const role = (u.role || '').toLowerCase();
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  if (isFetching && usersList.length === 0) {
    return <PageSkeleton />;
  }

  const coverage = clientsList.length ? (userClients.length / clientsList.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        icon={UserCog}
        title="Client Access"
        subtitle="Pick a user, then click clients to grant or remove access"
        gradient="from-pink-500 to-rose-500"
        actions={
          <>
            <RefreshButton onClick={fetchData} loading={isFetching} />
            <GradientButton onClick={() => setIsDialogOpen(true)} className="!py-1.5 !text-xs">
              <UserPlus className="h-3.5 w-3.5" />
              Add User
            </GradientButton>
          </>
        }
      />

      <StatGrid
        stats={[
          { label: 'Users', value: usersList.length, icon: Users, color: 'blue' },
          { label: 'Admins', value: roleCounts.admin || 0, icon: ShieldCheck, color: 'purple' },
          { label: 'Finance', value: roleCounts.finance || 0, icon: Building2, color: 'amber' },
          { label: 'Supervisors', value: roleCounts.supervisor || 0, icon: UserCog, color: 'cyan' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Users */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${ui.text} flex items-center gap-2`}>
              <Users className="h-4 w-4" />
              Users
            </h2>
            <span className={`text-[11px] ${ui.muted}`}>{filteredUsers.length} of {usersList.length}</span>
          </div>
          <div className="relative mb-3">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${ui.muted}`} />
            <input
              type="text"
              placeholder="Search users…"
              className={`w-full pl-8 pr-8 py-2 text-sm ${ui.input}`}
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
            />
            {userSearchTerm && (
              <button onClick={() => setUserSearchTerm('')} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${ui.muted} hover:text-red-400`}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[440px] overflow-y-auto -mx-1 px-1 space-y-1" style={ui.colorScheme}>
            {filteredUsers.length === 0 ? (
              <div className="py-10">
                <EmptyState icon={Users} title={usersList.length === 0 ? 'No users found' : 'No users match your search'} />
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const active = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border-l-2 transition-all animate-in fade-in slide-in-from-left-1 fill-mode-both ${
                      active ? 'border-blue-500 bg-blue-500/10' : `border-transparent ${ui.hoverRow}`
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 12) * 25}ms` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${ui.text} truncate`}>{u.name}</p>
                        <p className={`text-[11px] ${ui.muted} truncate`}>{u.email}</p>
                      </div>
                      <Badge tone={roleTone(u.role)}>{u.role || '-'}</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Client access for selected user */}
        <Card className="md:col-span-2 p-4">
          {selectedUser ? (
            <div key={selectedUser.id} className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedUser.name} size="lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-base font-semibold ${ui.text}`}>{selectedUser.name}</h2>
                      <Badge tone={roleTone(selectedUser.role)}>{selectedUser.role || '-'}</Badge>
                    </div>
                    <p className={`text-xs ${ui.muted}`}>{selectedUser.email}</p>
                  </div>
                </div>
                <div className="w-48">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={ui.muted}>Client access</span>
                    <span className={`${ui.text} font-medium`}>{userClients.length} / {clientsList.length}</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${ui.isDark ? 'bg-white/10' : 'bg-gray-200'} overflow-hidden`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700" style={{ width: `${coverage}%` }} />
                  </div>
                </div>
              </div>

              {/* Assigned */}
              <div className="mb-5">
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${ui.muted} mb-2`}>
                  Has access to {loadingUserClients && <Spinner className="h-3 w-3" />}
                </div>
                {userClients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userClients.map((id) => {
                      const client = clientsList.find((c: any) => c.id === id);
                      return client ? (
                        <span
                          key={id}
                          className="group/chip inline-flex items-center gap-1.5 pl-1 pr-1 py-1 rounded-full text-xs bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25 animate-in fade-in zoom-in-95"
                        >
                          <Avatar name={client.client_name} size="sm" />
                          <span className={ui.text}>{client.client_name}</span>
                          <button
                            onClick={() => handleRemoveClient(id)}
                            disabled={busyClientId === id}
                            className="p-1 rounded-full text-red-400 opacity-60 group-hover/chip:opacity-100 hover:bg-red-500/15 transition disabled:opacity-40"
                            aria-label={`Remove ${client.client_name}`}
                            title="Remove access"
                          >
                            {busyClientId === id ? <Spinner className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className={`text-xs ${ui.muted} italic`}>No clients assigned yet. Pick some from below.</p>
                )}
              </div>

              {/* Available */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-[11px] font-semibold uppercase tracking-wide ${ui.muted}`}>Available clients</p>
                  <span className={`text-[11px] ${ui.muted}`}>{availableClients.length}</span>
                </div>
                <div className="relative mb-3">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${ui.muted}`} />
                  <input
                    type="text"
                    placeholder="Search clients…"
                    className={`w-full pl-8 pr-8 py-2 text-sm ${ui.input}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${ui.muted} hover:text-red-400`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className={`p-3 rounded-xl border ${ui.border} ${ui.isDark ? 'bg-white/[0.02]' : 'bg-gray-50/60'}`}>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto" style={ui.colorScheme}>
                    {availableClients.map((client: any) => (
                      <button
                        key={client.id}
                        onClick={() => handleAssignClient(client.id)}
                        disabled={busyClientId === client.id}
                        className={`inline-flex items-center gap-1.5 pl-1 pr-2 py-1 ${ui.card} border ${ui.border} hover:border-blue-500/50 hover:bg-blue-500/10 hover:-translate-y-0.5 rounded-full text-xs transition-all disabled:opacity-50`}
                      >
                        <Avatar name={client.client_name} size="sm" />
                        <span className={ui.text}>{client.client_name}</span>
                        {busyClientId === client.id ? <Spinner className="h-3 w-3 text-blue-400" /> : <Plus className="h-3 w-3 text-blue-400" />}
                      </button>
                    ))}
                    {availableClients.length === 0 && (
                      <p className={`text-xs ${ui.muted} py-1`}>
                        {searchTerm ? 'No matching clients' : 'All clients assigned 🎉'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16">
              <EmptyState icon={Users} title="Select a user" hint="Pick someone on the left to manage their client access." />
            </div>
          )}
        </Card>
      </div>

      {/* Create user */}
      <Modal
        open={isDialogOpen}
        onClose={() => !creating && setIsDialogOpen(false)}
        title="Create New User"
        footer={
          <>
            <GhostButton onClick={() => setIsDialogOpen(false)} disabled={creating}>Cancel</GhostButton>
            <GradientButton type="submit" form="create-user-form" disabled={creating}>
              {creating ? <Spinner /> : <UserPlus className="h-4 w-4" />}
              Create User
            </GradientButton>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Name *">
            <input
              className={`w-full px-3 py-2 text-sm ${ui.input}`}
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              className={`w-full px-3 py-2 text-sm ${ui.input}`}
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password *" hint="At least 6 characters">
            <input
              type="password"
              className={`w-full px-3 py-2 text-sm ${ui.input}`}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              minLength={6}
            />
          </Field>
          <Field label="Role">
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewUser({ ...newUser, role })}
                  className={`px-3 py-2 text-xs rounded-lg border transition ${
                    newUser.role === role
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/40'
                      : `${ui.border} ${ui.textSoft} ${ui.hoverBtn}`
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
