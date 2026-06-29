import { useEffect, useRef } from 'react';
import { useUIStore, useDocumentStore, useEditorStore } from '@/store';

const THUMB_W = 108;
const THUMB_H = 153;
const PAGE_H = 1123;
const PAGE_W = 794;
const PADDING = 96;

function renderContentToThumbnail(htmlContent, theme, pageIndex) {
  return new Promise((resolve) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${PAGE_W}px;height:${PAGE_H}px;padding:${PADDING}px;background:${theme === 'dark' ? '#1a1a1a' : '#ffffff'};font-family:'Crimson Pro',Georgia,serif;font-size:12pt;line-height:1.7;color:${theme === 'dark' ? '#e8e0d0' : '#333333'};overflow:hidden;word-wrap:break-word;`;
      try {
        tempDiv.innerHTML = htmlContent || '<p></p>';
      } catch {
        tempDiv.innerHTML = '<p></p>';
      }
      document.body.appendChild(tempDiv);

      setTimeout(() => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = THUMB_W * 2;
          canvas.height = THUMB_H * 2;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            document.body.removeChild(tempDiv);
            resolve(null);
            return;
          }

          const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';
          const borderColor = theme === 'dark' ? '#333333' : '#e0e0e0';

          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

          const pageNumColor = theme === 'dark' ? '#666666' : '#999999';
          ctx.fillStyle = pageNumColor;
          ctx.font = `${7 * 2}px 'JetBrains Mono', monospace`;
          ctx.fillText(`${pageIndex + 1}`, canvas.width - 30, canvas.height - 8);

          const text = tempDiv.innerText || '';
          const lines = text.split('\n').filter(line => line.trim()).slice(0, 12);

          ctx.fillStyle = theme === 'dark' ? '#e8e0d0' : '#333333';
          ctx.font = `${7 * 2}px 'Crimson Pro', Georgia, serif`;
          const lineHeight = 14;
          const paddingTop = 10;

          lines.forEach((line, idx) => {
            const truncated = line.slice(0, 25);
            const y = paddingTop + idx * lineHeight;
            if (y + lineHeight < canvas.height - 20) {
              ctx.fillText(truncated, paddingTop, y + 8);
            }
          });

          const dataUrl = canvas.toDataURL('image/png', 0.9);
          document.body.removeChild(tempDiv);
          resolve(dataUrl);
        } catch (err) {
          console.error('Error rendering thumbnail:', err);
          if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
          resolve(null);
        }
      }, 50);
    } catch (err) {
      console.error('Error creating thumbnail:', err);
      resolve(null);
    }
  });
}

export function useThumbnailGenerator() {
  const editor = useEditorStore(s => s.editor);
  const { theme } = useUIStore();
  const { zoom } = useUIStore();
  const { pageCount, setThumbnail } = useDocumentStore();
  const updateTimer = useRef(null);
  const renderQueue = useRef([]);
  const isRendering = useRef(false);

const processRenderQueue = async () => {
    if (isRendering.current || renderQueue.current.length === 0) return;
    isRendering.current = true;
    try {
      while (renderQueue.current.length > 0) {
        const item = renderQueue.current.shift();
        if (item) {
          const { pageIndex, htmlContent } = item;
          const thumbnail = await renderContentToThumbnail(htmlContent, theme, pageIndex);
          if (thumbnail) setThumbnail(pageIndex, thumbnail);
        }
      }
    } catch (err) {
      console.error('Error processing thumbnail queue:', err);
    } finally {
      isRendering.current = false;
    }
  };

  useEffect(() => {
    if (!editor) return;

    const updateThumbnails = () => {
      clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        const pageContainer = document.getElementById('document-page-0');
        if (!pageContainer) return;

        const proseMirror = pageContainer.querySelector('.ProseMirror');
        if (!proseMirror) return;

        const scale = zoom / 100;
        const scaledContentHeight = (PAGE_H - PADDING * 2) * scale;

        const children = Array.from(proseMirror.children);
        let currentPageIndex = 0;
        let currentPageHTML = '';

        children.forEach(child => {
          const estimatedPage = Math.floor(child.offsetTop / scaledContentHeight);

          if (estimatedPage > currentPageIndex && currentPageHTML) {
            renderQueue.current.push({
              pageIndex: currentPageIndex,
              htmlContent: currentPageHTML,
            });
            currentPageIndex = estimatedPage;
            currentPageHTML = '';
          }

          currentPageHTML += child.outerHTML;
        });

        if (currentPageHTML) {
          renderQueue.current.push({
            pageIndex: currentPageIndex,
            htmlContent: currentPageHTML,
          });
        }

        processRenderQueue();
      }, 300);
    };

    editor.on('update', updateThumbnails);
    updateThumbnails();

    return () => {
      editor.off('update', updateThumbnails);
      clearTimeout(updateTimer.current);
    };
  }, [editor, theme, zoom, pageCount, setThumbnail]);
}
