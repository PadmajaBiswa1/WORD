import { useCallback, useRef } from 'react';
import { Select } from '@/components/ui';
import { useEditorStore } from '@/store';

export const FONT_STACKS = {
  'Crimson Pro': '"Crimson Pro", "Noto Serif", serif',
  Calibri: 'Calibri, "Segoe UI", sans-serif',
  Arial: 'Arial, sans-serif',
  'Times New Roman': '"Times New Roman", serif',
  Garamond: 'Garamond, serif',
  Georgia: 'Georgia, serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  Verdana: 'Verdana, sans-serif',
  'Courier New': '"Courier New", monospace',
  'Trebuchet MS': '"Trebuchet MS", sans-serif',
  'Segoe UI': '"Segoe UI", sans-serif',
  'Nirmala UI': '"Nirmala UI", sans-serif',
  'Microsoft YaHei': '"Microsoft YaHei", sans-serif',
  'Malgun Gothic': '"Malgun Gothic", sans-serif',
  Meiryo: 'Meiryo, sans-serif',
  'Yu Gothic UI': '"Yu Gothic UI", sans-serif',
  'Leelawadee UI': '"Leelawadee UI", sans-serif',
  Ebrama: 'Ebrama, sans-serif',
  'Noto Sans': '"Noto Sans", sans-serif',
  'Noto Sans Devanagari': '"Noto Sans Devanagari", sans-serif',
  'Noto Naskh Arabic': '"Noto Naskh Arabic", sans-serif',
};

export const FONT_FAMILY_OPTIONS = [
  'Calibri', 'Crimson Pro', 'Times New Roman', 'Arial', 'Garamond',
  'Georgia', 'Helvetica', 'Verdana', 'Courier New', 'Trebuchet MS',
  'Segoe UI', 'Nirmala UI', 'Microsoft YaHei', 'Malgun Gothic',
  'Meiryo', 'Yu Gothic UI', 'Leelawadee UI', 'Ebrama',
  'Noto Sans', 'Noto Sans Devanagari', 'Noto Naskh Arabic',
].map((family) => ({
  value: family,
  label: family,
  style: { fontFamily: FONT_STACKS[family] || `${family}, sans-serif` },
  searchTerms: family,
}));

export const FONT_SIZE_OPTIONS = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72']
  .map((size) => ({ value: size, label: size }));

export function useFontFormattingControls(editor) {
  const { setFontFamily, setFontSize } = useEditorStore();

  const run = useCallback((callback) => {
    if (!editor) return;
    editor.view.focus();
    callback();
    editor.view.focus();
  }, [editor]);

  const selectionSnapshotRef = useRef(null);

  const snapshotSelection = useCallback(() => {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    selectionSnapshotRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const snap = selectionSnapshotRef.current;
    const viewDom = editor?.view?.dom;
    if (!snap || !viewDom) return false;

    const sel = window.getSelection?.();
    if (!sel) return false;

    try {
      // Ensure range is still inside the editor DOM
      const common = snap.commonAncestorContainer;
      if (!viewDom.contains(common)) return false;

      sel.removeAllRanges();
      sel.addRange(snap);
      return true;
    } catch {
      return false;
    }
  }, [editor]);

  // Apply inline styles by wrapping the currently selected range.
  // This avoids relying on selection state inside Tiptap when the dropdown click clears it.
  const wrapSelectedRange = useCallback((stylePatch) => {
    const viewDom = editor?.view?.dom;
    if (!viewDom) return;

    const restored = restoreSelection();
    const sel = window.getSelection?.();
    if (!restored || !sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      // If there's no actual selection, fall back to Tiptap commands.
      Object.entries(stylePatch).forEach(([k, v]) => {
        if (k === 'font-family') editor.chain().setFontFamily(v).run();
        if (k === 'font-size') editor.chain().setFontSize(`${v}`).run();
      });
      return;
    }

    const wrapper = document.createElement('span');
    Object.entries(stylePatch).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') wrapper.style.setProperty(k, String(v));
    });

    // surroundContents can throw if the range splits non-text nodes.
    // Fallback to extract/insert.
    try {
      range.surroundContents(wrapper);
    } catch {
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);
    }

    // Re-sync editor selection & state
    editor.view.focus();
    editor.view.dispatch(editor.view.state.tr);
  }, [editor, restoreSelection]);

  const applyFontFamily = useCallback((value) => {
    if (!editor || !value) return;
    setFontFamily(value);

    snapshotSelection();
    // Apply immediately to the saved selection range (not current live selection).
    wrapSelectedRange({ 'font-family': value });

    // Also update Tiptap mark state for persistence/cursor typing.
    run(() => editor.chain().focus().setFontFamily(value).run());
  }, [editor, run, setFontFamily, snapshotSelection, wrapSelectedRange]);

  const applyFontSize = useCallback((value) => {
    if (!editor || !value) return;
    const next = String(value);
    setFontSize(next);

    snapshotSelection();
    // Font size in HTML expects px/pt; Tiptap stores as `fontSize` attribute.
    // We wrap selection with `font-size: <n>pt`.
    wrapSelectedRange({ 'font-size': `${next}pt` });

    run(() => editor.chain().focus().setFontSize(`${next}pt`).run());
  }, [editor, run, setFontSize, snapshotSelection, wrapSelectedRange]);


  return { applyFontFamily, applyFontSize };
}

export function FontFormattingControls({
  editor,
  fontFamily,
  fontSize,
  familyWidth = 140,
  sizeWidth = 64,
  searchable = true,
  searchPlaceholder = 'Search fonts...',
}) {
  const { applyFontFamily, applyFontSize } = useFontFormattingControls(editor);

  return (
    <>
      <Select
        value={fontFamily}
        onChange={applyFontFamily}
        options={FONT_FAMILY_OPTIONS}
        width={familyWidth}
        title="Font Family"
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
      />
      <Select
        value={fontSize}
        onChange={applyFontSize}
        options={FONT_SIZE_OPTIONS}
        width={sizeWidth}
        title="Font Size"
      />
    </>
  );
}