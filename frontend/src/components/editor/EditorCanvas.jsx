import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorContent } from '@tiptap/react';
import { useEditorSetup } from '@/hooks/useEditorSetup';
import { useThumbnailGenerator } from '@/hooks/useThumbnailGenerator';
import { useImageResizeAndDrag } from '@/hooks/useImageResizeAndDrag';
import { HorizontalRuler } from './HorizontalRuler';
import { useUIStore, useDocumentStore, useCollaborationStore } from '@/store';

const HEADER_FOOTER_STORAGE_KEY = 'etherx-header-footer-meta';

// ── A4 page geometry (96 DPI) ────────────────────────────────────
const PAGE_HEIGHT    = 1123;   // A4 height in px
const PAGE_WIDTH     = 794;    // A4 width  in px
const PAGE_MARGIN_V  = 96;     // 1-inch top & bottom margin per page
const PAGE_MARGIN_H  = 96;     // 1-inch left & right margin
const PAGE_GAP       = 32;     // Gray gap rendered between pages
// Usable text area per page (no gap needed here, gap is separate)
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_MARGIN_V * 2;   // 931 px

function colorFromString(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    stroke: `hsl(${hue}, 75%, 45%)`,
    fill:   `hsla(${hue}, 85%, 42%, 0.18)`,
  };
}

export function EditorCanvas() {
  const editor     = useEditorSetup();
  const { zoom, setActivePage, rulerVisible } = useUIStore();
  const { setStats, headerFooter, setHeaderFooter } = useDocumentStore();
  const collaborators = useCollaborationStore((s) => s.collaborators);
  const sessionId     = useCollaborationStore((s) => s.sessionId);
  const scale      = zoom / 100;
  const wrapRef    = useRef();
  const scrollRef  = useRef();
  const [pageCount, setPageCount]         = useState(1);
  const [remoteCarets, setRemoteCarets]   = useState([]);
  const [remoteSelections, setRemoteSelections] = useState([]);
  const overflowTimer = useRef(null);

  // Load persisted header/footer
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HEADER_FOOTER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setHeaderFooter(parsed);
    } catch { /* ignore */ }
  }, [setHeaderFooter]);

  useThumbnailGenerator();
  useImageResizeAndDrag(wrapRef);

  // ── Scaled dimensions (recalc on zoom) ──────────────────────
  const sd = useMemo(() => ({
    pageHeight:    PAGE_HEIGHT    * scale,
    pageWidth:     PAGE_WIDTH     * scale,
    marginV:       PAGE_MARGIN_V  * scale,
    marginH:       PAGE_MARGIN_H  * scale,
    pageGap:       PAGE_GAP       * scale,
    contentHeight: CONTENT_HEIGHT * scale,
  }), [scale]);

  // Height of one "page slot" = page + gap below it
  const pageSlotHeight = sd.pageHeight + sd.pageGap;

  // Total canvas height: all pages + all inter-page gaps
  const totalHeight = sd.pageHeight * pageCount + sd.pageGap * Math.max(0, pageCount - 1);

  // ── Debounced page-count recalculation ───────────────────────
  const recalcPages = useCallback(() => {
    clearTimeout(overflowTimer.current);
    overflowTimer.current = setTimeout(() => {
      const el = wrapRef.current?.querySelector('.ProseMirror');
      if (!el) return;
      const pages = Math.max(1, Math.ceil(el.scrollHeight / sd.contentHeight));
      const text  = el.innerText || '';
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setPageCount(pages);
      setStats({ wordCount: words, charCount: text.length, pageCount: pages });
    }, 120);
  }, [setStats, sd.contentHeight]);

  useEffect(() => {
    if (!editor) return;
    editor.on('update', recalcPages);
    return () => editor.off('update', recalcPages);
  }, [editor, recalcPages]);

  useEffect(() => { recalcPages(); }, [recalcPages, zoom]);

  useEffect(() => {
    const onResize = () => recalcPages();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcPages]);

  // ── Remote-collaborator caret / selection sync ───────────────
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
        .filter((p) => p?.sessionId && p.sessionId !== sessionId)
        .map((p) => {
          const rawCursor = Number(p?.cursor?.cursor ?? p?.cursor);
          if (!Number.isFinite(rawCursor)) return null;
          const safePos = Math.max(1, Math.min(docSize, Math.floor(rawCursor)));
          try {
            const coords  = editor.view.coordsAtPos(safePos);
            const palette = colorFromString(p.sessionId || p.name || 'user');
            return {
              id:     p.sessionId,
              name:   p.name || 'Guest',
              top:    coords.top  - containerRect.top,
              left:   coords.left - containerRect.left,
              stroke: palette.stroke,
              fill:   palette.fill,
            };
          } catch { return null; }
        })
        .filter(Boolean);

      const nextSelections = collaborators
        .filter((p) => p?.sessionId && p.sessionId !== sessionId)
        .map((p) => {
          const rawFrom = Number(p?.cursor?.from);
          const rawTo   = Number(p?.cursor?.to);
          if (!Number.isFinite(rawFrom) || !Number.isFinite(rawTo)) return null;
          const from  = Math.max(1, Math.min(docSize, Math.floor(rawFrom)));
          const to    = Math.max(1, Math.min(docSize, Math.floor(rawTo)));
          if (from === to) return null;
          const start = Math.min(from, to);
          const end   = Math.max(from, to);
          try {
            const fromDOM = editor.view.domAtPos(start);
            const toDOM   = editor.view.domAtPos(end);
            const range   = document.createRange();
            range.setStart(fromDOM.node, fromDOM.offset);
            range.setEnd(toDOM.node, toDOM.offset);
            const palette = colorFromString(p.sessionId || p.name || 'user');
            const rects   = Array.from(range.getClientRects());
            if (!rects.length) return null;
            return rects.map((rect, idx) => ({
              id:     `${p.sessionId}-${start}-${end}-${idx}`,
              top:    rect.top    - containerRect.top,
              left:   rect.left   - containerRect.left,
              width:  Math.max(2,  rect.width),
              height: Math.max(12, rect.height),
              fill:   palette.fill,
              stroke: palette.stroke,
            }));
          } catch { return null; }
        })
        .flat()
        .filter(Boolean);

      setRemoteCarets(nextCarets);
      setRemoteSelections(nextSelections);
    };

    syncRemoteCarets();
    editor.on('selectionUpdate', syncRemoteCarets);
    editor.on('update', syncRemoteCarets);
    window.addEventListener('resize', syncRemoteCarets);
    const scrollEl = scrollRef.current;
    if (scrollEl) scrollEl.addEventListener('scroll', syncRemoteCarets, { passive: true });

    return () => {
      editor.off('selectionUpdate', syncRemoteCarets);
      editor.off('update', syncRemoteCarets);
      window.removeEventListener('resize', syncRemoteCarets);
      if (scrollEl) scrollEl.removeEventListener('scroll', syncRemoteCarets);
    };
  }, [collaborators, editor, sessionId]);

  // ── Active-page tracking via scroll ─────────────────────────
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      const approx  = Math.floor((scrollEl.scrollTop + pageSlotHeight * 0.35) / pageSlotHeight);
      const clamped = Math.max(0, Math.min(pageCount - 1, approx));
      setActivePage(clamped);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [pageSlotHeight, pageCount, setActivePage]);

  // Cleanup debounce timer
  useEffect(() => () => clearTimeout(overflowTimer.current), []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Horizontal Ruler */}
      {rulerVisible && (
        <div id="etherx-ruler" style={{ borderBottom: '1px solid var(--border)', display: 'flex' }}>
          <HorizontalRuler />
        </div>
      )}

      {/* ── Scroll area ── */}
      <div
        ref={scrollRef}
        id="editor-scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          background: 'var(--bg-app)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '60px 24px 80px',
          scrollBehavior: 'smooth',
        }}
      >
        {/* ── Document canvas: relative wrapper sized to all pages + gaps ── */}
        <div
          id="document-page-0"
          style={{
            position: 'relative',
            width:     sd.pageWidth,
            height:    totalHeight,
            flexShrink: 0,
            transition: 'width 0.15s ease-out',
          }}
        >
          {/* Page background boxes (visual paper) */}
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={`page-bg-${i}`}
              className="editor-page-bg"
              style={{
                position:      'absolute',
                top:           i * pageSlotHeight,
                left:          0,
                width:         sd.pageWidth,
                height:        sd.pageHeight,
                background:    'var(--bg-page)',
                boxShadow:     'var(--shadow-page)',
                border:        '1px solid var(--page-border)',
                borderRadius:  2,
                pointerEvents: 'none',
                zIndex:        0,
              }}
            />
          ))}

          {/* ── Editor content: continuous ProseMirror flow ── */}
          <div
            ref={wrapRef}
            className="editor-content-area"
            style={{
              position:      'absolute',
              top:           0,
              left:          0,
              width:         '100%',
              minHeight:     totalHeight,
              padding:       `${sd.marginV}px ${sd.marginH}px`,
              zIndex:        1,
              wordBreak:     'break-word',
              overflowWrap:  'break-word',
              overflowX:     'hidden',
            }}
          >
            {/* Page scroll-anchors (i=0 is the canvas div itself; anchors from page 1 onward) */}
            {Array.from({ length: pageCount }).map((_, i) => {
              if (i === 0) return null;   // page-0 anchor = the outer #document-page-0 div
              return (
                <div
                  key={`anchor-${i}`}
                  id={`document-page-${i}`}
                  style={{
                    position:      'absolute',
                    top:           i * pageSlotHeight,
                    left:          0,
                    width:         1,
                    height:        1,
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

            <EditorContent editor={editor} />

            {/* Remote collaborator selections */}
            {remoteSelections.map((sel) => (
              <div
                key={sel.id}
                style={{
                  position:      'absolute',
                  top:           sel.top,
                  left:          sel.left,
                  width:         sel.width,
                  height:        sel.height,
                  borderRadius:  3,
                  background:    sel.fill,
                  outline:       `1px solid ${sel.stroke}`,
                  pointerEvents: 'none',
                  zIndex:        6,
                }}
              />
            ))}

            {/* Remote collaborator carets */}
            {remoteCarets.map((caret) => (
              <div
                key={caret.id}
                style={{ position: 'absolute', top: caret.top, left: caret.left, width: 1, pointerEvents: 'none', zIndex: 8 }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: 2, height: 20,
                  background: caret.stroke, borderRadius: 1,
                  boxShadow: `0 0 0 1px ${caret.fill}`,
                }} />
                <div style={{
                  position: 'absolute', top: -18, left: 0,
                  transform: 'translateX(-4px)',
                  padding: '1px 6px', borderRadius: 999,
                  fontFamily: 'var(--font-ui)', fontSize: 10,
                  whiteSpace: 'nowrap', color: '#111',
                  background: caret.stroke, border: `1px solid ${caret.stroke}`,
                }}>
                  {caret.name}
                </div>
              </div>
            ))}
          </div>

          {/* ── Page number labels (centered in each inter-page gap) ── */}
          {Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={`page-label-${i}`}
              style={{
                position:      'absolute',
                top:           (i + 1) * sd.pageHeight + i * sd.pageGap + sd.pageGap * 0.3,
                left:          0,
                right:         0,
                textAlign:     'center',
                fontSize:      10 * scale,
                color:         'var(--text-muted)',
                fontFamily:    'var(--font-ui)',
                pointerEvents: 'none',
                userSelect:    'none',
                zIndex:        5,
              }}
            >
              {i + 1}
            </div>
          ))}

          {/* ── Header text overlays ── */}
          {headerFooter?.headerText ? Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={`header-${i}`}
              style={{
                position:      'absolute',
                top:           i * pageSlotHeight + Math.max(16, sd.marginV * 0.22),
                left:          sd.marginH,
                right:         sd.marginH,
                textAlign:     String(headerFooter.headerAlign || 'Center').toLowerCase(),
                fontSize:      10 * scale,
                color:         'var(--text-muted)',
                fontFamily:    'var(--font-ui)',
                pointerEvents: 'none',
                userSelect:    'none',
                borderBottom:  '1px solid rgba(140,140,140,0.45)',
                paddingBottom: 6,
                zIndex:        4,
              }}
            >
              {headerFooter.headerText}
            </div>
          )) : null}

          {/* ── Footer text overlays ── */}
          {headerFooter?.footerText ? Array.from({ length: pageCount }).map((_, i) => (
            <div
              key={`footer-${i}`}
              style={{
                position:      'absolute',
                top:           (i + 1) * sd.pageHeight + i * sd.pageGap - Math.max(32, sd.marginV * 0.3),
                left:          sd.marginH,
                right:         sd.marginH,
                textAlign:     String(headerFooter.footerAlign || 'Center').toLowerCase(),
                fontSize:      10 * scale,
                color:         'var(--text-muted)',
                fontFamily:    'var(--font-ui)',
                pointerEvents: 'none',
                userSelect:    'none',
                borderTop:     '1px solid rgba(140,140,140,0.45)',
                paddingTop:    6,
                zIndex:        4,
              }}
            >
              {headerFooter.footerText}
            </div>
          )) : null}

          {/* ── Page-number overlays (from Header/Footer dialog) ── */}
          {headerFooter?.pageNumberEnabled ? Array.from({ length: pageCount }).map((_, i) => {
            const [vpos, halign] = String(headerFooter.pageNumberStyle || 'bottom-center').split('-');
            const isTop     = vpos === 'top';
            const pageNumber = Number(headerFooter.pageNumberStart || 1) + i;
            const pageTop    = i * pageSlotHeight;
            return (
              <div
                key={`pagenum-${i}`}
                style={{
                  position:      'absolute',
                  top:           isTop
                    ? pageTop + Math.max(32, sd.marginV * 0.3)
                    : pageTop + sd.pageHeight - Math.max(28, sd.marginV * 0.25),
                  left:          sd.marginH,
                  right:         sd.marginH,
                  textAlign:     halign,
                  fontSize:      10 * scale,
                  color:         'var(--text-muted)',
                  fontFamily:    'var(--font-ui)',
                  pointerEvents: 'none',
                  userSelect:    'none',
                  zIndex:        4,
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
