import { useState } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { Modal, Button, NumberInput, Stack, Label } from '@/components/ui';

export function InsertTableDialog() {
  const { closeDialog } = useUIStore();
  const { editor } = useEditorStore();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [header, setHeader] = useState(true);
  const [hoverCell, setHoverCell] = useState(null); // {r, c}

  const GRID = 12; // Increased from 8 to 12 for more visual options

  const insertTable = (r = rows, c = cols) => {
    const nextRows = Math.max(1, parseInt(String(r), 10) || 3);
    const nextCols = Math.max(1, parseInt(String(c), 10) || 3);
    editor?.chain().focus().insertTable({ rows: nextRows, cols: nextCols, withHeaderRow: header }).run();
    closeDialog('insertTable');
  };

  return (
    <Modal title="Insert Table" onClose={() => closeDialog('insertTable')} width={450}>
      <Stack gap={20}>
        {/* Visual grid picker */}
        <div>
          <Label>Quick Pick - Click to select size ({hoverCell ? `${hoverCell.r + 1} rows × ${hoverCell.c + 1} cols` : `${rows} rows × ${cols} cols`})</Label>
          <div style={{ display:'inline-grid', gridTemplateColumns: `repeat(${GRID}, 24px)`, gap:3, marginTop:8, padding: '8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            {Array.from({ length: GRID * GRID }).map((_, i) => {
              const r = Math.floor(i / GRID), c = i % GRID;
              const lit = hoverCell ? (r <= hoverCell.r && c <= hoverCell.c) : (r < rows && c < cols);
              return (
                <div key={i}
                  onMouseEnter={() => setHoverCell({ r, c })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => { setRows(r+1); setCols(c+1); insertTable(r+1, c+1); }}
                  style={{
                    width:24, height:24,
                    background: lit ? 'var(--gold-dim)' : 'var(--bg-surface)',
                    border: lit ? '2px solid var(--gold)' : '1px solid var(--border)',
                    borderRadius:2, cursor:'pointer',
                    transition:'var(--transition)',
                  }} />
              );
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
            Hover and click to select table dimensions
          </div>
        </div>

        {/* Manual input */}
        <div>
          <Label>Custom Size</Label>
          <div style={{ display:'flex', gap:16, marginTop: 8 }}>
            <NumberInput label="Rows" value={rows} onChange={setRows} min={1} max={100} />
            <NumberInput label="Columns" value={cols} onChange={setCols} min={1} max={50} />
          </div>
        </div>

        {/* Header row toggle */}
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:13, color:'var(--text-primary)' }}>
          <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} style={{ accentColor:'var(--gold)', cursor: 'pointer' }} />
          Include header row
        </label>

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <Button variant="subtle" onClick={() => closeDialog('insertTable')}>Cancel</Button>
          <Button variant="primary" onClick={() => insertTable()}>✓ Insert {rows}×{cols} Table</Button>
        </div>
      </Stack>
    </Modal>
  );
}
