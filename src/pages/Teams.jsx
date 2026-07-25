import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { RefreshCw, Trash2, GitMerge, Users, School, ChevronDown, UserCheck } from 'lucide-react';
import { API } from '../api.js';

export default function Teams() {
  const { token } = useAuth();
  const [teams, setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [mergeA, setMergeA] = useState('');
  const [mergeB, setMergeB] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeMsg, setMergeMsg] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'solo'

  // Solo participants state
  const [soloParticipants, setSoloParticipants] = useState([]);
  const [soloLoading, setSoloLoading] = useState(true);
  const [soloSearch, setSoloSearch] = useState('');

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTeams(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSoloParticipants = async () => {
    setSoloLoading(true);
    try {
      const params = new URLSearchParams();
      if (soloSearch) params.append('search', soloSearch);
      const res = await fetch(`${API}/api/public/solo-participants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSoloParticipants(await res.json());
    } catch (e) { console.error(e); }
    finally { setSoloLoading(false); }
  };

  useEffect(() => { if (token) fetchTeams(); }, [token]);
  useEffect(() => { if (token) fetchSoloParticipants(); }, [token, soloSearch]);

  const deleteTeam = async (id, name) => {
    if (!window.confirm(`Dissolve team "${name}"? All members will be unassigned.`)) return;
    try {
      const res = await fetch(`${API}/api/admin/teams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { fetchTeams(); }
    } catch (e) { console.error(e); }
  };

  const mergeTeams = async () => {
    if (!mergeA || !mergeB || mergeA === mergeB) {
      setMergeMsg('Select two different teams to merge.'); return;
    }
    setMerging(true); setMergeMsg('');
    try {
      const res = await fetch(`${API}/api/admin/teams/merge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamAId: mergeA, teamBId: mergeB })
      });
      const data = await res.json();
      setMergeMsg(data.message || 'Done');
      if (res.ok) { setMergeA(''); setMergeB(''); fetchTeams(); }
    } catch (e) { setMergeMsg('Merge failed.'); }
    finally { setMerging(false); }
  };

  const slotsBar = (used, max = 5) => {
    const pct = (used / max) * 100;
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>{used} / {max} members</span>
          <span>{max - used} slots left</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const initials = (name) =>
    (name || '').trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Teams Monitor</div>
          <div className="section-sub">
            {teams.length} teams &nbsp;·&nbsp; {soloParticipants.length} solo participants
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => { fetchTeams(); fetchSoloParticipants(); }} disabled={loading || soloLoading}>
          <RefreshCw size={13} />Refresh
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('teams')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderBottom: activeTab === 'teams' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'teams' ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'all 0.15s'
          }}
        >
          🏆 Teams ({teams.length})
        </button>
        <button
          onClick={() => setActiveTab('solo')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderBottom: activeTab === 'solo' ? '2px solid #0ea5e9' : '2px solid transparent',
            color: activeTab === 'solo' ? '#0ea5e9' : 'var(--text-muted)',
            transition: 'all 0.15s'
          }}
        >
          👤 Solo / Unpaired ({soloParticipants.length})
        </button>
      </div>

      {/* ===== TEAMS TAB ===== */}
      {activeTab === 'teams' && (
        <>
          {/* Merge Panel */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Merge Two Teams</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Merges Team B members into Team A. Max 5 members total.</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="input-group" style={{ flex: 1, minWidth: 160 }}>
                <label className="label">Team A (Primary)</label>
                <select className="input select" value={mergeA} onChange={e => setMergeA(e.target.value)}>
                  <option value="">Select Team A…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ flex: 1, minWidth: 160 }}>
                <label className="label">Team B (Absorb into A)</label>
                <select className="input select" value={mergeB} onChange={e => setMergeB(e.target.value)}>
                  <option value="">Select Team B…</option>
                  {teams.filter(t => t.id !== mergeA).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button className="btn btn-ghost" onClick={mergeTeams} disabled={merging} style={{ height: 36 }}>
                <GitMerge size={13} />{merging ? 'Merging…' : 'Merge Teams'}
              </button>
            </div>
            {mergeMsg && (
              <div style={{ marginTop: 10, fontSize: 11, color: mergeMsg.toLowerCase().includes('success') ? 'var(--success)' : 'var(--danger)' }}>
                {mergeMsg}
              </div>
            )}
          </div>

          {/* Teams Grid */}
          {loading ? (
            <div className="loading-center"><div className="spinner" />Loading teams…</div>
          ) : teams.length === 0 ? (
            <div className="empty-state">
              <Users size={40} />
              <h3>No Teams Yet</h3>
              <p>Teams will appear here once participants create them.</p>
            </div>
          ) : (
            <div className="grid-3">
              {teams.map(team => {
                const isExpanded = expandedId === team.id;
                const memberCount = team.members?.length ?? team.memberCount ?? 0;
                return (
                  <div key={team.id} className="team-card">
                    {/* Top Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div className="team-name">{team.name}</div>
                        <div className="team-meta" style={{ marginTop: 3 }}>
                          <School size={10} />
                          {team.college}
                        </div>
                      </div>
                      <span className={`badge ${team.status === 'full' ? 'badge-neutral' : 'badge-success'}`}>
                        {team.status === 'full' ? 'Full' : 'Open'}
                      </span>
                    </div>

                    {/* Members Bar */}
                    {slotsBar(memberCount)}

                    {/* Leader */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Leader: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{team.leaderName}</span>
                    </div>

                    {/* Description toggle */}
                    {team.description && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : team.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                      >
                        <ChevronDown size={12} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                        {isExpanded ? 'Hide' : 'Show'} description
                      </button>
                    )}
                    {isExpanded && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{team.description}</div>
                    )}

                    {/* Team ID */}
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4 }}>
                      ID: {team.id}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                      <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => deleteTeam(team.id, team.name)}>
                        <Trash2 size={11} />Dissolve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== SOLO / UNPAIRED TAB ===== */}
      {activeTab === 'solo' && (
        <>
          {/* Search bar */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search by name, college, branch…"
              value={soloSearch}
              onChange={e => setSoloSearch(e.target.value)}
              className="input"
              style={{ maxWidth: 320 }}
            />
          </div>

          {soloLoading ? (
            <div className="loading-center"><div className="spinner" />Loading solo participants…</div>
          ) : soloParticipants.length === 0 ? (
            <div className="empty-state">
              <UserCheck size={40} />
              <h3>No Solo Participants</h3>
              <p>All registered participants have joined a team, or no results match your search.</p>
            </div>
          ) : (
            <div className="grid-3">
              {soloParticipants.map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      height: 40, width: 40, borderRadius: '50%',
                      background: p.gender?.toLowerCase() === 'female' ? '#fce7f3' : '#e0f2fe',
                      color: p.gender?.toLowerCase() === 'female' ? '#be185d' : '#0369a1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, flexShrink: 0
                    }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: p.gender?.toLowerCase() === 'female' ? '#fce7f3' : '#e0f2fe',
                        color: p.gender?.toLowerCase() === 'female' ? '#be185d' : '#0369a1',
                        border: `1px solid ${p.gender?.toLowerCase() === 'female' ? '#fbcfe8' : '#bae6fd'}`
                      }}>
                        {p.gender}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <School size={11} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.college}</span>
                    </div>
                    <div>{p.branch && <span>{p.branch} · </span>}{p.year}</div>
                  </div>

                  {/* Badge */}
                  <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd'
                    }}>
                      Looking for a team
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
