import { Node, mergeAttributes } from '@tiptap/core';

export const PAGE_H    = 1123;
export const MARGIN_Y  = 96;
export const MARGIN_X  = 96;
export const PAGE_GAP  = 18;
export const CONTENT_H = PAGE_H - MARGIN_Y * 2 - PAGE_GAP; // usable per page

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      fillHeight: { default: CONTENT_H },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-page-break': 'true',
      style: `height:${HTMLAttributes.fillHeight ?? CONTENT_H}px; pointer-events:none; user-select:none;`,
    })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-page-break', 'true');
      dom.style.cssText = [
        `height:${node.attrs.fillHeight}px`,
        'pointer-events:none',
        'user-select:none',
        'position:relative',
        'display:block',
      ].join(';');

      const line = document.createElement('div');
      line.style.cssText = [
        'position:absolute',
        'bottom:0',
        'left:-96px',
        'right:-96px',
        'height:1px',
        'background:rgba(212,175,55,0.25)',
        'pointer-events:none',
      ].join(';');
      dom.appendChild(line);

      return { dom };
    };
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) =>
        commands.insertContent({ type: 'pageBreak', attrs: { fillHeight: CONTENT_H } }),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },
});
