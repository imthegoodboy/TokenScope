'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Users, Plus, Copy, Check, Trash2, UserPlus, LogOut, ChevronRight, Shield, Crown } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Group {
  id: number;
  name: string;
  code: string;
  description?: string;
  admin_id: string;
  role: string;
  member_count: number;
  created_at: string;
}

interface GroupMember {
  id: number;
  user_id: string;
  role: string;
  joined_at: string;
  stats: {
    total_optimizations: number;
    total_accepts: number;
    total_rejects: number;
    total_tokens_saved: number;
    total_cost_saved: number;
    avg_attention_score: number;
    acceptance_rate: number;
  };
}

interface GroupStats {
  total_members: number;
  total_optimizations: number;
  total_tokens_saved: number;
  total_cost_saved: number;
  avg_attention_score: number;
  avg_acceptance_rate: number;
  daily_stats: { date: string; optimizations: number; tokens_saved: number }[];
}

export default function GroupsPage() {
  const { user, isLoaded } = useUser();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const userId = user.id;

      const res = await fetch(`${apiUrl}/groups`, {
        headers: { 'X-User-Id': userId }
      });

      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadGroupDetails = useCallback(async (groupId: number) => {
    if (!user) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const userId = user.id;

      const [membersRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/groups/${groupId}/members`, {
          headers: { 'X-User-Id': userId }
        }),
        fetch(`${apiUrl}/groups/${groupId}/stats`, {
          headers: { 'X-User-Id': userId }
        })
      ]);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
      if (statsRes.ok) {
        setGroupStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadGroups();
    }
  }, [isLoaded, user, loadGroups]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup.id);
    }
  }, [selectedGroup, loadGroupDetails]);

  const createGroup = async () => {
    if (!user || !newGroup.name.trim()) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify(newGroup)
      });

      if (res.ok) {
        const data = await res.json();
        setGroups([data.group, ...groups]);
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '' });
        setSelectedGroup(data.group);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to create group');
      }
    } catch (err) {
      setError('Failed to create group');
    }
  };

  const joinGroup = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        },
        body: JSON.stringify({ code: joinCode.toUpperCase() })
      });

      if (res.ok) {
        const data = await res.json();
        await loadGroups();
        setShowJoinModal(false);
        setJoinCode('');
        // Find and select the joined group
        const joined = groups.find(g => g.id === data.group.id) || data.group;
        setSelectedGroup(joined);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to join group');
      }
    } catch (err) {
      setError('Failed to join group');
    }
  };

  const leaveGroup = async (groupId: number) => {
    if (!user || !confirm('Are you sure you want to leave this group?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'X-User-Id': user.id }
      });

      if (res.ok) {
        setGroups(groups.filter(g => g.id !== groupId));
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
          setMembers([]);
        }
      }
    } catch (err) {
      setError('Failed to leave group');
    }
  };

  const deleteGroup = async (groupId: number) => {
    if (!user || !confirm('Are you sure you want to delete this group? This cannot be undone.')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': user.id }
      });

      if (res.ok) {
        setGroups(groups.filter(g => g.id !== groupId));
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
          setMembers([]);
        }
      }
    } catch (err) {
      setError('Failed to delete group');
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatMoney = (num: number) => {
    if (num >= 1) return '$' + num.toFixed(2);
    if (num >= 0.01) return '$' + num.toFixed(4);
    return '$' + num.toFixed(6);
  };

  const chartData = groupStats?.daily_stats?.map(day => ({
    date: day.date?.slice(5) || day.date,
    optimizations: day.optimizations,
    tokensSaved: day.tokens_saved
  })).reverse() || [];

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange to-orange-light rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Groups</h1>
              <p className="text-gray-400 text-sm">Collaborate and track team usage</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <UserPlus size={18} />
              Join Group
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-orange hover:bg-orange-light text-black font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={18} />
              Create Group
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center justify-between">
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4">Your Groups</h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map(group => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedGroup?.id === group.id
                        ? 'bg-orange/20 border border-orange/50'
                        : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{group.name}</span>
                        {group.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-orange/20 text-orange rounded text-xs flex items-center gap-1">
                            <Crown size={10} /> Admin
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-500" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{group.member_count} members</span>
                      <span>Code: {group.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No groups yet</p>
                <p className="text-sm mt-1">Create or join a group to get started</p>
              </div>
            )}
          </div>

          {/* Group Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
                      {selectedGroup.description && (
                        <p className="text-gray-400 mt-1">{selectedGroup.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(selectedGroup.code)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <code className="text-orange font-mono">{selectedGroup.code}</code>
                        {copiedCode === selectedGroup.code ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      {selectedGroup.role === 'admin' && (
                        <button
                          onClick={() => deleteGroup(selectedGroup.id)}
                          className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {selectedGroup.role !== 'admin' && (
                        <button
                          onClick={() => leaveGroup(selectedGroup.id)}
                          className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-orange">{groupStats?.total_members || 0}</div>
                      <div className="text-xs text-gray-500">Members</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{formatNumber(groupStats?.total_optimizations || 0)}</div>
                      <div className="text-xs text-gray-500">Optimizations</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{formatNumber(groupStats?.total_tokens_saved || 0)}</div>
                      <div className="text-xs text-gray-500">Tokens Saved</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">{formatMoney(groupStats?.total_cost_saved || 0)}</div>
                      <div className="text-xs text-gray-500">Cost Saved</div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="groupGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#666" fontSize={12} />
                        <YAxis stroke="#666" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="optimizations" stroke="#FF6B00" fill="url(#groupGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Members */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <h3 className="text-lg font-semibold mb-4">Team Members</h3>
                  <div className="space-y-3">
                    {members.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-lg">👤</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.user_id.slice(0, 20)}...</span>
                              {member.role === 'admin' && (
                                <span className="px-2 py-0.5 bg-orange/20 text-orange rounded text-xs flex items-center gap-1">
                                  <Shield size={10} /> Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Joined {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Unknown'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-bold">{formatNumber(member.stats.total_optimizations)}</div>
                            <div className="text-xs text-gray-500">Optimizations</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-400">{formatNumber(member.stats.total_tokens_saved)}</div>
                            <div className="text-xs text-gray-500">Tokens Saved</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-purple-400">{member.stats.avg_attention_score * 100}%</div>
                            <div className="text-xs text-gray-500">Attention</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-blue-400">{member.stats.acceptance_rate}%</div>
                            <div className="text-xs text-gray-500">Accept Rate</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-500 text-lg">Select a group to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Group Name *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="e.g., Engineering Team"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange focus:ring-1 focus:ring-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                  placeholder="Optional description for the group"
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:border-orange focus:ring-1 focus:ring-orange"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroup.name.trim()}
                className="flex-1 px-4 py-3 bg-orange text-black font-medium rounded-lg hover:bg-orange-light transition-colors disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Join a Group</h2>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Group Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character code"
                maxLength={8}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange focus:ring-1 focus:ring-orange text-center text-2xl font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={joinGroup}
                disabled={joinCode.length !== 8}
                className="flex-1 px-4 py-3 bg-orange text-black font-medium rounded-lg hover:bg-orange-light transition-colors disabled:opacity-50"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}