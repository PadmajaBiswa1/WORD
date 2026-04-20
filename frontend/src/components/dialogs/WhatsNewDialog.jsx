import { useState } from 'react';
import { useUIStore } from '@/store';
import { Modal, Button, Stack } from '@/components/ui';

const FEATURES = [
  {
    id: 'real-time-collab',
    title: '⚡ Real-Time Collaboration (No Sign-Up)',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'Share a link and start collaborating instantly - no accounts, no sign-ups, no waiting. Perfect for teams, clients, and ad-hoc projects.',
    traditional: 'Word Online requires Microsoft accounts for all collaborators',
    etherx: 'Copy link → Share → Instant collaboration with anyone'
  },
  {
    id: 'cloud-native',
    title: '☁️ Cloud-Native & Open',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'Built from ground up for the cloud. Documents sync globally. No tedious uploads/downloads - just seamless editing.',
    traditional: 'Local files require manual saves and syncing',
    etherx: 'Auto-save every 3 seconds. Always up-to-date globally.'
  },
  {
    id: 'modern-ui',
    title: '🎨 Modern, Responsive UI',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'Fast, responsive interface that works perfectly on desktop, tablet, and mobile. Dark mode by default. Distraction-free editing.',
    traditional: 'Heavy ribbon interface, slower rendering',
    etherx: 'Lightweight, optimized for speed. Focus mode available.'
  },
  {
    id: 'live-cursors',
    title: '👀 Live Cursor Tracking',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'See exactly where collaborators are typing with live colored cursors. Perfect for video calls and remote meetings.',
    traditional: 'Limited cursor visibility, causes confusion',
    etherx: 'Crystal-clear live cursors for each collaborator'
  },
  {
    id: 'true-collab-track',
    title: '🔍 True Collaborative Tracking',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'See changes as they happen with live collaborative tracking, not just post-hoc versioning.',
    traditional: 'Track changes requires merge workflows',
    etherx: 'Live change tracking + full version history'
  },
  {
    id: 'ipfs-storage',
    title: '🌐 Decentralized Storage (IPFS)',
    unique: 'ETHERXWORD EXCLUSIVE',
    description: 'Pin documents to IPFS for permanent, censorship-resistant storage. Own your data.',
    traditional: 'Centralized cloud storage only',
    etherx: 'Hybrid: cloud + IPFS pinning for ownership'
  },
  {
    id: 'keyboard-first',
    title: '⌨️ Keyboard-First Power User Support',
    unique: 'BETTER THAN WORD',
    description: 'Extensive keyboard shortcut support. Customizable workflows for power users.',
    traditional: 'Heavy mouse dependency',
    etherx: 'Full keyboard navigation + custom shortcuts'
  },
  {
    id: 'integrated-collab',
    title: '💬 Integrated Comments & Feedback',
    unique: 'BETTER THAN WORD',
    description: 'Comments, replies, and resolution tracking without external tools.',
    traditional: 'Comments can get messy in complex documents',
    etherx: 'Clean, threaded comments with resolve status'
  },
  {
    id: 'performance',
    title: '⚙️ Lightning Fast Performance',
    unique: 'BETTER THAN WORD',
    description: 'Instant document loading. Smooth scrolling even with massive documents.',
    traditional: 'Can lag with large documents',
    etherx: 'Optimized rendering + lazy loading'
  },
  {
    id: 'privacy-first',
    title: '🔒 Privacy-First Design',
    unique: 'BETTER THAN WORD',
    description: 'Minimal tracking. No telemetry collection. Your documents are yours.',
    traditional: 'Microsoft collects usage data',
    etherx: 'Open source. No tracking. Your data stays yours.'
  },
  {
    id: 'versioning',
    title: '📜 Full Version History',
    unique: 'BETTER THAN WORD',
    description: 'Revert to any previous version instantly. See what changed and who changed it.',
    traditional: 'Limited version history',
    etherx: 'Complete change log with collaborative details'
  },
  {
    id: 'merge-personalization',
    title: '📬 Smart Mail Merge',
    unique: 'FEATURE PARITY',
    description: 'Mail merge with live preview. Test before mass-generate.',
    traditional: 'Word has mail merge but process is clunky',
    etherx: 'Streamlined workflow + live preview'
  }
];

const CATEGORIES = [
  { id: 'exclusive', label: '✨ EtherXWord Exclusive', count: 6 },
  { id: 'better', label: '🚀 Better Than Word', count: 5 },
  { id: 'feature-parity', label: '📋 Feature Parity', count: 1 }
];

export function WhatsNewDialog() {
  const { closeDialog } = useUIStore();
  const [selectedCategory, setSelectedCategory] = useState('exclusive');
  
  const filteredFeatures = selectedCategory === 'exclusive' 
    ? FEATURES.filter(f => f.unique.includes('EXCLUSIVE'))
    : selectedCategory === 'better'
    ? FEATURES.filter(f => f.unique.includes('BETTER'))
    : FEATURES.filter(f => f.unique.includes('PARITY'));

  return (
    <Modal title="What's New in EtherXWord" onClose={() => closeDialog('whatsNew')} width={800}>
      <Stack gap={16}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                background: selectedCategory === cat.id ? 'var(--bg-active)' : 'transparent',
                border: `2px solid ${selectedCategory === cat.id ? 'var(--gold)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)',
                color: selectedCategory === cat.id ? 'var(--gold)' : 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Feature List */}
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: 8 }}>
          <Stack gap={14}>
            {filteredFeatures.map((feature) => (
              <div
                key={feature.id}
                style={{
                  padding: '14px 16px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gold)';
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
              >
                {/* Feature Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    {feature.title}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '4px 8px',
                    background: 'var(--gold)',
                    color: 'var(--text-on-gold)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    {feature.unique}
                  </span>
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  lineHeight: '1.5',
                  marginBottom: 10,
                }}>
                  {feature.description}
                </div>

                {/* Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(200, 100, 100, 0.1)',
                    borderLeft: '3px solid #c86464',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    <div style={{ fontWeight: 600, color: '#c86464', marginBottom: 4 }}>Traditional Word:</div>
                    {feature.traditional}
                  </div>
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderLeft: '3px solid var(--gold)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>EtherXWord:</div>
                    {feature.etherx}
                  </div>
                </div>
              </div>
            ))}
          </Stack>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 14px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)',
          borderLeft: '4px solid var(--gold)',
        }}>
          💡 <strong>Tip:</strong> EtherXWord is designed for modern collaboration. Start a shared document today and experience the difference!
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="subtle" onClick={() => closeDialog('whatsNew')}>Close</Button>
        </div>
      </Stack>
    </Modal>
  );
}
