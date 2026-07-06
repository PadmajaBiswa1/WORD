export const PAGE_SIZES = {
  a4: { w: 794, h: 1123, label: 'A4' },
  letter: { w: 816, h: 1056, label: 'Letter' },
  legal: { w: 816, h: 1344, label: 'Legal' },
  a3: { w: 1123, h: 1587, label: 'A3' },
};

export const MARGIN_MAP = {
  normal: 96,
  narrow: 48,
  moderate: 72,
  wide: 144,
};

export function getLayoutMetrics({ size, orientation, margin } = {}) {
  const dims = PAGE_SIZES[size] || PAGE_SIZES.a4;
  const pageWidth = orientation === 'landscape' ? dims.h : dims.w;
  const pageHeight = orientation === 'landscape' ? dims.w : dims.h;
  const padding = MARGIN_MAP[margin] || MARGIN_MAP.normal;

  return {
    pageWidth,
    pageHeight,
    padding,
    contentHeight: Math.max(1, pageHeight - padding * 2),
  };
}