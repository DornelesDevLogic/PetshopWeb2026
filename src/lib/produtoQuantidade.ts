/** Produtos com unidade "UN" (unidade) só vendem em quantidades inteiras —
 * mesma regra do sistema legado (diferente de produtos por KG/G/ML/L etc.,
 * que aceitam fração). */
export function unidadeInteira(unidade?: string | null): boolean {
  return (unidade ?? '').trim().toUpperCase() === 'UN';
}

/** Bloqueia a digitação de vírgula/ponto quando a unidade não é fracionável,
 * pra nunca deixar o usuário lançar algo como "1,22" numa unidade que só
 * vende inteiro — sem atrapalhar a digitação normal de números inteiros. */
export function sanitizarQuantidade(valor: string, unidade?: string | null): string {
  if (!unidadeInteira(unidade)) return valor;
  return valor.replace(/[.,]/g, '');
}
