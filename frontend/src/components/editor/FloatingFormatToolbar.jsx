import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, ColorSwatch, Divider, Select, Tooltip } from '@/components/ui';
import { useEditorStore, useUIStore } from '@/store';
import { FontFormattingControls } from '../toolbar/fontFormatting.jsx';

const LINE_SPACING_VALUES = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
];

const TEXT_COLORS = ['#111111', '#7f8c8d', '#c0392b', '#d35400', '#b8860b', '#1f6feb', '#8e44ad', '#16a085'];
const HIGHLIGHT_COLORS = ['#fff59d', '#ffe08a', '#ffd6a5', '#c8f7c5', '#a8e0ff', '#f4c7f3', '#ffd1dc', '#d9f7be'];

function parseStyle(style = '') {
  const out = {};
  String(style).split(';').forEach((pair) => {
    const [key, value] = pair.split(':').map((s) => s?.trim());
    if (key && value) out[key] = value;
  });
  return out;
}

function toStyle(obj) {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

function isSelectionInsideEditor(editor) {
  if (!editor?.view?.dom) return false;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return editor.view.dom.contains(range.commonAncestorContainer);
}

function getSelectionBounds(editor) {
  if (!editor || !isSelectionInsideEditor(editor) || editor.state.selection.empty) return null;

  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  if (!rects.length) {
    const { from, to } = editor.state.selection;
    try {
      const fromCoords = editor.view.coordsAtPos(from);
      const toCoords = editor.view.coordsAtPos(to);
      const left = Math.min(fromCoords.left, toCoords.left);
      const right = Math.max(fromCoords.right, toCoords.right);
      const top = Math.min(fromCoords.top, toCoords.top);
      const bottom = Math.max(fromCoords.bottom, toCoords.bottom);
      return { centerX: (left + right) / 2, top, bottom };
    } catch {
      return null;
    }
  }

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { centerX: (left + right) / 2, top, bottom };
}

function isImageSelection(editor) {
  return Boolean(
    editor?.isActive?.('image')
    || editor?.state?.selection?.node?.type?.name === 'image'
  );
}

export function FloatingFormatToolbar({ editor, scrollContainerRef }) {
  const { theme } = useUIStore();
  const { fontFamily, fontSize, toast } = useEditorStore();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);
  const toolbarRef = useRef(null);
  const hideTimerRef = useRef(null);
  const pointerLockRef = useRef(false);

  const run = useCallback((callback) => {
    if (!editor) return;
    editor.view.focus();
    callback();
    editor.view.focus();
  }, [editor]);

  const updateParagraphStyle = useCallback((patch = {}) => {
    if (!editor) return;
    const base = editor.getAttributes('paragraph')?.style || '';
    const css = parseStyle(base);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') delete css[key];
      else css[key] = value;
    });
    run(() => editor.chain().updateAttributes('paragraph', { style: toStyle(css) }).run());
  }, [editor, run]);

  const hideToolbar = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setVisible(false);
    hideTimerRef.current = setTimeout(() => {
      setMounted(false);
      setAnchor(null);
      setTextColorOpen(false);
      setHighlightColorOpen(false);
    }, 180);
  }, []);

  const showToolbar = useCallback(() => {
    if (!editor) return;
    const nextAnchor = getSelectionBounds(editor);
    if (!nextAnchor) {
      hideToolbar();
      return;
    }
    setAnchor(nextAnchor);
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
  }, [editor, hideToolbar]);

  const positionToolbar = useCallback(() => {
    if (!toolbarRef.current || !anchor) return;
    const rect = toolbarRef.current.getBoundingClientRect();
    const width = rect.width || 640;
    const height = rect.height || 96;
    const padding = 12;
    const centerX = Math.max(width / 2 + padding, Math.min(window.innerWidth - width / 2 - padding, anchor.centerX));
    let top = anchor.top - height - 12;
    if (top < padding) {
      top = Math.min(window.innerHeight - height - padding, anchor.bottom + 12);
    }
    setPosition({ top, left: centerX });
  }, [anchor]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    positionToolbar();
    const raf = requestAnimationFrame(positionToolbar);
    return () => cancelAnimationFrame(raf);
  }, [mounted, positionToolbar, fontFamily, fontSize, textColorOpen, highlightColorOpen]);

  useEffect(() => {
    if (!editor) return undefined;

    const syncFromSelection = () => {
      if (editor.state.selection.empty || !isSelectionInsideEditor(editor) || isImageSelection(editor)) {
        hideToolbar();
        return;
      }
      showToolbar();
    };

    const handleWindowInteraction = () => {
      if (!mounted || !anchor) return;
      positionToolbar();
    };

    const handleBlur = () => {
      if (!pointerLockRef.current) hideToolbar();
    };

    syncFromSelection();
    editor.on('selectionUpdate', syncFromSelection);
    editor.on('update', syncFromSelection);
    editor.on('blur', handleBlur);
    window.addEventListener('resize', handleWindowInteraction);

    const scrollEl = scrollContainerRef?.current;
    if (scrollEl) scrollEl.addEventListener('scroll', handleWindowInteraction, { passive: true });

    return () => {
      editor.off('selectionUpdate', syncFromSelection);
      editor.off('update', syncFromSelection);
      editor.off('blur', handleBlur);
      window.removeEventListener('resize', handleWindowInteraction);
      if (scrollEl) scrollEl.removeEventListener('scroll', handleWindowInteraction);
    };
  }, [anchor, editor, hideToolbar, mounted, positionToolbar, scrollContainerRef, showToolbar]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (toolbarRef.current?.contains(event.target)) return;
      if (event.target.closest?.('[data-format-palette="true"]')) return;
      setTextColorOpen(false);
      setHighlightColorOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const applyTextColor = (color) => {
    run(() => editor.chain().setColor(color).run());
    setTextColorOpen(false);
  };

  const applyHighlightColor = (color) => {
    run(() => editor.chain().toggleHighlight({ color }).run());
    setHighlightColorOpen(false);
  };

  const clearFormatting = () => {
    run(() => editor.chain().clearNodes().unsetAllMarks().run());
  };

  const cycleLineSpacing = (value) => {
    updateParagraphStyle({ 'line-height': value });
  };

  const currentTextColor = editor?.getAttributes('textStyle')?.color || '';
  const currentHighlight = editor?.getAttributes('highlight')?.color || '';
  const currentAlignment = editor?.getAttributes('paragraph')?.textAlign || 'left';
  const paragraphStyle = editor?.getAttributes('paragraph')?.style || '';
  const currentLineSpacing = parseStyle(paragraphStyle)['line-height'] || '1';

  if (!mounted || !editor) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      onMouseDown={(event) => {
        event.preventDefault();
        pointerLockRef.current = true;
        window.setTimeout(() => { pointerLockRef.current = false; }, 0);
      }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: `translate(-50%, ${visible ? '0' : '-6px'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 160ms ease, transform 160ms ease',
        zIndex: 5000,
        maxWidth: 'min(92vw, 1080px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 4,
          padding: '8px 10px',
          border: '1px solid var(--border-gold)',
          borderRadius: 8,
          background: theme === 'dark' ? 'rgba(18, 18, 18, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          color: 'var(--text-primary)',
          boxShadow: theme === 'dark'
            ? '0 20px 36px rgba(0, 0, 0, 0.38)'
            : '0 18px 32px rgba(0, 0, 0, 0.14)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <FontFormattingControls
          editor={editor}
          fontFamily={fontFamily}
          fontSize={fontSize}
          familyWidth={140}
          sizeWidth={64}
        />

        <Divider vertical />

        <Tooltip text="Bold" shortcut="Ctrl+B">
          <Button active={editor.isActive('bold')} onClick={() => run(() => editor.chain().toggleBold().run())}>B</Button>
        </Tooltip>
        <Tooltip text="Italic" shortcut="Ctrl+I">
          <Button active={editor.isActive('italic')} onClick={() => run(() => editor.chain().toggleItalic().run())}>I</Button>
        </Tooltip>
        <Tooltip text="Underline" shortcut="Ctrl+U">
          <Button active={editor.isActive('underline')} onClick={() => run(() => editor.chain().toggleUnderline().run())}>U</Button>
        </Tooltip>
        <Tooltip text="Strikethrough">
          <Button active={editor.isActive('strike')} onClick={() => run(() => editor.chain().toggleStrike().run())}>S</Button>
        </Tooltip>

        <Divider vertical />

        <Tooltip text="Text Color">
          <Button active={textColorOpen} onClick={() => setTextColorOpen((value) => !value)} style={{ minWidth: 30 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: currentTextColor || '#111111', border: '1px solid var(--border)' }} />
              A
            </span>
          </Button>
        </Tooltip>
        <Tooltip text="Highlight Color">
          <Button active={highlightColorOpen} onClick={() => setHighlightColorOpen((value) => !value)} style={{ minWidth: 30 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: currentHighlight || '#fff59d', border: '1px solid var(--border)' }} />
              H
            </span>
          </Button>
        </Tooltip>
        <Tooltip text="Clear Formatting">
          <Button onClick={clearFormatting}>Clear</Button>
        </Tooltip>

        <Divider vertical />

        <Tooltip text="Align Left" shortcut="Ctrl+L">
          <Button active={currentAlignment === 'left'} onClick={() => run(() => editor.chain().setTextAlign('left').run())}>L</Button>
        </Tooltip>
        <Tooltip text="Align Center" shortcut="Ctrl+E">
          <Button active={currentAlignment === 'center'} onClick={() => run(() => editor.chain().setTextAlign('center').run())}>C</Button>
        </Tooltip>
        <Tooltip text="Align Right" shortcut="Ctrl+R">
          <Button active={currentAlignment === 'right'} onClick={() => run(() => editor.chain().setTextAlign('right').run())}>R</Button>
        </Tooltip>
        <Tooltip text="Justify">
          <Button active={currentAlignment === 'justify'} onClick={() => run(() => editor.chain().setTextAlign('justify').run())}>J</Button>
        </Tooltip>

        <Divider vertical />

        <Tooltip text="Bullets">
          <Button active={editor.isActive('bulletList')} onClick={() => run(() => editor.chain().toggleBulletList().run())}>•</Button>
        </Tooltip>
        <Tooltip text="Numbering">
          <Button active={editor.isActive('orderedList')} onClick={() => run(() => editor.chain().toggleOrderedList().run())}>1.</Button>
        </Tooltip>
        <Tooltip text="Line Spacing">
          <Select
            value={currentLineSpacing}
            onChange={cycleLineSpacing}
            options={LINE_SPACING_VALUES}
            width={82}
            title="Line Spacing"
          />
        </Tooltip>

        {textColorOpen && (
          <div
            data-format-palette="true"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 12,
              zIndex: 1,
              padding: 8,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {TEXT_COLORS.map((color) => (
              <ColorSwatch key={color} color={color} onSelect={applyTextColor} size={18} />
            ))}
          </div>
        )}

        {highlightColorOpen && (
          <div
            data-format-palette="true"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 120,
              zIndex: 1,
              padding: 8,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
            }}
          >
            {HIGHLIGHT_COLORS.map((color) => (
              <ColorSwatch key={color} color={color} onSelect={applyHighlightColor} size={18} />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
