import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/store';
import { MARGIN_MAP } from '@/utils/pageLayout';

const PIXELS_PER_INCH = 96;
const PIXELS_PER_CM = PIXELS_PER_INCH / 2.54;

function getNearestMarginPreset(px) {
  const entries = Object.entries(MARGIN_MAP);
  let nearest = entries[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  entries.forEach((entry) => {
    const distance = Math.abs(entry[1] - px);
    if (distance < bestDistance) {
      nearest = entry;
      bestDistance = distance;
    }
  });

  return nearest[0];
}

export function HorizontalRuler() {
  const { zoom, pageMargin, setPageMargin, toast } = useUIStore();
  const [draggingMargin, setDraggingMargin] = useState(null);
  const rulerRef = useRef(null);
  const dragPositionRef = useRef(null);

  const scale = zoom / 100;
  const rulerHeight = 24;
  const majorTickHeight = 8;
  const minorTickHeight = 4;
  const inchWidth = PIXELS_PER_INCH * scale;
  const cmWidth = PIXELS_PER_CM * scale;
  const unit = 'inch';
  const unitWidth = unit === 'inch' ? inchWidth : cmWidth;

  const marginPx = (MARGIN_MAP[pageMargin] || MARGIN_MAP.normal) * scale;
  const leftMargin = marginPx;
  const rightMargin = marginPx;

  const commitMargin = () => {
    if (!draggingMargin || !rulerRef.current || dragPositionRef.current === null) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const rawPx = draggingMargin === 'right'
      ? rect.width - dragPositionRef.current
      : dragPositionRef.current;
    const nextMargin = getNearestMarginPreset(Math.max(0, rawPx / scale));

    setPageMargin(nextMargin);
    toast(`Margin: ${nextMargin}`, 'info');
  };

  const handleMouseDown = (marginType) => {
    setDraggingMargin(marginType);
    dragPositionRef.current = null;
  };

  const handleMouseUp = () => {
    commitMargin();
    setDraggingMargin(null);
    dragPositionRef.current = null;
  };

  const handleMouseMove = (e) => {
    if (!draggingMargin || !rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    dragPositionRef.current = e.clientX - rect.left;
  };

  useEffect(() => {
    if (!draggingMargin) return undefined;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingMargin]);

  return (
    <div
      ref={rulerRef}
      style={{
        width: '100%',
        height: rulerHeight,
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #404040',
        display: 'flex',
        alignItems: 'flex-end',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <svg
        width="100%"
        height={rulerHeight}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {Array.from({ length: Math.ceil(1000 / unitWidth) }).map((_, i) => {
          const x = i * unitWidth;
          const isMajor = i % 1 === 0;
          const isSubMajor = i % 0.5 === 0;

          return (
            <g key={i}>
              {isMajor && (
                <>
                  <line
                    x1={x}
                    y1={rulerHeight}
                    x2={x}
                    y2={rulerHeight - majorTickHeight}
                    stroke="#b0b0b0"
                    strokeWidth="1"
                  />
                  <text
                    x={x + 2}
                    y={rulerHeight - majorTickHeight - 2}
                    fontSize="10"
                    fill="#b0b0b0"
                    fontFamily="var(--font-ui, 'Segoe UI', sans-serif)"
                  >
                    {i}
                  </text>
                </>
              )}
              {isSubMajor && !isMajor && (
                <line
                  x1={x}
                  y1={rulerHeight}
                  x2={x}
                  y2={rulerHeight - minorTickHeight}
                  stroke="#808080"
                  strokeWidth="1"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div
        onMouseDown={() => handleMouseDown('left')}
        style={{
          position: 'absolute',
          left: leftMargin - 4,
          top: 0,
          width: 8,
          height: rulerHeight,
          cursor: 'col-resize',
          backgroundColor: draggingMargin === 'left' ? '#d4af37' : 'transparent',
          zIndex: 10,
          transition: draggingMargin === 'left' ? 'none' : 'background-color 0.2s',
        }}
        title="Drag to adjust left margin"
      />

      <div
        onMouseDown={() => handleMouseDown('right')}
        style={{
          position: 'absolute',
          right: rightMargin - 4,
          top: 0,
          width: 8,
          height: rulerHeight,
          cursor: 'col-resize',
          backgroundColor: draggingMargin === 'right' ? '#d4af37' : 'transparent',
          zIndex: 10,
          transition: draggingMargin === 'right' ? 'none' : 'background-color 0.2s',
        }}
        title="Drag to adjust right margin"
      />
    </div>
  );
}