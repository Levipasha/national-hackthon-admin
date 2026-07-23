import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Search, RefreshCw, Download, UserCheck, Filter, FileText, ChevronDown, Trash2, Check, X
} from 'lucide-react';
import { API } from '../api.js';

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Date Registered (Newest)' },
  { value: 'oldest', label: 'Date Registered (Oldest)' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

const normalizeCollegeName = (name) => {
  if (!name) return '';
  let cleaned = name.trim().replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/instuite/gi, 'Institute');
  cleaned = cleaned.replace(/instittue/gi, 'Institute');
  cleaned = cleaned.replace(/intstitute/gi, 'Institute');
  cleaned = cleaned.replace(/universty/gi, 'University');
  cleaned = cleaned.replace(/univercity/gi, 'University');
  return cleaned
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (['of', 'and', '&', 'for', 'in', 'at', 'the'].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export default function Members() {
  const { token } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /* ─── Fetch participants & stats ─── */
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
        // Derive unique normalized colleges
        const uniqueColleges = [...new Set(data.map(p => normalizeCollegeName(p.college)).filter(Boolean))].sort();
        setColleges(uniqueColleges);
      }
      const statsRes = await fetch(`${API}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
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
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paid') return p.paymentStatus === 'paid';
      if (statusFilter === 'submitted') return p.paymentStatus === 'submitted';
      if (statusFilter === 'unpaid') return !p.paymentStatus || p.paymentStatus === 'unpaid';
      if (statusFilter === 'rejected') return p.paymentStatus === 'rejected';
      if (statusFilter === 'checkedIn') return p.checkedIn;
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

          {/* Payment Status Filter */}
          <div style={{ position: 'relative' }}>
            <select
              className="input select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ paddingLeft: 10, paddingRight: 28, minWidth: 160 }}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="submitted">Pending Verification</option>
              <option value="unpaid">Unpaid</option>
              <option value="rejected">Rejected</option>
              <option value="checkedIn">Checked In</option>
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
                <th>Payment ID</th>
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
                    {p.paymentId ? (
                      <span style={{ color: '#a78bfa', fontWeight: 650 }}>{p.paymentId}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {p.paymentStatus === 'submitted' && (
                        <>
                          <button
                            onClick={() => verifyUtr(p.id, 'approve')}
                            title="Approve Payment"
                            style={{
                              background: '#22c55e',
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
                            <Check size={11} />Approve
                          </button>
                          <button
                            onClick={() => verifyUtr(p.id, 'reject')}
                            title="Reject Payment"
                            style={{
                              background: '#f59e0b',
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
                            <X size={11} />Reject
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

      {/* ── Printable PDF / Print Report Container ── */}
      <div className="printable-report" style={{ background: '#ffffff', color: '#000000', padding: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #000000', paddingBottom: 8 }}>
          <h1 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, textTransform: 'uppercase', color: '#000000' }}>
            CodeSprint 2026 — Comprehensive Registration & Analytics Report
          </h1>
          <div style={{ fontSize: 10, color: '#333333', marginTop: 4 }}>
            Generated on {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Total Filtered Records: {filtered.length}
          </div>
        </div>

        {/* SECTION 1: DAY-BY-DAY REGISTRATIONS */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #666666', paddingBottom: 3, color: '#000000' }}>
            Section 1: Day-by-Day Student Registrations Breakdown
          </h2>
          {stats?.liveRegistrationsGraph && stats.liveRegistrationsGraph.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Date</th>
                  <th style={{ width: '30%' }}>Registered Students Count</th>
                  <th>Visual Count Indicator</th>
                </tr>
              </thead>
              <tbody>
                {stats.liveRegistrationsGraph.map((item) => {
                  const maxVal = Math.max(...stats.liveRegistrationsGraph.map(d => d.count), 1);
                  const barWidth = Math.max((item.count / maxVal) * 100, item.count > 0 ? 8 : 0);
                  return (
                    <tr key={item.date}>
                      <td style={{ fontWeight: 'bold', color: '#000000' }}>{item.date}</td>
                      <td style={{ color: '#000000' }}>{item.count} Students</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="print-bar" style={{ height: 10, width: `${barWidth}%`, backgroundColor: item.count > 0 ? '#2563eb' : '#e5e7eb', borderRadius: 2 }} />
                          <span style={{ fontSize: 9, color: '#000000', fontWeight: 'bold' }}>{item.count}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 11, color: '#333333' }}>No registration date history recorded.</p>
          )}
        </div>

        {/* SECTION 2: COLLEGE-WISE DISTRIBUTION */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #666666', paddingBottom: 3, color: '#000000' }}>
            Section 2: College-wise Student Registration Distribution
          </h2>
          {stats?.collegeDistribution && Object.keys(stats.collegeDistribution).length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>#</th>
                  <th>College Name</th>
                  <th style={{ width: '30%' }}>Total Registered Students</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.collegeDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .map(([collegeName, count], idx) => (
                    <tr key={collegeName}>
                      <td style={{ color: '#000000' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold', color: '#000000' }}>{collegeName}</td>
                      <td style={{ color: '#000000' }}>{count} Students</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 11, color: '#333333' }}>No college breakdown available.</p>
          )}
        </div>

        {/* SECTION 3: SUCCESSFUL PARTICIPANTS LEDGER */}
        {(() => {
          const paidRecords = filtered.filter(p => p.paymentStatus === 'paid' || p.checkedIn);
          return (
            <div>
              <h2 style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, borderBottom: '1px solid #666666', paddingBottom: 3, color: '#000000' }}>
                Section 3: Successful Participant Registration Records ({paidRecords.length})
              </h2>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '13%' }}>Name</th>
                    <th style={{ width: '15%' }}>Email</th>
                    <th style={{ width: '9%' }}>Phone</th>
                    <th style={{ width: '16%' }}>College</th>
                    <th style={{ width: '13%' }}>Branch · Year</th>
                    <th style={{ width: '8%' }}>Team</th>
                    <th style={{ width: '5%' }}>Size</th>
                    <th style={{ width: '6%' }}>Amount</th>
                    <th style={{ width: '5%' }}>Status</th>
                    <th style={{ width: '11%' }}>Payment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {paidRecords.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ color: '#000000' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold', color: '#000000' }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '8.5px', color: '#000000' }}>{p.email}</td>
                      <td style={{ color: '#000000' }}>{p.phone}</td>
                      <td style={{ color: '#000000' }}>{p.college}</td>
                      <td style={{ color: '#000000' }}>{p.branch} · {p.year}</td>
                      <td style={{ color: '#000000' }}>{p.teamName || '—'}</td>
                      <td style={{ color: '#000000' }}>{p.tshirtSize || '—'}</td>
                      <td style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#000000' }}>₹{p.amountPaid || p.expectedAmount || 0}</td>
                      <td>
                        <span className="print-badge-paid">
                          {p.paymentStatus || 'paid'}
                        </span>
                      </td>
                      <td className="print-payment-id" style={{ fontFamily: 'monospace', fontSize: '8px' }}>
                        {p.paymentId || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
