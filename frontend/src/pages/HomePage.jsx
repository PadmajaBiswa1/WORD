import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { documentApi, exportApi } from '@/services/api';
import { buildDocxBlob, buildHtmlDocument, exportToDocx, exportToHtml, exportToPdf } from '@/services/export';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore, useDocumentStore } from '@/store';

const LOCAL_FILE_DOCS_KEY = 'etherx_file_docs';

const MENU_ITEMS = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'new', label: 'New', icon: '✧' },
  { key: 'open', label: 'Open', icon: '◫' },
  { key: 'save', label: 'Save', icon: '⎙' },
  { key: 'saveAs', label: 'Save As', icon: '⇪' },
  { key: 'print', label: 'Print', icon: '⎘' },
  { key: 'export', label: 'Export', icon: '⇩' },
  { key: 'share', label: 'Share', icon: '⤴' },
  { key: 'info', label: 'Info', icon: 'ⓘ' },
  { key: 'statistics', label: 'Statistics', icon: '↕' },
  { key: 'settings', label: 'Settings', icon: '✶' },
  { key: 'close', label: 'Close', icon: '✕', danger: true },
];

const START_TEMPLATES = [
  { key: 'blank', label: 'Blank' },
  { key: 'business', label: 'Business' },
  { key: 'letter', label: 'Letter' },
  { key: 'resume', label: 'Resume' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'invoice', label: 'Invoice' },
];

const SAVE_AS_FORMATS = [
  { key: 'etherx', label: 'EtherX Document (.ethex)' },
  { key: 'docx', label: 'Word Document (.docx)' },
  { key: 'html', label: 'Web Page (.html)' },
];

const SAVE_AS_LOCATIONS = [
  { key: 'recent', label: 'Recent', icon: '◷', area: 'leftTop' },
  { key: 'onedrive', label: 'OneDrive - Personal', icon: '☁', area: 'personal' },
  { key: 'share', label: 'Share', icon: '⇪', area: 'share' },
  { key: 'copyLink', label: 'Copy Link', icon: '⎘', area: 'share' },
  { key: 'thisPc', label: 'This PC', icon: '🖥', area: 'other' },
  { key: 'addPlace', label: 'Add a Place', icon: '＋', area: 'other' },
  { key: 'browse', label: 'Browse', icon: '📁', area: 'other' },
];

const SAVE_AS_FAVORITES = [
  { key: 'adaptive', label: 'adaptive', path: 'OneDrive - Personal » Desktop » adaptive', updatedAt: '30-03-2026 14:15' },
  { key: 'onedriveRoot', label: 'OneDrive - Personal', path: 'OneDrive - Personal' },
];

function templateContent(key) {
  const map = {
    blank: '<p></p>',
    business: '<h1>Business Document</h1><p>Prepared for: Client Name</p><h2>Executive Summary</h2><p>Summary text...</p>',
    letter: '<p>Date</p><p>Recipient Name</p><p>Subject: Letter</p><p>Dear ...</p><p>Sincerely,</p>',
    resume: '<h1>Full Name</h1><p>Email | Phone | Location</p><h2>Experience</h2><p>Role details...</p><h2>Education</h2><p>Degree details...</p>',
    proposal: '<h1>Project Proposal</h1><h2>Objective</h2><p>Objective details...</p><h2>Scope</h2><p>Scope details...</p>',
    invoice: '<h1>Invoice</h1><p>Invoice #INV-001</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody><tr><td>Service</td><td>1</td><td>100</td><td>100</td></tr></tbody></table>',
  };
  return map[key] || '<p></p>';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function relativeTimeLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const diffMs = Date.now() - date.getTime();
  const hour = 3600000;
  const day = 86400000;
  const minute = 60000;
  
  if (diffMs < minute) {
    return 'Just now';
  }
  if (diffMs < hour) {
    const m = Math.max(1, Math.floor(diffMs / minute));
    return `${m} minute${m > 1 ? 's' : ''} ago`;
  }
  if (diffMs < day) {
    const h = Math.max(1, Math.floor(diffMs / hour));
    return `${h} hour${h > 1 ? 's' : ''} ago`;
  }
  const d = Math.max(1, Math.floor(diffMs / day));
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function formatActualTime(iso) {
  return relativeTimeLabel(iso);
}

function estimatePagesFromHtml(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 420));
}

function cleanBaseName(title = 'Untitled Document') {
  const base = String(title || 'Untitled Document').replace(/\.[^/.]+$/, '').trim();
  return base || 'Untitled Document';
}

function nextCopyName(title = 'Untitled Document') {
  const base = cleanBaseName(title);
  if (/^copy of\s+/i.test(base)) return base;
  return `Copy of ${base}`;
}

function downloadEtherxFile(title, content) {
  const payload = {
    title: cleanBaseName(title),
    content: content || '<p></p>',
    exportedAt: new Date().toISOString(),
    format: 'ethex-document',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const safe = cleanBaseName(title).replace(/[^a-z0-9_\-\s]/gi, '_');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${safe || 'document'}.ethex`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function filePickerSupported() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

function pickerOptions(name, format) {
  const byFormat = {
    etherx: {
      suggestedName: `${name}.ethex`,
      types: [{ description: 'EtherX Document', accept: { 'application/json': ['.ethex'] } }],
    },
    html: {
      suggestedName: `${name}.html`,
      types: [{ description: 'Web Page', accept: { 'text/html': ['.html'] } }],
    },
    docx: {
      suggestedName: `${name}.docx`,
      types: [{ description: 'Word Document', accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } }],
    },
  };
  return byFormat[format] || byFormat.etherx;
}

async function saveWithFilePicker(name, format, content) {
  if (!filePickerSupported()) return false;

  const { suggestedName, types } = pickerOptions(name, format);
  try {
    const handle = await window.showSaveFilePicker({ suggestedName, types });
    const writable = await handle.createWritable();

    if (format === 'docx') {
      const blob = await buildDocxBlob(content || '<p></p>');
      await writable.write(blob);
    } else if (format === 'html') {
      const html = buildHtmlDocument(name, content || '<p></p>');
      await writable.write(new Blob([html], { type: 'text/html;charset=utf-8' }));
    } else {
      const payload = {
        title: cleanBaseName(name),
        content: content || '<p></p>',
        exportedAt: new Date().toISOString(),
        format: 'ethex-document',
      };
      await writable.write(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    }

    await writable.close();
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    throw error;
  }
}

function selectedStyle(active, danger) {
  return {
    ...styles.menuBtn,
    ...(active ? styles.menuBtnActive : null),
    ...(danger ? styles.menuBtnDanger : null),
  };
}

function readLocalDocs() {
  try {
    const raw = localStorage.getItem(LOCAL_FILE_DOCS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((d) => ({
      id: String(d.id),
      title: d.title || 'Untitled Document',
      content: d.content || '',
      updatedAt: d.updatedAt || new Date().toISOString(),
      localOnly: true,
    }));
  } catch {
    return [];
  }
}

function writeLocalDocs(list) {
  localStorage.setItem(LOCAL_FILE_DOCS_KEY, JSON.stringify(list));
}

function upsertLocalDoc(doc) {
  const list = readLocalDocs();
  const next = [doc, ...list.filter((d) => d.id !== doc.id)].slice(0, 100);
  writeLocalDocs(next);
  return next;
}

function createLocalDoc({ title, content }) {
  const doc = {
    id: `local-${Date.now()}`,
    title: title || 'Untitled Document',
    content: content || '<p></p>',
    updatedAt: new Date().toISOString(),
    localOnly: true,
  };
  const next = upsertLocalDoc(doc);
  return { doc, next };
}

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const toast = useUIStore((s) => s.toast);
  const resetDoc = useDocumentStore((s) => s.reset);
  const setDocTitle = useDocumentStore((s) => s.setTitle);
  const setDocContent = useDocumentStore((s) => s.setContent);

  const [activeMenu, setActiveMenu] = useState('home');
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [search, setSearch] = useState('');
  const [saveAsName, setSaveAsName] = useState('');
  const [saveAsFormat, setSaveAsFormat] = useState('etherx');
  const [saveAsLocation, setSaveAsLocation] = useState('onedrive');
  const [saveAsBusy, setSaveAsBusy] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0); // Force re-render for time updates

  const returnTo = location.state?.returnTo || '/doc/new';
  const fileInputRef = useRef(null);

  // Refresh time display every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, 60000); // Update every 60 seconds
    return () => clearInterval(timer);
  }, []);

  const currentDocIdFromRoute = (() => {
    const p = location.state?.returnTo || '';
    const m = p.match(/^\/doc\/([^/]+)$/);
    return m?.[1] || null;
  })();

  useEffect(() => {
    let alive = true;
    async function loadDocs() {
      setLoading(true);
      try {
        const data = await documentApi.list();
        const list = Array.isArray(data) ? data : data.documents || data.items || [];
        const locals = readLocalDocs();
        if (!alive) return;
        const normalized = [...locals, ...list.map((d, i) => ({
          id: String(d.id || d._id || i + 1),
          title: d.title || 'Untitled Document',
          updatedAt: d.updatedAt || d.updated || new Date().toISOString(),
          content: d.content || '',
          localOnly: Boolean(d.localOnly),
        }))];
        setDocs(normalized);
        if (currentDocIdFromRoute && normalized.some((d) => d.id === currentDocIdFromRoute)) {
          setSelectedDocId(currentDocIdFromRoute);
        } else if (normalized[0]) {
          setSelectedDocId(normalized[0].id);
        }
      } catch {
        const fallback = readLocalDocs();
        if (!alive) return;
        setDocs(fallback);
        setSelectedDocId(fallback[0]?.id || null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadDocs();
    return () => { alive = false; };
  }, [currentDocIdFromRoute]);

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedDocId) || null, [docs, selectedDocId]);

  useEffect(() => {
    if (!selectedDoc) {
      setSaveAsName('');
      return;
    }
    setSaveAsName((current) => current || nextCopyName(selectedDoc.title));
  }, [selectedDoc]);

  const visibleDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? docs.filter((d) => d.title.toLowerCase().includes(q)) : docs;
    return filtered.slice(0, 4);
  }, [docs, search]);

  async function createFromTemplate(key) {
    if (key === 'blank') {
      try {
        // Create blank document on backend so it appears in recents
        const created = await documentApi.create({
          title: 'Untitled Document',
          content: '<p></p>',
        });
        const newId = String(created?.id || created?._id || 'new');
        setDocs((prev) => [
          {
            id: newId,
            title: 'Untitled Document',
            content: '<p></p>',
            updatedAt: new Date().toISOString(),
            localOnly: false,
          },
          ...prev.filter((d) => d.id !== newId),
        ]);
        setSelectedDocId(newId);
        toast('Blank document created', 'success');
        navigate(`/doc/${newId}`);
      } catch {
        // Fallback to local if backend unavailable
        const { doc, next } = createLocalDoc({
          title: 'Untitled Document',
          content: '<p></p>',
        });
        setDocs(next);
        setSelectedDocId(doc.id);
        resetDoc();
        setDocTitle(doc.title);
        setDocContent(doc.content);
        toast('Blank document created locally', 'success');
        navigate('/doc/new');
      }
      return;
    }

    const title = `${key[0].toUpperCase()}${key.slice(1)} ${new Date().toLocaleDateString()}`;
    const content = templateContent(key);
    try {
      const created = await documentApi.create({ title, content });
      const newId = String(created?.id || created?._id || created?.document?.id || created?.document?._id || 'new');
      setDocs((prev) => [
        {
          id: newId,
          title,
          content,
          updatedAt: new Date().toISOString(),
          localOnly: false,
        },
        ...prev.filter((d) => d.id !== newId),
      ]);
      setSelectedDocId(newId);
      toast(`${key} template created`, 'success');
      navigate(`/doc/${newId}`);
    } catch {
      const { doc, next } = createLocalDoc({ title, content });
      setDocs(next);
      setSelectedDocId(doc.id);
      resetDoc();
      setDocTitle(doc.title);
      setDocContent(doc.content);
      toast('Template created locally', 'success');
      navigate('/doc/new');
    }
  }

  async function deleteDoc(doc) {
    if (!doc) return;

    try {
      if (doc.localOnly) {
        const next = readLocalDocs().filter((d) => d.id !== doc.id);
        writeLocalDocs(next);
      } else {
        await documentApi.delete(doc.id);
      }

      setDocs((prev) => {
        const next = prev.filter((d) => d.id !== doc.id);
        if (selectedDocId === doc.id) {
          setSelectedDocId(next[0]?.id || null);
        }
        return next;
      });
      toast('Document deleted', 'success');
    } catch {
      toast('Unable to delete this document', 'error');
    }
  }

  function openDoc(doc) {
    if (!doc) return;
    if (doc.localOnly) {
      resetDoc();
      setDocTitle(doc.title || 'Untitled Document');
      setDocContent(doc.content || '<p></p>');
      navigate('/doc/new');
      return;
    }
    navigate(`/doc/${doc.id}`);
  }

  function setThemeMode(mode) {
    if (mode !== theme) toggleTheme();
  }

  async function runMenuAction(key) {
      if (key === 'home' || key === 'open' || key === 'export' || key === 'share' || key === 'saveAs' || key === 'info' || key === 'statistics' || key === 'settings') {
        setActiveMenu(key);
        if (key === 'saveAs' && selectedDoc) {
          setSaveAsName(nextCopyName(selectedDoc.title));
        }
        return;
      }

    if (key === 'new') {
      await createFromTemplate('blank');
      setActiveMenu('home');
      return;
    }

    if (key === 'save') {
      if (!selectedDoc) return toast('Select a document first', 'info');
      if (selectedDoc.localOnly) {
        const localDoc = { ...selectedDoc, updatedAt: new Date().toISOString(), localOnly: true };
        const next = upsertLocalDoc(localDoc);
        setDocs(next);
        setSelectedDocId(localDoc.id);
        toast('Document saved locally', 'success');
        setActiveMenu('home');
        return;
      }
      try {
        await documentApi.save(selectedDoc.id, { title: selectedDoc.title, content: selectedDoc.content || '' });
        toast('Document saved', 'success');
      } catch {
        const localDoc = { ...selectedDoc, id: `local-${Date.now()}`, updatedAt: new Date().toISOString(), localOnly: true };
        const next = upsertLocalDoc(localDoc);
        setDocs(next);
        setSelectedDocId(localDoc.id);
        toast('Cloud save failed, saved locally', 'warning');
      }
      setActiveMenu('home');
      return;
    }

    if (key === 'print') {
      if (!selectedDoc) return toast('Select a document first', 'info');
      const popup = window.open('', '_blank', 'width=980,height=760');
      if (!popup) return toast('Popup blocked for printing', 'warning');
      popup.document.write(`<html><head><title>${selectedDoc.title}</title></head><body><h1>${selectedDoc.title}</h1><div>${selectedDoc.content || '<p>No content available.</p>'}</div></body></html>`);
      popup.document.close();
      popup.focus();
      popup.print();
      setActiveMenu('home');
      return;
    }

    if (key === 'close') {
      navigate(returnTo);
    }
  }

  async function exportSelectedDoc() {
    if (!selectedDoc) return toast('Select a document first', 'info');
    const fmt = (window.prompt('Export format: html, pdf, docx', 'html') || 'html').toLowerCase();
    const exportLocally = async () => {
      if (fmt === 'docx') {
        await exportToDocx(selectedDoc.title, selectedDoc.content || '<p></p>');
        return;
      }

      if (fmt === 'pdf') {
        const frame = document.createElement('div');
        frame.style.position = 'fixed';
        frame.style.left = '-10000px';
        frame.style.top = '0';
        frame.style.width = '794px';
        frame.style.background = '#ffffff';
        frame.style.padding = '40px';
        frame.innerHTML = selectedDoc.content || '<p></p>';
        document.body.appendChild(frame);
        try {
          await exportToPdf(selectedDoc.title, frame);
        } finally {
          frame.remove();
        }
        return;
      }

      exportToHtml(selectedDoc.title, selectedDoc.content || '<p></p>');
    };

    try {
      const blob = selectedDoc.localOnly
        ? null
        : fmt === 'pdf'
          ? await exportApi.pdf(selectedDoc.id)
          : fmt === 'docx'
            ? await exportApi.docx(selectedDoc.id)
            : await exportApi.html(selectedDoc.id);

      if (!blob) {
        await exportLocally();
        toast(`Exported as ${fmt.toUpperCase()}`, 'success');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDoc.title}.${fmt === 'pdf' || fmt === 'docx' ? fmt : 'html'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Export complete', 'success');
    } catch {
      try {
        await exportLocally();
        toast('Cloud export failed, exported locally', 'warning');
      } catch {
        const fallback = new Blob([selectedDoc.content || '<p></p>'], { type: 'text/html' });
        const url = URL.createObjectURL(fallback);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedDoc.title}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Cloud export failed, exported HTML locally', 'warning');
      }
    }
  }

  async function shareSelectedDoc() {
    if (!selectedDoc) return toast('Select a document first', 'info');
    try {
      const targetDoc = await ensureCloudDocForShare(selectedDoc);
      const response = await documentApi.share(targetDoc.id, { role: 'viewer' });
      const link = response?.shareUrl || `${window.location.origin}/doc/${targetDoc.id}`;
      await navigator.clipboard.writeText(link);
      toast('Share link copied', 'success');
    } catch {
      const link = `${window.location.origin}/doc/${selectedDoc.id}`;
      window.prompt('Copy share link', link);
    }
  }

  async function createCloudCopyFrom(doc, titleOverride) {
    const content = doc?.content || '<p></p>';
    const title = cleanBaseName(titleOverride || doc?.title || 'Untitled Document');
    const created = await documentApi.create({
      title,
      content,
      comments: [],
      trackChanges: false,
    });
    const newId = String(created?.id || created?._id || created?.document?.id || created?.document?._id || '');
    const newDoc = {
      id: newId,
      title,
      content,
      updatedAt: new Date().toISOString(),
      localOnly: false,
    };
    if (newId) {
      setDocs((prev) => [newDoc, ...prev.filter((d) => d.id !== newId)]);
      setSelectedDocId(newId);
    }
    return newDoc;
  }

  async function ensureCloudDocForShare(sourceDoc) {
    if (!sourceDoc?.localOnly) return sourceDoc;
    const cloudDoc = await createCloudCopyFrom(sourceDoc, sourceDoc.title);
    toast('Created cloud copy for sharing', 'success');
    return cloudDoc;
  }

  async function performSaveAs() {
    if (!selectedDoc) {
      toast('Select a document first', 'info');
      return;
    }

    const finalName = cleanBaseName(saveAsName || nextCopyName(selectedDoc.title));
    if (!finalName) {
      toast('Enter a file name', 'warning');
      return;
    }

    setSaveAsBusy(true);
    try {
      if (saveAsLocation === 'share') {
        const targetDoc = await ensureCloudDocForShare(selectedDoc);
        const response = await documentApi.share(targetDoc.id, { role: 'viewer' });
        const link = response?.shareUrl || `${window.location.origin}/doc/${targetDoc.id}`;
        await navigator.clipboard.writeText(link);
        toast('Share link copied', 'success');
        return;
      }
      if (saveAsLocation === 'copyLink') {
        const targetDoc = await ensureCloudDocForShare(selectedDoc);
        const link = `${window.location.origin}/doc/${targetDoc.id}`;
        await navigator.clipboard.writeText(link);
        toast('Document link copied', 'success');
        return;
      }

      const wantsLocalFile = saveAsLocation === 'thisPc' || saveAsLocation === 'browse' || saveAsLocation === 'addPlace';

      if (wantsLocalFile) {
        const pickerResult = await saveWithFilePicker(finalName, saveAsFormat, selectedDoc.content || '<p></p>');
        if (pickerResult === null) {
          toast('Save As cancelled', 'info');
          return;
        }

        if (pickerResult !== true) {
          if (saveAsFormat === 'docx') {
            await exportToDocx(finalName, selectedDoc.content || '<p></p>');
          } else if (saveAsFormat === 'html') {
            exportToHtml(finalName, selectedDoc.content || '<p></p>');
          } else {
            downloadEtherxFile(finalName, selectedDoc.content || '<p></p>');
          }
        }
        toast('Saved to local files', 'success');
        setActiveMenu('home');
        return;
      }

      const createdDoc = await createCloudCopyFrom(selectedDoc, finalName);
      const newId = createdDoc.id;
      toast('Saved as a new cloud document', 'success');
      if (newId) {
        navigate(`/doc/${newId}`);
      } else {
        setActiveMenu('home');
      }
    } catch {
      const { doc, next } = createLocalDoc({ title: finalName, content: selectedDoc.content || '<p></p>' });
      setDocs(next);
      setSelectedDocId(doc.id);
      toast('Cloud Save As failed, saved locally', 'warning');
      setActiveMenu('home');
    } finally {
      setSaveAsBusy(false);
    }
  }

  async function handleUploadOpen(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const created = await documentApi.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: `<pre>${escapeHtml(text.slice(0, 50000))}</pre>`,
      });
      const newId = String(created?.id || created?._id || created?.document?.id || created?.document?._id || 'new');
      toast('File opened as a new document', 'success');
      navigate(`/doc/${newId}`);
    } catch {
      const { doc, next } = createLocalDoc({
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: `<pre>${escapeHtml(text.slice(0, 50000))}</pre>`,
      });
      setDocs(next);
      setSelectedDocId(doc.id);
      resetDoc();
      setDocTitle(doc.title);
      setDocContent(doc.content);
      toast('Opened file locally', 'warning');
      navigate('/doc/new');
    } finally {
      event.target.value = '';
    }
  }

  const stats = selectedDoc
    ? (() => {
        const text = String(selectedDoc.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const words = text ? text.split(' ').length : 0;
        return {
          words,
          chars: text.length,
          pages: estimatePagesFromHtml(selectedDoc.content),
        };
      })()
    : { words: 0, chars: 0, pages: 0 };

  return (
    <div style={styles.page}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUploadOpen} />

      <aside style={styles.sidebar}>
        <img src="/assets/etherxwordlogo.png" alt="EtherX Word Logo" style={{ ...styles.fileMenuTitle, maxHeight: '100%', objectFit: 'contain' }} />

        <div style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              style={selectedStyle(activeMenu === item.key, item.danger)}
              onClick={() => runMenuAction(item.key)}
              title={item.label}
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.docPill}>
            <div style={styles.docPillTitle}>{selectedDoc?.title || 'Untitled Document'}</div>
            <div style={styles.docPillMeta}>{stats.words} words • {stats.pages} page</div>
          </div>
          <div style={styles.themeSwitchRow}>
            <button
              style={{ ...styles.themeSwitchBtn, ...(theme === 'light' ? styles.themeSwitchBtnActive : null) }}
              onClick={() => setThemeMode('light')}
              title="Light mode"
            >
              Light
            </button>
            <button
              style={{ ...styles.themeSwitchBtn, ...(theme === 'dark' ? styles.themeSwitchBtnActive : null) }}
              onClick={() => setThemeMode('dark')}
              title="Dark mode"
            >
              Dark
            </button>
          </div>
          <button style={styles.backEditorBtn} onClick={() => navigate(returnTo)}>← Back to Editor</button>
        </div>
      </aside>

      <main style={styles.main}>
        <button style={styles.topBar} onClick={() => navigate(returnTo)}>← Editor</button>

        <section style={styles.hero}>
          <h1 style={styles.heroTitle}>Start Here</h1>
          <p style={styles.heroSub}>Create a new document or access your recent files</p>
        </section>

        {activeMenu === 'home' && (
          <section style={styles.gridArea}>
            <div>
              <div style={styles.sectionLabel}>RECENT DOCUMENTS</div>
              {loading ? (
                <div style={styles.empty}>Loading...</div>
              ) : (
                <div style={styles.recentsWrap}>
                  {visibleDocs.map((doc) => (
                    <div key={doc.id} style={styles.recentCard}>
                      <button style={styles.recentOpenBtn} onClick={() => openDoc(doc)}>
                        <span style={styles.recentIcon}>▣</span>
                        <span style={styles.recentTextWrap}>
                          <span style={styles.recentTitle}>{doc.title}</span>
                          <span style={styles.recentMeta}>{formatActualTime(doc.updatedAt)} • {estimatePagesFromHtml(doc.content)} pages</span>
                        </span>
                      </button>
                      <button
                        style={styles.recentDeleteBtn}
                        onClick={() => deleteDoc(doc)}
                        title="Delete document"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button style={styles.viewAllBtn} onClick={() => runMenuAction('open')}>View All Recent →</button>
                </div>
              )}
            </div>

            <div>
              <div style={styles.sectionLabel}>TEMPLATE CATEGORIES</div>
              <div style={styles.templateGrid}>
                {START_TEMPLATES.map((tpl) => (
                  <button key={tpl.key} style={styles.templateBtn} onClick={() => createFromTemplate(tpl.key)}>
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeMenu === 'info' && (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Document Info</h2>
            <div style={styles.panelRow}>Name: {selectedDoc?.title || '-'}</div>
            <div style={styles.panelRow}>Last modified: {selectedDoc ? formatActualTime(selectedDoc.updatedAt) : '-'}</div>
            <div style={styles.panelRow}>Pages: {stats.pages}</div>
          </section>
        )}

        {activeMenu === 'statistics' && (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Statistics</h2>
            <div style={styles.panelRow}>Words: {stats.words}</div>
            <div style={styles.panelRow}>Characters: {stats.chars}</div>
            <div style={styles.panelRow}>Pages: {stats.pages}</div>
          </section>
        )}

        {activeMenu === 'settings' && (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Settings</h2>
            <div style={styles.panelRow}>Appearance mode</div>
            <div style={styles.panelActionsLeft}>
              <button
                style={{ ...styles.secondaryActionBtn, ...(theme === 'light' ? styles.modeBtnActive : null) }}
                onClick={() => setThemeMode('light')}
              >
                Light mode
              </button>
              <button
                style={{ ...styles.secondaryActionBtn, ...(theme === 'dark' ? styles.modeBtnActive : null) }}
                onClick={() => setThemeMode('dark')}
              >
                Dark mode
              </button>
            </div>
          </section>
        )}

        {activeMenu === 'saveAs' && (
          <section style={styles.saveAsShell}>
            <h2 style={styles.saveAsTitle}>Save As</h2>
            <div style={styles.saveAsLayout}>
              <aside style={styles.saveAsLeft}>
                <div style={styles.saveAsBlock}>
                  {SAVE_AS_LOCATIONS.filter((item) => item.area === 'leftTop').map((item) => (
                    <button
                      key={item.key}
                      style={{
                        ...styles.saveAsItem,
                        ...(saveAsLocation === item.key ? styles.saveAsItemActive : null),
                      }}
                      onClick={() => setSaveAsLocation(item.key)}
                    >
                      <span style={styles.saveAsIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div style={styles.saveAsSectionTitle}>Personal</div>
                <div style={styles.saveAsBlock}>
                  {SAVE_AS_LOCATIONS.filter((item) => item.area === 'personal').map((item) => (
                    <button
                      key={item.key}
                      style={{
                        ...styles.saveAsItem,
                        ...(saveAsLocation === item.key ? styles.saveAsItemActive : null),
                      }}
                      onClick={() => setSaveAsLocation(item.key)}
                    >
                      <span style={styles.saveAsIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div style={styles.saveAsSectionTitle}>Share Options</div>
                <div style={styles.saveAsBlock}>
                  {SAVE_AS_LOCATIONS.filter((item) => item.area === 'share').map((item) => (
                    <button
                      key={item.key}
                      style={{
                        ...styles.saveAsItem,
                        ...(saveAsLocation === item.key ? styles.saveAsItemActive : null),
                      }}
                      onClick={() => setSaveAsLocation(item.key)}
                    >
                      <span style={styles.saveAsIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                <div style={styles.saveAsSectionTitle}>Other locations</div>
                <div style={styles.saveAsBlock}>
                  {SAVE_AS_LOCATIONS.filter((item) => item.area === 'other').map((item) => (
                    <button
                      key={item.key}
                      style={{
                        ...styles.saveAsItem,
                        ...(saveAsLocation === item.key ? styles.saveAsItemActive : null),
                      }}
                      onClick={() => setSaveAsLocation(item.key)}
                    >
                      <span style={styles.saveAsIcon}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div style={styles.saveAsRight}>
                <div style={styles.saveAsRightHeading}>Favorites</div>
                <p style={styles.saveAsMuted}>
                  Favorite folders you want to easily find later. Click the star icon that appears when you hover over a folder.
                </p>

                <div style={{ ...styles.saveAsRightHeading, marginTop: 18 }}>Older</div>
                <div style={styles.saveAsFavoritesList}>
                  {SAVE_AS_FAVORITES.map((fav) => (
                    <button
                      key={fav.key}
                      style={{
                        ...styles.saveAsFavoriteRow,
                        ...(saveAsLocation === fav.key ? styles.saveAsItemActive : null),
                      }}
                      onClick={() => setSaveAsLocation(fav.key)}
                    >
                      <span style={styles.saveAsFavoriteFolder}>▢</span>
                      <span style={styles.saveAsFavoriteMain}>
                        <span style={styles.saveAsFavoriteTitle}>{fav.label}</span>
                        <span style={styles.saveAsFavoritePath}>{fav.path}</span>
                      </span>
                      {fav.updatedAt ? <span style={styles.saveAsFavoriteTime}>{fav.updatedAt}</span> : null}
                    </button>
                  ))}
                </div>

                <div style={styles.saveAsFormRow}>
                  <label style={styles.saveAsFieldLabel}>File name</label>
                  <input
                    value={saveAsName}
                    onChange={(e) => setSaveAsName(e.target.value)}
                    placeholder="Copy of Untitled Document"
                    style={styles.saveAsInput}
                  />
                </div>

                <div style={styles.saveAsFormRow}>
                  <label style={styles.saveAsFieldLabel}>Save as type</label>
                  <select
                    value={saveAsFormat}
                    onChange={(e) => setSaveAsFormat(e.target.value)}
                    style={styles.saveAsSelect}
                  >
                    {SAVE_AS_FORMATS.map((fmt) => (
                      <option key={fmt.key} value={fmt.key}>{fmt.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.saveAsActionRow}>
                  <button
                    style={styles.secondaryActionBtn}
                    onClick={() => setActiveMenu('home')}
                    disabled={saveAsBusy}
                  >
                    Cancel
                  </button>
                  <button
                    style={{ ...styles.primaryActionBtn, marginBottom: 0 }}
                    onClick={performSaveAs}
                    disabled={saveAsBusy}
                  >
                    {saveAsBusy ? 'Saving…' : 'Save As'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {(activeMenu === 'open' || activeMenu === 'share' || activeMenu === 'export') && (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>{activeMenu[0].toUpperCase() + activeMenu.slice(1)}</h2>
            {activeMenu === 'open' && (
              <button style={styles.primaryActionBtn} onClick={() => fileInputRef.current?.click()}>
                Browse from device
              </button>
            )}
            {activeMenu === 'share' && (
              <button style={styles.primaryActionBtn} onClick={shareSelectedDoc}>
                Copy share link for selected document
              </button>
            )}
            {activeMenu === 'export' && (
              <button style={styles.primaryActionBtn} onClick={exportSelectedDoc}>
                Export selected document
              </button>
            )}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents"
              style={styles.search}
            />
            <div style={styles.panelList}>
              {docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase())).slice(0, 8).map((doc) => (
                <div key={doc.id} style={styles.panelItem}>
                  <button style={styles.panelItemMain} onClick={() => setSelectedDocId(doc.id)}>
                    <span>{doc.title}</span>
                    <span style={styles.panelItemMeta}>{formatActualTime(doc.updatedAt)}</span>
                  </button>
                  <button
                    style={styles.panelDeleteBtn}
                    onClick={() => deleteDoc(doc)}
                    title="Delete document"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.panelActions}>
              <button style={styles.secondaryActionBtn} onClick={() => selectedDoc && openDoc(selectedDoc)}>
                Open selected
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-ui)',
    overflow: 'hidden',
  },
  sidebar: {
    width: 238,
    borderRight: '1px solid var(--border-strong)',
    background: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
  },
  fileMenuTitle: {
    height: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    letterSpacing: '.12em',
    fontSize: 12,
    fontWeight: 700,
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 8px',
  },
  menuBtn: {
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-secondary)',
    padding: '10px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    textAlign: 'left',
    fontSize: 15,
    lineHeight: 1,
    fontWeight: 500,
  },
  menuBtnActive: {
    background: 'var(--bg-hover)',
    borderColor: 'var(--border-gold)',
    color: 'var(--text-gold)',
  },
  menuBtnDanger: {
    color: '#cf5d5d',
  },
  menuIcon: {
    width: 18,
    textAlign: 'center',
    fontSize: 17,
    opacity: 0.92,
  },
  sidebarFooter: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border)',
    padding: '10px 8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  docPill: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 10px',
    background: 'var(--bg-elevated)',
  },
  docPillTitle: {
    fontSize: 13,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  docPillMeta: {
    marginTop: 4,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  backEditorBtn: {
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    background: 'var(--bg-elevated)',
    color: 'var(--text-gold)',
    padding: '8px 10px',
    cursor: 'pointer',
    fontSize: 16,
    textAlign: 'left',
  },
  themeSwitchRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
  },
  themeSwitchBtn: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    padding: '7px 0',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  themeSwitchBtnActive: {
    borderColor: 'var(--border-gold)',
    background: 'var(--bg-hover)',
    color: 'var(--text-gold)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-app)',
    overflowY: 'auto',
  },
  topBar: {
    height: 70,
    borderBottom: '1px solid var(--border-strong)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    color: 'var(--text-muted)',
    fontSize: 13,
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  hero: {
    padding: '46px 54px 10px',
  },
  heroTitle: {
    margin: 0,
    fontSize: 44,
    letterSpacing: '.03em',
    color: 'var(--text-heading)',
  },
  heroSub: {
    marginTop: 8,
    marginBottom: 0,
    color: 'var(--text-muted)',
    fontSize: 17,
  },
  gridArea: {
    padding: '20px 54px 40px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 44,
    minWidth: 860,
  },
  sectionLabel: {
    fontSize: 13,
    color: 'var(--text-muted)',
    letterSpacing: '.12em',
    fontWeight: 700,
    marginBottom: 14,
  },
  recentsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  recentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    borderRadius: 10,
    padding: '8px 10px 8px 14px',
    textAlign: 'left',
    color: 'var(--text-primary)',
  },
  recentOpenBtn: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    padding: '6px 2px',
  },
  recentDeleteBtn: {
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-muted)',
    borderRadius: 6,
    cursor: 'pointer',
    width: 28,
    height: 28,
    flex: '0 0 auto',
  },
  recentIcon: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  recentTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  viewAllBtn: {
    border: '1px solid var(--border-gold)',
    borderRadius: 3,
    background: 'transparent',
    color: 'var(--text-gold)',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  templateBtn: {
    border: '1px solid var(--border)',
    borderRadius: 10,
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    minHeight: 58,
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
  },
  panel: {
    margin: '10px 54px 40px',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    borderRadius: 10,
    padding: 18,
    maxWidth: 760,
  },
  panelTitle: {
    margin: '0 0 12px',
    color: 'var(--text-heading)',
    fontSize: 26,
  },
  panelRow: {
    fontSize: 14,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  panelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 10,
  },
  panelItem: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 10px',
  },
  panelItemMain: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flex: 1,
    minWidth: 0,
    padding: '2px 4px',
  },
  panelItemMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  panelDeleteBtn: {
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  panelActions: {
    marginTop: 12,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panelActionsLeft: {
    marginTop: 12,
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-start',
  },
  primaryActionBtn: {
    border: '1px solid var(--border-gold)',
    borderRadius: 8,
    background: 'var(--bg-hover)',
    color: 'var(--text-gold)',
    padding: '9px 12px',
    cursor: 'pointer',
    fontSize: 14,
    marginBottom: 12,
  },
  secondaryActionBtn: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },
  modeBtnActive: {
    borderColor: 'var(--border-gold)',
    background: 'var(--bg-hover)',
    color: 'var(--text-gold)',
  },
  search: {
    width: '100%',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
  },
  saveAsShell: {
    margin: '10px 54px 40px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    padding: 18,
    maxWidth: 980,
  },
  saveAsTitle: {
    margin: '0 0 12px',
    fontSize: 26,
    color: 'var(--text-heading)',
  },
  saveAsLayout: {
    display: 'grid',
    gridTemplateColumns: '332px 1fr',
    borderTop: '1px solid var(--border)',
    minHeight: 420,
  },
  saveAsLeft: {
    padding: '12px 14px 12px 0',
    borderRight: '1px solid var(--border)',
  },
  saveAsRight: {
    padding: '12px 0 0 22px',
    display: 'flex',
    flexDirection: 'column',
  },
  saveAsBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingBottom: 12,
    marginBottom: 8,
    borderBottom: '1px solid var(--border)',
  },
  saveAsSectionTitle: {
    color: 'var(--text-secondary)',
    fontWeight: 700,
    marginBottom: 8,
    fontSize: 18,
  },
  saveAsItem: {
    border: '1px solid transparent',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-primary)',
    padding: '10px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 15,
  },
  saveAsItemActive: {
    background: 'var(--bg-hover)',
    borderColor: 'var(--border-gold)',
    color: 'var(--text-gold)',
  },
  saveAsIcon: {
    width: 40,
    textAlign: 'center',
    opacity: 0.9,
  },
  saveAsRightHeading: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 22,
    fontWeight: 700,
  },
  saveAsMuted: {
    marginTop: 6,
    color: 'var(--text-muted)',
    fontSize: 13,
    maxWidth: 780,
  },
  saveAsFavoritesList: {
    marginTop: 8,
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
  },
  saveAsFavoriteRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: 'none',
    borderBottom: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    textAlign: 'left',
    padding: '10px 10px',
    fontSize: 15,
  },
  saveAsFavoriteFolder: {
    fontSize: 24,
    color: 'var(--text-secondary)',
    width: 40,
    textAlign: 'center',
  },
  saveAsFavoriteMain: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },
  saveAsFavoriteTitle: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  saveAsFavoritePath: {
    marginTop: 2,
    color: 'var(--text-muted)',
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  saveAsFavoriteTime: {
    color: 'var(--text-muted)',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  saveAsFormRow: {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: '130px 1fr',
    alignItems: 'center',
    gap: 10,
  },
  saveAsFieldLabel: {
    color: 'var(--text-secondary)',
    fontSize: 13,
  },
  saveAsInput: {
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '9px 10px',
    fontSize: 14,
  },
  saveAsSelect: {
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderRadius: 6,
    padding: '9px 10px',
    fontSize: 14,
  },
  saveAsActionRow: {
    marginTop: 'auto',
    paddingTop: 16,
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  empty: {
    color: 'var(--text-muted)',
    fontSize: 14,
  },
};
