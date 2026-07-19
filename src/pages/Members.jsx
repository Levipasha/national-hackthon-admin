import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Search, RefreshCw, Download, UserCheck, Filter, FileText, ChevronDown, Trash2
} from 'lucide-react';
import { API } from '../api.js';

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Date Registered (Newest)' },
  { value: 'oldest', label: 'Date Registered (Oldest)' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

export default function Members() {
  const { token } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /* ─── Fetch participants ─── */
  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/admin/participants?search=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
        // Derive unique colleges
        const uniqueColleges = [...new Set(data.map(p => p.college).filter(Boolean))].sort();
        setColleges(uniqueColleges);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, search]);

  useEffect(() => {
    if (token) {
      const timeout = setTimeout(fetchParticipants, 350);
      return () => clearTimeout(timeout);
    }
  }, [token, search, fetchParticipants]);

  /* ─── Export CSV ─── */
  const exportCSV = () => {
    fetch(`${API}/api/admin/export-csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registrations_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('CSV Exported successfully!');
      });
  };

  /* ─── Export PDF (print) ─── */
  const exportPDF = () => window.print();

  /* ─── Manual check-in ─── */
  const checkIn = async (userId) => {
    try {
      const res = await fetch(`${API}/api/admin/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchParticipants();
        showNotification('Participant checked in!');
      } else {
        showNotification('Check-in failed.', 'error');
      }
    } catch (e) { console.error(e); showNotification('Check-in error.', 'error'); }
  };

  /* ─── Verify UTR Payment Request ─── */
  const verifyUtr = async (userId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this payment request?`)) return;
    try {
      const res = await fetch(`${API}/api/admin/verify-utr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });
      if (res.ok) {
        fetchParticipants();
        showNotification(`Payment successfully ${action}d!`);
      } else {
        const errData = await res.json();
        showNotification(errData.message || 'Verification update failed.', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Verification update error.', 'error');
    }
  };

  /* ─── Delete participant ─── */
  const deleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete participant "${name}"? This action is permanent and will remove them from the database.`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/api/admin/participants/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchParticipants();
        showNotification(`Participant "${name}" deleted successfully.`);
      } else {
        const errData = await res.json();
        showNotification(errData.message || 'Deletion failed.', 'error');
      }
    } catch (e) { console.error(e); showNotification('Deletion error.', 'error'); }
  };

  /* ─── Impersonate User / Open Dashboard ─── */
  const impersonateUser = async (userId) => {
    try {
      const res = await fetch(`${API}/api/admin/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const { token: userToken } = await res.json();
        // Open user dashboard in a new tab pointing to the client app (port 3000)
        const clientUrl = window.location.protocol + '//' + window.location.hostname + ':3000';
        window.open(`${clientUrl}/login?token=${userToken}`, '_blank');
      } else {
        showNotification('Failed to generate user login session.', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Error launching user dashboard.', 'error');
    }
  };

  /* ─── Filtering & Sorting ─── */
  const filtered = participants
    .filter(p => {
      if (statusFilter === 'paid')      return p.paymentStatus === 'paid';
      if (statusFilter === 'submitted') return p.paymentStatus === 'submitted';
      if (statusFilter === 'rejected')  return p.paymentStatus === 'rejected';
      if (statusFilter === 'unpaid')    return p.paymentStatus !== 'paid';
      if (statusFilter === 'checkedin') return p.checkedIn;
      return true;
    })
    .filter(p => collegeFilter === 'all' || p.college === collegeFilter)
    .filter(p => sizeFilter === 'all' || p.tshirtSize === sizeFilter)
    .filter(p => {
      if (typeFilter === 'teams') return !!p.teamName;
      if (typeFilter === 'individual') return !p.teamName;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      return 0;
    });

  const statusBadge = (p) => {
    if (p.checkedIn)                    return <span className="badge badge-success">Checked In</span>;
    if (p.paymentStatus === 'paid')     return <span className="badge badge-warning">Paid</span>;
    if (p.paymentStatus === 'submitted') return <span className="badge badge-info" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>Pending Verification</span>;
    if (p.paymentStatus === 'rejected')  return <span className="badge badge-danger" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Rejected</span>;
    return                                     <span className="badge badge-danger">Unpaid</span>;
  };

  const sizeBadge = (size) => {
    if (!size) return <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>;
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
        background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)', fontFamily: 'JetBrains Mono, monospace'
      }}>
        {size}
      </span>
    );
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--text-muted)' }} />
            Registrations Ledger
          </div>
          <div className="section-sub">
            Review pending student enrollments, manage approvals, and export conference rosters.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchParticipants} disabled={loading}>
            <RefreshCw size={13} />Refresh
          </button>
          <button className="btn btn-ghost" onClick={exportCSV} title="Export CSV">
            <Download size={13} />Export CSV
          </button>
          <button className="btn btn-ghost" onClick={exportPDF} title="Export PDF" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <FileText size={13} />Export PDF
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

      {/* ── Search + Filters ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        {/* Search bar */}
        <div className="search-wrap" style={{ marginBottom: 14 }}>
          <Search size={13} />
          <input
            className="input"
            placeholder="Search by Team Name or Registrant Email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter dropdowns row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status */}
          <div style={{ position: 'relative' }}>
            <select
              className="input select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 130 }}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="submitted">Pending Verification</option>
              <option value="rejected">Rejected</option>
              <option value="unpaid">Unpaid</option>
              <option value="checkedin">Checked In</option>
            </select>
          </div>

          {/* College */}
          <div style={{ position: 'relative' }}>
            <select
              className="input select"
              value={collegeFilter}
              onChange={e => setCollegeFilter(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 150 }}
            >
              <option value="all">All Colleges</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* T-shirt size */}
          <div style={{ position: 'relative' }}>
            <select
              className="input select"
              value={sizeFilter}
              onChange={e => setSizeFilter(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 120 }}
            >
              <option value="all">All Sizes</option>
              {ALL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Registration Type */}
          <div style={{ position: 'relative' }}>
            <select
              className="input select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 130 }}
            >
              <option value="all">All Types</option>
              <option value="teams">Teams</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {/* Sort */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>SORT BY:</span>
            <select
              className="input select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 200 }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Result count */}
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-secondary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-secondary)' }}>{participants.length}</strong> registrations
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="loading-center"><div className="spinner" />Loading registrations…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Filter size={40} />
          <h3>No Registrations Found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>College</th>
                <th>Branch · Year</th>
                <th>Team</th>
                <th>T-Shirt</th>
                <th>Amount</th>
                <th>Status</th>
                <th>UTR Number</th>
                <th>Check-In</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div 
                      onClick={() => impersonateUser(p.id)}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      style={{ 
                        fontWeight: 600, 
                        color: 'var(--text-primary)', 
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                      title="Click to view user dashboard"
                    >
                      {p.name}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.email}</td>
                  <td>{p.phone}</td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.college}</td>
                  <td>{p.branch} · {p.year}</td>
                  <td>
                    {p.teamName
                      ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-secondary)' }}>{p.teamName}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>}
                  </td>
                  <td>{sizeBadge(p.tshirtSize)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.amountPaid ? `₹${p.amountPaid}` : (p.expectedAmount ? `₹${p.expectedAmount}` : '—')}
                  </td>
                  <td>{statusBadge(p)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    {p.utr ? (
                      <span style={{ color: '#a78bfa', fontWeight: 650 }}>{p.utr}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {!p.checkedIn && p.paymentStatus === 'paid' ? (
                      <button className="btn btn-success btn-sm" onClick={() => checkIn(p.id)}>
                        <UserCheck size={11} />Check In
                      </button>
                    ) : p.checkedIn ? (
                      <span style={{ fontSize: 10, color: 'var(--success)' }}>✓ Done</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Unpaid</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {p.paymentStatus === 'submitted' && (
                        <>
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => verifyUtr(p.id, 'approve')}
                            style={{ 
                              background: '#22c55e', 
                              color: '#fff', 
                              border: 'none', 
                              padding: '4px 8px', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 10,
                              fontWeight: 650
                            }}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => verifyUtr(p.id, 'reject')}
                            style={{ 
                              background: '#f97316', 
                              color: '#fff', 
                              border: 'none', 
                              padding: '4px 8px', 
                              borderRadius: 4, 
                              cursor: 'pointer', 
                              fontSize: 10,
                              fontWeight: 655
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => deleteUser(p.id, p.name)}
                        style={{ 
                          background: '#ef4444', 
                          color: '#fff', 
                          border: 'none', 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 4, 
                          cursor: 'pointer', 
                          fontSize: 10,
                          fontWeight: 600
                        }}
                      >
                        <Trash2 size={11} />Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .sidebar, .topbar, .section-header .btn, .btn { display: none !important; }
          .page-body { padding: 0 !important; }
          .card { border: 1px solid #ddd !important; box-shadow: none !important; }
          body { background: white !important; color: black !important; }
          table th, table td { color: black !important; border-color: #ccc !important; }
          .table-wrap { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
