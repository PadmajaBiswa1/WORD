import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import App from './App';
import { initTheme } from './hooks/useTheme';
import { SplashScreen } from './components/ui/SplashScreen';
import './theme/global.css';

// Apply persisted theme before first render to avoid flash
const savedTheme = localStorage.getItem('etherx-theme') || 'dark';
initTheme(savedTheme);

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  return showSplash ? <SplashScreen /> : <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
