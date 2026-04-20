// ═══════════════════════════════════════════════════════════════
//  EtherX Word — Design Tokens
// ═══════════════════════════════════════════════════════════════

export const GOLD = '#d4af37';

// Apply CSS custom properties to :root for the given theme mode
export function applyTheme(mode = 'dark') {
  const root = document.documentElement;
  const dark = mode === 'dark';

  const vars = {
    // ── Surfaces ────────────────────────────────────────────────
    '--bg-app':      dark ? '#0a0a0a' : '#fafbff',
    '--bg-surface':  dark ? '#0a0a0a' : '#ffffff',
    '--bg-elevated': dark ? '#111111' : '#f0f0f0',
    '--bg-hover':    dark ? '#1f1800' : '#f5efd0',
    '--bg-active':   dark ? '#1a1a1a' : '#f0e5a8',
    '--bg-page':     dark ? '#1a1a1a' : '#ffffff',
    '--bg-code':     dark ? '#161616' : '#f3f3f3',
    '--bg-th':       dark ? '#1c1c1c' : '#f9f6e8',
    '--bg-sidebar':  dark ? '#0e0e0e' : '#f0f0f0',

    // ── Borders ──────────────────────────────────────────────────
    '--border':        dark ? '#3d3000' : '#d0d0d0',
    '--border-strong': dark ? '#2a2a2a' : '#aaa',
    '--border-gold':   dark ? '#3d3000' : 'rgba(180,140,10,0.55)',

    // ── Text ─────────────────────────────────────────────────────
    '--text-primary':   dark ? '#f0e6c8' : '#1a1a1a',
    '--text-secondary': dark ? '#d4b86a' : '#444',
    '--text-muted':     dark ? '#9a8a6a' : '#777',
    '--text-gold':      GOLD,
    '--text-heading':   dark ? '#e8d98a' : '#1a1200',
    // Document text adapts to theme
    '--text-doc':       dark ? '#e8d98a' : '#1a1a1a',
    '--text-on-gold':   '#0a0800',

    // ── Gold accent ───────────────────────────────────────────────
    '--gold':          '#c9a84c',
    '--gold-hover':    '#d9bb67',
    '--gold-dim':      dark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.18)',
    '--gold-glow':     dark ? 'none' : '0 0 0 3px rgba(212,175,55,0.2)',
    '--gold-border':   dark ? 'rgba(212,175,55,0.35)' : 'rgba(212,175,55,0.5)',

    // ── Shadows ───────────────────────────────────────────────────
    '--shadow-sm':   dark ? 'none' : '0 1px 4px rgba(0,0,0,0.09)',
    '--shadow-md':   dark ? 'none' : '0 2px 10px rgba(0,0,0,0.13)',
    '--shadow-lg':   dark ? 'none' : '0 6px 24px rgba(0,0,0,0.12)',
    '--shadow-page': dark ? 'none' : '0 2px 12px rgba(0,0,0,0.10)',

    // ── Fonts ─────────────────────────────────────────────────────
    '--font-ui': "'Segoe UI', Arial, sans-serif",
    '--font-heading': "'Spectral', 'Georgia', serif",
    '--font-body': "'Segoe UI', Arial, sans-serif",
    '--font-mono': "'JetBrains Mono', 'SF Mono', monospace",

    // ── Radius / transitions ──────────────────────────────────────
    '--radius-sm':    '2px',
    '--radius-md':    '6px',
    '--radius-lg':    '10px',
    '--radius-xl':    '16px',
    '--transition':   '140ms ease',
    '--transition-md':'260ms ease',
  };

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', mode);
}
