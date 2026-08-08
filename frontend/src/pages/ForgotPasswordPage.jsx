import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { authApi } from '@/services/api';
import { sendOtpEmail } from '@/services/emailjs';

function ThemeIcon({ dark }) {
  return dark ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 3.5a8.5 8.5 0 1 0 7 13.3 9.5 9.5 0 1 1-7-13.3Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M4.9 4.9l1.8 1.8" />
      <path d="M17.3 17.3l1.8 1.8" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="M4.9 19.1l1.8-1.8" />
      <path d="M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep]           = useState('email');  // 'email' | 'otp' | 'reset' | 'done'
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });
  const [focused, setFocused]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [resent, setResent]       = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authApi.forgotPassword({ email });
      setStep('otp');

      if (response?.otp) {
        await sendOtpEmail({
          toEmail: email,
          toName: email,
          code: response.otp,
          purpose: 'reset',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { resetToken: token } = await authApi.verifyResetOtp({ email, otp });
      setResetToken(token);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (passwords.password !== passwords.confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await authApi.resetPassword({ resetToken, password: passwords.password });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      const response = await authApi.resendOtp({ email, type: 'reset' });
      if (response?.otp) {
        await sendOtpEmail({
          toEmail: email,
          toName: email,
          code: response.otp,
          purpose: 'reset',
        });
      }
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-bg">
      <button className="auth-theme-toggle" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
        <ThemeIcon dark={theme === 'dark'} />
      </button>
      <div className="auth-card anim-scale-in">
        <div className="auth-logo-wrap">
          <img src="/assets/etherxword-logo.png" alt="EtherxWord" className="auth-logo" />
        </div>

        {step === 'email' && (
          <>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-sub">Enter your email and we'll send you an OTP.</p>
            <form onSubmit={handleSendOtp} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  type="email" required placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`auth-input${focused === 'email' ? ' focused' : ''}`}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="auth-title">Enter OTP</h1>
            <p className="auth-sub">We sent a 6-digit code to <strong>{email}</strong></p>
            <form onSubmit={handleVerifyOtp} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              {resent && <div className="auth-success">OTP resent!</div>}
              <div className="auth-field">
                <label className="auth-label">OTP Code</label>
                <input
                  type="text" required placeholder="123456" maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className={`auth-input${focused === 'otp' ? ' focused' : ''}`}
                  onFocus={() => setFocused('otp')} onBlur={() => setFocused('')}
                  style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify OTP'}
              </button>
            </form>
            <p className="auth-footer">
              Didn't receive it?{' '}
              <button onClick={handleResend} className="auth-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Resend OTP
              </button>
            </p>
          </>
        )}

        {step === 'reset' && (
          <>
            <h1 className="auth-title">New password</h1>
            <p className="auth-sub">Choose a strong new password.</p>
            <form onSubmit={handleReset} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              {['password', 'confirm'].map((key) => (
                <div className="auth-field" key={key}>
                  <label className="auth-label">{key === 'password' ? 'New Password' : 'Confirm Password'}</label>
                  <input
                    type="password" required placeholder="••••••••"
                    value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })}
                    className={`auth-input${focused === key ? ' focused' : ''}`}
                    onFocus={() => setFocused(key)} onBlur={() => setFocused('')}
                  />
                </div>
              ))}
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 className="auth-title">All done!</h1>
            <div className="auth-sent-badge">✓ Password reset successfully</div>
            <button className="auth-btn" style={{ marginTop: 20 }} onClick={() => navigate('/signin')}>
              Sign In
            </button>
          </>
        )}

        <p className="auth-footer">
          <Link to="/signin" className="auth-link">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
