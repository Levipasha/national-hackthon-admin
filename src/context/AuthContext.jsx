import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('dt_admin_token');
    const savedAdmin = localStorage.getItem('dt_admin_user');
    if (savedToken && savedAdmin) {
      setToken(savedToken);
      setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, []);

  // ── Admin Auth — Step 1: Send OTP to email ────────────────────────────────────
  const sendAdminOtp = async (email) => {
    const res = await fetch(`${API}/api/admin/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP code.');
    return data; // { success, email, maskedEmail, name }
  };

  // ── Google Admin Auth — Step 1: sign in with Google, send OTP ────────────────
  const googleAdminAuth = async () => {
    // Wait for Firebase to be ready (it loads via CDN module)
    let attempts = 0;
    while (!window.__firebaseAuth && attempts < 30) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }
    if (!window.__firebaseAuth) throw new Error('Firebase failed to load. Please refresh the page.');

    // Trigger Google popup
    const result = await window.__signInWithPopup(window.__firebaseAuth, window.__googleProvider);
    const idToken = await result.user.getIdToken();

    // Send to backend — it will check AdminAllowlist and send OTP
    const res = await fetch(`${API}/api/admin/google-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Google authentication failed.');
    return data; // { otpSent, email, maskedEmail, name }
  };

  // ── Google Admin Auth — Step 2: verify OTP, get JWT ──────────────────────────
  const verifyAdminOtp = async (email, code) => {
    const res = await fetch(`${API}/api/admin/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid OTP.');
    localStorage.setItem('dt_admin_token', data.token);
    localStorage.setItem('dt_admin_user', JSON.stringify(data.user));
    setToken(data.token);
    setAdmin(data.user);
    return data;
  };

  // ── Legacy OTP methods (participant side — kept for compatibility) ─────────────
  const sendOtp = async (email) => {
    const res = await fetch(`${API}/api/auth/otp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  };

  const verifyOtp = async (email, code) => {
    const res = await fetch(`${API}/api/auth/otp-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid OTP');
    if (data.user?.role !== 'admin') throw new Error('Access denied. Admin accounts only.');
    localStorage.setItem('dt_admin_token', data.token);
    localStorage.setItem('dt_admin_user', JSON.stringify(data.user));
    setToken(data.token);
    setAdmin(data.user);
    return data;
  };

  // ── Legacy password login (kept as fallback) ───────────────────────────────────
  const loginAdmin = async (password) => {
    const res = await fetch(`${API}/api/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid password');
    localStorage.setItem('dt_admin_token', data.token);
    localStorage.setItem('dt_admin_user', JSON.stringify(data.user));
    setToken(data.token);
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('dt_admin_token');
    localStorage.removeItem('dt_admin_user');
    setToken(null);
    setAdmin(null);
    // Also sign out of Firebase
    if (window.__firebaseAuth) {
      window.__firebaseAuth.signOut().catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ admin, token, loading, sendAdminOtp, googleAdminAuth, verifyAdminOtp, sendOtp, verifyOtp, loginAdmin, logout }}>

      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
