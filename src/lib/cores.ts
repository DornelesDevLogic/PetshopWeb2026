/**
 * Converte a cor do tipo de serviço (PET_TIPO_SERVICO.COR_STATUS) para CSS.
 * Aceita dois formatos:
 *  - Hex gravado pelo sistema web: "#3B82F6"
 *  - Inteiro TColor do Delphi legado (BGR): "16711680" → azul
 * Retorna null se vazio/inválido (ex: cores de sistema negativas do Delphi).
 */
export function corServicoCss(cor: string | null | undefined): string | null {
  const v = (cor ?? '').trim();
  if (!v) return null;
  if (v.startsWith('#')) {
    return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v) ? v : null;
  }
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0 || n > 0xffffff) return null;
  // TColor Delphi é BGR
  const r = n & 0xff;
  const g = (n >> 8) & 0xff;
  const b = (n >> 16) & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}
