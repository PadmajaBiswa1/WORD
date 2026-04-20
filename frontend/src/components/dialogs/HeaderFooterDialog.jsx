import { useEffect, useState } from 'react';
import { useUIStore, useDocumentStore } from '@/store';
import { Modal, Button, Input, Label, Stack } from '@/components/ui';

const POSITIONS = ['Left', 'Center', 'Right'];
const PAGE_NUM_STYLES = [
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right',  label: 'Bottom Right'  },
  { value: 'top-center',    label: 'Top Center'    },
  { value: 'top-right',     label: 'Top Right'     },
];

export function HeaderFooterDialog() {
  const { closeDialog, toast, headerFooterTab } = useUIStore();
  const { headerFooter, setHeaderFooter } = useDocumentStore();
  const [tab, setTab]           = useState(headerFooterTab || 'header'); // 'header' | 'footer' | 'pagenum'
  const [headerText, setHeader] = useState(headerFooter?.headerText || '');
  const [footerText, setFooter] = useState(headerFooter?.footerText || '');
  const [position, setPosition] = useState('Center');
  const [pageNumStyle, setPageNumStyle] = useState(headerFooter?.pageNumberStyle || 'bottom-center');
  const [startNum, setStartNum] = useState(headerFooter?.pageNumberStart || 1);

  useEffect(() => {
    if (headerFooterTab) setTab(headerFooterTab);
  }, [headerFooterTab]);

  useEffect(() => {
    if (!headerFooter) return;
    setHeader(headerFooter.headerText || '');
    setFooter(headerFooter.footerText || '');
    setPosition(headerFooter.headerAlign || headerFooter.footerAlign || 'Center');
    setPageNumStyle(headerFooter.pageNumberStyle || 'bottom-center');
    setStartNum(headerFooter.pageNumberStart || 1);
  }, [headerFooter]);

  const persistMeta = (next) => {
    setHeaderFooter(next);
    try {
      window.localStorage.setItem('etherx-header-footer-meta', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const insertHeaderFooter = () => {
    const isHeader = tab === 'header';
    const text = isHeader ? headerText : footerText;
    if (!text.trim()) { toast('Please enter text', 'info'); return; }

    persistMeta({
      ...headerFooter,
      headerText: isHeader ? text : headerFooter?.headerText || '',
      headerAlign: isHeader ? position : headerFooter?.headerAlign || 'Center',
      footerText: isHeader ? headerFooter?.footerText || '' : text,
      footerAlign: isHeader ? headerFooter?.footerAlign || 'Center' : position,
    });
    toast(`${isHeader ? 'Header' : 'Footer'} inserted`, 'success');
    closeDialog('headerFooter');
  };

  const insertPageNumber = () => {
    persistMeta({
      ...headerFooter,
      pageNumberEnabled: true,
      pageNumberStyle: pageNumStyle,
      pageNumberStart: startNum,
    });
    toast('Page number inserted', 'success');
    closeDialog('headerFooter');
  };

  const TABS = ['header', 'footer', 'pagenum'];

  return (
    <Modal title="Header, Footer & Page Number" onClose={() => closeDialog('headerFooter')} width={460}>
      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            color: tab === t ? 'var(--gold)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: tab === t ? 700 : 400,
            padding: '6px 16px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em',
          }}>{t === 'pagenum' ? 'Page Number' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <Stack gap={14}>
        {tab !== 'pagenum' ? (
          <>
            <div>
              <Label>{tab === 'header' ? 'Header' : 'Footer'} Text</Label>
              <Input
                value={tab === 'header' ? headerText : footerText}
                onChange={tab === 'header' ? setHeader : setFooter}
                placeholder={`Enter ${tab} text…`}
                autoFocus
              />
            </div>
            <div>
              <Label>Alignment</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {POSITIONS.map((p) => (
                  <Button key={p} variant={position === p ? 'primary' : 'subtle'} onClick={() => setPosition(p)}>{p}</Button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="subtle" onClick={() => closeDialog('headerFooter')}>Cancel</Button>
              <Button variant="primary" onClick={insertHeaderFooter}>✓ Insert</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <Label>Position</Label>
              <select value={pageNumStyle} onChange={(e) => setPageNumStyle(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                {PAGE_NUM_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Start At</Label>
              <input type="number" min={1} value={startNum} onChange={(e) => setStartNum(+e.target.value)}
                style={{ width: 80, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 13, fontFamily: 'var(--font-ui)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="subtle" onClick={() => closeDialog('headerFooter')}>Cancel</Button>
              <Button variant="primary" onClick={insertPageNumber}>✓ Insert Page Number</Button>
            </div>
          </>
        )}
      </Stack>
    </Modal>
  );
}
