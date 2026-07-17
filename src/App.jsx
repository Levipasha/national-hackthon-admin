import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Teams from './pages/Teams.jsx';
import Members from './pages/Members.jsx';
import Timeline from './pages/Timeline.jsx';
import Coupons from './pages/Coupons.jsx';

const PAGE_TITLES = {
  '/':         { title: 'Overview Dashboard', sub: 'Live registration stats' },
  '/teams':    { title: 'Teams Monitor',       sub: 'All registered teams' },
  '/members':  { title: 'Members Monitor',     sub: 'Participant management' },
  '/timeline': { title: 'Event Timeline',      sub: 'Deadlines & schedule' },
  '/coupons':  { title: 'Coupon Manager',      sub: 'Discount code management' },
};

function Topbar() {
  const location = useLocation();
  const info = PAGE_TITLES[location.pathname] || { title: 'Admin Panel', sub: '' };
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <header className="topbar">
      <div className="topbar-title">{info.title}</div>
      <div className="topbar-meta">{now}</div>
    </header>
  );
}

function ProtectedLayout() {
  const { admin, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!admin) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-body">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/teams"    element={<Teams />} />
            <Route path="/members"  element={<Members />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/coupons"  element={<Coupons />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function LoginGuard() {
  const { admin, loading } = useAuth();
  if (loading) return null;
  if (admin)   return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*"     element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
