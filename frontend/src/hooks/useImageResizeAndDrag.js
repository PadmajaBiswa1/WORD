import { useEffect, useRef } from 'react';

export function useImageResizeAndDrag(editorRef) {
  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    img: null,
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
  });

  useEffect(() => {
    if (!editorRef?.current) return;

    const editorElement = editorRef.current;
    const proseMirrorEl = editorElement.querySelector('.ProseMirror');

    const handleMouseDown = (e) => {
      const img = e.target.closest('img');
      if (!img) return;

      // Check if image is selected
      const isSelected = 
        img.classList.contains('ProseMirror-selectednode') || 
        img.parentElement?.classList.contains('ProseMirror-selectednode');

      if (!isSelected) return;

      const rect = img.getBoundingClientRect();
      const parentRect = editorElement.getBoundingClientRect();

      // Check if clicking on resize handle (bottom-right corner area - 20px square)
      const resizeHandleSize = 20;
      const isResizeHandle = 
        e.clientX > rect.right - resizeHandleSize &&
        e.clientY > rect.bottom - resizeHandleSize;

      if (isResizeHandle) {
        dragStateRef.current.isResizing = true;
        e.preventDefault();
      } else {
        dragStateRef.current.isDragging = true;
        e.preventDefault();
      }

      dragStateRef.current.img = img;
      dragStateRef.current.startX = e.clientX;
      dragStateRef.current.startY = e.clientY;
      dragStateRef.current.initialWidth = rect.width;
      dragStateRef.current.initialHeight = rect.height;

      img.style.cursor = dragStateRef.current.isResizing ? 'nwse-resize' : 'grabbing';
    };

    const handleMouseMove = (e) => {
      const { isDragging, isResizing, img, startX, startY, initialWidth, initialHeight } = dragStateRef.current;
      
      if (!isDragging && !isResizing) return;
      if (!img) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (isResizing) {
        const newWidth = Math.max(50, initialWidth + deltaX);
        const aspectRatio = initialHeight / initialWidth;
        const newHeight = newWidth * aspectRatio;

        img.style.width = `${newWidth}px`;
        img.style.height = `${newHeight}px`;
      } else if (isDragging) {
        // Use margin to move the image
        const currentMarginLeft = parseInt(img.style.marginLeft || '0', 10);
        const currentMarginTop = parseInt(img.style.marginTop || '0', 10);
        
        img.style.marginLeft = `${currentMarginLeft + deltaX}px`;
        img.style.marginTop = `${currentMarginTop + deltaY}px`;
        
        dragStateRef.current.startX = e.clientX;
        dragStateRef.current.startY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.img) {
        dragStateRef.current.img.style.cursor = 'move';
        
        // Trigger editor update for persistence
        const proseMirror = dragStateRef.current.img.closest('.ProseMirror');
        if (proseMirror) {
          proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      dragStateRef.current = {
        isDragging: false,
        isResizing: false,
        img: null,
        startX: 0,
        startY: 0,
        initialWidth: 0,
        initialHeight: 0,
      };
    };

    const handleKeyDown = (e) => {
      // Check if backspace or delete key is pressed
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;

      // Find selected image
      const selectedImg = proseMirrorEl?.querySelector('img.ProseMirror-selectednode, .ProseMirror-selectednode img');
      if (!selectedImg) return;

      e.preventDefault();

      // Get the image position
      const img = selectedImg.classList.contains('ProseMirror-selectednode') 
        ? selectedImg 
        : selectedImg.closest('.ProseMirror-selectednode')?.querySelector('img') || selectedImg;

      // Try to delete the image from the editor
      try {
        // Dispatch a delete command or remove the element
        img.remove();
        
        // Trigger editor update
        if (proseMirrorEl) {
          proseMirrorEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    };

    editorElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    proseMirrorEl?.addEventListener('keydown', handleKeyDown);

    return () => {
      editorElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      proseMirrorEl?.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorRef]);
}

