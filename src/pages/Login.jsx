import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, KeyRound, ArrowRight } from 'lucide-react';

export default function Login() {
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Shield size={22} color="black" />
        </div>
        <div className="login-title">Admin Access</div>
        <div className="login-sub">
          Enter the admin security password to access the panel.
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="label">Security Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                type="password"
                placeholder="Enter password (e.g., admin)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 32 }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', marginTop: 4 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                Verifying...
              </>
            ) : (
              <>
                <ArrowRight size={14} />
                Access Admin Panel
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          CodeSprint-2026 · Restricted Access
        </div>
      </div>
    </div>
  );
}
