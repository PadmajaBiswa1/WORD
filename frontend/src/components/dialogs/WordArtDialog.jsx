import { useState, useRef, useEffect } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { Modal, Button, Input, Label, Stack } from '@/components/ui';

const STYLES = [
  { id: 'fill',      label: 'Fill',       color: '#d4af37', shadow: 'none',                  stroke: 'none'    },
  { id: 'outline',   label: 'Outline',    color: 'transparent', shadow: 'none',              stroke: '#d4af37' },
  { id: 'shadow',    label: 'Shadow',     color: '#d4af37', shadow: '3px 3px 6px #000',      stroke: 'none'    },
  { id: 'gradient',  label: 'Gradient',   color: 'linear-gradient(135deg,#d4af37,#fff)',      shadow: 'none', stroke: 'none' },
  { id: 'glow',      label: 'Glow',       color: '#fff',    shadow: '0 0 12px #d4af37, 0 0 24px #d4af37', stroke: 'none' },
  { id: 'emboss',    label: 'Emboss',     color: '#c9a84c', shadow: '1px 1px 0 #fff,-1px -1px 0 #555', stroke: 'none' },
];

const FONTS = ['Arial', 'Times New Roman', 'Georgia', 'Impact', 'Trebuchet MS', 'Courier New', 'Verdana'];

export function WordArtDialog() {
  const { closeDialog, toast } = useUIStore();
  const { editor } = useEditorStore();
  const canvasRef = useRef();
  const [text, setText]     = useState('WordArt');
  const [style, setStyle]   = useState('fill');
  const [font, setFont]     = useState('Arial');
  const [size, setSize]     = useState(48);
  const [color, setColor]   = useState('#d4af37');

  const W = 480, H = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    const s = STYLES.find((x) => x.id === style) || STYLES[0];
    ctx.font = `bold ${size}px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (s.shadow !== 'none') {
      const parts = s.shadow.split(',');
      parts.forEach((p) => {
        const m = p.trim().match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(.+)/);
        if (m) { ctx.shadowOffsetX = +m[1]; ctx.shadowOffsetY = +m[2]; ctx.shadowBlur = +m[3]; ctx.shadowColor = m[4]; }
      });
    } else {
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
    }

    if (s.id === 'gradient') {
      const grad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, H);
      grad.addColorStop(0, '#d4af37');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
    } else if (s.id === 'outline') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeText(text || 'WordArt', W / 2, H / 2);
      return;
    } else {
      ctx.fillStyle = color;
    }

    ctx.fillText(text || 'WordArt', W / 2, H / 2);
  }, [text, style, font, size, color]);

  const insert = () => {
    if (!editor || !canvasRef.current) return;
    const img = canvasRef.current.toDataURL('image/png');
    editor.chain().focus().setImage({ src: img, alt: text }).run();
    toast('WordArt inserted!', 'success');
    closeDialog('wordArt');
  };

  return (
    <Modal title="Insert WordArt" onClose={() => closeDialog('wordArt')} width={560}>
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Controls */}
        <Stack gap={12} style={{ flex: '0 0 200px' }}>
          <div><Label>Text</Label><Input value={text} onChange={setText} placeholder="Your text…" autoFocus /></div>
          <div>
            <Label>Font</Label>
            <select value={font} onChange={(e) => setFont(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: 12, fontFamily: 'var(--font-ui)' }}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <Label>Size — {size}px</Label>
            <input type="range" min={20} max={100} value={size} onChange={(e) => setSize(+e.target.value)} style={{ width: '100%', accentColor: 'var(--gold)' }} />
          </div>
          <div>
            <Label>Color</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ width: 36, height: 28, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 2, background: 'transparent', cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{color}</span>
            </div>
          </div>
          <div>
            <Label>Style</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {STYLES.map((s) => (
                <Button key={s.id} variant={style === s.id ? 'primary' : 'subtle'} onClick={() => setStyle(s.id)}>{s.label}</Button>
              ))}
            </div>
          </div>
        </Stack>

        {/* Preview + actions */}
        <Stack gap={12} style={{ flex: 1 }}>
          <Label>Preview</Label>
          <canvas ref={canvasRef} width={W} height={H}
            style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="subtle" onClick={() => closeDialog('wordArt')}>Cancel</Button>
            <Button variant="primary" onClick={insert}>✓ Insert</Button>
          </div>
        </Stack>
      </div>
    </Modal>
  );
}
