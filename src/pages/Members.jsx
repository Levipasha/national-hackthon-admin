import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Search, RefreshCw, Download, UserCheck, Filter, FileText, ChevronDown, Trash2, Check, X,
  UserPlus, Users, Plus, Minus, Pencil
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

const BLANK_INDIVIDUAL = { name: '', email: '', phone: '', college: '', branch: '', year: '', gender: 'Male', paymentStatus: 'paid', amountPaid: 500 };
const BLANK_MEMBER = { name: '', email: '' };
const BLANK_TEAM = { teamName: '', college: '', branch: '', year: '', description: '', paymentStatus: 'paid', amountPaid: 500, leader: { name: '', email: '', phone: '' }, members: [{ name: '', email: '' }] };

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

  // ── Add Registration State ─────────────────────────────
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [indForm, setIndForm] = useState(BLANK_INDIVIDUAL);
  const [teamForm, setTeamForm] = useState(BLANK_TEAM);
  const [submitting, setSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // ── Edit User State ────────────────────────────────────
  const [editUser, setEditUser] = useState(null); // holds the user being edited
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

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
        const cleanData = (Array.isArray(data) ? data : []).filter(p => p && !p.hidden && p.email?.toLowerCase() !== 'vamshi.c2002@gmail.com');
        setParticipants(cleanData);
        // Derive unique normalized colleges
        const uniqueColleges = [...new Set(cleanData.map(p => normalizeCollegeName(p.college)).filter(Boolean))].sort();
        setColleges(uniqueColleges);
      }
      let statsRes = await fetch(`${API}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => null);
      if (!statsRes || !statsRes.ok) {
        statsRes = await fetch(`${API}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
      }
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json().catch(() => null);
        if (statsData) setStats(statsData);
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
  const exportCSV = async () => {
    try {
      const res = await fetch(`${API}/api/admin/export-csv`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('CSV Exported successfully!');
    } catch (e) {
      console.error('Export CSV error:', e);
      // Fallback: Client-side generation from participants array if API fails
      if (participants && participants.length > 0) {
        try {
          const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
          let maleCount = 0;
          let femaleCount = 0;
          let otherGenderCount = 0;
          participants.forEach(p => {
            const g = (p.gender || '').toLowerCase().trim();
            if (g === 'male' || g === 'm') maleCount++;
            else if (g === 'female' || g === 'f') femaleCount++;
            else otherGenderCount++;
          });
          const totalP = participants.length;
          const malePct = totalP ? ((maleCount / totalP) * 100).toFixed(1) : '0';
          const femalePct = totalP ? ((femaleCount / totalP) * 100).toFixed(1) : '0';
          const otherPct = totalP ? ((otherGenderCount / totalP) * 100).toFixed(1) : '0';

          const headers = ['ID', 'Name', 'Email', 'Phone', 'College', 'Branch', 'Year', 'Gender', 'TshirtSize', 'TeamName', 'PaymentStatus', 'AmountPaid', 'RegistrationDate'];
          const rows = participants.map(p => [
            esc(p.id), esc(p.name), esc(p.email), esc(p.phone), esc(p.college),
            esc(p.branch), esc(p.year), esc(p.gender), esc(p.tshirtSize),
            esc(p.teamName || ''), esc(p.paymentStatus), esc(p.amountPaid ?? 0), esc(p.createdAt)
          ].join(','));

          const summaryLines = [
            `================================================================================`,
            `CODESPRINT 2026 — REGISTRATION REPORT`,
            `Total Registrations: ${totalP}`,
            `Male Participants: ${maleCount} (${malePct}%)`,
            `Female Participants: ${femaleCount} (${femalePct}%)`,
            `Other / Unspecified: ${otherGenderCount} (${otherPct}%)`,
            `================================================================================\n`,
            `=== GENDER DEMOGRAPHICS BREAKDOWN ===`,
            `Gender,Student Count,Percentage`,
            `Male,${maleCount},${malePct}%`,
            `Female,${femaleCount},${femalePct}%`,
            `Other / Unspecified,${otherGenderCount},${otherPct}%\n`,
            `=== PARTICIPANT RECORDS ===`,
            headers.join(','),
            ...rows
          ].join('\n');

          const blob = new Blob([summaryLines], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `registrations_report_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showNotification('CSV Exported successfully (from current view)!');
          return;
        } catch (clientErr) {
          console.error('Client CSV export error:', clientErr);
        }
      }
      showNotification(e.message || 'Failed to export CSV.', 'error');
    }
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

  /* ─── Add Registration Handlers ─── */
  const addIndividual = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/admin/add-registration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'individual', individual: indForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowIndividualModal(false);
        setIndForm(BLANK_INDIVIDUAL);
        fetchParticipants();
        showNotification('Individual participant added successfully!');
      } else {
        showNotification(data.message || 'Failed to add participant.', 'error');
      }
    } catch (e) { showNotification('Network error.', 'error'); }
    finally { setSubmitting(false); }
  };

  const addTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/admin/add-registration`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'team', team: teamForm })
      });
      const data = await res.json();
      if (res.ok) {
        setShowTeamModal(false);
        setTeamForm(BLANK_TEAM);
        fetchParticipants();
        showNotification(data.message || 'Team added successfully!');
      } else {
        showNotification(data.message || 'Failed to add team.', 'error');
      }
    } catch (e) { showNotification('Network error.', 'error'); }
    finally { setSubmitting(false); }
  };

  /* ─── Edit User Handlers ─── */
  const openEdit = (participant) => {
    setEditUser(participant);
    setEditForm({
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      college: participant.college || '',
      branch: participant.branch || '',
      year: participant.year || '',
      gender: participant.gender || 'Not Specified',
      linkedin: participant.linkedin || '',
      paymentStatus: participant.paymentStatus || 'paid',
      amountPaid: participant.amountPaid ?? 500,
      role: participant.role || 'participant',
      tshirtSize: participant.tshirtSize || '',
      foodPreference: participant.foodPreference || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`${API}/api/admin/participants/${editUser.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditUser(null);
        fetchParticipants();
        showNotification(`${data.user?.name || 'User'} updated successfully!`);
      } else {
        showNotification(data.message || 'Update failed.', 'error');
      }
    } catch (e) { showNotification('Network error.', 'error'); }
    finally { setEditSubmitting(false); }
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
    <>
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={fetchParticipants} disabled={loading}>
            <RefreshCw size={13} />Refresh
          </button>
          <button className="btn btn-ghost" onClick={exportCSV} title="Export CSV">
            <Download size={13} />Export CSV
          </button>
          <button className="btn btn-ghost" onClick={exportPDF} title="Export PDF" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <FileText size={13} />Export PDF
          </button>

          {/* ── Add Button with Dropdown ── */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setAddDropdownOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                transition: 'opacity 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={13} /> Add
              <ChevronDown size={11} style={{ marginLeft: 2, transition: 'transform 0.2s', transform: addDropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {addDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--card-bg, #18181b)', border: '1px solid var(--border, #27272a)',
                borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                minWidth: 180, zIndex: 9999, overflow: 'hidden'
              }}>
                <button
                  onClick={() => { setAddDropdownOpen(false); setShowIndividualModal(true); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', background: 'transparent', border: 'none',
                    color: 'var(--text-primary, #f4f4f5)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    borderBottom: '1px solid var(--border, #27272a)', textAlign: 'left',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <UserPlus size={14} style={{ color: '#6366f1' }} />
                  Add Individual
                </button>
                <button
                  onClick={() => { setAddDropdownOpen(false); setShowTeamModal(true); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', background: 'transparent', border: 'none',
                    color: 'var(--text-primary, #f4f4f5)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    textAlign: 'left', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Users size={14} style={{ color: '#8b5cf6' }} />
                  Add Team
                </button>
              </div>
            )}
          </div>
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
                      {/* Edit Button */}
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit participant"
                        style={{
                          background: 'rgba(99,102,241,0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          fontSize: 10,
                          fontWeight: 600,
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                      >
                        <Pencil size={11} />Edit
                      </button>
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
          // Helper to format date
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length < 3) return dateStr;
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          };

          const safeGetDateKey = (val) => {
            if (!val) return 'Unknown';
            if (typeof val === 'string') return val.split('T')[0] || val;
            if (val instanceof Date) return val.toISOString().split('T')[0];
            try { return new Date(val).toISOString().split('T')[0]; } catch (e) { return 'Unknown'; }
          };

          // 1. Calculate Daily Stats
          const dailyMap = {};
          filtered.forEach(p => {
            const dateKey = safeGetDateKey(p.createdAt);
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
              count
            }));

          // 3. Calculate Year Stats
          const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
          const yearCounts = years.map(y => {
            const count = filtered.filter(p => (p.year || '').toLowerCase().includes(y.toLowerCase())).length;
            return { label: y, count };
          });

          // 4. Calculate Gender Stats
          let maleCount = 0;
          let femaleCount = 0;
          let otherGenderCount = 0;
          filtered.forEach(p => {
            const g = (p.gender || '').toLowerCase().trim();
            if (g === 'male' || g === 'm') maleCount++;
            else if (g === 'female' || g === 'f') femaleCount++;
            else otherGenderCount++;
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

              {/* Demographics Metrics Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '20px', fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>
                <span>Total Registrations: {totalStudents}</span>
                <span style={{ color: '#2563eb' }}>Male: {maleCount} ({totalStudents ? ((maleCount / totalStudents) * 100).toFixed(1) : 0}%)</span>
                <span style={{ color: '#ec4899' }}>Female: {femaleCount} ({totalStudents ? ((femaleCount / totalStudents) * 100).toFixed(1) : 0}%)</span>
                {otherGenderCount > 0 && <span>Other / Unspecified: {otherGenderCount}</span>}
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
                    <th style={thStyle}>Student Count</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeRows.map((c, i) => (
                    <tr key={i}>
                      <td style={tdLeftStyle}>{c.name}</td>
                      <td style={tdStyle}>{c.count}</td>
                    </tr>
                  ))}
                  <tr style={totalRowStyle}>
                    <td style={{ ...tdLeftStyle, fontWeight: 'bold' }}>TOTAL</td>
                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalStudents}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tables 3 & 4: Year-wise & Gender Demographics Breakdown */}
              <div style={{ display: 'flex', gap: '20px', width: '100%', marginBottom: '20px' }}>
                <table style={{ ...tableStyle, flex: 1, marginBottom: 0, marginTop: 0 }}>
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

                <table style={{ ...tableStyle, flex: 1, marginBottom: 0, marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Gender Breakdown</th>
                      <th style={thStyle}>Student Count</th>
                      <th style={thStyle}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tdStyle}>Male</td>
                      <td style={tdStyle}>{maleCount}</td>
                      <td style={tdStyle}>{totalStudents ? ((maleCount / totalStudents) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    <tr>
                      <td style={tdStyle}>Female</td>
                      <td style={tdStyle}>{femaleCount}</td>
                      <td style={tdStyle}>{totalStudents ? ((femaleCount / totalStudents) * 100).toFixed(1) : 0}%</td>
                    </tr>
                    {otherGenderCount > 0 && (
                      <tr>
                        <td style={tdStyle}>Other / Unspecified</td>
                        <td style={tdStyle}>{otherGenderCount}</td>
                        <td style={tdStyle}>{totalStudents ? ((otherGenderCount / totalStudents) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    )}
                    <tr style={totalRowStyle}>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>{totalStudents}</td>
                      <td style={{ ...tdStyle, fontWeight: 'bold' }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

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

    {/* ══════════════════════════════════════════════════════
        EDIT USER MODAL
    ══════════════════════════════════════════════════════ */}
    {editUser && (
      <div
        onClick={e => { if (e.target === e.currentTarget) setEditUser(null); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}
      >
        <div style={{
          background: 'var(--card-bg, #18181b)', border: '1px solid var(--border, #27272a)',
          borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--border, #27272a)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Pencil size={16} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #f4f4f5)' }}>Edit Participant</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #71717a)', fontFamily: 'monospace' }}>{editUser.email}</div>
              </div>
            </div>
            <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={saveEdit} style={{ padding: '24px' }}>
            {/* Basic Info */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Basic Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                ['name',    'Full Name',            'text'],
                ['email',   'Email Address',         'email'],
                ['phone',   'Phone Number',          'text'],
                ['college', 'College / Institution', 'text'],
                ['branch',  'Branch / Department',  'text'],
                ['year',    'Year (e.g. 4th Year)',  'text'],
                ['linkedin','LinkedIn URL',          'url'],
              ].map(([field, label, type]) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    type={type}
                    value={editForm[field]}
                    onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)',
                      borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)',
                      fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box'
                    }}
                    placeholder={label}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                  {['Male','Female','Other','Not Specified'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Registration / Payment */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Registration & Payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                  {['participant','team-leader','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</label>
                <select value={editForm.paymentStatus} onChange={e => setEditForm(f => ({ ...f, paymentStatus: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                  {['paid','pending','submitted','rejected','refunded'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid (₹)</label>
                <input type="number" min={0} value={editForm.amountPaid} onChange={e => setEditForm(f => ({ ...f, amountPaid: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }} />
              </div>
            </div>

            {/* Extras */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Extras</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>T-Shirt Size</label>
                <select value={editForm.tshirtSize} onChange={e => setEditForm(f => ({ ...f, tshirtSize: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                  <option value="">— Not selected —</option>
                  {['S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Food Preference</label>
                <select value={editForm.foodPreference} onChange={e => setEditForm(f => ({ ...f, foodPreference: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                  <option value="">— Not selected —</option>
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditUser(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border, #27272a)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button type="submit" disabled={editSubmitting}
                style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: editSubmitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pencil size={12} />{editSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════════
        INDIVIDUAL REGISTRATION MODAL
    ══════════════════════════════════════════════════════ */}
    {showIndividualModal && (
      <div
        onClick={e => { if (e.target === e.currentTarget) setShowIndividualModal(false); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}
      >
        <div style={{
          background: 'var(--card-bg, #18181b)', border: '1px solid var(--border, #27272a)',
          borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
        }}>
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--border, #27272a)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <UserPlus size={18} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #f4f4f5)' }}>Add Individual</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #71717a)' }}>Register a single participant</div>
              </div>
            </div>
            <button onClick={() => setShowIndividualModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={addIndividual} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[['name','Full Name','text',true],['email','Email Address','email',true],['phone','Phone Number','text',false],['college','College / Institution','text',false],['branch','Branch / Department','text',false],['year','Year (e.g. 4th Year)','text',false]]
                .map(([field, label, type, required]) => (
                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}{required && <span style={{ color: '#f87171' }}> *</span>}
                  </label>
                  <input
                    required={required}
                    type={type}
                    value={indForm[field]}
                    onChange={e => setIndForm(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)',
                      borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)',
                      fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box'
                    }}
                    placeholder={label}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                <select
                  value={indForm.gender}
                  onChange={e => setIndForm(f => ({ ...f, gender: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                >
                  {['Male','Female','Other','Not Specified'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</label>
                <select
                  value={indForm.paymentStatus}
                  onChange={e => setIndForm(f => ({ ...f, paymentStatus: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                >
                  {['paid','pending','submitted','rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid (₹)</label>
                <input
                  type="number" min={0}
                  value={indForm.amountPaid}
                  onChange={e => setIndForm(f => ({ ...f, amountPaid: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowIndividualModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border, #27272a)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving…' : 'Add Participant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════════════
        TEAM REGISTRATION MODAL
    ══════════════════════════════════════════════════════ */}
    {showTeamModal && (
      <div
        onClick={e => { if (e.target === e.currentTarget) setShowTeamModal(false); }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}
      >
        <div style={{
          background: 'var(--card-bg, #18181b)', border: '1px solid var(--border, #27272a)',
          borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
        }}>
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--border, #27272a)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={18} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #f4f4f5)' }}>Add Team</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #71717a)' }}>Register a team with leader and members</div>
              </div>
            </div>
            <button onClick={() => setShowTeamModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={addTeam} style={{ padding: '24px' }}>

            {/* Team Info */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Team Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['teamName','Team Name',true],['college','College / Institution',false],['branch','Branch / Department',false],['year','Year (e.g. 4th Year)',false]]
                  .map(([field, label, required]) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
                    <input
                      required={required} type="text"
                      value={teamForm[field]}
                      onChange={e => setTeamForm(f => ({ ...f, [field]: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                      placeholder={label}
                    />
                  </div>
                ))}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Status</label>
                  <select value={teamForm.paymentStatus} onChange={e => setTeamForm(f => ({ ...f, paymentStatus: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}>
                    {['paid','pending','submitted','rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Paid per Member (₹)</label>
                  <input type="number" min={0} value={teamForm.amountPaid} onChange={e => setTeamForm(f => ({ ...f, amountPaid: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }} />
                </div>
              </div>
            </div>

            {/* Team Leader */}
            <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>👑 Team Leader</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['name','Leader Name','text',true],['email','Leader Email','email',true],['phone','Leader Phone','text',false]]
                  .map(([field, label, type, required]) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}{required && <span style={{ color: '#f87171' }}> *</span>}</label>
                    <input required={required} type={type}
                      value={teamForm.leader[field]}
                      onChange={e => setTeamForm(f => ({ ...f, leader: { ...f.leader, [field]: e.target.value } }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                      placeholder={label} />
                  </div>
                ))}
              </div>
            </div>

            {/* Members */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👥 Members ({teamForm.members.length})</div>
                {teamForm.members.length < 4 && (
                  <button type="button"
                    onClick={() => setTeamForm(f => ({ ...f, members: [...f.members, { name: '', email: '' }] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                    <Plus size={11} /> Add Member
                  </button>
                )}
              </div>
              {teamForm.members.map((mem, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member {idx+1} Name</label>
                    <input type="text" value={mem.name}
                      onChange={e => setTeamForm(f => { const m = [...f.members]; m[idx] = { ...m[idx], name: e.target.value }; return { ...f, members: m }; })}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                      placeholder="Full Name" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #71717a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member {idx+1} Email</label>
                    <input type="email" value={mem.email}
                      onChange={e => setTeamForm(f => { const m = [...f.members]; m[idx] = { ...m[idx], email: e.target.value }; return { ...f, members: m }; })}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, #27272a)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary, #f4f4f5)', fontSize: 13 }}
                      placeholder="Email" />
                  </div>
                  <button type="button"
                    onClick={() => setTeamForm(f => ({ ...f, members: f.members.filter((_, i) => i !== idx) }))}
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '9px', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Minus size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowTeamModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border, #27272a)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                style={{ padding: '9px 22px', borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving…' : `Add Team (${teamForm.members.length + 1} member${teamForm.members.length + 1 !== 1 ? 's' : ''})`}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>);
}
