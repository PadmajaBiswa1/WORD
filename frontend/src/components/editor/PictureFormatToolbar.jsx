import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore, useUIStore } from '@/store';
import { PictureFormatTab } from '@/components/toolbar/tabs/PictureFormatTab';

function selectedImageElement() {
  return document.querySelector('.ProseMirror img.ProseMirror-selectednode')
    || document.querySelector('.ProseMirror .ProseMirror-selectednode img');
}

function isImageSelection(editor) {
  return Boolean(
    editor?.isActive?.('image')
    || editor?.state?.selection?.node?.type?.name === 'image'
  );
}

function getImageBounds(editor) {
  const img = selectedImageElement();
  if (img) {
    const rect = img.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
    };
  }

  if (!editor?.view?.dom) return null;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.view.dom.contains(range.commonAncestorContainer)) return null;

  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 || rect.height > 0);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { centerX: (left + right) / 2, top, bottom };
}

export function PictureFormatToolbar({ editor, scrollContainerRef }) {
   const { theme } = useUIStore();
   const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef(null);
  const hideTimerRef = useRef(null);

  const hideToolbar = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setVisible(false);
    hideTimerRef.current = setTimeout(() => {
      setMounted(false);
      setAnchor(null);
    }, 180);
  }, []);

  const showToolbar = useCallback(() => {
    if (!editor) return;
    if (!isImageSelection(editor)) {
      hideToolbar();
      return;
    }
    const nextAnchor = getImageBounds(editor);
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
    const width = rect.width || 860;
    const height = rect.height || 260;
    const padding = 12;
    const centerX = Math.max(width / 2 + padding, Math.min(window.innerWidth - width / 2 - padding, anchor.centerX));
    let top = anchor.bottom + 12;
    if (top + height > window.innerHeight - padding) {
      top = Math.max(padding, anchor.top - height - 12);
    }
    setPosition({ top, left: centerX });
  }, [anchor]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    positionToolbar();
    const raf = requestAnimationFrame(positionToolbar);
    return () => cancelAnimationFrame(raf);
  }, [mounted, positionToolbar]);

  useEffect(() => {
    if (!editor) return undefined;

    const syncFromSelection = () => {
      if (!isImageSelection(editor)) {
        hideToolbar();
        return;
      }
      showToolbar();
    };

    const handleWindowInteraction = () => {
      if (!mounted || !anchor) return;
      positionToolbar();
    };

    syncFromSelection();
    editor.on('selectionUpdate', syncFromSelection);
    editor.on('update', syncFromSelection);
    window.addEventListener('resize', handleWindowInteraction);

    const scrollEl = scrollContainerRef?.current;
    if (scrollEl) scrollEl.addEventListener('scroll', handleWindowInteraction, { passive: true });

    return () => {
      editor.off('selectionUpdate', syncFromSelection);
      editor.off('update', syncFromSelection);
      window.removeEventListener('resize', handleWindowInteraction);
      if (scrollEl) scrollEl.removeEventListener('scroll', handleWindowInteraction);
    };
  }, [anchor, editor, hideToolbar, mounted, positionToolbar, scrollContainerRef, showToolbar]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  if (!mounted || !editor) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: `translate(-50%, ${visible ? '0' : '-6px'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 160ms ease, transform 160ms ease',
        zIndex: 5200,
        maxWidth: 'min(94vw, 1120px)',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          border: '1px solid var(--border-gold)',
          borderRadius: 10,
          background: theme === 'dark' ? 'rgba(18, 18, 18, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          color: 'var(--text-primary)',
          boxShadow: theme === 'dark'
            ? '0 20px 36px rgba(0, 0, 0, 0.42)'
            : '0 18px 32px rgba(0, 0, 0, 0.14)',
          backdropFilter: 'blur(10px)',
          overflowX: 'auto',
          maxHeight: '70vh',
        }}
      >
        <PictureFormatTab />
      </div>
    </div>,
    document.body,
  );
}