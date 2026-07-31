/**
 * Filial ativa para componentes client-side.
 * A filial é escolhida no login e gravada no cookie `ps_filial`
 * (não-httpOnly — não é segredo), espelhando o modelo do sistema
 * legado onde a filial fica fixa durante toda a sessão.
 * Fallback: NEXT_PUBLIC_FILIAL / FILIAL do .env (modo filial única).
 */
export function getFilialClient(): number {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)ps_filial=(\d+)/);
    if (m) {
      const f = Number(m[1]);
      if (Number.isFinite(f) && f > 0) return f;
    }
  }
  return Number(process.env.NEXT_PUBLIC_FILIAL ?? process.env.FILIAL ?? 1);
}
