import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

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

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-4.2 4.9" />
      <path d="M6.2 6.2C3.3 8.5 2 12 2 12s3.5 7 10 7c1 0 2-.1 3-.4" />
    </svg>
  );
}

export function SignInPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [focused, setFocused] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Frontend-only mock: always succeed, no backend needed
      const fakeToken = 'demo-frontend-token-' + Date.now();
      const fakeUser = { 
        name: form.email.split('@')[0] || 'User', 
        email: form.email 
      };
      localStorage.setItem('etherx_token', fakeToken);
      localStorage.setItem('etherx_user', JSON.stringify(fakeUser));
      navigate('/home');
    } finally {
      setLoading(false);
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
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your EtherxWord account</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`auth-input${focused === 'email' ? ' focused' : ''}`}
              onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
            />
          </div>
          <div className="auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="auth-label">Password</label>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: 11 }}>Forgot password?</Link>
            </div>
            <div className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`auth-input auth-password-input${focused === 'password' ? ' focused' : ''}`}
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">Create one</Link>
        </p>
      </div>
    </div>
  );
}
