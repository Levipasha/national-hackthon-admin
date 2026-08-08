import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, CreditCard, UserCheck, GitBranch, RefreshCw, TrendingUp, Globe, Eye, Monitor, AlertTriangle, LogOut, Mail, Send, CheckCircle2, X } from 'lucide-react';
import { API } from '../api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bulk Email Campaign state
  const [showBulkMailModal, setShowBulkMailModal] = useState(false);
  const [campaignState, setCampaignState] = useState(null);
  const [triggeringBulkMail, setTriggeringBulkMail] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [bulkMailNotice, setBulkMailNotice] = useState(null);

  const fetchCampaignStatus = async () => {
    try {
      const res = await fetch(`${API}/api/admin/campaign/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaignState(data.campaignStatus);
      }
    } catch (err) {
      console.error('Failed to fetch campaign status:', err);
    }
  };

  const handleStartBulkMail = async () => {
    setTriggeringBulkMail(true);
    setBulkMailNotice(null);
    try {
      const res = await fetch(`${API}/api/admin/campaign/send-whatsapp-bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: forceResend })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkMailNotice({ type: 'success', text: data.message });
        setCampaignState(data.campaignStatus);
      } else {
        setBulkMailNotice({ type: 'error', text: data.message || 'Failed to start bulk mail campaign.' });
      }
    } catch (err) {
      setBulkMailNotice({ type: 'error', text: 'Network error starting campaign.' });
    } finally {
      setTriggeringBulkMail(false);
    }
  };

  useEffect(() => {
    let interval;
    if (showBulkMailModal || (campaignState && campaignState.inProgress)) {
      fetchCampaignStatus();
      interval = setInterval(fetchCampaignStatus, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showBulkMailModal, campaignState?.inProgress]);

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
        }).catch(() => null);
      }

      // If targetUrl failed and was localhost, attempt production API
      if ((!res || !res.ok) && (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1'))) {
        res = await fetch(`https://ap.orderin.in/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(`https://ap.orderin.in/api/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);
        }
      }

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          setStats(data);
          return;
        }
      }

      if (res) {
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
      } else {
        // Both endpoints failed due to network / CORS / ad-blocker issue
        let serverReachable = false;
        try {
          const pingRes = await fetch(`${targetUrl}/`, { method: 'GET', mode: 'cors' }).catch(() => null);
          if (pingRes && pingRes.ok) serverReachable = true;
        } catch (pingErr) {
          // Ping failed
        }

        if (serverReachable) {
          setError({
            title: 'Session Expired or Unauthorized',
            message: `The server at ${targetUrl} is online, but your admin session token is invalid or expired. Please sign out and log back in.`,
            detail: 'Server health check OK, but stats API request failed.',
            isAuth: true
          });
        } else {
          setError({
            title: 'Connection Error (Failed to fetch)',
            message: `Could not connect to backend API at "${targetUrl}". Ensure your backend server is running and accessible.`,
            detail: 'Network request failed or blocked by browser extension/ad-blocker.',
            isAuth: false
          });
        }
      }
    } catch (e) {
      console.error('Fetch stats error:', e);
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
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-title">Overview Dashboard</div>
          <div className="section-sub">Live registration & event metrics</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/bulk-mails')}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <Mail size={14} />
            Bulk Mails Page
          </button>
          <button className="btn btn-ghost" onClick={() => fetchStats()} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
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

      {/* Send Bulk Mails Confirmation & Progress Modal */}
      {showBulkMailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }}>
          <div className="card" style={{
            maxWidth: 580, width: '100%', background: '#121318', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)', position: 'relative'
          }}>
            <button
              onClick={() => setShowBulkMailModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                padding: 10, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981', display: 'flex'
              }}>
                <Mail size={22} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Send WhatsApp Group Bulk Mails
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Broadcast official WhatsApp Community link to all registered participants
                </div>
              </div>
            </div>

            {bulkMailNotice && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16,
                background: bulkMailNotice.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: bulkMailNotice.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${bulkMailNotice.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                display: 'flex', gap: 8, alignItems: 'center'
              }}>
                {bulkMailNotice.type === 'success' && <CheckCircle2 size={14} />}
                {bulkMailNotice.text}
              </div>
            )}

            {/* Template / Target Details */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Audience:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>
                  {stats?.totalRegistrations ?? 'All'} Registered Participants
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Daily Usage Quota:</span>
                <span style={{
                  fontWeight: 700,
                  color: (campaignState?.runsToday >= 2) ? '#ef4444' : '#10b981',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  {campaignState?.runsToday ?? 0} / 2 Dispatches Used Today
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Email Subject:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  [Action Required] Join Official CodeSprint 2026 WhatsApp Group
                </span>
              </div>
            </div>

            {/* Daily Limit Warning Banner */}
            {campaignState && campaignState.runsToday >= 2 && !campaignState.inProgress && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 20,
                background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', gap: 8, alignItems: 'center'
              }}>
                <AlertTriangle size={16} />
                Daily Bulk Email Limit Reached (2/2 dispatches used today). Try again tomorrow.
              </div>
            )}

            {/* Campaign Live Status Progress */}
            {campaignState && (campaignState.inProgress || campaignState.totalCount > 0) && (
              <div style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {campaignState.inProgress ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                    {campaignState.inProgress ? 'Sending Bulk Emails...' : 'Campaign Completed'}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                    {campaignState.sentCount} / {campaignState.totalCount} ({Math.round(((campaignState.sentCount || 0) / (campaignState.totalCount || 1)) * 100)}%)
                  </div>
                </div>

                <div className="progress-bar" style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round(((campaignState.sentCount || 0) / (campaignState.totalCount || 1)) * 100)}%`,
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      height: '100%', borderRadius: 4, transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Sent: {campaignState.sentCount}</span>
                  <span>Failed: {campaignState.failedCount}</span>
                </div>
              </div>
            )}

            {/* Force Re-send option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="forceResend"
                checked={forceResend}
                onChange={e => setForceResend(e.target.checked)}
                disabled={campaignState?.inProgress || triggeringBulkMail || campaignState?.runsToday >= 2}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="forceResend" style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Force re-send to participants who have already received this email
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowBulkMailModal(false)}
                disabled={triggeringBulkMail}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStartBulkMail}
                disabled={triggeringBulkMail || campaignState?.inProgress || campaignState?.runsToday >= 2}
                style={{
                  background: (campaignState?.runsToday >= 2) ? 'var(--bg-hover)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: (campaignState?.runsToday >= 2) ? 'var(--text-muted)' : '#ffffff',
                  border: 'none', fontWeight: 600, gap: 6,
                  cursor: (campaignState?.runsToday >= 2) ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={14} />
                {triggeringBulkMail ? 'Starting...' : campaignState?.inProgress ? 'Sending in Progress...' : (campaignState?.runsToday >= 2) ? 'Limit Reached (2/2)' : 'Start Bulk Mail Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
