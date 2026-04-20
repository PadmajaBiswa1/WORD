// ═══════════════════════════════════════════════════════════════
//  EtherX Word — Export Service (client-side)
// ═══════════════════════════════════════════════════════════════
import { saveAs } from 'file-saver';

function sanitize(name) {
  return (name || 'document').replace(/[^a-z0-9_\-\s]/gi, '_').trim();
}

export function buildHtmlDocument(title, html) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
     <title>${title}</title>
     <style>body{font-family:'Georgia',serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}</style>
     </head><body>${html}</body></html>`;
}

/* ── HTML ───────────────────────────────────────────────────── */
export function exportToHtml(title, html) {
  const blob = new Blob([buildHtmlDocument(title, html)], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${sanitize(title)}.html`);
}

/* ── PDF (via jsPDF + html2canvas) ─────────────────────────── */
export async function exportToPdf(title, el) {
  const [{ default: jsPDF }, { default: h2c }] = await Promise.all([
    import('jspdf'), import('html2canvas'),
  ]);
  const canvas   = await h2c(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData  = canvas.toDataURL('image/png');
  const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw       = pdf.internal.pageSize.getWidth()  - 20;
  const ph       = pdf.internal.pageSize.getHeight() - 20;
  const imgH     = (canvas.height * pw) / canvas.width;
  let   y        = 10, remaining = imgH;

  while (remaining > 0) {
    pdf.addImage(imgData, 'PNG', 10, y, pw, imgH);
    remaining -= ph;
    y         -= ph;
    if (remaining > 0) pdf.addPage();
  }
  pdf.save(`${sanitize(title)}.pdf`);
}

/* ── DOCX (via docx library) ────────────────────────────────── */
export async function buildDocxBlob(html) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const div = document.createElement('div');
  div.innerHTML = html;

  const children = [];
  div.childNodes.forEach((n) => {
    const tag = n.tagName;
    const txt = n.textContent || '';
    if (tag === 'H1') children.push(new Paragraph({ text: txt, heading: HeadingLevel.HEADING_1 }));
    else if (tag === 'H2') children.push(new Paragraph({ text: txt, heading: HeadingLevel.HEADING_2 }));
    else if (tag === 'H3') children.push(new Paragraph({ text: txt, heading: HeadingLevel.HEADING_3 }));
    else children.push(new Paragraph({ children: [new TextRun(txt)] }));
  });

  const doc    = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBlob(doc);
}

export async function exportToDocx(title, html) {
  const buffer = await buildDocxBlob(html);
  saveAs(buffer, `${sanitize(title)}.docx`);
}
