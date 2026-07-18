import React, { useState, useEffect, useRef } from 'react';
import { School, Upload, Download, Trash2, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

export default function Colleges() {
  const { token } = useAuth();
  const [colleges, setColleges] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

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
    setTimeout(() => setNotification(null), 3000);
  };

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

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <School size={18} style={{ color: 'var(--text-muted)' }} />
            Colleges List Management
          </div>
          <div className="section-sub">Upload a CSV to populate the dropdown on the Registration Form</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
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
          <button onClick={() => fileInputRef.current.click()} className="btn btn-primary" style={{ gap: 6 }} disabled={isUploading}>
            <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload CSV'}
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

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <List size={14} style={{ color: 'var(--text-muted)' }} />
          Currently Active Colleges ({colleges.length})
        </div>
        
        {colleges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No colleges uploaded yet. The registration form will use a standard text input.
            <br />
            Upload a CSV to enable the dropdown menu!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
            {colleges.map(c => (
              <div key={c.id} style={{
                background: 'var(--surface-hover)',
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={c.name}>
                {c.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
