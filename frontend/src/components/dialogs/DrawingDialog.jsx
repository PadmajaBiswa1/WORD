import { useRef, useState, useEffect } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { Modal, Button, Tooltip } from '@/components/ui';

const TOOLS  = [{ id:'pen', icon:'✏', label:'Pen' }, { id:'highlighter', icon:'🖍', label:'Highlighter' }, { id:'eraser', icon:'⬜', label:'Eraser' }];
const COLORS = ['#d4af37','#e8d98a','#ffffff','#ff5555','#55ff88','#55aaff','#ff55ff','#000000'];
const SIZES  = [2, 4, 6, 10, 16];

export function DrawingDialog() {
  const { closeDialog, toast, drawTool, drawColor, drawSize, drawOpacity, setDrawTool, setDrawColor, setDrawSize } = useUIStore();
  const { editor } = useEditorStore();
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef(null);

  const W = 560, H = 360;

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const toRgba = (hex, alpha) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return hex;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const startDraw = (e) => { setDrawing(true); lastPos.current = getPos(e); };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);

    if (drawTool === 'eraser') {
      ctx.clearRect(pos.x - drawSize, pos.y - drawSize, drawSize * 2, drawSize * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = drawTool === 'highlighter' ? toRgba(drawColor, drawOpacity) : drawColor;
      ctx.lineWidth   = drawTool === 'highlighter' ? drawSize * 4 : drawSize;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();
    }
    lastPos.current = pos;
  };

  const stopDraw = () => { setDrawing(false); lastPos.current = null; };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, W, H);
  };

  const insertDrawing = () => {
    const img = canvasRef.current.toDataURL('image/png');
    if (!editor) return;
    const insertPos = editor.state.selection.to;
    editor
      .chain()
      .focus()
      .setTextSelection(insertPos)
      .insertContent([
        { type: 'paragraph' },
        { type: 'image', attrs: { src: img, alt: 'Drawing' } },
        { type: 'paragraph' },
      ])
      .run();
    toast('Drawing inserted!', 'success');
    closeDialog('drawing');
  };

  return (
    <Modal title="Freehand Drawing" onClose={() => closeDialog('drawing')} width={620} noPad>
      <div style={{ display:'flex', flexDirection:'column' }}>
        {/* Toolbar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
          {/* Tools */}
          <div style={{ display:'flex', gap:3 }}>
            {TOOLS.map((t) => (
              <Tooltip key={t.id} text={t.label}>
                <button onClick={() => setDrawTool(t.id)} style={{
                  background: drawTool===t.id ? 'var(--bg-active)':'var(--bg-elevated)',
                  border: drawTool===t.id ? '1px solid var(--gold)':'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)', padding:'4px 10px',
                  cursor:'pointer', fontSize:15, color:'var(--text-primary)',
                  transition:'var(--transition)',
                }}>{t.icon}</button>
              </Tooltip>
            ))}
          </div>

          <div style={{ width:1, height:24, background:'var(--border)' }} />

          {/* Colors */}
          <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setDrawColor(c)} style={{
                width:20, height:20, background:c, border: drawColor===c ? '2px solid var(--gold)':'1px solid var(--border)',
                borderRadius:3, cursor:'pointer', padding:0,
              }} />
            ))}
          </div>

          <div style={{ width:1, height:24, background:'var(--border)' }} />

          {/* Brush size */}
          <div style={{ display:'flex', gap:3, alignItems:'center' }}>
            {SIZES.map((s) => (
              <button key={s} onClick={() => setDrawSize(s)} style={{
                width:s+12, height:s+12,
                background: drawSize===s ? 'var(--gold)':'var(--bg-elevated)',
                border: drawSize===s ? '1px solid var(--gold)':'1px solid var(--border)',
                borderRadius:'50%', cursor:'pointer',
              }} />
            ))}
          </div>

          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <Button variant="subtle"  onClick={clearCanvas}>Clear</Button>
            <Button variant="primary" onClick={insertDrawing}>✓ Insert</Button>
          </div>
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} width={W} height={H}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          style={{ cursor: drawTool==='eraser'?'cell':'crosshair', display:'block', width:'100%', background:'#ffffff' }} />
      </div>
    </Modal>
  );
}
