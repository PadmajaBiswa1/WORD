import { useCallback } from 'react';
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

  const applyFontFamily = useCallback((value) => {
    if (!editor) return;
    setFontFamily(value);
    run(() => editor.chain().setFontFamily(value).run());
  }, [editor, run, setFontFamily]);

  const applyFontSize = useCallback((value) => {
    if (!editor || !value) return;
    setFontSize(String(value));
    run(() => editor.chain().setFontSize(`${value}pt`).run());
  }, [editor, run, setFontSize]);

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