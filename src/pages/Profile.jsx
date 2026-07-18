import React, { useState } from 'react';
import { Settings, Shield, Key, Bell, Save, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { admin } = useAuth();
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    name: admin?.name || 'CodeSprint Admin',
    email: admin?.email || 'admin@codesprint.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifyRegistrations: true,
    notifyPayments: true,
    notifyCheckIns: false,
    notifyBroadcasts: true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }));

  const Toggle = ({ field, label, sub }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        type="button"
        onClick={() => toggle(field)}
        style={{
          width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
          background: form[field] ? 'var(--success)' : 'var(--bg-elevated)',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: form[field] ? 21 : 3, width: 16, height: 16,
          borderRadius: '50%', background: 'white', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={18} style={{ color: 'var(--text-muted)' }} />
            Profile Settings
          </div>
          <div className="section-sub">Manage your admin account details, password, and notification preferences</div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 860 }}>

        {/* Account Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Shield size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Account Information</span>
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: '2px solid var(--border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'var(--text-primary)'
            }}>
              {(form.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{form.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Super Administrator</div>
              <div style={{ fontSize: 10, color: 'var(--success)', marginTop: 3 }}>● Systems Secure</div>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="label">Display Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
        </div>

        {/* Password */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Key size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Change Password</span>
          </div>

          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="••••••••" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="label">New Password</label>
            <input className="input" type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min. 8 characters" />
          </div>
          <div className="input-group">
            <label className="label">Confirm New Password</label>
            <input className="input" type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter new password" />
          </div>
          {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 8 }}>⚠ Passwords do not match</div>
          )}
        </div>

        {/* Notifications */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Bell size={15} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notification Preferences</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Choose which admin events trigger notifications in your dashboard.</div>

          <Toggle field="notifyRegistrations" label="New Registrations" sub="Alert when a new participant completes the signup form" />
          <Toggle field="notifyPayments" label="Payment Completions" sub="Alert when a participant confirms their payment" />
          <Toggle field="notifyCheckIns" label="Event Check-Ins" sub="Alert each time an attendee is checked in at the venue" />
          <Toggle field="notifyBroadcasts" label="Broadcast Confirmations" sub="Alert when a WS broadcast is successfully dispatched" />
        </div>

        {/* Save Button */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" className="btn btn-primary">
            <Save size={13} />Save Settings
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} />Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
