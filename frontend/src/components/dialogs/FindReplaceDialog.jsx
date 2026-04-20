import { useState, useCallback, useEffect, useRef } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { Modal, Button, Input, Label, Stack } from '@/components/ui';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const HIGHLIGHT_KEY = new PluginKey('findHighlight');

// Inject / update the highlight decoration plugin into the editor
function setHighlightDecorations(editor, matches, currentIdx) {
  if (!editor) return;

  const decorations = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      style: i === currentIdx
        ? 'background:#d4af37;color:#000;border-radius:2px;'
        : 'background:rgba(212,175,55,0.35);border-radius:2px;',
    })
  );

  const plugin = new Plugin({
    key: HIGHLIGHT_KEY,
    state: {
      init: () => DecorationSet.create(editor.state.doc, decorations),
      apply: (tr, old) => {
        if (tr.docChanged) return old.map(tr.mapping, tr.doc);
        return old;
      },
    },
    props: {
      decorations(state) { return this.getState(state); },
    },
  });

  // Reconfigure editor with updated plugins
  const nextPlugins = editor.state.plugins
    .filter((p) => p.spec.key !== HIGHLIGHT_KEY)
    .concat(plugin);

  editor.view.updateState(
    editor.state.reconfigure({ plugins: nextPlugins })
  );
}

function clearHighlightDecorations(editor) {
  if (!editor) return;
  const nextPlugins = editor.state.plugins.filter((p) => p.spec.key !== HIGHLIGHT_KEY);
  editor.view.updateState(editor.state.reconfigure({ plugins: nextPlugins }));
}

export function FindReplaceDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [find,    setFind]    = useState('');
  const [replace, setReplace] = useState('');
  const [count,   setCount]   = useState(null);
  const [caseSensitive, setCase] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const matchesRef = useRef([]);

  // Collect all match positions via ProseMirror doc traversal
  const findMatches = useCallback(() => {
    if (!editor || !find) return [];
    const matches = [];
    const needle = caseSensitive ? find : find.toLowerCase();
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const text = caseSensitive ? node.text : node.text.toLowerCase();
      let start = 0;
      while (true) {
        const idx = text.indexOf(needle, start);
        if (idx === -1) break;
        matches.push({ from: pos + idx, to: pos + idx + needle.length });
        start = idx + 1;
      }
    });
    return matches;
  }, [editor, find, caseSensitive]);

  // Re-highlight whenever find text or case sensitivity changes
  useEffect(() => {
    if (!find) {
      clearHighlightDecorations(editor);
      matchesRef.current = [];
      setCount(null);
      return;
    }
    const matches = findMatches();
    matchesRef.current = matches;
    setCount(matches.length);
    setMatchIndex(0);
    setHighlightDecorations(editor, matches, 0);
    if (matches.length > 0) {
      editor.chain().focus().setTextSelection(matches[0]).run();
    }
  }, [find, caseSensitive]);

  // Cleanup decorations when dialog closes
  useEffect(() => {
    return () => clearHighlightDecorations(editor);
  }, []);

  const navigateTo = (idx) => {
    const matches = matchesRef.current;
    if (!matches.length) return;
    const clamped = (idx + matches.length) % matches.length;
    setMatchIndex(clamped);
    setHighlightDecorations(editor, matches, clamped);
    editor.chain().focus().setTextSelection(matches[clamped]).run();
  };

  const handleFindNext = () => {
    const matches = findMatches();
    matchesRef.current = matches;
    if (!matches.length) { toast('No matches found', 'info'); return; }
    navigateTo(matchIndex + 1);
  };

  const handleFindPrev = () => {
    const matches = findMatches();
    matchesRef.current = matches;
    if (!matches.length) { toast('No matches found', 'info'); return; }
    navigateTo(matchIndex - 1);
  };

  // Safe replace using ProseMirror transactions — no HTML string manipulation
  const doReplace = (all = false) => {
    if (!editor || !find) return;
    const matches = findMatches();
    if (!matches.length) { toast('No matches found', 'info'); return; }

    const { tr } = editor.state;
    const targets = all ? [...matches].reverse() : [matches[matchIndex] || matches[0]];
    targets.forEach(({ from, to }) => {
      tr.replaceWith(from, to, replace
        ? editor.state.schema.text(replace)
        : editor.state.schema.text(''));
    });
    editor.view.dispatch(tr);

    // Re-scan and re-highlight after replace
    const remaining = findMatches();
    matchesRef.current = remaining;
    setCount(remaining.length);
    setMatchIndex(0);
    setHighlightDecorations(editor, remaining, 0);
    editor.view.focus();
    toast(`Replaced ${targets.length} occurrence${targets.length !== 1 ? 's' : ''}`, 'success');
  };

  const handleClose = () => {
    clearHighlightDecorations(editor);
    closeDialog('findReplace');
  };

  return (
    <Modal title="Find & Replace" onClose={handleClose} width={440}>
      <Stack gap={14}>
        <div>
          <Label>Find</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input
              value={find}
              onChange={(v) => setFind(v)}
              placeholder="Search text…"
              autoFocus
            />
          </div>
          {count !== null && (
            <div style={{ fontSize: 11, color: count > 0 ? 'var(--gold)' : 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
              {count > 0
                ? `${matchIndex + 1} of ${count} match${count !== 1 ? 'es' : ''}`
                : 'No matches found'}
            </div>
          )}
        </div>

        <div><Label>Replace With</Label><Input value={replace} onChange={setReplace} placeholder="Replacement text…" /></div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCase(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
          Case sensitive
        </label>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={handleClose}>Close</Button>
          <Button variant="outline" onClick={handleFindPrev} disabled={!find || !count}>◀ Prev</Button>
          <Button variant="outline" onClick={handleFindNext} disabled={!find || !count}>▶ Next</Button>
          <Button variant="outline" onClick={() => doReplace(false)} disabled={!find || !count}>Replace</Button>
          <Button variant="primary" onClick={() => doReplace(true)} disabled={!find || !count}>Replace All</Button>
        </div>
      </Stack>
    </Modal>
  );
}
