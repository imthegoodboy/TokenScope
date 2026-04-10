'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, Download, Filter, ChevronDown, Eye, X, FileText } from 'lucide-react';

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

interface Group {
  id: number;
  name: string;
  code: string;
  description?: string;
  admin_id: string;
  role: string;
  member_count: number;
}

interface MemberLog {
  id: number;
  original_prompt: string;
  optimized_prompt: string;
  original_tokens: number;
  optimized_tokens: number;
  tokens_saved: number;
  cost_saved: number;
  attention_score: number;
  chatbot: string;
  accepted: boolean;
  created_at: string;
}

const CHATBOT_ICONS: Record<string, string> = {
  chatgpt: '🤖',
  claude: '🧠',
  gemini: '✨',
  perplexity: '🔍',
  manual: '✍️'
};

export default function GroupAdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get('groupId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(groupIdParam ? parseInt(groupIdParam) : null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [memberLogs, setMemberLogs] = useState<MemberLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filters
  const [filterAcceptRate, setFilterAcceptRate] = useState<string>('all');
  const [filterTokens, setFilterTokens] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'optimizations' | 'tokens' | 'accept_rate'>('optimizations');
  const [searchQuery, setSearchQuery] = useState('');

  const loadGroups = useCallback(async () => {
    if (!user) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups`, {
        headers: { 'X-User-Id': user.id }
      });

      if (res.ok) {
        const data = await res.json();
        setGroups(data.filter((g: any) => g.role === 'admin'));
        if (data.filter((g: any) => g.role === 'admin').length === 1) {
          setSelectedGroupId(data.filter((g: any) => g.role === 'admin')[0]?.id);
        }
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMembers = useCallback(async (groupId: number) => {
    if (!user) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups/${groupId}/members`, {
        headers: { 'X-User-Id': user.id }
      });

      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, [user]);

  const loadMemberLogs = useCallback(async (groupId: number, memberUserId: string) => {
    if (!user) return;

    setLoadingLogs(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/groups/${groupId}/members/${memberUserId}/logs?limit=100`, {
        headers: { 'X-User-Id': user.id }
      });

      if (res.ok) {
        setMemberLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadGroups();
    }
  }, [isLoaded, user, loadGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      setSelectedGroup(group || null);
      loadMembers(selectedGroupId);
    }
  }, [selectedGroupId, groups, loadMembers]);

  useEffect(() => {
    if (selectedGroupId && selectedMember) {
      loadMemberLogs(selectedGroupId, selectedMember.user_id);
    }
  }, [selectedGroupId, selectedMember, loadMemberLogs]);

  // Filter and sort members
  const filteredMembers = members
    .filter(m => {
      // Search filter
      if (searchQuery && !m.user_id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Accept rate filter
      if (filterAcceptRate === 'high' && m.stats.acceptance_rate < 70) return false;
      if (filterAcceptRate === 'medium' && (m.stats.acceptance_rate >= 70 || m.stats.acceptance_rate < 40)) return false;
      if (filterAcceptRate === 'low' && m.stats.acceptance_rate >= 40) return false;

      // Tokens filter
      if (filterTokens === 'high' && m.stats.total_tokens_saved < 100) return false;
      if (filterTokens === 'medium' && (m.stats.total_tokens_saved >= 100 || m.stats.total_tokens_saved < 20)) return false;
      if (filterTokens === 'low' && m.stats.total_tokens_saved >= 20) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'optimizations') return b.stats.total_optimizations - a.stats.total_optimizations;
      if (sortBy === 'tokens') return b.stats.total_tokens_saved - a.stats.total_tokens_saved;
      if (sortBy === 'accept_rate') return b.stats.acceptance_rate - a.stats.acceptance_rate;
      return 0;
    });

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

  const exportToPDF = async () => {
    if (!selectedGroup) return;

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Group Report - ${selectedGroup.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #FF6B00; }
    h2 { color: #333; border-bottom: 2px solid #FF6B00; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; padding: 12px; text-align: left; border: 1px solid #ddd; }
    td { padding: 10px; border: 1px solid #ddd; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #f5f5f5; padding: 20px; border-radius: 8px; flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; color: #FF6B00; }
    .stat-label { color: #666; }
  </style>
</head>
<body>
  <h1>TokenScope Group Report</h1>
  <p><strong>Group:</strong> ${selectedGroup.name}</p>
  <p><strong>Code:</strong> ${selectedGroup.code}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${members.length}</div>
      <div class="stat-label">Total Members</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${formatNumber(members.reduce((sum, m) => sum + m.stats.total_optimizations, 0))}</div>
      <div class="stat-label">Total Optimizations</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${formatNumber(members.reduce((sum, m) => sum + m.stats.total_tokens_saved, 0))}</div>
      <div class="stat-label">Tokens Saved</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${formatMoney(members.reduce((sum, m) => sum + m.stats.total_cost_saved, 0))}</div>
      <div class="stat-label">Cost Saved</div>
    </div>
  </div>

  <h2>Member Details</h2>
  <table>
    <thead>
      <tr>
        <th>User ID</th>
        <th>Role</th>
        <th>Optimizations</th>
        <th>Accepts</th>
        <th>Rejects</th>
        <th>Accept Rate</th>
        <th>Tokens Saved</th>
        <th>Cost Saved</th>
        <th>Avg Attention</th>
        <th>Joined</th>
      </tr>
    </thead>
    <tbody>
      ${members.map(m => `
        <tr>
          <td>${m.user_id}</td>
          <td>${m.role}</td>
          <td>${m.stats.total_optimizations}</td>
          <td>${m.stats.total_accepts}</td>
          <td>${m.stats.total_rejects}</td>
          <td>${m.stats.acceptance_rate}%</td>
          <td>${m.stats.total_tokens_saved}</td>
          <td>${formatMoney(m.stats.total_cost_saved)}</td>
          <td>${(m.stats.avg_attention_score * 100).toFixed(0)}%</td>
          <td>${m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `;

    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (groups.filter(g => g.role === 'admin').length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-xl font-bold mb-2">No Admin Access</h2>
          <p className="text-gray-500 mb-4">You need to be an admin of a group to access this page</p>
          <button
            onClick={() => router.push('/groups')}
            className="px-4 py-2 bg-orange text-black rounded-lg"
          >
            Go to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/groups')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="text-orange" size={28} />
              Admin Dashboard
            </h1>
            {selectedGroup && (
              <p className="text-gray-400 text-sm mt-1">
                Managing: {selectedGroup.name}
              </p>
            )}
          </div>
          {selectedGroup && (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-orange hover:bg-orange-light text-black font-medium rounded-lg transition-colors"
            >
              <Download size={18} />
              Export PDF
            </button>
          )}
        </div>

        {/* Group Selector */}
        {groups.filter(g => g.role === 'admin').length > 1 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Select Group</label>
            <select
              value={selectedGroupId || ''}
              onChange={e => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-orange"
            >
              <option value="">Select a group...</option>
              {groups.filter(g => g.role === 'admin').map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedGroup ? (
          <>
            {/* Filters */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search user ID..."
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <select
                    value={filterAcceptRate}
                    onChange={e => setFilterAcceptRate(e.target.value)}
                    className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm focus:border-orange"
                  >
                    <option value="all">All Accept Rates</option>
                    <option value="high">High (>70%)</option>
                    <option value="medium">Medium (40-70%)</option>
                    <option value="low">Low (<40%)</option>
                  </select>

                  <select
                    value={filterTokens}
                    onChange={e => setFilterTokens(e.target.value)}
                    className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm focus:border-orange"
                  >
                    <option value="all">All Token Savings</option>
                    <option value="high">High (>100)</option>
                    <option value="medium">Medium (20-100)</option>
                    <option value="low">Low (<20)</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm focus:border-orange"
                  >
                    <option value="optimizations">Sort: Optimizations</option>
                    <option value="tokens">Sort: Tokens Saved</option>
                    <option value="accept_rate">Sort: Accept Rate</option>
                  </select>
                </div>

                <div className="text-sm text-gray-500">
                  Showing {filteredMembers.length} of {members.length} members
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">User</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Optimizations</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Accepts</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Rejects</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Accept Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Tokens Saved</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Cost Saved</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Attention Score</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Joined</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm">
                              👤
                            </div>
                            <div>
                              <div className="font-medium text-sm">{member.user_id.slice(0, 16)}...</div>
                              {member.role === 'admin' && (
                                <span className="text-xs text-orange">Admin</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{member.stats.total_optimizations}</td>
                        <td className="px-4 py-3 text-center font-mono text-green-400">{member.stats.total_accepts}</td>
                        <td className="px-4 py-3 text-center font-mono text-red-400">{member.stats.total_rejects}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            member.stats.acceptance_rate >= 70 ? 'bg-green-900/50 text-green-400' :
                            member.stats.acceptance_rate >= 40 ? 'bg-yellow-900/50 text-yellow-400' :
                            'bg-red-900/50 text-red-400'
                          }`}>
                            {member.stats.acceptance_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-green-400">{formatNumber(member.stats.total_tokens_saved)}</td>
                        <td className="px-4 py-3 text-center font-mono text-green-400">{formatMoney(member.stats.total_cost_saved)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500"
                                style={{ width: `${member.stats.avg_attention_score * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-purple-400">{(member.stats.avg_attention_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No members match your filters</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-500 text-lg">Select a group to manage</p>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">👤</div>
                <div>
                  <h2 className="text-lg font-bold">{selectedMember.user_id.slice(0, 24)}...</h2>
                  <p className="text-sm text-gray-500">Member since {selectedMember.joined_at ? new Date(selectedMember.joined_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const html = `
                      <!DOCTYPE html>
                      <html>
                      <head><title>User Report - ${selectedMember.user_id}</title>
                      <style>
                        body { font-family: Arial; padding: 40px; }
                        h1 { color: #FF6B00; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 10px; border: 1px solid #ddd; }
                        th { background: #f5f5f5; }
                      </style>
                      </head>
                      <body>
                        <h1>User Report: ${selectedMember.user_id}</h1>
                        <h2>Stats</h2>
                        <ul>
                          <li>Total Optimizations: ${selectedMember.stats.total_optimizations}</li>
                          <li>Accepts: ${selectedMember.stats.total_accepts}</li>
                          <li>Rejects: ${selectedMember.stats.total_rejects}</li>
                          <li>Accept Rate: ${selectedMember.stats.acceptance_rate}%</li>
                          <li>Tokens Saved: ${selectedMember.stats.total_tokens_saved}</li>
                          <li>Cost Saved: ${formatMoney(selectedMember.stats.total_cost_saved)}</li>
                          <li>Avg Attention: ${(selectedMember.stats.avg_attention_score * 100).toFixed(0)}%</li>
                        </ul>
                        <h2>Recent Logs</h2>
                        <table>
                          <tr>
                            <th>Date</th>
                            <th>Chatbot</th>
                            <th>Original</th>
                            <th>Optimized</th>
                            <th>Tokens Saved</th>
                            <th>Accepted</th>
                          </tr>
                          ${memberLogs.map(log => `
                            <tr>
                              <td>${log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
                              <td>${log.chatbot}</td>
                              <td>${log.original_prompt.slice(0, 50)}...</td>
                              <td>${log.optimized_prompt.slice(0, 50)}...</td>
                              <td>${log.tokens_saved}</td>
                              <td>${log.accepted ? 'Yes' : 'No'}</td>
                            </tr>
                          `).join('')}
                        </table>
                      </body>
                      </html>
                    `;
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(html);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-orange hover:bg-orange-light text-black rounded-lg text-sm"
                >
                  <FileText size={16} />
                  Export User
                </button>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="p-2 hover:bg-gray-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-800">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{selectedMember.stats.total_optimizations}</div>
                <div className="text-xs text-gray-500">Total Optimizations</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{formatNumber(selectedMember.stats.total_tokens_saved)}</div>
                <div className="text-xs text-gray-500">Tokens Saved</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{formatMoney(selectedMember.stats.total_cost_saved)}</div>
                <div className="text-xs text-gray-500">Cost Saved</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{(selectedMember.stats.avg_attention_score * 100).toFixed(0)}%</div>
                <div className="text-xs text-gray-500">Avg Attention</div>
              </div>
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Optimization History</h3>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
                </div>
              ) : memberLogs.length > 0 ? (
                <div className="space-y-3">
                  {memberLogs.map(log => (
                    <div key={log.id} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CHATBOT_ICONS[log.chatbot] || '🤖'}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${log.accepted ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {log.accepted ? 'Accepted' : 'Dismissed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</span>
                          <span className="text-orange">-{log.tokens_saved} tokens</span>
                          <span className="text-green-400">-{formatMoney(log.cost_saved)}</span>
                          <span className="text-purple-400">⚡ {(log.attention_score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        <span className="line-through text-red-400/60">{log.original_prompt.slice(0, 100)}...</span>
                      </div>
                      <div className="text-sm text-green-400 mt-1">
                        → {log.optimized_prompt.slice(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No optimization history yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}