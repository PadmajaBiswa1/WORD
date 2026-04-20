import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

export function SignInPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [focused, setFocused] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

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
      <button className="auth-theme-toggle" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? '☀' : '🌙'}
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
            <input
              type="password" placeholder="••••••••"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`auth-input${focused === 'password' ? ' focused' : ''}`}
              onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
            />
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
