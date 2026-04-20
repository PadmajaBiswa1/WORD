const router = require('express').Router();
const {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  listVersions,
  restoreVersion,
  sanitizeUser,
  shareDocument,
  updateDocument,
} = require('../lib/documentStore');
const { sendInviteEmail } = require('../utils/sendEmail');
const {
  broadcast,
  broadcastPresence,
  listCollaborators,
  registerClient,
  unregisterClient,
  updatePresence,
  writeEvent,
} = require('../lib/collaborationHub');

function requestUser(req) {
  return sanitizeUser({
    id: req.get('X-EtherX-User-Id') || req.body?.user?.id || req.query?.sessionId,
    name: req.get('X-EtherX-User-Name') || req.body?.user?.name || req.query?.name,
    email: req.get('X-EtherX-User-Email') || req.body?.user?.email || req.query?.email,
  });
}

router.get('/', (_req, res) => {
  res.json({ documents: listDocuments() });
});

router.post('/', (req, res) => {
  const document = createDocument(req.body || {}, requestUser(req));
  res.status(201).json(document);
});

router.get('/:id', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });
  res.json(document);
});

router.put('/:id', (req, res) => {
  const document = updateDocument(req.params.id, req.body || {}, { createVersion: true });
  if (!document) return res.status(404).json({ message: 'Document not found' });
  res.json(document);
});

router.delete('/:id', (req, res) => {
  const removed = deleteDocument(req.params.id);
  if (!removed) return res.status(404).json({ message: 'Document not found' });
  res.json({ ok: true });
});

router.get('/:id/versions', (req, res) => {
  const versions = listVersions(req.params.id);
  if (!versions) return res.status(404).json({ message: 'Document not found' });
  res.json({ versions });
});

router.post('/:id/versions/:vid/restore', (req, res) => {
  const document = restoreVersion(req.params.id, req.params.vid);
  if (!document) return res.status(404).json({ message: 'Version not found' });
  res.json(document);
});

router.post('/:id/share', async (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  const result = shareDocument(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ message: 'Document not found' });

  const { share, document: updatedDocument } = result;
  const origin = req.get('origin') || process.env.FRONTEND_URL || 'http://localhost:3000';
  const shareUrl = `${origin.replace(/\/$/, '')}/doc/${req.params.id}`;

  let inviteEmailSent = false;
  let inviteEmailError = null;

  if (share?.email) {
    try {
      const inviter = requestUser(req);
      await sendInviteEmail({
        toEmail: share.email,
        inviterName: inviter?.name || 'A collaborator',
        documentTitle: updatedDocument?.title || document.title,
        shareUrl,
        role: share.role || 'viewer',
      });
      inviteEmailSent = true;
    } catch (error) {
      inviteEmailError = error?.message || 'Invite email could not be sent';
    }
  }

  res.json({
    share,
    shareUrl,
    sharedWith: Array.isArray(updatedDocument?.sharedWith) ? updatedDocument.sharedWith : [],
    inviteEmailSent,
    inviteEmailError,
  });
});

router.get('/:id/collaboration/stream', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  const session = {
    sessionId: req.query.sessionId || `session-${Date.now()}`,
    role: req.query.role || 'editor',
    user: requestUser(req),
  };

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(': connected\n\n');

  registerClient(req.params.id, session, res);
  writeEvent(res, 'ready', {
    sessionId: session.sessionId,
    collaborators: listCollaborators(req.params.id),
  });
  writeEvent(res, 'snapshot', {
    document,
    collaborators: listCollaborators(req.params.id),
  });
  broadcastPresence(req.params.id);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterClient(req.params.id, session.sessionId);
    res.end();
  });
});

router.post('/:id/collaboration/publish', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  const { type, payload = {}, sessionId } = req.body || {};
  const user = requestUser(req);
  if (!type || !sessionId) {
    return res.status(400).json({ message: 'type and sessionId are required' });
  }

  if (type === 'presence') {
    updatePresence(req.params.id, sessionId, {
      cursor: payload.cursor ?? null,
      status: payload.status || 'active',
    });
    broadcastPresence(req.params.id);
    return res.json({ ok: true });
  }

  if (type === 'leave') {
    unregisterClient(req.params.id, sessionId);
    return res.json({ ok: true });
  }

  if (type === 'change') {
    const baseRevision = Number(payload.baseRevision);
    if (Number.isFinite(baseRevision) && baseRevision !== Number(document.revision || 0)) {
      return res.status(409).json({
        message: 'Revision conflict',
        document,
        expectedRevision: document.revision || 0,
      });
    }

    const nextDocument = updateDocument(
      req.params.id,
      {
        title: payload.title,
        content: payload.content,
        comments: Array.isArray(payload.comments) ? payload.comments : undefined,
        trackChanges: typeof payload.trackChanges === 'boolean' ? payload.trackChanges : undefined,
      },
      { createVersion: false },
    );

    broadcast(req.params.id, 'change', {
      sessionId,
      user,
      payload: nextDocument,
      revision: nextDocument?.revision || 0,
    }, { excludeSessionId: sessionId });

    return res.json({ ok: true, document: nextDocument, revision: nextDocument?.revision || 0 });
  }

  if (type === 'comment') {
    const baseRevision = Number(payload.baseRevision);
    if (Number.isFinite(baseRevision) && baseRevision !== Number(document.revision || 0)) {
      return res.status(409).json({
        message: 'Revision conflict',
        document,
        expectedRevision: document.revision || 0,
      });
    }

    const nextDocument = updateDocument(
      req.params.id,
      {
        comments: Array.isArray(payload.comments) ? payload.comments : document.comments,
      },
      { createVersion: false },
    );

    broadcast(req.params.id, 'comment', {
      sessionId,
      user,
      payload: {
        comments: nextDocument.comments,
        updatedAt: nextDocument.updatedAt,
        revision: nextDocument.revision || 0,
      },
    }, { excludeSessionId: sessionId });

    return res.json({ ok: true, document: nextDocument, revision: nextDocument?.revision || 0 });
  }

  broadcast(req.params.id, type, { sessionId, user, payload }, { excludeSessionId: sessionId });
  res.json({ ok: true });
});

module.exports = router;
