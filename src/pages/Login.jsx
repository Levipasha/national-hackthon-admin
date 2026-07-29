import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, KeyRound, ArrowRight, Mail, RefreshCw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

// ── Google "G" Logo SVG ───────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const OTP_LENGTH = 6;
const OTP_EXPIRE_SECONDS = 600; // 10 minutes

export default function Login() {
  const { googleAdminAuth, verifyAdminOtp, loginAdmin } = useAuth();
  const navigate = useNavigate();

  // Stage: 'google' | 'otp' | 'success'
  const [stage, setStage] = useState('google');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading]       = useState(false);
  const [error, setError]                 = useState('');

  // OTP state
  const [otpEmail, setOtpEmail]         = useState('');
  const [maskedEmail, setMaskedEmail]   = useState('');
  const [adminName, setAdminName]       = useState('');
  const [otpDigits, setOtpDigits]       = useState(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft]         = useState(OTP_EXPIRE_SECONDS);
  const [resending, setResending]       = useState(false);
  const digitRefs                       = useRef([]);

  // Legacy password
  const [showLegacy, setShowLegacy]     = useState(false);
  const [password, setPassword]         = useState('');
  const [legacyLoading, setLegacyLoading] = useState(false);

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'otp') return;
    setTimeLeft(OTP_EXPIRE_SECONDS);
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [stage, otpEmail]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Google Sign-In handler ────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const data = await googleAdminAuth();
      setOtpEmail(data.email);
      setMaskedEmail(data.maskedEmail);
      setAdminName(data.name);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setStage('otp');
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── OTP digit input ───────────────────────────────────────────────────────────
  const handleDigit = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < OTP_LENGTH - 1) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitKey = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) digitRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length) {
      const next = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((c, i) => { next[i] = c; });
      setOtpDigits(next);
      digitRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      e.preventDefault();
    }
  };

  // ── OTP Submit ────────────────────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    const code = otpDigits.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    if (timeLeft === 0) { setError('OTP has expired. Please sign in with Google again.'); return; }
    setError('');
    setOtpLoading(true);
    try {
      await verifyAdminOtp(otpEmail, code);
      setStage('success');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setOtpLoading(false);
    }
  };

  // Auto-submit when all digits filled
  useEffect(() => {
    if (stage === 'otp' && otpDigits.every(d => d !== '') && !otpLoading) {
      handleOtpSubmit();
    }
  }, [otpDigits]);

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await googleAdminAuth(); // re-triggers Google popup → new OTP
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeLeft(OTP_EXPIRE_SECONDS);
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // ── Legacy password ───────────────────────────────────────────────────────────
  const handleLegacy = async (e) => {
    e.preventDefault();
    setError('');
    setLegacyLoading(true);
    try {
      await loginAdmin(password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLegacyLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 20% 100%, rgba(139,92,246,0.1) 0%, transparent 50%), #09090b',
      padding: 20, fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(24,24,27,0.95)', border: '1px solid #27272a',
        borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        overflow: 'hidden', backdropFilter: 'blur(16px)'
      }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Admin Control Panel</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>CodeSprint 2026 · Restricted Access</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* ── Error ── */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              fontSize: 13, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span> {error}
            </div>
          )}

          {/* ══ STAGE: Google Sign-In ══════════════════════════════════════════ */}
          {stage === 'google' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Sign in to continue</div>
                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6 }}>
                  Use your Google account to sign in.<br />
                  A verification code will be sent to your email.
                </div>
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: googleLoading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, padding: '13px 20px', cursor: googleLoading ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600, color: '#f4f4f5',
                  transition: 'all 0.2s', opacity: googleLoading ? 0.7 : 1,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; }}
                onMouseLeave={e => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                {googleLoading ? (
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : <GoogleIcon />}
                {googleLoading ? 'Opening Google…' : 'Continue with Google'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#27272a' }} />
                <span style={{ fontSize: 11, color: '#52525b', whiteSpace: 'nowrap' }}>or use legacy access</span>
                <div style={{ flex: 1, height: 1, background: '#27272a' }} />
              </div>

              {/* Legacy toggle */}
              <button
                onClick={() => setShowLegacy(v => !v)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'transparent', border: '1px solid #27272a', borderRadius: 10,
                  padding: '10px 14px', cursor: 'pointer', fontSize: 12, color: '#71717a'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <KeyRound size={13} /> Admin Password (Legacy)
                </span>
                {showLegacy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showLegacy && (
                <form onSubmit={handleLegacy} style={{ marginTop: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
                    <input
                      type="password"
                      placeholder="Enter admin password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid #27272a',
                        borderRadius: 8, color: '#f4f4f5', fontSize: 13, outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={legacyLoading}
                    style={{
                      width: '100%', marginTop: 10, padding: '10px', background: '#27272a',
                      border: 'none', borderRadius: 8, color: '#a1a1aa', fontSize: 13,
                      fontWeight: 600, cursor: legacyLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    {legacyLoading ? <div style={{ width: 13, height: 13, border: '2px solid #52525b', borderTopColor: '#a1a1aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <ArrowRight size={13} />}
                    {legacyLoading ? 'Verifying…' : 'Access Panel'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ══ STAGE: OTP Verification ════════════════════════════════════════ */}
          {stage === 'otp' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                  background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Mail size={24} style={{ color: '#818cf8' }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5', marginBottom: 6 }}>Check your email</div>
                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.7 }}>
                  We sent a 6-digit code to<br />
                  <strong style={{ color: '#a1a1aa', fontFamily: 'monospace' }}>{maskedEmail}</strong>
                </div>
              </div>

              {/* 6-digit OTP boxes */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => digitRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleDigitKey(i, e)}
                    onPaste={i === 0 ? handleDigitPaste : undefined}
                    style={{
                      width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
                      fontFamily: 'JetBrains Mono, monospace',
                      background: d ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${d ? '#6366f1' : '#27272a'}`,
                      borderRadius: 10, color: '#f4f4f5', outline: 'none',
                      transition: 'all 0.15s', caretColor: '#6366f1'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = d ? '#6366f1' : '#27272a'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              {/* Timer */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {timeLeft > 0 ? (
                  <span style={{ fontSize: 12, color: timeLeft < 60 ? '#f87171' : '#71717a' }}>
                    Code expires in <strong style={{ fontFamily: 'monospace', color: timeLeft < 60 ? '#f87171' : '#a1a1aa' }}>{formatTime(timeLeft)}</strong>
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>⏰ Code expired</span>
                )}
              </div>

              <button
                onClick={handleOtpSubmit}
                disabled={otpLoading || otpDigits.join('').length < OTP_LENGTH || timeLeft === 0}
                style={{
                  width: '100%', padding: '13px', marginBottom: 12,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: otpLoading || otpDigits.join('').length < OTP_LENGTH || timeLeft === 0 ? 'not-allowed' : 'pointer',
                  opacity: otpLoading || otpDigits.join('').length < OTP_LENGTH || timeLeft === 0 ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s'
                }}
              >
                {otpLoading ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Shield size={15} />}
                {otpLoading ? 'Verifying…' : 'Verify & Login'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => { setStage('google'); setError(''); setOtpDigits(Array(OTP_LENGTH).fill('')); }}
                  style={{ background: 'none', border: 'none', color: '#71717a', fontSize: 12, cursor: 'pointer', padding: 0 }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'none', border: 'none', color: resending ? '#52525b' : '#818cf8',
                    fontSize: 12, cursor: resending ? 'not-allowed' : 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                  }}
                >
                  <RefreshCw size={11} style={{ animation: resending ? 'spin 0.8s linear infinite' : 'none' }} />
                  {resending ? 'Resending…' : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {/* ══ STAGE: Success ═════════════════════════════════════════════════ */}
          {stage === 'success' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ margin: '0 auto 16px', width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={32} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5', marginBottom: 6 }}>Access Granted</div>
              <div style={{ fontSize: 12, color: '#71717a' }}>Welcome back, <strong style={{ color: '#a1a1aa' }}>{adminName}</strong>. Redirecting…</div>
            </div>
          )}

        </div>

        <div style={{ padding: '12px 32px 20px', textAlign: 'center', fontSize: 11, color: '#3f3f46' }}>
          CodeSprint 2026 · Audisankara University · Admin Panel
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
