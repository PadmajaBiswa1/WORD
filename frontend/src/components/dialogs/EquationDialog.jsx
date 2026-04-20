import { useState } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { Modal, Button, Stack, Label } from '@/components/ui';

const COMMON = [
  { label: 'Quadratic',   eq: 'x = (-b ± √(b²-4ac)) / 2a'   },
  { label: 'Pythagorean', eq: 'a² + b² = c²'                 },
  { label: 'Euler',       eq: 'e^(iπ) + 1 = 0'               },
  { label: 'Einstein',    eq: 'E = mc²'                       },
  { label: 'Integral',    eq: '∫ f(x) dx'                     },
  { label: 'Derivative',  eq: 'dy/dx = lim(Δy/Δx) as Δx→0'  },
  { label: 'Sum',         eq: 'Σᵢ₌₁ⁿ i = n(n+1)/2'           },
  { label: 'Binomial',    eq: '(a+b)ⁿ = Σ C(n,k) aᵏ bⁿ⁻ᵏ'   },
];

const SYMBOLS = ['∑','∏','∫','∂','∆','∇','√','∞','±','×','÷','≠','≤','≥','≈','∈','∉','⊂','⊃','∪','∩','α','β','γ','δ','ε','θ','λ','μ','π','σ','φ','ω'];

export function EquationDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const [eq, setEq] = useState('');

  const insert = () => {
    if (!editor || !eq.trim()) return;
    // Insert as styled inline code block to visually distinguish equations
    const html = `<code style="font-family:'Times New Roman',serif;font-size:1.1em;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:4px;padding:2px 8px;color:var(--gold);">${eq}</code>`;
    editor.chain().focus().insertContent(html).run();
    toast('Equation inserted', 'success');
    closeDialog('equation');
  };

  return (
    <Modal title="Insert Equation" onClose={() => closeDialog('equation')} width={520}>
      <Stack gap={16}>
        {/* Equation input */}
        <div>
          <Label>Equation</Label>
          <textarea value={eq} onChange={(e) => setEq(e.target.value)}
            placeholder="Type your equation, e.g. x = (-b ± √(b²-4ac)) / 2a"
            rows={3}
            style={{
              width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              padding: '8px 10px', fontSize: 15, fontFamily: "'Times New Roman', serif",
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
            onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
            autoFocus
          />
        </div>

        {/* Symbol palette */}
        <div>
          <Label>Insert Symbol</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {SYMBOLS.map((s) => (
              <button key={s} onClick={() => setEq((prev) => prev + s)}
                title={`Insert ${s}`}
                style={{
                  width: 32, height: 32, fontSize: 16, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Common equations */}
        <div>
          <Label>Common Equations</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {COMMON.map((c) => (
              <button key={c.label} onClick={() => setEq(c.eq)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11,
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {eq && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 16px' }}>
            <Label>Preview</Label>
            <span style={{ fontFamily: "'Times New Roman', serif", fontSize: 18, color: 'var(--gold)' }}>{eq}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="subtle" onClick={() => closeDialog('equation')}>Cancel</Button>
          <Button variant="primary" onClick={insert} disabled={!eq.trim()}>✓ Insert Equation</Button>
        </div>
      </Stack>
    </Modal>
  );
}
