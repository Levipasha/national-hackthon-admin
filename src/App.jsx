import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Timeline from './pages/Timeline.jsx';
import Coupons from './pages/Coupons.jsx';
import Teams from './pages/Teams.jsx';
import Broadcast from './pages/Broadcast.jsx';
import Highlights from './pages/Highlights.jsx';
import Guests from './pages/Guests.jsx';
import Coordinators from './pages/Coordinators.jsx';
import Profile from './pages/Profile.jsx';
import Colleges from './pages/Colleges.jsx';
import ProblemStatements from './pages/ProblemStatements.jsx';

const PAGE_TITLES = {
  '/':             { title: 'Analytics Dashboard',  sub: 'Live registration stats & analytics' },
  '/registrations':{ title: 'Registrations Ledger',  sub: 'Review pending student enrollments and manage approvals' },
  '/broadcast':    { title: 'WS Broadcast',          sub: 'Dispatch real-time notifications to all attendees' },
  '/highlights':   { title: 'Highlights Manager',    sub: 'Manage event highlights and media' },
  '/guests':       { title: 'Guests Manager',        sub: 'Manage guest speakers and VIP attendees' },
  '/timeline':     { title: 'Timeline Stages',       sub: 'Deadlines & schedule management' },
  '/coordinators': { title: 'Coordinators',          sub: 'Faculty and student coordinator management' },
  '/colleges':     { title: 'Colleges List',         sub: 'Manage colleges for the registration dropdown' },
  '/problems':     { title: 'Problem Statements',    sub: 'Manage and distribute problem statements' },
  '/profile':      { title: 'Profile Settings',      sub: 'Admin account and preferences' },
  // Legacy redirects
  '/teams':        { title: 'Teams Monitor',         sub: 'All registered teams' },
  '/coupons':      { title: 'Coupon Manager',        sub: 'Discount code management' },
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
            <Route path="/"             element={<Dashboard />} />
            <Route path="/registrations"element={<Members />} />
            <Route path="/broadcast"    element={<Broadcast />} />
            <Route path="/highlights"   element={<Highlights />} />
            <Route path="/guests"       element={<Guests />} />
            <Route path="/timeline"     element={<Timeline />} />
            <Route path="/coordinators" element={<Coordinators />} />
            <Route path="/colleges"     element={<Colleges />} />
            <Route path="/problems"     element={<ProblemStatements />} />
            <Route path="/profile"      element={<Profile />} />
            {/* Legacy routes */}
            <Route path="/teams"        element={<Teams />} />
            <Route path="/coupons"      element={<Coupons />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
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
