import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage }        from '@/pages/SignInPage';
import { SignUpPage }        from '@/pages/SignUpPage';
import { ForgotPasswordPage} from '@/pages/ForgotPasswordPage';
import { HomePage }          from '@/pages/HomePage';
import { EditorPage }        from '@/pages/EditorPage';
import { useUIStore }        from '@/store';
import { initTheme }         from '@/hooks/useTheme';

class EditorErrorBoundary extends React.PureComponent {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-primary)' }}>
          <h2 style={{ color: '#e05c5c', marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ marginBottom: 16 }}>The editor encountered an error. Please refresh the page.</p>
          <button style={{ padding: '8px 16px', cursor: 'pointer' }} onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeSync() {
  const theme = useUIStore((s) => s.theme);
  useEffect(() => { initTheme(theme); }, [theme]);
  return null;
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('etherx_token');
  return token ? children : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <Routes>
        <Route path="/"              element={<Navigate to="/signin" replace />} />
        <Route path="/signin"        element={<SignInPage />} />
        <Route path="/signup"        element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/home"          element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/doc/:id"       element={<EditorErrorBoundary><RequireAuth><EditorPage /></RequireAuth></EditorErrorBoundary>} />
        <Route path="/shared/:id"    element={<EditorErrorBoundary><EditorPage isShared={true} /></EditorErrorBoundary>} />
        <Route path="*"              element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
