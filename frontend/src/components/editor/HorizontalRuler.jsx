import React, { useState, useEffect, useRef } from 'react';
import { useUIStore, useDocumentStore } from '@/store';

const PIXELS_PER_INCH = 96; // Standard screen DPI
const PIXELS_PER_CM = PIXELS_PER_INCH / 2.54;

export function HorizontalRuler() {
  const { zoom } = useUIStore();
  const { margins } = useDocumentStore();
  const [draggingMargin, setDraggingMargin] = useState(null);
  const rulerRef = useRef(null);

  const scale = zoom / 100;
  const rulerHeight = 24;
  const majorTickHeight = 8;
  const minorTickHeight = 4;
  const inchWidth = PIXELS_PER_INCH * scale;
  const cmWidth = PIXELS_PER_CM * scale;
  const unit = 'inch'; // 'inch' or 'cm'
  const unitWidth = unit === 'inch' ? inchWidth : cmWidth;
  const label = unit === 'inch' ? 'in' : 'cm';

  // Scaled margins
  const leftMargin = (margins?.left || 48) * scale;
  const rightMargin = (margins?.right || 48) * scale;

  const handleMouseDown = (marginType) => {
    setDraggingMargin(marginType);
  };

  const handleMouseUp = () => {
    setDraggingMargin(null);
  };

  const handleMouseMove = (e) => {
    if (!draggingMargin || !rulerRef.current) return;

    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Convert pixels to document units and update margins
    // This would integrate with useDocumentStore to persist margins
    console.log(`${draggingMargin}: ${x / scale}px`);
  };

  useEffect(() => {
    if (draggingMargin) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
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
      {/* Ruler markings */}
      <svg
        width="100%"
        height={rulerHeight}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {/* Draw tick marks and labels */}
        {Array.from({ length: Math.ceil(1000 / unitWidth) }).map((_, i) => {
          const x = i * unitWidth;
          const isMajor = i % 1 === 0; // Every inch/cm
          const isSubMajor = i % 0.5 === 0; // Half inch/cm

          return (
            <g key={i}>
              {/* Major tick */}
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
              {/* Half-inch/cm tick */}
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

      {/* Left margin handle */}
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

      {/* Right margin handle */}
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
