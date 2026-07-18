import React, { useState, useEffect, useRef } from 'react';
import { Target, Plus, Trash2, Edit2, X, Users, Send, Upload, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

export default function ProblemStatements() {
  const { token } = useAuth();
  const [problems, setProblems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', visibleFrom: '', visibleTo: '' });
  
  const [showDistribute, setShowDistribute] = useState(false);
  const [distributeMode, setDistributeMode] = useState('all');
  const fileInputRef = useRef(null);
  const [csvFile, setCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef(null);
  
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const res = await fetch(`${API}/api/problem-statements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProblems(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const downloadDemoCsv = () => {
    const csvData = `Title,Description,VisibleFrom,VisibleTo
Smart Traffic Management,Develop an AI system to optimize traffic lights.,2026-08-01T09:00:00Z,2026-08-02T09:00:00Z
Healthcare Chatbot,Build a chatbot for preliminary diagnosis.,,
E-Waste Classifier,Create an image classifier for e-waste.,,
`;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demo_problem_statements.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvContent = event.target.result;
      try {
        const res = await fetch(`${API}/api/admin/problem-statements/upload`, {
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
          fetchProblems();
        } else {
          showNotification(data.message || 'Upload failed', 'error');
        }
      } catch (error) {
        showNotification('Connection error', 'error');
      } finally {
        setIsUploading(false);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API}/api/admin/problem-statements/${editingId}` : `${API}/api/admin/problem-statements`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showNotification(editingId ? 'Problem Statement updated!' : 'Problem Statement created!');
        fetchProblems();
        closeForm();
      } else {
        showNotification('Failed to save', 'error');
      }
    } catch (error) {
      showNotification('Error saving', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this problem statement?')) return;
    try {
      const res = await fetch(`${API}/api/admin/problem-statements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('Deleted successfully');
        fetchProblems();
      }
    } catch (error) {
      showNotification('Error deleting', 'error');
    }
  };

  const openForm = (p = null) => {
    if (p) {
      setEditingId(p.id);
      // Format dates for datetime-local input
      const from = p.visibleFrom ? new Date(p.visibleFrom).toISOString().slice(0, 16) : '';
      const to = p.visibleTo ? new Date(p.visibleTo).toISOString().slice(0, 16) : '';
      setForm({ title: p.title, description: p.description, visibleFrom: from, visibleTo: to });
    } else {
      setEditingId(null);
      setForm({ title: '', description: '', visibleFrom: '', visibleTo: '' });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleDistribute = async () => {
    if (distributeMode === 'csv' && !csvFile) {
      return showNotification('Please select a CSV file first', 'error');
    }

    try {
      let mapping = [];
      if (distributeMode === 'csv') {
        const text = await csvFile.text();
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        // Skip header if exists
        if (lines[0].toLowerCase().includes('team')) lines.shift();
        
        mapping = lines.map(l => {
          const parts = l.split(',');
          return { teamId: parts[0].trim(), problemId: parts[1].trim() };
        }).filter(m => m.teamId && m.problemId);
      }

      const res = await fetch(`${API}/api/admin/problem-statements/distribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode: distributeMode, mapping })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(data.message);
        setShowDistribute(false);
        setCsvFile(null);
        fetchProblems();
      } else {
        showNotification(data.message || 'Distribution failed', 'error');
      }
    } catch (e) {
      showNotification('Error during distribution', 'error');
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--text-muted)' }} />
            Problem Statements
          </div>
          <div className="section-sub">Manage statements and their visibility windows for the student dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowDistribute(true)} className="btn btn-ghost" style={{ gap: 6 }}>
            <Send size={14} /> Distribute
          </button>
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            ref={uploadInputRef}
            onChange={handleFileUpload}
          />
          <button onClick={() => uploadInputRef.current.click()} className="btn btn-secondary" style={{ gap: 6 }} disabled={isUploading}>
            <Upload size={14} /> {isUploading ? 'Uploading...' : 'Bulk CSV'}
          </button>
          <button onClick={downloadDemoCsv} className="btn btn-ghost" style={{ gap: 6 }}>
            <Download size={14} /> Demo CSV
          </button>
          <button onClick={() => openForm()} className="btn btn-primary" style={{ gap: 6 }}>
            <Plus size={14} /> Add Statement
          </button>
        </div>
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

      {showDistribute && (
        <div className="card" style={{ marginBottom: 20, position: 'relative', border: '1px solid var(--border)' }}>
          <button onClick={() => setShowDistribute(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} className="text-purple-600" />
            Distribute Problem Statements
          </div>
          
          <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="dmode" checked={distributeMode === 'all'} onChange={() => setDistributeMode('all')} />
              Send all statements to all teams
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="dmode" checked={distributeMode === 'csv'} onChange={() => setDistributeMode('csv')} />
              Bulk CSV Random Distribution
            </label>
          </div>

          {distributeMode === 'csv' && (
            <div style={{ marginBottom: 15, padding: 12, background: 'var(--surface-hover)', borderRadius: 6, border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Upload a CSV with two columns: <strong>TeamID, ProblemID</strong> (no headers required, but first row ignored if it contains "Team").
              </div>
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} style={{ fontSize: 12 }} />
            </div>
          )}

          <button onClick={handleDistribute} className="btn btn-primary" style={{ gap: 6 }}>
            Confirm Distribution
          </button>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20, position: 'relative' }}>
          <button onClick={closeForm} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
            {editingId ? 'Edit Problem Statement' : 'Add Problem Statement'}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="label">Title</label>
              <input required className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Smart Traffic Management" />
            </div>
            <div className="input-group">
              <label className="label">Description / Details</label>
              <textarea required className="input" rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Full problem statement description..."></textarea>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="label">Visible From</label>
                <input required type="datetime-local" className="input" value={form.visibleFrom} onChange={e => setForm({...form, visibleFrom: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="label">Visible To</label>
                <input required type="datetime-local" className="input" value={form.visibleTo} onChange={e => setForm({...form, visibleTo: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 10 }}>
              {editingId ? 'Save Changes' : 'Create Statement'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {problems.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No problem statements created yet.
          </div>
        )}
        
        {problems.map(p => {
          const now = new Date();
          const from = new Date(p.visibleFrom);
          const to = new Date(p.visibleTo);
          let status = 'Inactive';
          let sColor = '#ef4444';
          
          if (now >= from && now <= to) {
            status = 'Active Now';
            sColor = '#22c55e';
          } else if (now < from) {
            status = 'Scheduled';
            sColor = '#f59e0b';
          }

          return (
            <div key={p.id} className="card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                <button onClick={() => openForm(p)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: `${sColor}15`, color: sColor }}>
                  {status}
                </div>
              </div>
              
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {p.description}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, background: 'var(--surface-hover)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Problem ID</div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{p.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Window</div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    {new Date(p.visibleFrom).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} - {new Date(p.visibleTo).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Assigned Teams</div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {p.assignedTo ? p.assignedTo.length : 0} Teams
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
