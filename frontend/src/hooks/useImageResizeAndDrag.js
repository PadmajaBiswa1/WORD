import { useEffect, useRef } from 'react';
import { getSelectedImageElement, isImageSelection } from '@/utils/imageSelection';

const parseCssStyle = (style = '') => {
  const out = {};
  String(style).split(';').forEach((pair) => {
    const separator = pair.indexOf(':');
    if (separator < 0) return;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key && value) out[key] = value;
  });
  return out;
};

const toCssStyle = (styles) => Object.entries(styles)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => `${key}:${value}`)
  .join(';');

const createIdleDragState = () => ({
  isDragging: false,
  isResizing: false,
  img: null,
  startX: 0,
  startY: 0,
  initialWidth: 0,
  initialHeight: 0,
  initialMarginLeft: 0,
  initialMarginTop: 0,
});

export function useImageResizeAndDrag(editor, editorRef) {
  const dragStateRef = useRef(createIdleDragState());

  useEffect(() => {
    if (!editor || !editorRef?.current) return undefined;

    const editorElement = editorRef.current;
    const proseMirrorEl = editorElement.querySelector('.ProseMirror');
    if (!proseMirrorEl) return undefined;

    const persistImageGeometry = (state) => {
      const img = state.img;
      if (!img || editor.isDestroyed) return;

      const attrs = editor.getAttributes('image') || {};
      const css = parseCssStyle(attrs.style || '');
      const computed = window.getComputedStyle(img);
      const width = Math.max(20, Math.round(Number.parseFloat(computed.width) || img.getBoundingClientRect().width));
      const height = Math.max(20, Math.round(Number.parseFloat(computed.height) || img.getBoundingClientRect().height));

      css.width = `${width}px`;
      css.height = `${height}px`;
      if (state.isDragging) {
        if (img.style.marginLeft) css['margin-left'] = img.style.marginLeft;
        if (img.style.marginTop) css['margin-top'] = img.style.marginTop;
      }

      editor.chain().focus().updateAttributes('image', {
        width: String(width),
        height: String(height),
        style: toCssStyle(css),
      }).run();
    };

    const handleMouseDown = (event) => {
      const img = event.target.closest?.('img');
      if (!img || !proseMirrorEl.contains(img)) return;

      // Dragging/resizing starts only after ProseMirror has selected the image.
      // A normal first click remains a regular node-selection click.
      const selected = img.classList.contains('ProseMirror-selectednode')
        || img.parentElement?.classList.contains('ProseMirror-selectednode')
        || (isImageSelection(editor) && getSelectedImageElement(editor) === img);
      if (!selected) return;

      const rect = img.getBoundingClientRect();
      const computed = window.getComputedStyle(img);
      const resizeHandleSize = 20;
      const isResizeHandle = event.clientX > rect.right - resizeHandleSize
        && event.clientY > rect.bottom - resizeHandleSize;

      dragStateRef.current = {
        ...createIdleDragState(),
        isDragging: !isResizeHandle,
        isResizing: isResizeHandle,
        img,
        startX: event.clientX,
        startY: event.clientY,
        initialWidth: rect.width,
        initialHeight: rect.height,
        initialMarginLeft: Number.parseFloat(computed.marginLeft) || 0,
        initialMarginTop: Number.parseFloat(computed.marginTop) || 0,
      };

      event.preventDefault();
      img.style.cursor = isResizeHandle ? 'nwse-resize' : 'grabbing';
    };

    const handleMouseMove = (event) => {
      const state = dragStateRef.current;
      const { isDragging, isResizing, img } = state;
      if ((!isDragging && !isResizing) || !img) return;

      const deltaX = event.clientX - state.startX;
      const deltaY = event.clientY - state.startY;

      if (isResizing) {
        const newWidth = Math.max(20, state.initialWidth + deltaX);
        const aspectRatio = state.initialHeight / Math.max(state.initialWidth, 1);
        const newHeight = Math.max(20, newWidth * aspectRatio);
        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
      } else {
        img.style.marginLeft = `${state.initialMarginLeft + deltaX}px`;
        img.style.marginTop = `${state.initialMarginTop + deltaY}px`;
      }
    };

    const handleMouseUp = () => {
      const state = dragStateRef.current;
      if (state.img) {
        persistImageGeometry(state);
        state.img.style.cursor = 'move';
      }
      dragStateRef.current = createIdleDragState();
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      if (!isImageSelection(editor)) return;

      event.preventDefault();
      editor.chain().focus().deleteSelection().run();
    };

    editorElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    proseMirrorEl.addEventListener('keydown', handleKeyDown);

    return () => {
      editorElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      proseMirrorEl.removeEventListener('keydown', handleKeyDown);
      dragStateRef.current = createIdleDragState();
    };
  }, [editor, editorRef]);
}
