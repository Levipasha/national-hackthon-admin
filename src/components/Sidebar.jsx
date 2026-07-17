import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard, Users, GitBranch, CalendarClock,
  Ticket, LogOut, Shield
} from 'lucide-react';

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teams',   icon: GitBranch,       label: 'Teams Monitor' },
  { to: '/members', icon: Users,           label: 'Members Monitor' },
  { to: '/timeline',icon: CalendarClock,   label: 'Timeline' },
  { to: '/coupons', icon: Ticket,          label: 'Coupon Manager' },
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
          <div className="sidebar-logo-text">CodeSprint</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
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
