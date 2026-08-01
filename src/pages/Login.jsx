import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, KeyRound, ArrowRight, Mail, RefreshCw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

const OTP_LENGTH = 6;
const OTP_EXPIRE_SECONDS = 600; // 10 minutes

export default function Login() {
  const { sendAdminOtp, verifyAdminOtp, loginAdmin } = useAuth();
  const navigate = useNavigate();

  // Stage: 'email' | 'otp' | 'success'
  const [stage, setStage] = useState('email');
  const [emailInput, setEmailInput]     = useState('');
  const [sendOtpLoading, setSendOtpLoading] = useState(false);
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

  // ── Send Email OTP handler ───────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!emailInput.trim()) {
      setError('Please enter your admin email address.');
      return;
    }
    setError('');
    setSendOtpLoading(true);
    try {
      const data = await sendAdminOtp(emailInput.trim());
      setOtpEmail(data.email);
      setMaskedEmail(data.maskedEmail);
      setAdminName(data.name);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setStage('otp');
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code. Please check your email.');
    } finally {
      setSendOtpLoading(false);
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
    if (timeLeft === 0) { setError('OTP code has expired. Please request a new code.'); return; }
    setError('');
    setOtpLoading(true);
    try {
      await verifyAdminOtp(otpEmail, code);
      setStage('success');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please try again.');
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
      await sendAdminOtp(otpEmail);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

          {/* ══ STAGE: Enter Email ════════════════════════════════════════════ */}
          {stage === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#f4f4f5', marginBottom: 6 }}>Sign in to continue</div>
                <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
                  Enter your authorised admin email address.<br />
                  A 6-digit verification code will be sent to your email.
                </div>
              </div>

              <form onSubmit={handleSendOtp} style={{ spaceY: 16 }}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: 6 }}>
                    Admin Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                    <input
                      type="email"
                      required
                      placeholder="admin@audisankara.ac.in"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        paddingLeft: 42, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid #27272a',
                        borderRadius: 12, color: '#f4f4f5', fontSize: 13, outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendOtpLoading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none', borderRadius: 12, padding: '13px 20px',
                    cursor: sendOtpLoading ? 'not-allowed' : 'pointer',
                    fontSize: 14, fontWeight: 700, color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    transition: 'all 0.2s', opacity: sendOtpLoading ? 0.7 : 1
                  }}
                >
                  {sendOtpLoading ? (
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : <ArrowRight size={16} />}
                  {sendOtpLoading ? 'Sending Verification Code…' : 'Send Verification Code'}
                </button>
              </form>
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
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>
                  Check your Email
                </div>
                <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.5 }}>
                  Verification code sent to<br />
                  <span style={{ color: '#818cf8', fontWeight: 600 }}>{maskedEmail || otpEmail}</span>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit}>
                {/* 6 Digit inputs */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => digitRefs.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigit(idx, e.target.value)}
                      onKeyDown={e => handleDigitKey(idx, e)}
                      onPaste={handleDigitPaste}
                      style={{
                        width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                        fontFamily: 'monospace',
                        background: digit ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${digit ? '#6366f1' : '#27272a'}`,
                        borderRadius: 12, color: '#f4f4f5', outline: 'none', transition: 'all 0.15s'
                      }}
                    />
                  ))}
                </div>

                {/* Timer & Resend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, fontSize: 12 }}>
                  <span style={{ color: timeLeft < 60 ? '#f87171' : '#71717a', fontFamily: 'monospace' }}>
                    ⏱ Expires in {formatTime(timeLeft)}
                  </span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || timeLeft > 540}
                    style={{
                      background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, opacity: (resending || timeLeft > 540) ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <RefreshCw size={11} className={resending ? 'spin' : ''} />
                    {resending ? 'Sending…' : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpDigits.some(d => !d)}
                  style={{
                    width: '100%', padding: '13px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: (otpLoading || otpDigits.some(d => !d)) ? 'not-allowed' : 'pointer',
                    opacity: (otpLoading || otpDigits.some(d => !d)) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
                  }}
                >
                  {otpLoading ? (
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : <ArrowRight size={15} />}
                  {otpLoading ? 'Verifying Code…' : 'Verify Code & Sign In'}
                </button>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setStage('email'); setError(''); }}
                    style={{ background: 'none', border: 'none', color: '#71717a', fontSize: 12, cursor: 'pointer' }}
                  >
                    ← Change Email Address
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══ STAGE: Success ══════════════════════════════════════════════════ */}
          {stage === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={32} style={{ color: '#22c55e' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 6 }}>
                Access Granted!
              </div>
              <div style={{ fontSize: 13, color: '#71717a' }}>
                Welcome back, {adminName || 'Admin'}. Loading dashboard…
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #18181b', padding: '14px 32px', textAlign: 'center', fontSize: 11, color: '#52525b' }}>
          CodeSprint 2026 · Audisankara University · Admin Panel
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
