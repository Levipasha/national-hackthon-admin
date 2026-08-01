import React, { useState, useEffect, useRef } from 'react';
import { School, Upload, Download, Trash2, List, Plus, Search, Pencil, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

export default function Colleges() {
  const { token } = useAuth();
  const [colleges, setColleges] = useState([]);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCollegeName, setAddCollegeName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [editingCollege, setEditingCollege] = useState(null); // { id, name }
  const [editCollegeName, setEditCollegeName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await fetch(`${API}/api/colleges`);
      if (res.ok) setColleges(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── 1. Add Single College ─────────────────────────────
  const handleAddSingleCollege = async (e) => {
    e.preventDefault();
    if (!addCollegeName.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`${API}/api/admin/colleges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: addCollegeName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`College "${data.name}" added successfully!`, 'success');
        setAddCollegeName('');
        setShowAddModal(false);
        fetchColleges();
      } else {
        showNotification(data.message || 'Failed to add college', 'error');
      }
    } catch (err) {
      showNotification('Server error adding college', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // ── 2. Edit / Rename College ─────────────────────────────
  const handleEditCollege = async (e) => {
    e.preventDefault();
    if (!editingCollege || !editCollegeName.trim()) return;

    setIsEditing(true);
    try {
      const res = await fetch(`${API}/api/admin/colleges/${editingCollege.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editCollegeName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`College updated successfully! (${data.updatedUsers || 0} students & ${data.updatedTeams || 0} teams updated)`, 'success');
        setEditingCollege(null);
        setEditCollegeName('');
        fetchColleges();
      } else {
        showNotification(data.message || 'Failed to update college', 'error');
      }
    } catch (err) {
      showNotification('Server error updating college', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  // ── 3. Delete College ─────────────────────────────────────
  const handleDeleteCollege = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the Colleges list?`)) return;

    try {
      const res = await fetch(`${API}/api/admin/colleges/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`College deleted successfully!`, 'info');
        fetchColleges();
      } else {
        showNotification(data.message || 'Failed to delete college', 'error');
      }
    } catch (err) {
      showNotification('Server error deleting college', 'error');
    }
  };

  // ── 4. CSV Upload & Download ──────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvContent = event.target.result;
      try {
        const res = await fetch(`${API}/api/admin/colleges/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ csvContent })
        });
        const data = await res.json();
        if (res.ok) {
          showNotification(data.message);
          fetchColleges();
        } else {
          showNotification(data.message || 'Upload failed', 'error');
        }
      } catch (error) {
        showNotification('Connection error', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const downloadDemoCsv = () => {
    const csvData = "College Name\nAudisankara College of Engineering and Technology\nJNTUH University\nVIT Vellore\nSRM Institute of Science and Technology";
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'demo_colleges.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredColleges = colleges.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <School size={18} style={{ color: 'var(--text-muted)' }} />
            Colleges List Management
          </div>
          <div className="section-sub">Add single colleges or upload a CSV to populate the registration form dropdowns.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ gap: 6 }}>
            <Plus size={14} /> Add Single College
          </button>

          <button onClick={downloadDemoCsv} className="btn btn-ghost" style={{ gap: 6 }}>
            <Download size={14} /> Demo CSV
          </button>
          
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button onClick={() => fileInputRef.current.click()} className="btn btn-ghost" style={{ gap: 6 }} disabled={isUploading}>
            <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {notification && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: notification.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          color: notification.type === 'error' ? 'var(--danger)' : 'var(--success)',
          border: `1px solid ${notification.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
        }}>
          {notification.msg}
        </div>
      )}

      {/* Main Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <List size={14} style={{ color: 'var(--text-muted)' }} />
            Currently Active Colleges ({filteredColleges.length} {search ? `of ${colleges.length}` : ''})
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search college name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: 8,
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none'
              }}
            />
          </div>
        </div>
        
        {filteredColleges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {colleges.length === 0 ? (
              <>
                No colleges added yet. Click <strong>"+ Add Single College"</strong> or upload a CSV to get started!
              </>
            ) : (
              <>No colleges matching "<strong>{search}</strong>"</>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, maxHeight: '600px', overflowY: 'auto', paddingRight: 4 }}>
            {filteredColleges.map(c => (
              <div key={c.id || c.name} style={{
                background: 'var(--surface-hover)',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8
              }}>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1
                }} title={c.name}>
                  {c.name}
                </span>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setEditingCollege(c);
                      setEditCollegeName(c.name);
                    }}
                    title="Edit College Name"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      borderRadius: 4,
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Pencil size={12} />
                  </button>

                  <button
                    onClick={() => handleDeleteCollege(c.id, c.name)}
                    title="Delete College"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      borderRadius: 4,
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add Single College */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color="#a855f7" />
                Add Single College
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Enter the official name of the college. Once added, it will immediately appear in registration dropdown suggestions for all students.
            </p>

            <form onSubmit={handleAddSingleCollege}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  College Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audisankara College of Engineering & Technology"
                  value={addCollegeName}
                  onChange={(e) => setAddCollegeName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isAdding}>
                  {isAdding ? 'Adding...' : 'Add College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit College Name */}
      {editingCollege && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="card" style={{ maxWidth: 440, width: '100%', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={16} color="#60a5fa" />
                Edit College Name
              </div>
              <button onClick={() => setEditingCollege(null)} className="btn btn-ghost" style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Updating this college name will automatically rename it in the Colleges Database and update all existing registered students & teams under this college.
            </p>

            <form onSubmit={handleEditCollege}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  College Name
                </label>
                <input
                  type="text"
                  required
                  value={editCollegeName}
                  onChange={(e) => setEditCollegeName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: 'var(--surface-hover)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setEditingCollege(null)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#3b82f6' }} disabled={isEditing}>
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
