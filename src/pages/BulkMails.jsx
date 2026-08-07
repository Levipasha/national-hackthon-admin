import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Mail, Send, RefreshCw, CheckCircle2, AlertTriangle, Users, Calendar, 
  Search, Filter, X, ShieldAlert, Clock, Info 
} from 'lucide-react';
import { API } from '../api.js';

export default function BulkMails() {
  const { token } = useAuth();
  const [recipients, setRecipients] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notice, setNotice] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'sent' | 'failed' | 'pending'

  const fetchData = async () => {
    try {
      const res = await fetch(`${API}/api/admin/campaign/recipients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
        setCampaignStatus(data.campaignStatus || null);
      }
    } catch (err) {
      console.error('Error fetching bulk mail recipients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Poll progress when campaign is active
  useEffect(() => {
    let interval;
    if (campaignStatus?.inProgress) {
      interval = setInterval(fetchData, 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [campaignStatus?.inProgress]);

  const handleStartDispatch = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setNotice(null);
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
        setNotice({ type: 'success', text: data.message });
        fetchData();
      } else {
        setNotice({ type: 'error', text: data.message || 'Failed to start bulk mail dispatch.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: 'Network error triggering campaign.' });
    } finally {
      setSending(false);
    }
  };

  // Filter recipients list
  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = 
      (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.college || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;
  const pendingCount = recipients.filter(r => r.status === 'pending').length;
  const isLimitReached = (campaignStatus?.runsToday ?? 0) >= 2;

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Not sent yet';
    try {
      return new Date(isoStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex' }}>
              <Mail size={20} />
            </div>
            Bulk Email Management
          </div>
          <div className="section-sub">Broadcast official WhatsApp Community link & track individual student email delivery</div>
        </div>

        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh Status
        </button>
      </div>

      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 20,
          background: notice.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: notice.type === 'success' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${notice.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          display: 'flex', gap: 10, alignItems: 'center'
        }}>
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {notice.text}
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon"><Users size={16} /></div>
          <div className="stat-label">Total Recipients</div>
          <div className="stat-value">{recipients.length}</div>
          <div className="stat-sub">Registered participants</div>
        </div>

        <div className="stat-card" style={{ borderColor: isLimitReached ? 'rgba(239, 68, 68, 0.4)' : undefined }}>
          <div className="stat-icon" style={{ color: isLimitReached ? '#ef4444' : '#10b981' }}><Calendar size={16} /></div>
          <div className="stat-label">Daily Limit Quota</div>
          <div className="stat-value" style={{ color: isLimitReached ? '#ef4444' : '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
            {campaignStatus?.runsToday ?? 0} / 2
          </div>
          <div className="stat-sub">{isLimitReached ? 'Max daily dispatches reached' : 'Dispatches used today (Max 2)'}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#22c55e' }}><CheckCircle2 size={16} /></div>
          <div className="stat-label">Emails Sent</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{sentCount}</div>
          <div className="stat-sub">Verified delivered</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#ef4444' }}><AlertTriangle size={16} /></div>
          <div className="stat-label">Emails Failed</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{failedCount}</div>
          <div className="stat-sub">Delivery failures</div>
        </div>
      </div>

      {/* Campaign Control & Dispatch Panel */}
      <div className="card" style={{ marginBottom: 28, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} style={{ color: '#10b981' }} />
              WhatsApp Community Invitation Campaign
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Subject: <strong>[Action Required] Join Official CodeSprint 2026 WhatsApp Group</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceResend}
                onChange={e => setForceResend(e.target.checked)}
                disabled={isLimitReached || sending || campaignStatus?.inProgress}
              />
              Force re-send
            </label>

            <button
              className="btn btn-primary"
              onClick={() => setShowConfirmModal(true)}
              disabled={isLimitReached || sending || campaignStatus?.inProgress}
              style={{
                background: isLimitReached ? 'var(--bg-hover)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: isLimitReached ? 'var(--text-muted)' : '#ffffff',
                border: 'none',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 8,
                cursor: isLimitReached ? 'not-allowed' : 'pointer',
                boxShadow: isLimitReached ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Send size={14} />
              {sending ? 'Starting...' : campaignStatus?.inProgress ? 'Sending in Progress...' : isLimitReached ? 'Limit Reached (2/2)' : 'Send Bulk Mails'}
            </button>
          </div>
        </div>

        {/* Daily Limit Warning Banner */}
        {isLimitReached && !campaignStatus?.inProgress && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex', gap: 10, alignItems: 'center'
          }}>
            <ShieldAlert size={18} />
            <div>
              <strong>Daily Limit Reached (2/2 Dispatches Used Today)</strong><br />
              Bulk emails are restricted to a maximum of 2 dispatches per day. The button is disabled until tomorrow.
            </div>
          </div>
        )}

        {/* Live Progress Bar when Sending */}
        {campaignStatus && (campaignStatus.inProgress || campaignStatus.totalCount > 0) && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                {campaignStatus.inProgress ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                {campaignStatus.inProgress ? 'Sending Bulk Emails in Background...' : 'Last Campaign Completed'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                {campaignStatus.sentCount} / {campaignStatus.totalCount} ({Math.round(((campaignStatus.sentCount || 0) / (campaignStatus.totalCount || 1)) * 100)}%)
              </div>
            </div>

            <div className="progress-bar" style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.round(((campaignStatus.sentCount || 0) / (campaignStatus.totalCount || 1)) * 100)}%`,
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  height: '100%', borderRadius: 4, transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Recipient Verification Table Header & Search */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--text-muted)' }} />
            Student Recipient Email Verification Ledger
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 3, borderRadius: 8 }}>
              {[
                ['all', `All (${recipients.length})`],
                ['sent', `Sent (${sentCount})`],
                ['failed', `Failed (${failedCount})`],
                ['pending', `Pending (${pendingCount})`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`btn btn-sm ${statusFilter === key ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '4px 10px', height: 28 }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: 32, height: 32, fontSize: 12 }}
                placeholder="Search name, email, college..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Student Verification Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 12px' }}>#</th>
                <th style={{ padding: '10px 12px' }}>Student Name</th>
                <th style={{ padding: '10px 12px' }}>Email Address</th>
                <th style={{ padding: '10px 12px' }}>College</th>
                <th style={{ padding: '10px 12px' }}>Verification Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Dispatch Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 8px' }} /> Loading recipient verification ledger...
                  </td>
                </tr>
              ) : filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No recipient records matching "{searchTerm}" ({statusFilter}).
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((rec, idx) => (
                  <tr key={rec.userId || rec.email || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{rec.email}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.college}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {rec.status === 'sent' ? (
                        <span className="badge badge-success" style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}>
                          <CheckCircle2 size={12} /> Sent & Verified
                        </span>
                      ) : rec.status === 'failed' ? (
                        <span className="badge badge-danger" title={rec.error || 'Delivery failed'} style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}>
                          <AlertTriangle size={12} /> Failed: {rec.error || 'SMTP error'}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', gap: 4, display: 'inline-flex', alignItems: 'center' }}>
                          <Clock size={12} /> Pending Queue
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
                      {formatDate(rec.sentAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }}>
          <div className="card" style={{
            maxWidth: 520, width: '100%', background: '#121318', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.6)', position: 'relative'
          }}>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 10, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex' }}>
                <Mail size={22} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Confirm Bulk Email Dispatch</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily Usage Quota: {campaignStatus?.runsToday ?? 0} / 2 used</div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Target Audience:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{recipients.length} Registered Students</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Subject:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>[Action Required] Join Official WhatsApp Group</span>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                ⚠ Emails will be queued asynchronously in the background with a 1-second SMTP rate-limiting delay per email.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleStartDispatch}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', fontWeight: 600, gap: 6 }}
              >
                <Send size={14} /> Start Bulk Email Dispatch Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
