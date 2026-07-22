import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, CreditCard, UserCheck, GitBranch, RefreshCw, TrendingUp } from 'lucide-react';
import { API } from '../api.js';

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchStats(); }, [token]);

  const cards = stats ? [
    { label: 'Total Registrations', value: stats.totalRegistrations ?? 0,   icon: Users,       sub: 'All registered participants' },
    { label: 'Paid Participants',   value: stats.paidParticipants ?? 0,     icon: CreditCard,  sub: `₹${(stats.totalRevenue ?? 0).toLocaleString()} collected` },
    { label: 'Total Teams',         value: stats.totalTeams ?? 0,           icon: GitBranch,   sub: 'Formed event teams' },
  ] : [];

  const graphData = stats?.liveRegistrationsGraph || [];
  const maxCount = Math.max(...graphData.map(d => d.count), 1);

  const formatDateLabel = (dateStr) => {
    if (!dateStr || dateStr === 'Unknown') return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Overview Dashboard</div>
          <div className="section-sub">Live registration & event metrics</div>
        </div>
        <button className="btn btn-ghost" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /> Loading stats…</div>
      ) : (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {cards.map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="stat-card">
              <div className="stat-icon"><Icon size={16} /></div>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-sub">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Day by Day Student Registrations Bar Graph */}
      {stats && graphData.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#a855f7" />
                Day-by-Day Student Registrations
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Daily count of students registered for CodeSprint-2026
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Peak Day</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#a855f7' }}>
                  {Math.max(...graphData.map(d => d.count), 0)} Students
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 26, paddingTop: 20, borderBottom: '1px solid var(--border)', position: 'relative' }}>
            {graphData.map((item, index) => {
              const heightPercent = Math.max((item.count / maxCount) * 100, item.count > 0 ? 18 : 5);
              const formattedDate = formatDateLabel(item.date);

              return (
                <div
                  key={item.date || index}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%', justifyContent: 'flex-end' }}
                >
                  {/* Value Badge on top of bar */}
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: item.count > 0 ? '#a855f7' : 'var(--text-muted)',
                      marginBottom: 6,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {item.count}
                  </div>

                  {/* Bar Column */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 38,
                      height: `${heightPercent}%`,
                      background: item.count > 0 
                        ? 'linear-gradient(180deg, #a855f7 0%, #6366f1 100%)' 
                        : 'var(--bg-hover)',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease',
                      boxShadow: item.count > 0 ? '0 0 12px rgba(168, 85, 247, 0.35)' : 'none',
                      cursor: 'pointer'
                    }}
                    title={`${formattedDate}: ${item.count} students registered`}
                  />

                  {/* Date Label under bar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -24,
                      fontSize: 10,
                      fontWeight: 600,
                      color: item.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formattedDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Progress */}
      {stats && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Payment Conversion</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Registered → Paid</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700 }}>
              {stats.totalRegistrations > 0
                ? Math.round((stats.paidParticipants / stats.totalRegistrations) * 100)
                : 0}%
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: stats.totalRegistrations > 0 ? `${(stats.paidParticipants / stats.totalRegistrations) * 100}%` : '0%' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
            <span>{stats.paidParticipants} paid</span>
            <span>{stats.totalRegistrations - stats.paidParticipants} pending</span>
          </div>
        </div>
      )}

      {/* Quick Info */}
      {stats && (
        <div className="grid-2">
          <div className="card-sm">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Revenue Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Total Revenue',    `₹${(stats.totalRevenue ?? 0).toLocaleString()}`],
                ['Avg per Team',     stats.totalTeams > 0 ? `₹${Math.round((stats.totalRevenue ?? 0) / stats.totalTeams).toLocaleString()}` : '—'],
                ['Pending Payments', stats.totalRegistrations - stats.paidParticipants],
              ].map(([k, v]) => (

                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-sm">
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Event Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Teams Active',  stats.totalTeams ?? 0],
                ['Status',        <span className="badge badge-success">Live</span>],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: typeof v === 'string' ? 'JetBrains Mono, monospace' : 'inherit' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
