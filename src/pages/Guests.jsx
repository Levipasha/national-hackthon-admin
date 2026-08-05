import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, Mail, Phone, Star, Download, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

const STATUS_STYLE = {
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  invited:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  declined:  { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

export default function Guests() {
  const { token } = useAuth();
  const [guests, setGuests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', designation: '', topic: '', email: '', phone: '', status: 'invited', vip: false, imageUrl: '' });
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await fetch(`${API}/api/guests`);
      if (res.ok) setGuests(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        // Mock upload if no credentials
        setTimeout(() => {
          setForm(f => ({ ...f, imageUrl: `https://i.pravatar.cc/150?u=${Date.now()}` }));
          setIsUploading(false);
          showNotification('Mock upload successful (Credentials missing)');
        }, 1000);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setForm(f => ({ ...f, imageUrl: data.secure_url }));
        showNotification('Image uploaded successfully!');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name) return;
    try {
      const res = await fetch(`${API}/api/admin/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const newGuest = await res.json();
        setGuests(prev => [newGuest, ...prev]);
        setForm({ name: '', designation: '', topic: '', email: '', phone: '', status: 'invited', vip: false, imageUrl: '' });
        setShowForm(false);
        showNotification('Guest added successfully!');
      }
    } catch (e) {
      showNotification('Failed to add guest', 'error');
    }
  };

  const remove = async (id) => { 
    if (window.confirm('Remove guest?')) {
      try {
        await fetch(`${API}/api/admin/guests/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setGuests(prev => prev.filter(g => g.id !== id));
        showNotification('Guest removed!', 'error');
      } catch (e) {
        showNotification('Failed to remove guest', 'error');
      }
    }
  };

  const cycleStatus = async (id, currentStatus) => {
    const ORDER = ['invited', 'confirmed', 'declined'];
    const nextStatus = ORDER[(ORDER.indexOf(currentStatus) + 1) % 3];
    try {
      await fetch(`${API}/api/admin/guests/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
      setGuests(prev => prev.map(g => g.id === id ? { ...g, status: nextStatus } : g));
      showNotification('Guest status updated!');
    } catch (e) {
      showNotification('Failed to update status', 'error');
    }
  };

  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Name', 'Designation', 'Topic', 'Email', 'Phone', 'Status', 'VIP'];
    const csvContent = [
      headers.join(','),
      ...guests.map(g => [esc(g.name), esc(g.designation), esc(g.topic), esc(g.email), esc(g.phone), esc(g.status), esc(g.vip ? 'Yes' : 'No')].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `guests_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported CSV successfully!');
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck size={18} style={{ color: 'var(--text-muted)' }} />
            Guests Manager
          </div>
          <div className="section-sub">Manage guest speakers, VIPs, and distinguished visitors</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={13} />Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={13} />Add Guest
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: notification.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: notification.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${notification.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          fontSize: 12, fontWeight: 600
        }}>
          {notification.msg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>Add Guest Speaker</div>
          
          <div style={{ marginBottom: 16 }}>
            <label className="label">Guest Photo</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {form.imageUrl ? <img src={form.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} color="var(--text-muted)" />}
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="guest-img-upload" />
                <label htmlFor="guest-img-upload" className="btn btn-sm btn-ghost" style={{ cursor: 'pointer' }}>
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </label>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>JPEG, PNG (Max 2MB)</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'Dr. John Smith' },
              { key: 'designation', label: 'Designation', placeholder: 'CTO, Company' },
              { key: 'topic', label: 'Talk Topic', placeholder: 'AI in Healthcare' },
              { key: 'email', label: 'Email', placeholder: 'guest@org.com' },
              { key: 'phone', label: 'Phone', placeholder: '9876543210' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="input-group">
                <label className="label">{label}</label>
                <input className="input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div className="input-group">
              <label className="label">Status</label>
              <select className="input select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="invited">Invited</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">VIP Guest?</label>
              <select className="input select" value={form.vip} onChange={e => setForm(f => ({ ...f, vip: e.target.value === 'true' }))}>
                <option value="false">No</option><option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={isUploading}>Add Guest</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>Designation</th><th>Topic</th>
              <th>Contact</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g, idx) => {
              const st = STATUS_STYLE[g.status] || STATUS_STYLE.invited;
              return (
                <tr key={g.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={g.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=random`} alt={g.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {g.vip && <Star size={11} style={{ color: '#facc15', flexShrink: 0 }} />}
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{g.name}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{g.designation}</td>
                  <td style={{ fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.topic}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={9} />{g.email}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={9} />{g.phone}</span>
                    </div>
                  </td>
                  <td>
                    <button onClick={() => cycleStatus(g.id, g.status)} style={{ cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {g.status}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => remove(g.id)}>
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
