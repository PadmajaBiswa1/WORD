import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditorSetup } from '@/hooks/useEditorSetup';
import { useThumbnailGenerator } from '@/hooks/useThumbnailGenerator';
import { useImageResizeAndDrag } from '@/hooks/useImageResizeAndDrag';
import { HorizontalRuler } from './HorizontalRuler';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';
import { PictureFormatToolbar } from './PictureFormatToolbar';
import { useUIStore, useDocumentStore, useCollaborationStore } from '@/store';

const HEADER_FOOTER_STORAGE_KEY = 'etherx-header-footer-meta';

const PAGE_HEIGHT  = 1123; // A4 height in pixels (at 96 DPI)
const PAGE_WIDTH   = 794;  // A4 width in pixels (at 96 DPI)
const PAGE_PADDING = 96;   // Top and bottom padding (48px each side = 96px total)
const PAGE_GAP = 18;       // Visual gap between pages in print-layout view
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING * 2 - PAGE_GAP;

function colorFromString(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    stroke: `hsl(${hue}, 75%, 45%)`,
    fill: `hsla(${hue}, 85%, 42%, 0.18)`,
  };
}

export function EditorCanvas() {
  const editor    = useEditorSetup();
  const { zoom, setActivePage, rulerVisible }  = useUIStore();
  const { setStats, headerFooter, setHeaderFooter } = useDocumentStore();
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const sessionId = useCollaborationStore((s) => s.sessionId);
  const scale     = zoom / 100;
  const wrapRef   = useRef();
  const scrollRef = useRef();
  const [pageCount, setPageCount] = useState(1);
  const [remoteCarets, setRemoteCarets] = useState([]);
  const [remoteSelections, setRemoteSelections] = useState([]);
  const overflowTimer = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HEADER_FOOTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setHeaderFooter(parsed);
      }
    } catch {
      // ignore storage errors
    }
  }, [setHeaderFooter]);

  // Generate and update thumbnails
  useThumbnailGenerator();

  // Enable image resize and drag functionality
  useImageResizeAndDrag(wrapRef);
  
  // Calculate scaled dimensions for responsive sizing
  const scaledDimensions = useMemo(() => ({
    pageHeight: PAGE_HEIGHT * scale,
    pageWidth: PAGE_WIDTH * scale,
    padding: PAGE_PADDING * scale,
    pageGap: PAGE_GAP * scale,
    contentHeight: CONTENT_HEIGHT * scale,
    scrollPaddingY: 40 * scale,
    scrollPaddingX: 20 * scale,
  }), [scale]);

  // Debounced page count — reads height only, never touches Tiptap DOM
const recalcPages = useCallback(() => {
   clearTimeout(overflowTimer.current);
   overflowTimer.current = setTimeout(() => {
     const el = wrapRef.current?.querySelector('.ProseMirror');
     if (!el) return;
     const contentHeight = scaledDimensions.contentHeight || 1;
     const pages = Math.max(1, Math.min(500, Math.ceil(el.scrollHeight / contentHeight)));
     const text  = el.innerText || '';
     const words = text.trim().split(/\s+/).filter(Boolean).length;
     setPageCount(pages);
     setStats({ wordCount: words, charCount: text.length, pageCount: pages });
   }, 120);
 }, [setStats, scaledDimensions]);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', recalcPages);
    return () => editor.off('update', recalcPages);
  }, [editor, recalcPages]);

  useEffect(() => {
    recalcPages();
  }, [recalcPages, zoom]);

  useEffect(() => {
    const onResize = () => recalcPages();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcPages]);

  useEffect(() => {
    if (!editor || !wrapRef.current) {
      setRemoteCarets([]);
      setRemoteSelections([]);
      return undefined;
    }

    const syncRemoteCarets = () => {
      const container = wrapRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const docSize = editor.state.doc.content.size;

      const nextCarets = collaborators
        .filter((person) => person?.sessionId && person.sessionId !== sessionId)
        .map((person) => {
          const rawCursor = Number(person?.cursor?.cursor ?? person?.cursor);
          if (!Number.isFinite(rawCursor)) return null;

          const safePos = Math.max(1, Math.min(docSize, Math.floor(rawCursor)));
          try {
            const coords = editor.view.coordsAtPos(safePos);
            const palette = colorFromString(person.sessionId || person.name || 'user');
            return {
              id: person.sessionId,
              name: person.name || 'Guest',
              top: coords.top - containerRect.top,
              left: coords.left - containerRect.left,
              stroke: palette.stroke,
              fill: palette.fill,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const nextSelections = collaborators
        .filter((person) => person?.sessionId && person.sessionId !== sessionId)
        .map((person) => {
          const rawFrom = Number(person?.cursor?.from);
          const rawTo = Number(person?.cursor?.to);
          if (!Number.isFinite(rawFrom) || !Number.isFinite(rawTo)) return null;

          const from = Math.max(1, Math.min(docSize, Math.floor(rawFrom)));
          const to = Math.max(1, Math.min(docSize, Math.floor(rawTo)));
          if (from === to) return null;

          const start = Math.min(from, to);
          const end = Math.max(from, to);

          try {
            const fromDOM = editor.view.domAtPos(start);
            const toDOM = editor.view.domAtPos(end);
            const range = document.createRange();
            range.setStart(fromDOM.node, fromDOM.offset);
            range.setEnd(toDOM.node, toDOM.offset);

            const palette = colorFromString(person.sessionId || person.name || 'user');
            const rects = Array.from(range.getClientRects());

            if (!rects.length) {
              return null;
            }

            return rects.map((rect, index) => ({
              id: `${person.sessionId}-${start}-${end}-${index}`,
              top: rect.top - containerRect.top,
              left: rect.left - containerRect.left,
              width: Math.max(2, rect.width),
              height: Math.max(12, rect.height),
              fill: palette.fill,
              stroke: palette.stroke,
            }));
          } catch {
            return null;
          }
        })
        .flat()
        .filter(Boolean);

      setRemoteCarets(nextCarets);
      setRemoteSelections(nextSelections);
    };

    syncRemoteCarets();
    editor.on('selectionUpdate', syncRemoteCarets);
    editor.on('update', syncRemoteCarets);
    const onWindowResize = () => syncRemoteCarets();
    window.addEventListener('resize', onWindowResize);
    const scrollEl = scrollRef.current;
    if (scrollEl) scrollEl.addEventListener('scroll', syncRemoteCarets, { passive: true });

    return () => {
      editor.off('selectionUpdate', syncRemoteCarets);
      editor.off('update', syncRemoteCarets);
      window.removeEventListener('resize', onWindowResize);
      if (scrollEl) scrollEl.removeEventListener('scroll', syncRemoteCarets);
    };
  }, [collaborators, editor, sessionId]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const onScroll = () => {
      const approx = Math.floor((scrollEl.scrollTop + scaledDimensions.pageHeight * 0.35) / scaledDimensions.pageHeight);
      const clamped = Math.max(0, Math.min(pageCount - 1, approx));
      setActivePage(clamped);
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [scaledDimensions.pageHeight, pageCount, setActivePage]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(overflowTimer.current);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Horizontal Ruler */}
      {rulerVisible && (
        <div id="etherx-ruler" style={{ borderBottom: '1px solid var(--border)', display: 'flex' }}>
          <HorizontalRuler />
        </div>
      )}

      {/* Editor scroll area */}
      <div
        ref={scrollRef}
        id="editor-scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          background: 'var(--bg-app)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `${scaledDimensions.scrollPaddingY}px ${scaledDimensions.scrollPaddingX}px`,
          scrollBehavior: 'smooth',
        }}
      >
      {/* A4 page container */}
      <div
        ref={wrapRef}
        id="document-page-0"
style={{
           width:     scaledDimensions.pageWidth,
           minHeight: Math.min(100000, scaledDimensions.pageHeight * Math.max(1, pageCount)),
           background: 'var(--bg-page)',
          boxShadow: 'var(--shadow-page)',
          borderRadius: 2,
          padding: `${scaledDimensions.padding}px`,
          position: 'relative',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          overflowX: 'hidden',
          transition: 'all 0.15s ease-out',

          // Word-like fixed page spacing strip between pages
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent,
            transparent ${scaledDimensions.pageHeight - scaledDimensions.pageGap}px,
            rgba(90,90,90,0.92) ${scaledDimensions.pageHeight - scaledDimensions.pageGap}px,
            rgba(90,90,90,0.92) ${scaledDimensions.pageHeight}px
          )`,
          backgroundSize: `100% ${scaledDimensions.pageHeight}px`,
        }}
      >
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={`anchor-${i}`}
            id={`document-page-${i}`}
            style={{
              position: 'absolute',
              top: i * scaledDimensions.pageHeight,
              left: 0,
              width: 1,
              height: 1,
              pointerEvents: 'none',
            }}
          />
        ))}

        <EditorContent editor={editor} />

        <FloatingFormatToolbar editor={editor} scrollContainerRef={scrollRef} />
        <PictureFormatToolbar editor={editor} scrollContainerRef={scrollRef} />

        {/* Remote collaborator selections */}
        {remoteSelections.map((selection) => (
          <div
            key={selection.id}
            style={{
              position: 'absolute',
              top: selection.top,
              left: selection.left,
              width: selection.width,
              height: selection.height,
              borderRadius: 3,
              background: selection.fill,
              outline: `1px solid ${selection.stroke}`,
              pointerEvents: 'none',
              zIndex: 6,
            }}
          />
        ))}

        {/* Remote collaborator carets */}
        {remoteCarets.map((caret) => (
          <div
            key={caret.id}
            style={{
              position: 'absolute',
              top: caret.top,
              left: caret.left,
              width: 1,
              pointerEvents: 'none',
              zIndex: 8,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 2,
                height: 20,
                background: caret.stroke,
                borderRadius: 1,
                boxShadow: `0 0 0 1px ${caret.fill}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: -18,
                left: 0,
                transform: 'translateX(-4px)',
                padding: '1px 6px',
                borderRadius: 999,
                fontFamily: 'var(--font-ui)',
                fontSize: 10,
                whiteSpace: 'nowrap',
                color: '#111',
                background: caret.stroke,
                border: `1px solid ${caret.stroke}`,
              }}
            >
              {caret.name}
            </div>
          </div>
        ))}

        {/* Page number labels */}
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={i}
            style={{
              position:      'absolute',
              top:           (i + 1) * scaledDimensions.pageHeight - (scaledDimensions.pageGap * 0.55),
              left:          0,
              right:         0,
              textAlign:     'center',
              fontSize:      10 * scale,
              color:         'var(--text-muted)',
              fontFamily:    'var(--font-ui)',
              pointerEvents: 'none',
              userSelect:    'none',
            }}
          >
            {i + 1}
          </div>
        ))}

        {headerFooter?.headerText ? Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={`header-${i}`}
            style={{
              position: 'absolute',
              top: i * scaledDimensions.pageHeight + Math.max(16, scaledDimensions.padding * 0.22),
              left: scaledDimensions.padding,
              right: scaledDimensions.padding,
              textAlign: String(headerFooter.headerAlign || 'Center').toLowerCase(),
              fontSize: 10 * scale,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)',
              pointerEvents: 'none',
              userSelect: 'none',
              borderBottom: '1px solid rgba(140,140,140,0.45)',
              paddingBottom: 6,
            }}
          >
            {headerFooter.headerText}
          </div>
        )) : null}

        {headerFooter?.footerText ? Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={`footer-${i}`}
            style={{
              position: 'absolute',
              top: (i + 1) * scaledDimensions.pageHeight - Math.max(32, scaledDimensions.padding * 0.3),
              left: scaledDimensions.padding,
              right: scaledDimensions.padding,
              textAlign: String(headerFooter.footerAlign || 'Center').toLowerCase(),
              fontSize: 10 * scale,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-ui)',
              pointerEvents: 'none',
              userSelect: 'none',
              borderTop: '1px solid rgba(140,140,140,0.45)',
              paddingTop: 6,
            }}
          >
            {headerFooter.footerText}
          </div>
        )) : null}

        {headerFooter?.pageNumberEnabled ? Array.from({ length: pageCount }).map((_, i) => {
          const [vpos, halign] = String(headerFooter.pageNumberStyle || 'bottom-center').split('-');
          const isTop = vpos === 'top';
          const pageNumber = Number(headerFooter.pageNumberStart || 1) + i;
          return (
            <div
              key={`pagenum-${i}`}
              style={{
                position: 'absolute',
                top: isTop ? (i * scaledDimensions.pageHeight + Math.max(32, scaledDimensions.padding * 0.3)) : ((i + 1) * scaledDimensions.pageHeight - Math.max(28, scaledDimensions.padding * 0.25)),
                left: scaledDimensions.padding,
                right: scaledDimensions.padding,
                textAlign: halign,
                fontSize: 10 * scale,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              Page {pageNumber}
            </div>
          );
        }) : null}
      </div>
      </div>
    </div>
  );
}