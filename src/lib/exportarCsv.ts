/**
 * Exporta uma lista de objetos pra um .csv que abre normalmente no Excel,
 * sem depender de nenhuma biblioteca externa (evita as vulnerabilidades
 * conhecidas de libs tipo `xlsx`/SheetJS, que não têm correção disponível
 * pelo npm). Formatação rica (cores, largura de coluna) fica de fora — só
 * dados tabulares, que é o que os relatórios precisam.
 */
export interface ColunaCsv<T> {
  titulo: string;
  valor: (linha: T) => string | number;
}

function escapaCampoCsv(valor: string | number): string {
  const s = String(valor ?? '');
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportarCsv<T>(nomeArquivo: string, colunas: ColunaCsv<T>[], linhas: T[]): void {
  const cabecalho = colunas.map((c) => escapaCampoCsv(c.titulo)).join(';');
  const corpo = linhas
    .map((linha) => colunas.map((c) => escapaCampoCsv(c.valor(linha))).join(';'))
    .join('\r\n');
  // ';' como separador e BOM UTF-8 na frente - Excel PT-BR abre certo assim
  // (com ',' ele quebra colunas de valor decimal com vírgula, ex: "12,90").
  const conteudo = '﻿' + cabecalho + '\r\n' + corpo;
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
