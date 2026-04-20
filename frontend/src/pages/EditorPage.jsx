// ═══════════════════════════════════════════════════════════════
//  EditorPage — Main editor layout
// ═══════════════════════════════════════════════════════════════
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TitleBar }       from '@/components/editor/TitleBar';
import { Ribbon }         from '@/components/toolbar/Ribbon';
import { PageSidebar }    from '@/components/sidebar/PageSidebar';
import { EditorCanvas }   from '@/components/editor/EditorCanvas';
import { StatusBar }      from '@/components/editor/StatusBar';
import { DialogManager }  from '@/components/dialogs/DialogManager';
import { ToastContainer } from '@/components/ui/Toast';
import { useAutoSave }    from '@/hooks/useAutoSave';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUIStore, useDocumentStore } from '@/store';
import { documentApi } from '@/services/api';

export function EditorPage() {
  const { id: routeId } = useParams();
  const fullscreen = useUIStore((s) => s.fullscreen);
  const reset = useDocumentStore((s) => s.reset);
  const hydrateDocument = useDocumentStore((s) => s.hydrateDocument);
  const setId = useDocumentStore((s) => s.setId);
  const documentId = useDocumentStore((s) => s.id);

  const { save } = useAutoSave();
  useKeyboardShortcuts();
  useCollaboration(routeId && routeId !== 'new' ? routeId : documentId);

  // Load doc if ID provided
  useEffect(() => {
    if (routeId && routeId !== 'new') {
      setId(routeId);
      documentApi.get(routeId)
        .then((doc) => {
          hydrateDocument(doc);
        })
        .catch(() => { /* new doc — ignore */ });
    } else {
      reset();
    }
  }, [hydrateDocument, reset, routeId, setId]);

  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-app)',
      ...(fullscreen ? { position:'fixed', inset:0, zIndex:9000 } : {}),
    }}>
      {/* Title bar */}
      <TitleBar onSave={save} />

      {/* Ribbon */}
      <Ribbon />

      {/* Body: sidebar + canvas */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <PageSidebar />
        <EditorCanvas />
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Dialogs (portal-like, fixed positioning) */}
      <DialogManager />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}
