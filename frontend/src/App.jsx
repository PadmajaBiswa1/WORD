import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage }        from '@/pages/SignInPage';
import { SignUpPage }        from '@/pages/SignUpPage';
import { ForgotPasswordPage} from '@/pages/ForgotPasswordPage';
import { HomePage }          from '@/pages/HomePage';
import { EditorPage }        from '@/pages/EditorPage';
import { useUIStore }        from '@/store';
import { initTheme }         from '@/hooks/useTheme';

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
        <Route path="/doc/:id"       element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route path="/shared/:id"    element={<EditorPage isShared={true} />} />
        <Route path="*"              element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
