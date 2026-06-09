function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

// ── CSV ─────────────────────────────────────────────────────────────────────
// RFC 4180: every field wrapped in double-quotes; internal " doubled to "".
// Handles unstructured text that contains commas, quotes, or newlines.

export function exportToCSV(content: string, title: string): void {
  const lines = content.split('\n');
  const rows: [string, string][] = [['Section', 'Content']];
  let currentSection = title;
  const buffer: string[] = [];

  const flush = () => {
    const text = buffer.join(' ').trim();
    if (text) rows.push([currentSection, text]);
    buffer.length = 0;
  };

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      flush();
      currentSection = line.replace(/^#+\s+/, '');
    } else if (line.startsWith('### ')) {
      buffer.push('[' + line.replace(/^###\s+/, '') + ']');
    } else if (!line.startsWith('---') && line.trim()) {
      const clean = stripInline(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
      if (clean) buffer.push(clean);
    }
  }
  flush();

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = rows.map(([sec, cont]) => `${q(sec)},${q(cont)}`).join('\r\n');

  // UTF-8 BOM so Excel opens without mangling characters
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${slugify(title)}-research.csv`);
}

// ── PDF ──────────────────────────────────────────────────────────────────────
// Opens a print-ready HTML page in a new tab and auto-triggers the print dialog.

export function exportToPDF(content: string, title: string): void {
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (t: string) =>
    t
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(\d+)\]\(([^)]+)\)/g, '<sup><a href="$2" target="_blank">[$1]</a></sup>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  const body = content
    .split('\n')
    .map(line => {
      if (line.startsWith('## '))  return `<h2>${esc(line.slice(3))}</h2>`;
      if (line.startsWith('### ')) return `<h3>${esc(line.slice(4))}</h3>`;
      if (line.startsWith('# '))   return `<h1>${esc(line.slice(2))}</h1>`;
      if (line.startsWith('- '))   return `<li>${inline(line.slice(2))}</li>`;
      if (/^\d+\.\s/.test(line))   return `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`;
      if (line.startsWith('---'))  return '<hr>';
      if (!line.trim())            return '<p style="margin:4px 0">&nbsp;</p>';
      return `<p>${inline(line)}</p>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)} — Research Report</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;max-width:760px;margin:32px auto;color:#111}
  h1{font-size:20pt;border-bottom:2px solid #222;padding-bottom:6px;margin-bottom:20px}
  h2{font-size:13pt;border-bottom:1px solid #bbb;padding-bottom:3px;margin-top:24px;margin-bottom:8px;color:#1e3a5f}
  h3{font-size:11pt;margin-top:14px;font-weight:700}
  li{margin:3px 0;padding-left:2px}
  ul,ol{padding-left:20px;margin:6px 0}
  p{margin:4px 0}
  hr{border:none;border-top:1px solid #ddd;margin:14px 0}
  a{color:#0369a1;text-decoration:none}
  sup a{font-size:8pt}
  @media print{body{margin:16px}}
</style>
</head>
<body>
<h1>${esc(title)} — Research Report</h1>
${body}
<script>window.addEventListener('load',()=>window.print())<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ── Word (.docx) ─────────────────────────────────────────────────────────────
// Dynamically imports the `docx` package (keeps it out of the main bundle).

export async function exportToWord(content: string, title: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = (await import('docx')) as any;

  const inlineRuns = (text: string) => {
    const tokens = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
    return tokens.map((tok: string) => {
      if (tok.startsWith('**') && tok.endsWith('**'))
        return new TextRun({ text: tok.slice(2, -2), bold: true });
      const m = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) return new TextRun({ text: m[1] }); // links rendered as plain text
      return new TextRun({ text: tok });
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({
      children: [new TextRun({ text: `${title} — Research Report`, bold: true, size: 36 })],
      spacing: { after: 400 },
    }),
  ];

  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 60 } }));
    } else if (line.startsWith('# ')) {
      children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 } }));
    } else if (line.startsWith('- ')) {
      children.push(new Paragraph({ children: inlineRuns(line.slice(2)), bullet: { level: 0 } }));
    } else if (/^\d+\.\s/.test(line)) {
      children.push(new Paragraph({ children: inlineRuns(line.replace(/^\d+\.\s/, '')), bullet: { level: 0 } }));
    } else if (line.startsWith('---') || !line.trim()) {
      children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
    } else {
      children.push(new Paragraph({ children: inlineRuns(line), spacing: { after: 80 } }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${slugify(title)}-research.docx`);
}
