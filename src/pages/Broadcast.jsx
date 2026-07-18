import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Radio, Send, Users, School, User, CheckCircle2 } from 'lucide-react';
import { API } from '../api.js';

export default function Broadcast() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    recipientType: 'all',
    recipientTarget: '',
    title: '',
    message: '',
    channel: 'push',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/admin/notifications/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || (res.ok ? 'Broadcast dispatched!' : 'Failed to send.') });
      if (res.ok) setForm(f => ({ ...f, title: '', message: '' }));
    } catch {
      setResult({ success: false, message: 'Connection error.' });
    } finally {
      setLoading(false);
    }
  };

  const RECIPIENT_ICONS = {
    all: <Users size={14} />, college: <School size={14} />, individual: <User size={14} />,
  };
  const CHANNELS = ['email', 'sms', 'push'];

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={18} style={{ color: 'var(--text-muted)' }} />
            Notification Banner
          </div>
          <div className="section-sub">Dispatch real-time notification banners to attendees on the frontend</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, maxWidth: 900 }}>
        {/* Compose Form */}
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 18, color: 'var(--text-primary)' }}>Compose Broadcast Message</div>
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Recipient type */}
            <div className="input-group">
              <label className="label">Recipients</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['all', 'college', 'individual'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recipientType: t, recipientTarget: '' }))}
                    className={`btn btn-sm ${form.recipientType === t ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, gap: 5 }}
                  >
                    {RECIPIENT_ICONS[t]}
                    {t === 'all' ? 'All' : t === 'college' ? 'College' : 'Individual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Target input when not 'all' */}
            {form.recipientType !== 'all' && (
              <div className="input-group">
                <label className="label">{form.recipientType === 'college' ? 'College Name' : 'User ID or Email'}</label>
                <input
                  className="input"
                  value={form.recipientTarget}
                  onChange={e => setForm(f => ({ ...f, recipientTarget: e.target.value }))}
                  placeholder={form.recipientType === 'college' ? 'e.g. JNTUH' : 'e.g. user@email.com'}
                />
              </div>
            )}


            {/* Title */}
            <div className="input-group">
              <label className="label">Notification Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Hackathon Schedule Update" required />
            </div>

            {/* Message */}
            <div className="input-group">
              <label className="label">Message Body *</label>
              <textarea
                className="input"
                rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Write your notification message here…"
                required
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {result && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: result.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: result.success ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                display: 'flex', gap: 8, alignItems: 'center'
              }}>
                {result.success && <CheckCircle2 size={14} />}
                {result.message}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
              <Send size={13} />{loading ? 'Dispatching…' : 'Send Broadcast'}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Banner Guide</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Notification Banner</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>WebSocket real-time in-app toast banner. Instant delivery to active users on the website.</div>
            </div>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <span style={{ color: 'var(--warning)', fontWeight: 700 }}>⚠ Note:</span> Notification Banners are dispatched instantly via the Socket.IO server.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
