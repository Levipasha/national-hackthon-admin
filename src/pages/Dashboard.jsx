import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, CreditCard, UserCheck, GitBranch, RefreshCw, TrendingUp, Globe, Eye, Monitor, AlertTriangle, LogOut } from 'lucide-react';
import { API } from '../api.js';

export default function Dashboard() {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async (targetUrl = API) => {
    setLoading(true);
    setError(null);
    try {
      // Try /api/admin/overview first (to avoid ad-blockers filtering '/stats'), fallback to /api/admin/stats
      let res = await fetch(`${targetUrl}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${targetUrl}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          setError({
            title: 'Authentication Required',
            message: errData.message || 'Your session token is invalid or expired. Please sign out and log back in.',
            isAuth: true
          });
        } else {
          setError({
            title: `Server Error (${res.status})`,
            message: errData.message || `The server at ${targetUrl} returned an error response.`,
            isAuth: false
          });
        }
      }
    } catch (e) {
      console.error('Fetch stats error:', e);
      // Automatic fallback: if target is local and failed, try production server
      if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
        try {
          console.log('Local backend unreachable. Trying fallback to https://ap.orderin.in...');
          const fallbackRes = await fetch(`https://ap.orderin.in/api/admin/overview`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setStats(data);
            setLoading(false);
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback to production API also failed:', fallbackErr);
        }
      }
      setError({
        title: 'Connection Error (Failed to fetch)',
        message: `Could not connect to backend API at "${targetUrl}". Ensure your backend server is running and accessible.`,
        detail: e.message || 'TypeError: Failed to fetch',
        isAuth: false
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchStats(); }, [token]);

  const cards = stats ? [
    { label: 'Total Registrations', value: stats.totalRegistrations ?? 0,   icon: Users,       sub: 'All registered participants' },
    { label: 'Paid Participants',   value: stats.paidParticipants ?? 0,     icon: CreditCard,  sub: `₹${((stats.paidParticipants ?? 0) * 399).toLocaleString()} collected` },
    { label: 'Total Teams',         value: stats.totalTeams ?? 0,           icon: GitBranch,   sub: 'Formed event teams' },
    { label: 'Unique Visitors',     value: stats.uniqueVisitorsCount ?? 0,  icon: Globe,       sub: 'Filtered by IP (no duplicate hits)' },
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
        <button className="btn btn-ghost" onClick={() => fetchStats()} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards / Error State */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /> Loading stats…</div>
      ) : error ? (
        <div className="card" style={{ padding: 24, marginBottom: 28, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex' }}>
              <AlertTriangle size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                {error.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {error.message}
              </div>
              {error.detail && (
                <div style={{ fontSize: 11, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: 6, color: '#fca5a5', marginBottom: 16 }}>
                  Error detail: {error.detail} (Target URL: {API})
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => fetchStats()} style={{ fontSize: 12, padding: '6px 14px' }}>
                  <RefreshCw size={14} /> Retry Connection
                </button>
                {error.isAuth ? (
                  <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 12, color: '#ef4444' }}>
                    <LogOut size={14} /> Sign Out & Re-login
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => fetchStats('https://ap.orderin.in')} style={{ fontSize: 12 }}>
                    Try Production API (ap.orderin.in)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
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
                ['Total Revenue',    `₹${((stats.paidParticipants ?? 0) * 399).toLocaleString()}`],
                ['Avg per Team',     stats.totalTeams > 0 ? `₹${Math.round(((stats.paidParticipants ?? 0) * 399) / stats.totalTeams).toLocaleString()}` : '—'],
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
