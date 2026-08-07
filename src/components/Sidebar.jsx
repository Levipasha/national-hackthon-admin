import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard, CalendarClock, Ticket,
  LogOut, Shield, Radio, Sparkles, UserCheck,
  Award, Settings, ClipboardList, Users, School, Target, Mail
} from 'lucide-react';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Analytics Dashboard' },
  { to: '/registrations',icon: ClipboardList,   label: 'Registrations' },
  { to: '/bulk-mails',   icon: Mail,            label: 'Bulk Mails' },
  { to: '/problems',     icon: Target,          label: 'Problem Statements' },
  { to: '/broadcast',    icon: Radio,           label: 'WS Broadcast' },
  { to: '/highlights',   icon: Sparkles,        label: 'Highlights Manager' },
  { to: '/guests',       icon: UserCheck,       label: 'Guests Manager' },
  { to: '/timeline',     icon: CalendarClock,   label: 'Timeline Stages' },
  { to: '/coordinators', icon: Award,           label: 'Coordinators' },
  { to: '/colleges',     icon: School,          label: 'Colleges List' },
  { to: '/profile',      icon: Settings,        label: 'Profile Settings' },
];

export default function Sidebar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={14} color="black" />
        </div>
        <div>
          <div className="sidebar-logo-text">ADMIN CONTROL</div>
          <div className="sidebar-logo-sub">CodeSprint 2026</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {admin && (
          <div style={{ padding: '8px 12px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-dim)', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{admin.email}</div>
          </div>
        )}
        <button onClick={handleLogout} className="nav-item btn-danger" style={{ width: '100%', border: 'none' }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
