import React, { useState, useEffect } from 'react';
import { Award, Mail, Phone, Plus, Trash2, Edit2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

export default function Coordinators() {
  const { token } = useAuth();
  const [coordinators, setCoordinators] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', dept: '', email: '', phone: '', avatar: '', color: '#3b82f6' });
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const fetchCoordinators = async () => {
    try {
      const res = await fetch(`${API}/api/coordinators`);
      if (res.ok) setCoordinators(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        id: editingId || `c_${Date.now()}`
      };
      
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API}/api/admin/coordinators/${editingId}` : `${API}/api/admin/coordinators`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification(editingId ? 'Coordinator updated!' : 'Coordinator added!');
        fetchCoordinators();
        closeForm();
      } else {
        showNotification('Failed to save', 'error');
      }
    } catch (error) {
      showNotification('Error saving coordinator', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coordinator?')) return;
    try {
      const res = await fetch(`${API}/api/admin/coordinators/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Coordinator deleted');
        fetchCoordinators();
      }
    } catch (error) {
      showNotification('Error deleting', 'error');
    }
  };

  const openForm = (c = null) => {
    if (c) {
      setEditingId(c.id);
      setForm(c);
    } else {
      setEditingId(null);
      setForm({ name: '', role: '', dept: '', email: '', phone: '', avatar: '', color: '#3b82f6' });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const facultyCoords = coordinators.filter(c => {
    const roleLower = (c.role || '').toLowerCase();
    return roleLower.includes('faculty') || roleLower.includes('dean') || roleLower.includes('professor');
  });
  const studentCoords = coordinators.filter(c => !facultyCoords.includes(c));

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} style={{ color: 'var(--text-muted)' }} />
            Coordinators
          </div>
          <div className="section-sub">Faculty and student coordinator directory for CodeSprint 2026</div>
        </div>
        <button onClick={() => openForm()} className="btn btn-primary" style={{ gap: 6 }}>
          <Plus size={14} /> Add Coordinator
        </button>
      </div>

      {notification && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          color: notification.type === 'error' ? 'var(--danger)' : 'var(--success)',
        }}>
          {notification.msg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20, position: 'relative' }}>
          <button onClick={closeForm} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            {editingId ? 'Edit Coordinator' : 'Add Coordinator'}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="label">Name</label>
                <input required className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Dr. John Doe" />
              </div>
              <div className="input-group">
                <label className="label">Role</label>
                <input className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="e.g. Faculty Coordinator" />
              </div>
              <div className="input-group">
                <label className="label">Department / Info</label>
                <input className="input" value={form.dept} onChange={e => setForm({...form, dept: e.target.value})} placeholder="e.g. CSE Dept" />
              </div>
              <div className="input-group">
                <label className="label">Initials (Avatar)</label>
                <input className="input" value={form.avatar} onChange={e => setForm({...form, avatar: e.target.value})} placeholder="e.g. JD" maxLength={3} />
              </div>
              <div className="input-group">
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Theme Color</label>
                <input type="color" style={{ width: '100%', height: 40, padding: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }} value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10 }}>
              {editingId ? 'Save Changes' : 'Create Coordinator'}
            </button>
          </form>
        </div>
      )}

      {/* Faculty Coordinators */}
      {facultyCoords.length > 0 && (
        <>
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Faculty
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 28 }}>
            {facultyCoords.map(c => (
              <CoordinatorCard key={c.id} c={c} onEdit={() => openForm(c)} onDelete={() => handleDelete(c.id)} />
            ))}
          </div>
        </>
      )}

      {/* Student Coordinators */}
      {studentCoords.length > 0 && (
        <>
          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Student Coordinators
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {studentCoords.map(c => (
              <CoordinatorCard key={c.id} c={c} onEdit={() => openForm(c)} onDelete={() => handleDelete(c.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CoordinatorCard({ c, onEdit, onDelete }) {
  const avatarText = c.avatar || (c.name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  const displayColor = c.color || '#3b82f6';
  
  return (
    <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} title="Edit"><Edit2 size={12} /></button>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={12} /></button>
      </div>

      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `${displayColor}22`, border: `2px solid ${displayColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: displayColor, letterSpacing: 1
      }}>
        {avatarText}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 40 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, marginBottom: 2 }}>{c.name}</div>
        {c.role && <div style={{ fontSize: 10, fontWeight: 600, color: displayColor, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.role}</div>}
        {c.dept && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{c.dept}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {c.email && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={9} />{c.email}
            </span>
          )}
          {c.phone && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={9} />{c.phone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
