import { useLocation, useNavigate } from 'react-router-dom';
import { useCollaborationStore, useDocumentStore, useEditorStore, useUIStore } from '@/store';
import { useTheme } from '@/hooks/useTheme';

export function TitleBar({ onSave }) {
  const navigate = useNavigate();
  const location = useLocation();
  const openDialog = useUIStore((s) => s.openDialog);
  const fullscreen = useUIStore((s) => s.fullscreen);
  const toggleFullscreen = useUIStore((s) => s.toggleFullscreen);
  const toggleRibbon = useUIStore((s) => s.toggleRibbon);
  const ribbonCollapsed = useUIStore((s) => s.ribbonCollapsed);
  const autoSaveEnabled = useUIStore((s) => s.autoSaveEnabled);
  const toggleAutoSave = useUIStore((s) => s.toggleAutoSave);
  const title = useDocumentStore((s) => s.title);
  const setTitle = useDocumentStore((s) => s.setTitle);
  const editor = useEditorStore((s) => s.editor);
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const collabStatus = useCollaborationStore((s) => s.status);
  const { theme, toggleTheme } = useTheme();
  const visibleCollaborators = collaborators.slice(0, 3);

  const canUndo = Boolean(editor?.can?.().undo?.());
  const canRedo = Boolean(editor?.can?.().redo?.());

  const handleUndo = () => {
    if (!editor) return;
    editor.chain().focus().undo().run();
  };

  const handleRedo = () => {
    if (!editor) return;
    editor.chain().focus().redo().run();
  };

  const handleClose = () => {
    navigate('/home', { state: { returnTo: location.pathname } });
  };

  const onGoldHover = (e) => {
    e.currentTarget.style.background = 'var(--bg-hover)';
    e.currentTarget.style.borderColor = 'var(--gold)';
  };
  const onGoldLeave = (e) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = 'transparent';
  };

  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      padding: '0 8px', flexShrink: 0, userSelect: 'none', fontFamily: 'var(--font-ui)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 2, background: 'var(--bg-elevated)', color: 'var(--gold)',
          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
        }}>W</div>
        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>AutoSave {autoSaveEnabled ? 'On' : 'Off'}</span>
        <button
          onClick={toggleAutoSave}
          style={{
            width: 30, height: 16, borderRadius: 999, border: '1px solid #c9a84c',
            background: 'var(--bg-elevated)', cursor: 'pointer', padding: 1, position: 'relative',
          }}
          title="Toggle AutoSave"
        >
          <span style={{
            width: 12, height: 12, borderRadius: '50%', background: 'var(--gold)', display: 'block',
            transform: `translateX(${autoSaveEnabled ? 14 : 0}px)`, transition: 'transform 0.1s ease',
          }} />
        </button>
        <button title="Save" onClick={onSave} style={quickBtn} onMouseEnter={onGoldHover} onMouseLeave={onGoldLeave}>💾</button>
        <button title="Undo" onClick={handleUndo} disabled={!canUndo} style={{ ...quickBtn, ...(canUndo ? null : disabledBtn) }} onMouseEnter={onGoldHover} onMouseLeave={onGoldLeave}>↩</button>
        <button title="Redo" onClick={handleRedo} disabled={!canRedo} style={{ ...quickBtn, ...(canRedo ? null : disabledBtn) }} onMouseEnter={onGoldHover} onMouseLeave={onGoldLeave}>↪</button>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 'min(520px, 52vw)', height: 24, background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 2, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6,
        }}>
          <span style={{ color: 'var(--gold)', fontSize: 12 }}>✎</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Document"
            style={{
              border: 'none', background: 'transparent', outline: 'none', width: '100%',
              color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-ui)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          style={outlineBtn}
          onMouseEnter={onGoldHover}
          onMouseLeave={onGoldLeave}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀ Light'}
        </button>
        <div style={presenceWrap} title={collabStatus}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{collabStatus}</span>
          {visibleCollaborators.map((person, index) => (
            <span key={person.sessionId || `${person.name}-${index}`} style={presenceBadge}>
              {(person.name || 'G').slice(0, 2).toUpperCase()}
            </span>
          ))}
          {collaborators.length > visibleCollaborators.length ? (
            <span style={presenceCount}>+{collaborators.length - visibleCollaborators.length}</span>
          ) : null}
        </div>
        <button onClick={() => openDialog('comments')} style={outlineBtn} onMouseEnter={onGoldHover} onMouseLeave={onGoldLeave}>Comments</button>
        <button
          style={flatTextBtn}
          onClick={() => openDialog('restrictEditing')}
          onMouseEnter={onGoldHover}
          onMouseLeave={onGoldLeave}
          title="Open editing permissions"
        >
          Editing ▾
        </button>
        <button
          onClick={() => openDialog('shareDoc')}
          style={shareBtn}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#d9bb67'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}
        >
          Share
        </button>
        <button style={{
          ...quickBtn, background: 'var(--gold)', color: 'var(--text-on-gold)', borderColor: 'var(--gold)', fontWeight: 700,
        }} onMouseEnter={(e) => { e.currentTarget.style.background = '#d9bb67'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gold)'; }}>U</button>
        <button
          title="Toggle ribbon"
          onClick={toggleRibbon}
          style={windowBtn}
          onMouseEnter={onGoldHover}
          onMouseLeave={onGoldLeave}
        >
          {ribbonCollapsed ? '▔' : '—'}
        </button>
        <button title="Maximize" onClick={toggleFullscreen} style={windowBtn} onMouseEnter={onGoldHover} onMouseLeave={onGoldLeave}>{fullscreen ? '❐' : '⬜'}</button>
        <button
          title="Back to file menu"
          onClick={handleClose}
          style={windowBtn}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#c42b1c'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const quickBtn = {
  width: 22,
  height: 22,
  borderRadius: 2,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--gold)',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'background 0.1s, border-color 0.1s',
};

const outlineBtn = {
  ...quickBtn,
  width: 'auto',
  padding: '0 8px',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
};

const flatTextBtn = {
  ...quickBtn,
  width: 'auto',
  padding: '0 8px',
  color: 'var(--text-primary)',
};

const shareBtn = {
  ...quickBtn,
  width: 'auto',
  padding: '0 10px',
  background: 'var(--gold)',
  borderColor: 'var(--gold)',
  color: 'var(--text-on-gold)',
  fontWeight: 600,
};

const windowBtn = {
  ...quickBtn,
  color: 'var(--text-primary)',
};

const disabledBtn = {
  opacity: 0.35,
  cursor: 'not-allowed',
};

const presenceWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 6px',
};

const presenceBadge = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  background: 'rgba(212, 175, 55, 0.18)',
  border: '1px solid var(--border-gold)',
  color: 'var(--text-gold)',
  fontSize: 10,
  fontWeight: 700,
};

const presenceCount = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  minWidth: 20,
};
