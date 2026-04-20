// ═══════════════════════════════════════════════════════════════
//  EtherX Word — UI Primitives
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/store';

/* ── Button ─────────────────────────────────────────────────── */
const variantStyle = {
  ghost:   { bg: 'transparent', color: 'var(--text-primary)', hoverBg: 'var(--bg-hover)', activeBg: 'var(--bg-active)' },
  primary: { bg: 'var(--gold)', color: 'var(--text-on-gold)', hoverBg: 'var(--gold-hover)', activeBg: 'var(--gold)' },
  outline: { bg: 'transparent', color: 'var(--gold)', hoverBg: 'var(--gold-dim)', activeBg: 'var(--gold-dim)', border: '1px solid var(--gold-border)' },
  danger:  { bg: '#c0392b',        color: '#fff',                  hoverBg: '#e74c3c', activeBg: '#c0392b' },
  subtle:  { bg: 'var(--bg-elevated)', color: 'var(--text-secondary)', hoverBg: 'var(--bg-hover)', activeBg: 'var(--bg-active)' },
};

export function Button({ children, onClick, onMouseDown, variant = 'ghost', size = 'sm', active = false, disabled = false, title, className = '', style = {} }) {
  const v = variantStyle[variant] || variantStyle.ghost;
  const pad = { xs: '2px 5px', sm: '3px 8px', md: '6px 14px', lg: '8px 20px' }[size] || '3px 8px';
  const fz  = { xs: '11px', sm: '12px', md: '13px', lg: '14px' }[size] || '12px';

  return (
    <button
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseDown={disabled ? undefined : onMouseDown}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        minWidth: 22, minHeight: 22, padding: pad, fontSize: fz, fontFamily: 'var(--font-ui)', fontWeight: 500,
        background: active ? v.activeBg : v.bg,
        color: active ? (variant === 'ghost' ? 'var(--gold)' : v.color) : v.color,
        border: v.border || '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background 0.1s, border-color 0.1s, color 0.1s',
        userSelect: 'none', whiteSpace: 'nowrap', outline: 'none',
        ...style,
      }}
      className={className}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = v.hoverBg;
          e.currentTarget.style.borderColor = 'var(--gold)';
          if (variant === 'ghost') e.currentTarget.style.color = 'var(--gold)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = active ? v.activeBg : v.bg;
          e.currentTarget.style.borderColor = v.border ? 'var(--gold-border)' : 'transparent';
          if (variant === 'ghost') e.currentTarget.style.color = active ? 'var(--gold)' : v.color;
        }
      }}
    >
      {children}
    </button>
  );
}

/* ── Divider ────────────────────────────────────────────────── */
export function Divider({ vertical = false }) {
  return (
    <div style={{
      background: 'var(--border-strong)', flexShrink: 0,
      ...(vertical ? { width: '1px', height: '26px', margin: '0 3px' } : { height: '1px', margin: '4px 0' }),
    }} />
  );
}

/* ── Tooltip ────────────────────────────────────────────────── */
export function Tooltip({ children, text, shortcut, placement = 'top' }) {
  const [show, setShow] = useState(false);
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const isTop = placement === 'top';
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div className="anim-fade-in" style={{
          position: 'absolute', zIndex: 9999, whiteSpace: 'nowrap', pointerEvents: 'none',
          background: isDark ? '#0a0800' : '#ffffff',
          color: isDark ? '#ece8dc' : '#1a1a1a',
          border: '1px solid var(--border-gold)',
          fontSize: '11px', padding: '4px 9px', borderRadius: 'var(--radius-sm)',
          ...(isTop ? { bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' }
                     : { top: 'calc(100% + 7px)',   left: '50%', transform: 'translateX(-50%)' }),
        }}>
          {text}
          {shortcut && <span style={{ color: 'var(--gold)', marginLeft: 6, fontSize: '10px' }}>{shortcut}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Select ─────────────────────────────────────────────────── */
export function Select({ value, onChange, options = [], width = 120, title }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  
  const styles = {
    background: isDark ? '#111111' : '#ffffff',
    color: isDark ? '#f0e6c8' : '#1a1a1a',
    border: isDark ? '1px solid #3d3000' : '1px solid #d0d0d0',
    hoverBg: isDark ? '#1f1800' : '#f5efd0',
    arrowColor: '#c9a84c',
  };
  
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title={title}
      style={{
        height: 22,
        background: styles.background,
        color: styles.color,
        border: styles.border,
        borderRadius: 2,
        padding: '0 22px 0 6px',
        fontSize: '12px',
        fontFamily: 'var(--font-ui)',
        width,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: `linear-gradient(45deg, transparent 50%, ${styles.arrowColor} 50%), linear-gradient(135deg, ${styles.arrowColor} 50%, transparent 50%)`,
        backgroundPosition: 'calc(100% - 12px) 9px, calc(100% - 7px) 9px',
        backgroundSize: '5px 5px, 5px 5px',
        backgroundRepeat: 'no-repeat',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = styles.hoverBg; e.currentTarget.style.borderColor = '#c9a84c'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = styles.background; e.currentTarget.style.borderColor = styles.border.split('solid ')[1]; }}
      onFocus={(e) => (e.target.style.borderColor = '#c9a84c')}
      onBlur={(e)  => (e.target.style.borderColor = styles.border.split('solid ')[1])}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Input ──────────────────────────────────────────────────── */
export function Input({ value, onChange, placeholder, width = '100%', type = 'text', autoFocus, onKeyDown, rows }) {
  const base = {
    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '6px 10px', fontSize: '13px', fontFamily: 'var(--font-ui)',
    width, outline: 'none', transition: 'border-color var(--transition)',
    resize: rows ? 'vertical' : undefined,
  };
  const handlers = {
    onFocus: (e) => (e.target.style.borderColor = 'var(--gold)'),
    onBlur:  (e) => (e.target.style.borderColor = 'var(--border)'),
  };
  return rows
    ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        rows={rows} style={base} {...handlers} />
    : <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus} onKeyDown={onKeyDown}
        style={base} {...handlers} />;
}

/* ── ColorSwatch ────────────────────────────────────────────── */
export function ColorSwatch({ color, onSelect, label, size = 18 }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const borderColor = isDark ? '#3d3000' : '#d0d0d0';
  
  return (
    <button title={label || color} onClick={() => onSelect(color)}
      style={{
        width: size, height: size, background: color,
        border: `1px solid ${borderColor}`, borderRadius: '2px',
        cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c9a84c'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; }}
    />
  );
}

/* ── Modal ──────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, width = 480, noPad = false }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div className="anim-scale-in" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-gold)',
        borderRadius: 'var(--radius-lg)', width, maxWidth: '95vw', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 0 1px rgba(212,175,55,0.08), var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--gold)', fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding: noPad ? 0 : 20, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Label ──────────────────────────────────────────────────── */
export function Label({ children, style }) {
  return <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5, ...style }}>{children}</div>;
}

/* ── Stack ──────────────────────────────────────────────────── */
export function Stack({ children, gap = 10, dir = 'column', align, justify, style }) {
  return (
    <div style={{ display:'flex', flexDirection:dir, gap, alignItems:align, justifyContent:justify, ...style }}>
      {children}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────── */
export function Badge({ children, color = 'var(--gold)' }) {
  return (
    <span style={{
      background: color, color: 'var(--text-on-gold)', fontSize: 9, fontWeight: 700,
      padding: '1px 5px', borderRadius: 999, fontFamily: 'var(--font-ui)', letterSpacing: '.04em',
    }}>{children}</span>
  );
}

/* ── NumberInput ────────────────────────────────────────────── */
export function NumberInput({ value, onChange, min = 1, max = 100, label }) {
  return (
    <Stack dir="column" gap={4}>
      {label && <Label>{label}</Label>}
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))}
          style={{ width:24, height:24, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text-primary)', fontSize:14 }}>−</button>
        <input type="number" value={value} min={min} max={max}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          style={{ width:48, textAlign:'center', background:'var(--bg-elevated)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'3px 6px', fontSize:13, fontFamily:'var(--font-ui)', outline:'none' }} />
        <button onClick={() => onChange(Math.min(max, value + 1))}
          style={{ width:24, height:24, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', color:'var(--text-primary)', fontSize:14 }}>+</button>
      </div>
    </Stack>
  );
}
