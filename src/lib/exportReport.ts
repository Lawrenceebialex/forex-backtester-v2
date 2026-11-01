/** Saves text as a file the user can keep (works on desktop, iPad and phones). */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Opens the print dialog (which also offers "Save as PDF") for a plain-text report. */
export function printText(title: string, text: string): void {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) return frame.remove();
  doc.open();
  doc.write(
    `<!doctype html><title>${escapeHtml(title)}</title><style>body{font:13px/1.55 ui-monospace,Menlo,Consolas,monospace;padding:28px;color:#111;white-space:pre-wrap}</style><body>${escapeHtml(text)}</body>`,
  );
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  window.setTimeout(() => frame.remove(), 2000);
}
