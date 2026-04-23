import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore, useDocumentStore } from '@/store';
import { useCollaborationStore } from '@/store';
import { Modal, Button, Input, Label, Stack } from '@/components/ui';
import { documentApi } from '@/services/api';

export function ShareDialog() {
  const navigate = useNavigate();
  const { closeDialog, toast } = useUIStore();
  const { id, title, content, setId, setLastSaved } = useDocumentStore();
  const { collaborators, connected } = useCollaborationStore();
  const [copied, setCopied] = useState(false);
  const [email,  setEmail]  = useState('');
  const [role,   setRole]   = useState('viewer');
  const [working, setWorking] = useState(false);
  const [invitedCollaborators, setInvitedCollaborators] = useState([]);

  const activeDocId = id || 'new';
  const shareUrl = activeDocId === 'new'
    ? `${window.location.origin}/doc/new`
    : `${window.location.origin}/doc/${activeDocId}`;

  const loadInvitedCollaborators = async (docId) => {
    if (!docId) {
      setInvitedCollaborators([]);
      return;
    }
    try {
      const document = await documentApi.get(docId);
      const shared = Array.isArray(document?.sharedWith)
        ? document.sharedWith
        : Array.isArray(document?.document?.sharedWith)
          ? document.document.sharedWith
          : [];
      setInvitedCollaborators(shared);
    } catch {
      setInvitedCollaborators([]);
    }
  };

  useEffect(() => {
    if (!id) {
      setInvitedCollaborators([]);
      return;
    }
    loadInvitedCollaborators(id);
  }, [id]);

  const displayedCollaborators = useMemo(() => {
    const active = (collaborators || []).map((person) => ({
      key: person.sessionId || person.id || person.email || person.name,
      title: person.name || person.email || 'Guest User',
      subtitle: person.role || 'editor',
      status: person.status || 'active',
      isInvite: false,
    }));

    const activeEmails = new Set(
      active
        .map((person) => (person.title || '').toLowerCase())
        .filter(Boolean),
    );

    const invited = (invitedCollaborators || [])
      .filter((invite) => invite?.email)
      .filter((invite) => !activeEmails.has(String(invite.email).toLowerCase()))
      .map((invite) => ({
        key: invite.id || invite.email,
        title: invite.email,
        subtitle: invite.role || 'viewer',
        status: 'invited',
        isInvite: true,
      }));

    return [...active, ...invited];
  }, [collaborators, invitedCollaborators]);

  const ensureShareableDocument = async () => {
    if (id) return id; // Already have an ID, document is shareable
    
    setWorking(true);
    try {
      const created = await documentApi.create({ title, content });
      const newId = String(created?.id || created?._id || created?.document?.id || created?.document?._id || '');
      if (!newId) throw new Error('The document could not be created');
      setId(newId);
      if (created?.updatedAt) setLastSaved(created.updatedAt);
      await loadInvitedCollaborators(newId);
      // Update URL without navigation
      window.history.replaceState(null, '', `/doc/${newId}`);
      return newId;
    } catch (error) {
      console.error('Failed to create shareable document:', error);
      throw error;
    } finally {
      setWorking(false);
    }
  };

  const copyLink = async () => {
    if (working || copied) return; // Prevent multiple simultaneous clicks
    try {
      setCopied(false); // Reset state first
      const docId = await ensureShareableDocument();
      const nextUrl = `${window.location.origin}/doc/${docId}`;
      await navigator.clipboard.writeText(nextUrl);
      setCopied(true);
      toast('Share link copied to clipboard', 'success');
      
      // Reset "copied" state after 2 seconds for re-click
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
      toast('Unable to prepare a shared document right now', 'error');
      console.error('Copy link error:', err);
    }
  };

  const inviteUser = async () => {
    const inviteEmail = email.trim().toLowerCase();
    if (!inviteEmail) {
      toast('Please enter an email address', 'warning');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast('Please enter a valid email address', 'error');
      return;
    }

    if (working) {
      toast('Please wait, processing previous invite...', 'info');
      return;
    }

    setWorking(true);
    try {
      console.log(`📧 Starting invite process for: ${inviteEmail}`);
      const docId = await ensureShareableDocument();
      console.log(`📄 Document ID: ${docId}`);
      
      const response = await documentApi.share(docId, { email: inviteEmail, role });
      console.log(`📧 Share response:`, response);
      
      const sharedEmail = response?.share?.email || inviteEmail;

      // Update invited collaborators list
      if (Array.isArray(response?.sharedWith)) {
        setInvitedCollaborators(response.sharedWith);
        console.log(`✅ Collaborators updated:`, response.sharedWith);
      } else {
        await loadInvitedCollaborators(docId);
      }

      // Provide detailed feedback based on response
      if (response?.inviteEmailSent) {
        toast(`✓ Invitation email sent to ${sharedEmail}`, 'success');
        console.log(`✅ Email invitation sent successfully`);
      } else if (response?.inviteEmailError) {
        // Email service issue but collaborator was added
        const errorMsg = response.inviteEmailError;
        console.warn(`⚠️ Email failed: ${errorMsg}`);
        
        if (errorMsg.includes('SMTP') || errorMsg.includes('credential')) {
          toast(`${sharedEmail} added as collaborator. Email service config needed.`, 'warning');
        } else if (errorMsg.includes('timeout')) {
          toast(`${sharedEmail} added. Email sending timed out - try resending invite.`, 'warning');
        } else {
          toast(`${sharedEmail} added as collaborator. Note: ${errorMsg}`, 'warning');
        }
      } else if (response?.share) {
        // Collaborator added (email status unclear from response)
        toast(`✓ ${sharedEmail} added as collaborator`, 'success');
        console.log(`✅ Collaborator added`);
      } else {
        toast(`✓ ${sharedEmail} has been invited`, 'success');
        console.log(`✅ Invitation created`);
      }
      
      // Clear email field after successful invite
      setEmail('');
      console.log(`✅ Email field cleared, ready for next invite`);
    } catch (error) {
      const errorMsg = error?.message || 'Unknown error';
      console.error(`❌ Invite failed: ${errorMsg}`, error);
      toast(`Invite failed: ${errorMsg}`, 'error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal title="Share Document" onClose={() => closeDialog('shareDoc')} width={480}>
      <Stack gap={20}>
        <div style={{ padding:'12px 14px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>
            {connected ? 'Live collaboration is active' : 'Share this document to start live collaboration'}
          </div>
          <div style={{ marginTop:6, fontFamily:'var(--font-ui)', fontSize:12, color:'var(--text-secondary)' }}>
            {collaborators.length > 0
              ? `${collaborators.length} collaborator${collaborators.length === 1 ? '' : 's'} currently in this document.`
              : 'No collaborators are connected yet.'}
          </div>
        </div>

        {/* Link share */}
        <div>
          <Label>Share Link</Label>
          <div style={{ display:'flex', gap:6 }}>
            <div style={{
              flex:1, padding:'6px 10px', background:'var(--bg-elevated)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-sm)',
              fontFamily:'var(--font-ui)', fontSize:12, color:'var(--text-secondary)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{shareUrl}</div>
            <Button 
              variant={copied ? 'primary' : 'outline'} 
              onClick={copyLink} 
              disabled={working}
              title="Copy share link to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </Button>
          </div>
          <div style={{ marginTop: 6, fontFamily:'var(--font-ui)', fontSize: 11, color:'var(--text-muted)' }}>
            📌 Share this link with anyone to start collaborating instantly - no sign-up required
          </div>
        </div>

        {/* Invite */}
        <div>
          <Label>Invite by Email</Label>
          <div style={{ display:'flex', gap:6 }}>
            <Input value={email} onChange={setEmail} placeholder="colleague@company.com" style={{ flex:1 }} />
            <select value={role} onChange={(e) => setRole(e.target.value)}
              style={{ background:'var(--bg-elevated)', color:'var(--text-primary)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'6px 8px', fontSize:12, fontFamily:'var(--font-ui)', outline:'none' }}>
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
            <Button variant="primary" onClick={inviteUser} disabled={!email.trim() || working}>Invite</Button>
          </div>
        </div>

        <div>
          <Label>Active Collaborators</Label>
          <div style={{ display:'grid', gap:8 }}>
            {displayedCollaborators.length === 0 ? (
              <div style={{ padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:12, fontFamily:'var(--font-ui)', color:'var(--text-secondary)' }}>
                Nobody else is editing this document yet.
              </div>
            ) : displayedCollaborators.map((person) => (
              <div key={person.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{person.title}</div>
                  <div style={{ fontFamily:'var(--font-ui)', fontSize:11, color:'var(--text-secondary)' }}>{person.subtitle}</div>
                </div>
                <div style={{ fontFamily:'var(--font-ui)', fontSize:11, color:'var(--text-gold)' }}>
                  {person.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Access settings */}
        <div style={{ padding:'12px 14px', background:'var(--bg-elevated)', borderRadius:'var(--radius-md)', border:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:12, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>🔒 Access Settings</div>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:12, color:'var(--text-secondary)' }}>
            Anyone with the link can join this document. Use invited roles to guide whether they should view, comment, or edit.
          </div>
        </div>

        <Button variant="subtle" onClick={() => closeDialog('shareDoc')}>Done</Button>
      </Stack>
    </Modal>
  );
}
