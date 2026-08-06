export function printWindow(html: string): void {
  const janela = window.open('', '_blank', 'width=420,height=700,scrollbars=yes');
  if (!janela) { alert('Permitir pop-ups para imprimir.'); return; }
  const win = janela;

  let impresso = false;
  function disparar() {
    if (impresso) return;
    impresso = true;
    win.focus();
    win.print();
  }

  // onload é mais confiável que um tempo fixo (espera o conteúdo — logo
  // incluso — terminar de renderizar); o timeout é só um reforço para
  // navegadores em que "load" não dispara depois de document.write.
  win.onload = disparar;
  win.onafterprint = () => win.close();

  win.document.write(html);
  win.document.close();
  setTimeout(disparar, 600);
}
