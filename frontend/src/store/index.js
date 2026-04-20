// ═══════════════════════════════════════════════════════════════
//  EtherX Word — Central State (Zustand)
// ═══════════════════════════════════════════════════════════════
import { create } from 'zustand';

const baseDocumentState = () => ({
  id: null,
  title: 'Untitled Document',
  content: '',
  headerFooter: {
    headerText: '',
    headerAlign: 'Center',
    footerText: '',
    footerAlign: 'Center',
    pageNumberEnabled: false,
    pageNumberStyle: 'bottom-center',
    pageNumberStart: 1,
  },
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  revision: 0,
  versions: [],
  comments: [],
  trackChanges: false,
  wordCount: 0,
  charCount: 0,
  pageCount: 1,
  readingTime: 0,
  pageOrder: [0],
  pageThumbnails: {},
});

/* ── Document Store ─────────────────────────────────────────── */
export const useDocumentStore = create((set) => ({
    ...baseDocumentState(),

    setId: (id) => set({ id }),
    hydrateDocument: (doc = {}) =>
      set((state) => ({
        ...state,
        id: doc.id ?? doc._id ?? state.id ?? null,
        title: doc.title || 'Untitled Document',
        content: doc.content ?? '<p></p>',
        headerFooter: {
          ...state.headerFooter,
          ...(doc.headerFooter || {}),
        },
        isDirty: false,
        isSaving: false,
        lastSaved: doc.updatedAt ? new Date(doc.updatedAt) : state.lastSaved,
        createdAt: doc.createdAt ? new Date(doc.createdAt) : state.createdAt,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
        revision: Number.isFinite(Number(doc.revision)) ? Number(doc.revision) : state.revision,
        versions: Array.isArray(doc.versions) ? doc.versions : [],
        comments: Array.isArray(doc.comments) ? doc.comments : [],
        trackChanges: Boolean(doc.trackChanges),
      })),
    applyRemoteUpdate: (patch = {}) =>
      set((state) => ({
        title: patch.title ?? state.title,
        content: typeof patch.content === 'string' ? patch.content : state.content,
        headerFooter: patch.headerFooter ? { ...state.headerFooter, ...patch.headerFooter } : state.headerFooter,
        comments: Array.isArray(patch.comments) ? patch.comments : state.comments,
        trackChanges: typeof patch.trackChanges === 'boolean' ? patch.trackChanges : state.trackChanges,
        updatedAt: patch.updatedAt ? new Date(patch.updatedAt) : new Date(),
        revision: Number.isFinite(Number(patch.revision)) ? Number(patch.revision) : state.revision,
        lastSaved: patch.updatedAt ? new Date(patch.updatedAt) : state.lastSaved,
        isDirty: false,
      })),

    setTitle:    (title)   => set({ title,   isDirty: true }),
    setContent:  (content) => set({ content, isDirty: true, updatedAt: new Date() }),
    setHeaderFooter: (headerFooter = {}) =>
      set((state) => ({
        headerFooter: { ...state.headerFooter, ...headerFooter },
        isDirty: true,
        updatedAt: new Date(),
      })),
    setSaving:   (v)       => set({ isSaving: v }),
    setRevision: (revision) => set((state) => ({
      revision: Number.isFinite(Number(revision)) ? Number(revision) : state.revision,
    })),
    setLastSaved:(value = new Date()) => set({ lastSaved: value instanceof Date ? value : new Date(value), isDirty: false }),
    setStats: ({ wordCount = 0, charCount = 0, pageCount = 1 }) =>
      set((s) => {
        if (s.pageCount === pageCount) {
          return { wordCount, charCount, pageCount, readingTime: Math.ceil(wordCount / 200) };
        }
        const prev = s.pageOrder;
        const newOrder = Array.from({ length: pageCount }, (_, i) => i);
        const kept = prev.filter((p) => p < pageCount);
        const added = newOrder.filter((p) => !kept.includes(p));
        return { wordCount, charCount, pageCount, readingTime: Math.ceil(wordCount / 200), pageOrder: [...kept, ...added] };
      }),
    setThumbnail: (index, dataUrl) =>
      set((s) => ({ pageThumbnails: { ...s.pageThumbnails, [index]: dataUrl } })),
    reorderPages: (from, to) =>
      set((s) => {
        const order = [...s.pageOrder];
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        return { pageOrder: order };
      }),
    addVersion: (snapshot) =>
      set((s) => ({ versions: [{ id: Date.now(), snapshot, savedAt: new Date(), label: `v${s.versions.length + 1}` }, ...s.versions] })),
    setComments: (comments) => set({ comments, isDirty: true, updatedAt: new Date() }),
    replaceComments: (comments) => set({ comments, isDirty: false, updatedAt: new Date() }),
    addComment: (c)  => set((s) => ({ comments: [...s.comments, { id: Date.now(), ...c, resolved: false }], isDirty: true, updatedAt: new Date() })),
    deleteComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id), isDirty: true, updatedAt: new Date() })),
    resolveComment: (id) => set((s) => ({ comments: s.comments.map((c) => c.id === id ? { ...c, resolved: true } : c), isDirty: true, updatedAt: new Date() })),
    toggleTrackChanges: () => set((s) => ({ trackChanges: !s.trackChanges, isDirty: true, updatedAt: new Date() })),
    reset: () => set(baseDocumentState()),
}));

/* ── UI Store ───────────────────────────────────────────────── */
export const useUIStore = create((set) => ({
  theme: localStorage.getItem('etherx-theme') || 'dark',
  autoSaveEnabled: localStorage.getItem('etherx-autosave') !== 'false',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  toggleAutoSave: () =>
    set((s) => {
      const next = !s.autoSaveEnabled;
      localStorage.setItem('etherx-autosave', next ? 'true' : 'false');
      return { autoSaveEnabled: next };
    }),
  setAutoSaveEnabled: (enabled) => {
    localStorage.setItem('etherx-autosave', enabled ? 'true' : 'false');
    set({ autoSaveEnabled: !!enabled });
  },
  sidebarOpen: true,
  fullscreen: false,
  ribbonCollapsed: false,
  zoom: 100,
  activeTab: 'home',
  activePage: 0,
  headerFooterTab: 'header',

  // Page layout state
  rulerVisible: false,
  gridlinesVisible: false,
  pageOrientation: 'portrait',  // 'portrait' | 'landscape'
  pageSize: 'a4',               // 'a4' | 'letter' | 'legal' | 'a3'
  pageMargin: 'normal',         // 'normal' | 'narrow' | 'moderate' | 'wide'
  pageColumns: 1,
  drawTool: 'pen',
  drawColor: '#111111',
  drawSize: 4,
  drawOpacity: 0.4,

  toggleSidebar:      () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleFullscreen:   () => set((s) => ({ fullscreen: !s.fullscreen })),
  toggleRibbon:       () => set((s) => ({ ribbonCollapsed: !s.ribbonCollapsed })),
  toggleRuler:        () => set((s) => ({ rulerVisible: !s.rulerVisible })),
  toggleGridlines:    () => set((s) => ({ gridlinesVisible: !s.gridlinesVisible })),
  setZoom:            (z) => set({ zoom: Math.min(200, Math.max(25, z)) }),
  setActiveTab:       (t) => set({ activeTab: t }),
  setActivePage:      (p) => set({ activePage: p }),
  setHeaderFooterTab: (t) => set({ headerFooterTab: t }),
  setPageOrientation: (o) => set({ pageOrientation: o }),
  setPageSize:        (s) => set({ pageSize: s }),
  setPageMargin:      (m) => set({ pageMargin: m }),
  setPageColumns:     (c) => set({ pageColumns: c }),
  setDrawTool:        (t) => set({ drawTool: t }),
  setDrawColor:       (c) => set({ drawColor: c }),
  setDrawSize:        (s) => set({ drawSize: s }),
  setDrawOpacity:     (o) => set({ drawOpacity: Math.max(0.1, Math.min(1, o)) }),

  dialogs: {
    insertImage: false, insertTable: false, insertLink: false,
    insertChart: false, insertShape: false, insertSymbol: false,
    findReplace: false, versionHistory: false, exportDoc: false,
    shareDoc: false, drawing: false, templates: false,
    pageSetup: false, comments: false,
    lineSpacing: false, shading: false, borders: false, dictate: false,
    coverPage: false, header: false, footer: false, pageNumber: false,
    headerFooter: false,
    wordArt: false, equation: false, bookmark: false, crossReference: false,
    insertTextBox: false,
    breaks: false, selectionPane: false,
    greetingLine: false,
    tableOfContents: false, insertCitation: false, manageSources: false,
    bibliography: false, navigationPane: false,
    envelopes: false, labels: false, mailMerge: false, selectRecipients: false,
    editRecipients: false, insertMergeField: false, finishMerge: false,
    wordCount: false, language: false, reviewingPane: false,
    accessibility: false, compareDocuments: false, restrictEditing: false,
    commandMap: false,
    help: false, feedback: false, whatsNew: false, about: false,
  },
  openDialog:  (name) => set((s) => ({ dialogs: { ...s.dialogs, [name]: true  } })),
  closeDialog: (name) => set((s) => ({ dialogs: { ...s.dialogs, [name]: false } })),
  closeAll:    ()     => set((s) => ({ dialogs: Object.fromEntries(Object.keys(s.dialogs).map((k) => [k, false])) })),

  toasts: [],
  toast: (message, type = 'info', duration = 3200) =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now(), message, type, duration }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  findQuery: '', replaceQuery: '',
  setFindQuery:    (v) => set({ findQuery: v }),
  setReplaceQuery: (v) => set({ replaceQuery: v }),
}));

/* ── Editor Store ───────────────────────────────────────────── */
export const useEditorStore = create((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  fontFamily: 'Crimson Pro',
  fontSize: '12',
  setFontFamily: (v) => set({ fontFamily: v }),
  setFontSize:   (v) => set({ fontSize: v }),
  spellCheck: true,
  toggleSpellCheck: () => set((s) => ({ spellCheck: !s.spellCheck })),
  isProgrammaticChange: false,
  programmaticContent: null,
  beginProgrammaticChange: (content = null) => set({ isProgrammaticChange: true, programmaticContent: content }),
  endProgrammaticChange: () => set({ isProgrammaticChange: false, programmaticContent: null }),
  // Format painter: stores captured marks to apply on next selection
  formatPainterMarks: null,
  setFormatPainterMarks: (marks) => set({ formatPainterMarks: marks }),
}));

/* ── Collaboration Store ────────────────────────────────────── */
export const useCollaborationStore = create((set) => ({
  sessionId: null,
  connected: false,
  status: 'Not shared',
  userName: 'You',
  role: 'editor',
  collaborators: [],
  lastSyncedAt: null,
  lastRemoteEditAt: null,

  configureSession: ({ sessionId, userName, role = 'editor' }) =>
    set({
      sessionId,
      userName: userName || 'You',
      role,
      status: 'Connecting…',
    }),
  setConnected: (connected) =>
    set({
      connected,
      status: connected ? 'Live' : 'Disconnected',
    }),
  setCollaborators: (collaborators) => set({ collaborators: Array.isArray(collaborators) ? collaborators : [] }),
  setLastSyncedAt: (value = new Date()) =>
    set({ lastSyncedAt: value instanceof Date ? value : new Date(value) }),
  setLastRemoteEditAt: (value = new Date()) =>
    set({ lastRemoteEditAt: value instanceof Date ? value : new Date(value) }),
  reset: () =>
    set({
      sessionId: null,
      connected: false,
      status: 'Not shared',
      userName: 'You',
      role: 'editor',
      collaborators: [],
      lastSyncedAt: null,
      lastRemoteEditAt: null,
    }),
}));
