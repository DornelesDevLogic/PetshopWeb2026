/**
 * Constante de filial segura para uso em componentes client-side.
 * FILIAL é uma variável pública (não contém segredos).
 * Use NEXT_PUBLIC_FILIAL no .env para disponibilizar ao browser.
 */
export const FILIAL = Number(process.env.NEXT_PUBLIC_FILIAL ?? process.env.FILIAL ?? 1);
