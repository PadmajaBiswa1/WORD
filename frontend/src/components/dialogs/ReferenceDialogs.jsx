import { useEffect, useState } from 'react';
import { useEditorStore, useUIStore } from '@/store';
import { Button, Input, Label, Modal, Stack } from '@/components/ui';

const STORAGE_KEY = 'etherx-reference-sources';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function loadSources() {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveSources(sources) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(sources));
}

function makeSourceId() {
  return `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/["']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function insertHtml(editor, html) {
  if (!editor) return false;
  editor.chain().focus().insertContent(html).run();
  editor.view?.focus();
  return true;
}

export function syncHeadingIds(html) {
  let index = 0;

  return String(html ?? '').replace(/<h([1-6])(\b[^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!text) return match;

    index += 1;
    const id = `${slugify(text)}-${index}`;
    const nextAttrs = /\sid=(["']).*?\1/i.test(attrs)
      ? attrs.replace(/\sid=(["']).*?\1/i, ` id="${id}"`)
      : `${attrs} id="${id}"`;

    return `<h${level}${nextAttrs}>${inner}</h${level}>`;
  });
}

export function getHeadingOutline(editor) {
  if (!editor) return [];

  const outline = [];
  let index = 0;

  editor.state.doc.descendants((node) => {
    if (node.type?.name !== 'heading') return;
    const text = node.textContent?.trim();
    if (!text) return;

    index += 1;
    outline.push({
      level: Number(node.attrs?.level) || 1,
      text,
      id: node.attrs?.id || `${slugify(text)}-${index}`,
    });
  });

  return outline;
}

export function buildTocHtml(outline) {
  const items = outline.length
    ? outline
        .map((entry) => (
          `<li style="margin-left:${Math.max(0, (entry.level - 1) * 14)}px;">${escapeHtml(entry.text)}</li>`
        ))
        .join('')
    : '<li style="color:#666;">Add headings to your document to generate entries.</li>';

  return `
    <h2>Table of Contents</h2>
    <ol>${items}</ol>
  `;
}

function formatCitation(source, style) {
  const author = source.author || source.title || 'Unknown Author';
  const year = source.year || 'n.d.';

  if (style === 'mla') return `(${author} ${year})`;
  if (style === 'chicago') return `(${author}, ${year})`;
  return `(${author}, ${year})`;
}

function formatBibliographyEntry(source, style) {
  const author = escapeHtml(source.author || 'Unknown Author');
  const title = escapeHtml(source.title || 'Untitled');
  const year = escapeHtml(source.year || 'n.d.');
  const publisher = source.publisher ? ` ${escapeHtml(source.publisher)}.` : '';
  const url = source.url ? ` <a href="${escapeHtml(source.url)}">${escapeHtml(source.url)}</a>` : '';

  if (style === 'mla') return `${author}. <em>${title}</em>. ${year}.${publisher}${url}`;
  if (style === 'chicago') return `${author}. <em>${title}</em>. ${year}.${publisher}${url}`;
  return `${author} (${year}). <em>${title}</em>.${publisher}${url}`;
}

export function TableOfContentsDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [outline, setOutline] = useState([]);

  useEffect(() => {
    setOutline(getHeadingOutline(editor));
  }, [editor]);

  const refresh = () => {
    setOutline(getHeadingOutline(editor));
    toast('Table of contents refreshed', 'success');
  };

  const insertToc = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    const contentWithIds = syncHeadingIds(editor.getHTML());
    const tocHtml = buildTocHtml(getHeadingOutline(editor));
    editor.commands.setContent(`${tocHtml}${contentWithIds}`, false);
    toast('Table of contents inserted', 'success');
    closeDialog('tableOfContents');
  };

  return (
    <Modal title="Table of Contents" onClose={() => closeDialog('tableOfContents')} width={520}>
      <Stack gap={14}>
        <div>
          <Label>Detected Headings</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', maxHeight: 220, overflow: 'auto' }}>
            {outline.length ? outline.map((entry, idx) => (
              <div key={`${entry.id}-${idx}`} style={{ marginLeft: (entry.level - 1) * 14, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {entry.text}
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No headings found yet. Use heading styles in the document first.</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={refresh}>Refresh</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('tableOfContents')}>Cancel</Button>
            <Button variant="primary" onClick={insertToc}>Insert TOC</Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

export function InsertCitationDialog() {
  const { closeDialog, openDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [sources, setSources] = useState(() => loadSources());
  const [selectedId, setSelectedId] = useState('');
  const [style, setStyle] = useState('apa');
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    const next = loadSources();
    setSources(next);
    setSelectedId(next[0]?.id || '');
  }, []);

  const selectedSource = sources.find((source) => source.id === selectedId) || sources[0] || null;
  const preview = customText.trim() || (selectedSource ? formatCitation(selectedSource, style) : '[Citation]');

  const insertCitation = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    const html = customText.trim()
      ? `<span data-etherx-citation="custom" data-style="${style}">${escapeHtml(customText.trim())}</span>`
      : selectedSource
        ? `<span data-etherx-citation="${escapeHtml(selectedSource.id)}" data-style="${style}">${escapeHtml(formatCitation(selectedSource, style))}</span>`
        : '';

    if (!html) {
      toast('Add a source first or enter custom citation text', 'info');
      return;
    }

    insertHtml(editor, html);
    toast('Citation inserted', 'success');
    closeDialog('insertCitation');
  };

  return (
    <Modal title="Insert Citation" onClose={() => closeDialog('insertCitation')} width={540}>
      <Stack gap={14}>
        <div>
          <Label>Source</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-ui)' }}
          >
            <option value="">Select a source</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>{source.author} - {source.title}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Style</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['apa', 'mla', 'chicago'].map((item) => (
              <Button key={item} variant={style === item ? 'primary' : 'subtle'} onClick={() => setStyle(item)}>
                {item.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label>Custom Citation Text</Label>
          <Input value={customText} onChange={setCustomText} placeholder="Optional custom citation text" />
        </div>

        <div>
          <Label>Preview</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>
            {preview}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => { closeDialog('insertCitation'); openDialog('manageSources'); }}>Manage Sources</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('insertCitation')}>Cancel</Button>
            <Button variant="primary" onClick={insertCitation}>Insert Citation</Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

export function ManageSourcesDialog() {
  const { closeDialog, openDialog, toast } = useUIStore();
  const [sources, setSources] = useState(() => loadSources());
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ author: '', title: '', year: '', publisher: '', url: '' });

  const persist = (nextSources) => {
    setSources(nextSources);
    saveSources(nextSources);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ author: '', title: '', year: '', publisher: '', url: '' });
  };

  const startEdit = (source) => {
    setEditingId(source.id);
    setForm({
      author: source.author || '',
      title: source.title || '',
      year: source.year || '',
      publisher: source.publisher || '',
      url: source.url || '',
    });
  };

  const saveSource = () => {
    if (!form.author.trim()) {
      toast('Author is required', 'error');
      return;
    }
    if (!form.title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    const nextSource = {
      id: editingId || makeSourceId(),
      author: form.author.trim(),
      title: form.title.trim(),
      year: form.year.trim(),
      publisher: form.publisher.trim(),
      url: form.url.trim(),
    };

    const nextSources = editingId
      ? sources.map((source) => (source.id === editingId ? nextSource : source))
      : [nextSource, ...sources];

    persist(nextSources);
    toast(editingId ? '✓ Source updated' : '✓ Source added', 'success');
    resetForm();
  };

  const removeSource = (id) => {
    const nextSources = sources.filter((source) => source.id !== id);
    persist(nextSources);
    if (editingId === id) resetForm();
    toast('Source removed', 'success');
  };

  return (
    <Modal title="Manage Sources" onClose={() => closeDialog('manageSources')} width={640}>
      <Stack gap={16}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label>Author</Label>
            <Input value={form.author} onChange={(v) => setForm((current) => ({ ...current, author: v }))} placeholder="Author name" />
          </div>
          <div>
            <Label>Year</Label>
            <Input value={form.year} onChange={(v) => setForm((current) => ({ ...current, year: v }))} placeholder="2026" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Title</Label>
            <Input value={form.title} onChange={(v) => setForm((current) => ({ ...current, title: v }))} placeholder="Source title" />
          </div>
          <div>
            <Label>Publisher</Label>
            <Input value={form.publisher} onChange={(v) => setForm((current) => ({ ...current, publisher: v }))} placeholder="Publisher" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={form.url} onChange={(v) => setForm((current) => ({ ...current, url: v }))} placeholder="https://..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={resetForm}>Clear</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => closeDialog('manageSources')}>Close</Button>
            {sources.length > 0 && (
              <Button variant="secondary" onClick={() => { closeDialog('manageSources'); openDialog('bibliography'); }}>
                Insert Bibliography →
              </Button>
            )}
            <Button variant="primary" onClick={saveSource}>{editingId ? 'Update Source' : 'Add Source'}</Button>
          </div>
        </div>

        <div>
          <Label>Saved Sources</Label>
          <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto' }}>
            {sources.length ? sources.map((source) => (
              <div key={source.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{source.author} - {source.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {source.year || 'n.d.'}{source.publisher ? ` · ${source.publisher}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <Button variant="subtle" onClick={() => startEdit(source)}>Edit</Button>
                  <Button variant="danger" onClick={() => removeSource(source.id)}>Delete</Button>
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No saved sources yet.</div>}
          </div>
        </div>
      </Stack>
    </Modal>
  );
}

export function BibliographyDialog() {
  const { closeDialog, openDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [sources, setSources] = useState(() => loadSources());
  const [style, setStyle] = useState('apa');
  const [heading, setHeading] = useState('References');

  // Reload sources every time the dialog opens (in case they were added in ManageSourcesDialog)
  useEffect(() => {
    const reloadSources = () => setSources(loadSources());
    // Reload after a short delay to ensure previous dialog fully closed
    const timer = setTimeout(reloadSources, 100);
    return () => clearTimeout(timer);
  }, []);

  const insertBibliography = () => {
    if (!editor) {
      toast('Editor is not ready yet', 'info');
      return;
    }

    if (!sources.length) {
      toast('Add sources before inserting a bibliography', 'info');
      return;
    }

    const entries = sources
      .map((source) => `<li style="margin-bottom:8px;">${formatBibliographyEntry(source, style)}</li>`)
      .join('');

    const html = `
      <h2>${escapeHtml(heading || 'References')}</h2>
      <ol>${entries}</ol>
    `;

    insertHtml(editor, html);
    toast('Bibliography inserted', 'success');
    closeDialog('bibliography');
  };

  return (
    <Modal title="Bibliography" onClose={() => closeDialog('bibliography')} width={560}>
      <Stack gap={14}>
        <div>
          <Label>Heading</Label>
          <Input value={heading} onChange={setHeading} placeholder="References" />
        </div>

        <div>
          <Label>Style</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['apa', 'mla', 'chicago'].map((item) => (
              <Button key={item} variant={style === item ? 'primary' : 'subtle'} onClick={() => setStyle(item)}>
                {item.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label>Sources to include</Label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', background: 'var(--bg-elevated)', maxHeight: 180, overflow: 'auto' }}>
            {sources.length ? sources.map((source) => (
              <div key={source.id} style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>
                {source.author} - {source.title}
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sources saved yet.</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Button variant="subtle" onClick={() => closeDialog('bibliography')}>Cancel</Button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button variant="subtle" onClick={() => { closeDialog('bibliography'); openDialog('manageSources'); }}>Manage Sources</Button>
            <Button variant="primary" onClick={insertBibliography}>Insert Bibliography</Button>
          </div>
        </div>
      </Stack>
    </Modal>
  );
}