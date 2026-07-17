import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CalendarClock, Check, X, GripVertical } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const STORAGE_KEY = 'dt_admin_timeline';

const DEFAULT_EVENTS = [
  {
    id: '1',
    title: 'Registrations Open',
    date: '2026-07-01',
    time: '09:00',
    description: 'Individual participant registrations and payment window opens.',
    category: 'registration',
  },
  {
    id: '2',
    title: 'Registration Deadline',
    date: '2026-08-03',
    time: '23:59',
    description: 'Last date to register and complete the ₹399 payment.',
    category: 'deadline',
  },
  {
    id: '3',
    title: 'Team Formation Deadline',
    date: '2026-08-05',
    time: '18:00',
    description: 'All teams must be formed and locked before this time.',
    category: 'deadline',
  },
  {
    id: '4',
    title: 'CodeSprint-2026 Hackathon',
    date: '2026-08-08',
    time: '09:00',
    description: '8-Hours National Level Hackathon commences at KVT Hall Gudur.',
    category: 'event',
  },
  {
    id: '5',
    title: 'Demos & Closing Ceremony',
    date: '2026-08-08',
    time: '15:00',
    description: 'Prototype evaluations, final pitching presentations, and closing prize distributions.',
    category: 'event',
  },
];

const CATEGORY_COLORS = {
  registration: { dot: '#a1a1aa', badge: 'badge-neutral', label: 'Registration' },
  deadline:     { dot: '#f59e0b', badge: 'badge-warning', label: 'Deadline' },
  event:        { dot: '#ffffff', badge: 'badge-success', label: 'Event Day' },
  milestone:    { dot: '#60a5fa', badge: 'badge-neutral', label: 'Milestone' },
};

function getStatus(date, time) {
  const dt = new Date(`${date}T${time || '00:00'}`);
  if (isToday(dt)) return 'today';
  if (isPast(dt)) return 'past';
  return 'upcoming';
}

const EMPTY_FORM = { title: '', date: '', time: '09:00', description: '', category: 'event' };

export default function Timeline() {
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_EVENTS;
    } catch { return DEFAULT_EVENTS; }
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);

  // Persist to localStorage whenever events change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const sorted = [...events].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditId(ev.id);
    setForm({ title: ev.title, date: ev.date, time: ev.time || '09:00', description: ev.description, category: ev.category });
    setShowForm(true);
  };

  const saveEvent = () => {
    if (!form.title || !form.date) return;
    if (editId) {
      setEvents(prev => prev.map(e => e.id === editId ? { ...e, ...form } : e));
    } else {
      setEvents(prev => [...prev, { id: Date.now().toString(), ...form }]);
    }
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const deleteEvent = (id) => {
    if (!window.confirm('Remove this timeline event?')) return;
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const resetToDefault = () => {
    if (!window.confirm('Reset timeline to default events? This cannot be undone.')) return;
    setEvents(DEFAULT_EVENTS);
  };

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Event Timeline</div>
          <div className="section-sub">Manage important deadlines and event schedule</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={resetToDefault}>Reset</button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={13} />Add Event</button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left: Timeline list */}
        <div className="card">
          <div className="timeline-list">
            {sorted.map((ev, idx) => {
              const status = getStatus(ev.date, ev.time);
              const cat = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.event;
              return (
                <div key={ev.id} className="timeline-item">
                  <div className="timeline-line">
                    <div
                      className={`timeline-dot ${status === 'today' ? 'active' : status === 'past' ? 'past' : ''}`}
                      style={{ background: status === 'today' ? cat.dot : undefined }}
                    />
                    {idx < sorted.length - 1 && <div className="timeline-connector" />}
                  </div>
                  <div className="timeline-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div className="timeline-date">
                          {format(new Date(`${ev.date}T12:00:00`), 'dd MMM yyyy')} · {ev.time}
                          {status === 'today' && <span style={{ marginLeft: 6, color: 'white', fontWeight: 700 }}>TODAY</span>}
                          {status === 'past'  && <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>PAST</span>}
                        </div>
                        <div className="timeline-event-title">{ev.title}</div>
                        {ev.description && <div className="timeline-desc">{ev.description}</div>}
                        <div style={{ marginTop: 6 }}>
                          <span className={`badge ${cat.badge}`}>{cat.label}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(ev)} title="Edit">
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-danger btn-icon" onClick={() => deleteEvent(ev.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Add/Edit Form */}
        <div>
          {showForm ? (
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                {editId ? 'Edit Event' : 'New Timeline Event'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group">
                  <label className="label">Event Title *</label>
                  <input className="input" placeholder="e.g. Registration Deadline" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group">
                    <label className="label">Date *</label>
                    <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="label">Time</label>
                    <input className="input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Category</label>
                  <select className="input select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="registration">Registration</option>
                    <option value="deadline">Deadline</option>
                    <option value="event">Event Day</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Brief description of this event…"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveEvent}>
                    <Check size={13} />{editId ? 'Update Event' : 'Add Event'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={openAdd}>
              <CalendarClock size={28} style={{ margin: '0 auto 10px', color: 'var(--text-muted)', opacity: 0.5 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Add a new deadline or event</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Click to open the event form</div>
              <button className="btn btn-primary" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={openAdd}>
                <Plus size={13} />New Event
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="card-sm" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Legend</div>
            {Object.entries(CATEGORY_COLORS).map(([key, { dot, badge, label }]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
