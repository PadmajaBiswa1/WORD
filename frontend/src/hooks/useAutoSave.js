import { useEffect, useRef, useCallback } from 'react';
import { useDocumentStore, useUIStore } from '@/store';
import { documentApi } from '@/services/api';

const DELAY = 3000;

export function useAutoSave() {
  const toast    = useUIStore((s) => s.toast);
  const autoSaveEnabled = useUIStore((s) => s.autoSaveEnabled);
  const isDirty  = useDocumentStore((s) => s.isDirty);
  const content  = useDocumentStore((s) => s.content);
  const timer    = useRef(null);
  const vTimer   = useRef(null);

  const save = useCallback(async () => {
    const store = useDocumentStore.getState();
    if (!store) return;
    const { id, title, content: c, comments, trackChanges, isDirty: dirty, setSaving, setLastSaved } = store;
    if (!dirty) return;
    setSaving(true);
    try {
      if (id) await documentApi.save(id, { title, content: c, comments, trackChanges });
      setLastSaved();
    } catch {
      toast('Auto-save failed', 'error');
    } finally {
      setSaving(false);
    }
  }, [toast]);

  // Debounce on content changes
  useEffect(() => {
    if (!autoSaveEnabled) {
      clearTimeout(timer.current);
      return;
    }
    if (!isDirty) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, DELAY);
    return () => clearTimeout(timer.current);
  }, [autoSaveEnabled, isDirty, content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Version snapshot every 5 min
  useEffect(() => {
    if (!autoSaveEnabled) {
      clearInterval(vTimer.current);
      return;
    }
    vTimer.current = setInterval(() => {
      const { content: c, addVersion } = useDocumentStore.getState();
      if (c) addVersion(c);
    }, 5 * 60_000);
    return () => clearInterval(vTimer.current);
  }, [autoSaveEnabled]);

  // Ctrl/Cmd+S
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [save]);

  return { save };
}
