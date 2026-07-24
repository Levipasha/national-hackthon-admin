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
      <div className="printable-report" style={{ background: '#ffffff', color: '#000000', padding: '10px', fontFamily: 'sans-serif' }}>
        {(() => {
          // Helper to map college names to locations
          const getCollegeLocation = (collegeName) => {
            const name = (collegeName || '').toLowerCase().trim();
            if (name.includes('audisankara')) return 'Nellore';
            if (name.includes('srm')) return 'Chennai';
            if (name.includes('narayana')) return 'Nellore';
            if (name.includes('study world')) return 'Coimbatore';
            if (name.includes('nbkrist')) return 'Tirupati';
            if (name.includes('vellore') || name.includes('vit')) return 'Tamil Nadu';
            if (name.includes('gudlavalleru')) return 'Gudlavalleru';
            if (name.includes('lbrce') || name.includes('lakireddy')) return 'Mylavaram';
            return 'Nellore'; // Default or fallback
          };

          // Helper to format date
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length < 3) return dateStr;
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          };

          // 1. Calculate Daily Stats
          const dailyMap = {};
          filtered.forEach(p => {
            const dateKey = p.createdAt ? p.createdAt.split('T')[0] : 'Unknown';
            if (dateKey === 'Unknown') return;
            if (!dailyMap[dateKey]) {
              dailyMap[dateKey] = { students: 0, teams: 0 };
            }
            dailyMap[dateKey].students += 1;
            if (p.role === 'team-leader') {
              dailyMap[dateKey].teams += 1;
            }
          });
          
          const sortedDates = Object.keys(dailyMap).sort();
          const totalStudents = filtered.length;
          const totalTeams = filtered.filter(p => p.role === 'team-leader').length;

          // 2. Calculate College Stats
          const collegeMap = {};
          filtered.forEach(p => {
            if (p.college) {
              const name = p.college.trim();
              collegeMap[name] = (collegeMap[name] || 0) + 1;
            }
          });
          const collegeRows = Object.entries(collegeMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
              name,
              location: getCollegeLocation(name),
              count
            }));

          // 3. Calculate Year Stats
          const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
          const yearCounts = years.map(y => {
            const count = filtered.filter(p => (p.year || '').toLowerCase().includes(y.toLowerCase())).length;
            return { label: y, count };
          });

          // Style definitions
          const tableStyle = {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px',
            background: '#fff',
            marginTop: '10px'
          };
          const thStyle = {
            border: '1px solid #333',
            padding: '8px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
            backgroundColor: '#fff',
            color: '#000',
            textAlign: 'center'
          };
          const tdStyle = {
            border: '1px solid #333',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#000',
            textAlign: 'center'
          };
          const tdLeftStyle = {
            ...tdStyle,
            textAlign: 'left'
          };
          const totalRowStyle = {
            fontWeight: 'bold',
            backgroundColor: '#fff'
          };

          return (
            <div>
              {/* Header */}
              <div style={{ position: 'relative', textAlign: 'center', marginBottom: '25px', paddingBottom: '10px' }}>
                <h1 style={{ color: '#800000', fontSize: '24px', fontWeight: 'bold', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  CODESPRINT HACKATHON - DASHBOARD
                </h1>
                <div style={{ color: '#002080', fontSize: '12px', fontWeight: 'bold', textAlign: 'right', marginTop: '6px', paddingRight: '5px' }}>
                  Audisankara (Deemed to be University)
                </div>
              </div>

              {/* Bar Chart Container */}
              <div style={{ border: '1px solid #444', padding: '30px 40px 20px 40px', marginBottom: '25px', background: '#fff', height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', height: '180px', position: 'relative', borderLeft: '1px solid #444', borderBottom: '1px solid #444', width: '100%' }}>
                  {/* Y-Axis Grid Lines & Labels */}
                  {[0, 5, 10, 15, 20].map(val => {
                    const bottomPercent = (val / 20) * 100;
                    return (
                      <div key={val} style={{ position: 'absolute', bottom: `${bottomPercent}%`, left: -25, right: 0, borderBottom: val === 0 ? 'none' : '1px dashed #ccc', height: 0, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#333', marginRight: '8px', width: '15px', textAlign: 'right', fontFamily: 'sans-serif' }}>{val}</span>
                      </div>
                    );
                  })}
                  
                  {/* Bars Container */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', width: '100%', height: '100%', zIndex: 10, paddingLeft: '15px', paddingRight: '15px' }}>
                    {sortedDates.map(date => {
                      const val = dailyMap[date].students;
                      return (
                        <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ 
                            height: val > 0 ? `${(val/20)*100}%` : '0%', 
                            width: '35px', 
                            backgroundColor: '#3b82f6', 
                            border: '1px solid #2563eb',
                            display: 'flex', 
                            alignItems: 'flex-end', 
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            paddingBottom: '4px',
                            minHeight: val > 0 ? '12px' : '0px'
                          }}>
                            {val > 0 && val}
                          </div>
                          <span style={{ fontSize: '10px', color: '#000', marginTop: '6px', fontWeight: 500, fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                            {formatDate(date)}
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* TOTAL Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ 
                        height: `${(totalStudents/20)*100}%`, 
                        width: '35px', 
                        backgroundColor: '#3b82f6', 
                        border: '1px solid #2563eb',
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        paddingBottom: '4px'
                      }}>
                        {totalStudents}
                      </div>
                      <span style={{ fontSize: '10px', color: '#000', marginTop: '6px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                        TOTAL
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table 1: Daily Breakdown */}
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Team Registration</th>
                    <th style={thStyle}>Student Registration</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map(date => (
                    <tr key={date}>
                      <td style={tdStyle}>{formatDate(date)}</td>
                      <td style={tdStyle}>{dailyMap[date].teams}</td>
                      <td style={tdStyle}>{dailyMap[date].students}</td>
                    </tr>
                  ))}
                  <tr style={totalRowStyle}>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalTeams}</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalStudents}</td>
                  </tr>
                </tbody>
              </table>

              {/* Table 2: College breakdown */}
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'left' }}>College Name</th>
                    <th style={thStyle}>Location</th>
                    <th style={thStyle}>Student Count</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeRows.map((c, i) => (
                    <tr key={i}>
                      <td style={tdLeftStyle}>{c.name}</td>
                      <td style={tdStyle}>{c.location}</td>
                      <td style={tdStyle}>{c.count}</td>
                    </tr>
                  ))}
                  <tr style={totalRowStyle}>
                    <td style={{ ...tdLeftStyle, fontWeight: 'bold' }} colSpan={2}>TOTAL</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalStudents}</td>
                  </tr>
                </tbody>
              </table>

              {/* Table 3: Year-wise breakdown */}
              <table style={{ ...tableStyle, width: '50%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Year wise Registration</th>
                    <th style={thStyle}>Student Count</th>
                  </tr>
                </thead>
                <tbody>
                  {yearCounts.map((y, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{y.label}</td>
                      <td style={tdStyle}>{y.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* SECTION 4: PARTICIPANTS LEDGER (ALL INDIVIDUAL RECORDS) */}
              <h2 style={{ fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginTop: '30px', marginBottom: '6px', borderBottom: '1px solid #666666', paddingBottom: '3px', color: '#000000' }}>
                Section 4: Participant Registration Records ({totalStudents})
              </h2>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '4%' }}>#</th>
                    <th style={{ ...thStyle, width: '13%' }}>Name</th>
                    <th style={{ ...thStyle, width: '15%' }}>Email</th>
                    <th style={{ ...thStyle, width: '9%' }}>Phone</th>
                    <th style={{ ...thStyle, width: '16%' }}>College</th>
                    <th style={{ ...thStyle, width: '13%' }}>Branch · Year</th>
                    <th style={{ ...thStyle, width: '8%' }}>Team</th>
                    <th style={{ ...thStyle, width: '5%' }}>Size</th>
                    <th style={{ ...thStyle, width: '6%' }}>Amount</th>
                    <th style={{ ...thStyle, width: '5%' }}>Status</th>
                    <th style={{ ...thStyle, width: '11%' }}>Payment ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{ ...tdLeftStyle, fontWeight: 'bold' }}>{p.name}</td>
                      <td style={{ ...tdLeftStyle, fontFamily: 'monospace', fontSize: '8.5px' }}>{p.email}</td>
                      <td style={tdStyle}>{p.phone}</td>
                      <td style={tdLeftStyle}>{p.college}</td>
                      <td style={tdLeftStyle}>{p.branch} · {p.year}</td>
                      <td style={tdStyle}>{p.teamName || '—'}</td>
                      <td style={tdStyle}>{p.tshirtSize || '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', fontFamily: 'monospace' }}>₹{p.amountPaid || p.expectedAmount || 0}</td>
                      <td style={tdStyle}>
                        <span style={(() => {
                          if (p.checkedIn) return { color: '#16a34a', fontWeight: 'bold', fontSize: '8px' };
                          if (p.paymentStatus === 'paid') return { color: '#16a34a', fontWeight: 'bold', fontSize: '8px' };
                          if (p.paymentStatus === 'submitted') return { color: '#2563eb', fontWeight: 'bold', fontSize: '8px' };
                          if (p.paymentStatus === 'rejected') return { color: '#dc2626', fontWeight: 'bold', fontSize: '8px' };
                          return { color: '#6b7280', fontWeight: 'bold', fontSize: '8px' };
                        })()}>
                          {p.checkedIn ? 'Checked In' : (p.paymentStatus ? p.paymentStatus.toUpperCase() : 'UNPAID')}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '8px' }}>
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
