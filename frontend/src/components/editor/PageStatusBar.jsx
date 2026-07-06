import { usePageStore } from '@/store/usePageStore';
import { useUIStore } from '@/store';
import { PAGE_SIZES } from '@/utils/pageLayout';

export function PageStatusBar() {
  const { pages, activePage, zoom, setZoom } = usePageStore();
  const { pageSize, pageOrientation } = useUIStore();
  const sizeLabel = (PAGE_SIZES[pageSize] || PAGE_SIZES.a4).label;
  const orientationLabel = pageOrientation === 'landscape' ? 'Landscape' : 'Portrait';

  return (
    <div
      style={{
        height: '26px',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        fontFamily: 'var(--font-ui)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        userSelect: 'none',
      }}
    >
      <span>
        <span style={{ color: 'var(--text-muted)' }}>Page </span>
        <span style={{ color: 'var(--text-secondary)' }}>{activePage + 1}</span>
      </span>
      <span style={{ margin: '0 10px', color: 'var(--border-strong)' }}>|</span>
      <span>
        <span style={{ color: 'var(--text-muted)' }}>of </span>
        <span style={{ color: 'var(--text-secondary)' }}>{pages.length}</span>
      </span>

      <div style={{ flex: 1 }} />

      <span style={{ marginRight: '4px' }}>{sizeLabel} · {orientationLabel}</span>
      <span style={{ margin: '0 10px', color: 'var(--border-strong)' }}>|</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => setZoom(zoom - 0.1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0 2px',
          }}
        >
          −
        </button>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
          style={{ width: '80px', accentColor: 'var(--gold)', cursor: 'pointer' }}
        />
        <button
          onClick={() => setZoom(zoom + 0.1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '0 2px',
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold)',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '0 2px',
            minWidth: '42px',
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  );
}
