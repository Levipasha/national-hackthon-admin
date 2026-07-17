import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Search, RefreshCw, Download, UserCheck, Users } from 'lucide-react';
import { API } from '../api.js';

export default function Members() {
  const { token } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | paid | unpaid | checkedin
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/participants?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setParticipants(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, search]);

  useEffect(() => {
    if (token) {
      const timeout = setTimeout(fetchParticipants, 350);
      return () => clearTimeout(timeout);
    }
  }, [token, search, fetchParticipants]);

  const exportCSV = () => {
    const link = document.createElement('a');
    link.href = `${API}/api/admin/export-csv`;
    link.setAttribute('download', 'participants.csv');
    link.setAttribute('data-token', token);
    // We need to do a fetch with auth header, so open via fetch blob
    fetch(`${API}/api/admin/export-csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'participants.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  };

  const checkIn = async (userId) => {
    try {
      const res = await fetch(`${API}/api/admin/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) fetchParticipants();
    } catch (e) { console.error(e); }
  };

  const filtered = participants.filter(p => {
    if (filter === 'paid')      return p.paymentStatus === 'paid';
    if (filter === 'unpaid')    return p.paymentStatus !== 'paid';
    if (filter === 'checkedin') return p.checkedIn;
    return true;
  });

  const statusBadge = (p) => {
    if (p.checkedIn) return <span className="badge badge-success">Checked In</span>;
    if (p.paymentStatus === 'paid') return <span className="badge badge-warning">Paid</span>;
    return <span className="badge badge-danger">Unpaid</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Members Monitor</div>
          <div className="section-sub">{filtered.length} participants shown</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchParticipants} disabled={loading}>
            <RefreshCw size={13} />Refresh
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={13} />Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search size={13} />
          <input
            className="input"
            placeholder="Search name, email, college…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { key: 'all',       label: 'All' },
            { key: 'paid',      label: 'Paid' },
            { key: 'unpaid',    label: 'Unpaid' },
            { key: 'checkedin', label: 'Checked In' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" />Loading participants…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={40} />
          <h3>No Participants Found</h3>
          <p>Try adjusting your search or filter.</p>
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
                <th>Branch / Year</th>
                <th>Team</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Check-In</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{p.name}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{p.email}</td>
                  <td>{p.phone}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.college}</td>
                  <td>{p.branch} · {p.year}</td>
                  <td>
                    {p.teamId
                      ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{p.teamId}</span>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>—</span>}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.amountPaid ? `₹${p.amountPaid}` : '—'}
                  </td>
                  <td>{statusBadge(p)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
