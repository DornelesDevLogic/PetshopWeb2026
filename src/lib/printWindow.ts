export function printWindow(html: string): void {
  const win = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
  if (!win) { alert('Permitir pop-ups para imprimir.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
