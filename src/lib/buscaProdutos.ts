/**
 * Busca de produtos com suporte a múltiplos termos.
 *
 * Aceita `%` ou `*` como separador extra entre palavras, além de espaço —
 * ex.: "golden%15" ou "golden*15" equivalem a buscar "golden" e "15" juntos,
 * mesmo que não fiquem lado a lado no nome do produto (ex.: "GOLDEN CARNE
 * FILHOTES 15 KG").
 *
 * O backend Delphi faz correspondência de substring literal no parâmetro
 * `busca`, então não adianta mandar todos os termos juntos — isso só acha
 * produtos onde as palavras aparecem exatamente nessa ordem e adjacentes.
 * Por isso: manda ao backend apenas o termo mais seletivo (o mais longo),
 * e refina o resultado no frontend exigindo que TODOS os termos apareçam.
 */

function removerAcentos(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Quebra a query em termos: converte * e % em espaço, remove acentos, lowercase */
export function normalizarTermosBusca(q: string): string[] {
  return removerAcentos(q.replace(/[*%]+/g, ' '))
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/** Termo mais seletivo (mais longo) para consultar o backend */
export function termoPrincipal(termos: string[]): string {
  return termos.reduce((maior, t) => (t.length > maior.length ? t : maior), termos[0] ?? '');
}

/** Filtra produtos exigindo que TODOS os termos apareçam no texto (nome/código) */
export function filtrarProdutosPorTermos<T>(
  produtos: T[],
  termos: string[],
  getTexto: (item: T) => string,
): T[] {
  if (termos.length === 0) return produtos;
  return produtos.filter(p => {
    const texto = removerAcentos(getTexto(p)).toLowerCase();
    return termos.every(t => texto.includes(t));
  });
}
