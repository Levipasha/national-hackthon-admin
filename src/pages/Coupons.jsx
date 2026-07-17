import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw, Ticket, Check } from 'lucide-react';

const EMPTY_FORM = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  collegeName: '',
  usageLimit: '',
  expiryDate: '',
};

export default function Coupons() {
  const { token } = useAuth();
  const [coupons, setCoupons]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCoupons(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchCoupons(); }, [token]);

  const createCoupon = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/coupons/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
          usageLimit: Number(form.usageLimit),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess(`Coupon "${data.coupon.code}" created!`);
        setForm(EMPTY_FORM);
        fetchCoupons();
      } else {
        setFormError(data.message || 'Failed to create coupon.');
      }
    } catch (e) { setFormError('Network error.'); }
    finally { setSubmitting(false); }
  };

  const toggleCoupon = async (id) => {
    try {
      await fetch('/api/admin/coupons/toggle', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponId: id }),
      });
      fetchCoupons();
    } catch (e) { console.error(e); }
  };

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date();

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Coupon Manager</div>
          <div className="section-sub">{coupons.length} coupon codes total</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchCoupons} disabled={loading}>
            <RefreshCw size={13} />Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            <Plus size={13} />{showForm ? 'Cancel' : 'Create Coupon'}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>New Coupon Code</div>
          {formError   && <div className="error-msg" style={{ marginBottom: 12 }}>{formError}</div>}
          {formSuccess && <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11.5, padding: '10px 12px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} />{formSuccess}</div>}
          <form onSubmit={createCoupon}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div className="input-group">
                <label className="label">Coupon Code *</label>
                <input className="input" placeholder="e.g. VNRJYOTHI20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              </div>
              <div className="input-group">
                <label className="label">Discount Type *</label>
                <select className="input select" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Discount Value *</label>
                <input className="input" type="number" placeholder={form.discountType === 'percentage' ? '10' : '100'} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} required min="1" />
              </div>
              <div className="input-group">
                <label className="label">Usage Limit *</label>
                <input className="input" type="number" placeholder="100" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} required min="1" />
              </div>
              <div className="input-group">
                <label className="label">College (Optional)</label>
                <input className="input" placeholder="Restrict to college…" value={form.collegeName} onChange={e => setForm(f => ({ ...f, collegeName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="label">Expiry Date *</label>
                <input className="input" type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Ticket size={13} />{submitting ? 'Creating…' : 'Create Coupon'}
            </button>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" />Loading coupons…</div>
      ) : coupons.length === 0 ? (
        <div className="empty-state">
          <Ticket size={40} />
          <h3>No Coupons Yet</h3>
          <p>Create your first coupon code above.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>College</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const expired = isExpired(c.expiryDate);
                const usagePct = c.usageLimit > 0 ? Math.round((c.usageCount / c.usageLimit) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 4 }}>
                        {c.code}
                      </span>
                    </td>
                    <td><span className="badge badge-neutral">{c.discountType === 'percentage' ? 'Percent' : 'Flat'}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                    </td>
                    <td style={{ color: c.collegeName ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 11 }}>
                      {c.collegeName || 'All Colleges'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                          <span>{c.usageCount} used</span><span>{c.usageLimit} max</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${usagePct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: expired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : '—'}
                      {expired && <span style={{ display: 'block', fontSize: 9, marginTop: 1 }}>EXPIRED</span>}
                    </td>
                    <td>
                      {c.isActive && !expired
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-danger">Inactive</span>
                      }
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleCoupon(c.id)}
                        title={c.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {c.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        {c.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
