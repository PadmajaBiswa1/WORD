import { useMemo } from 'react';
import { Button, Tooltip } from '@/components/ui';
import { RibbonGroup } from '../RibbonGroup';
import { useDocumentStore, useEditorStore, useUIStore } from '@/store';
import { buildAiResult, openTranslationUrl } from '@/services/ai';

function getSelectedText(editor) {
  if (!editor) return '';
  const { from, to } = editor.state.selection;
  if (from !== to) return editor.state.doc.textBetween(from, to, ' ').trim();
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, ' ').trim();
}

function replaceSelectionOrInsert(editor, html) {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  if (from !== to) {
    editor.chain().focus().insertContentAt({ from, to }, html).run();
    return;
  }
  editor.chain().focus().insertContent(html).run();
}

export function AITab() {
  const { editor } = useEditorStore();
  const { toast } = useUIStore();
  const setTitle = useDocumentStore((s) => s.setTitle);

  const hasEditor = !!editor;
  const buttonStyle = useMemo(() => ({
    width: 124,
    height: 56,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontSize: 11,
  }), []);

  const runWithSelection = (kind, options = {}) => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    const source = getSelectedText(editor);
    if (!source) {
      toast('Select text or add content first', 'info');
      return;
    }

    const result = buildAiResult(kind, source, options);
    if (kind === 'title') {
      setTitle(result.title || options.fallbackTitle || 'Untitled Document');
      toast('Document title updated', 'success');
      return;
    }

    replaceSelectionOrInsert(editor, result.html || '<p></p>');
  };

  const generateContent = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }
    const topic = window.prompt('What should the AI content generator write about?', 'project update');
    if (!topic) return;
    const tone = window.prompt('Tone for the draft?', 'professional') || 'professional';
    const result = buildAiResult('content-generator', '', { topic, tone });
    replaceSelectionOrInsert(editor, result.html || '<p></p>');
    toast('AI content inserted', 'success');
  };

  const summarize = () => {
    runWithSelection('summarize');
    toast('Text summarized', 'success');
  };

  const correctGrammar = () => {
    runWithSelection('grammar');
    toast('Grammar corrected', 'success');
  };

  const rewrite = () => {
    const mode = window.prompt('Rewrite style: clear, formal, or short', 'clear') || 'clear';
    runWithSelection('rewrite', { mode });
    toast(`Rewritten in ${mode} mode`, 'success');
  };

  const generateTitle = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }
    const fallbackTitle = window.prompt('Fallback title if the content is short', 'Untitled Document') || 'Untitled Document';
    const source = getSelectedText(editor);
    const result = buildAiResult('title', source, { fallbackTitle });
    setTitle(result.title || fallbackTitle);
    toast(`Title generated: ${result.title || fallbackTitle}`, 'success');
  };

  const translate = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }
    const source = getSelectedText(editor);
    if (!source) {
      toast('Select text or add content first', 'info');
      return;
    }
    const language = window.prompt('Translate to which language?', 'Spanish') || 'Spanish';
    openTranslationUrl(source, language);
    toast(`Opened translation for ${language}`, 'info');
  };

  return (
    <>
      <RibbonGroup label="AI Features">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 860 }}>
          <Tooltip text="AI Content Generator">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={generateContent}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>✦</span>
              <span>Content Generator</span>
            </Button>
          </Tooltip>
          <Tooltip text="AI Text Summarizer">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={summarize}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>▤</span>
              <span>Text Summarizer</span>
            </Button>
          </Tooltip>
          <Tooltip text="AI Grammar Correction">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={correctGrammar}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>✓</span>
              <span>Grammar Correction</span>
            </Button>
          </Tooltip>
          <Tooltip text="AI Rewrite Assistant">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={rewrite}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>↻</span>
              <span>Rewrite Assistant</span>
            </Button>
          </Tooltip>
          <Tooltip text="AI Title Generator">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={generateTitle}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🏷</span>
              <span>Title Generator</span>
            </Button>
          </Tooltip>
          <Tooltip text="AI Translation">
            <Button disabled={!hasEditor} style={buttonStyle} onClick={translate}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🌐</span>
              <span>Translation</span>
            </Button>
          </Tooltip>
        </div>
      </RibbonGroup>
    </>
  );
}