/**
 * Utilitários de máscara e validação de campos de formulário
 */

// ─── Telefone ────────────────────────────────────────────────────────────────

/**
 * Formata um telefone durante a digitação.
 * Suporta celular (11 dígitos): (XX) XXXXX-XXXX
 * e fixo (10 dígitos):          (XX) XXXX-XXXX
 */
export function formatarTelefone(value: string): string {
  // Mantém apenas dígitos, limita a 11
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  // 11 dígitos → celular com 9 na frente
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Remove formatação do telefone, deixando apenas dígitos.
 */
export function limparTelefone(value: string): string {
  return value.replace(/\D/g, '');
}

// ─── E-mail ──────────────────────────────────────────────────────────────────

/**
 * Valida formato básico de e-mail.
 * Retorna true quando válido (ou quando string vazia — campo opcional).
 */
export function validarEmail(email: string): boolean {
  if (!email.trim()) return true; // campo opcional
  // Deve ter: algo @ algo . algo
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ─── CPF / CNPJ ──────────────────────────────────────────────────────────────

/**
 * Remove pontuação de CPF/CNPJ deixando só dígitos.
 */
export function limparCpfCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Verifica se o CPF/CNPJ tem ao menos 11 dígitos (CPF) ou 14 (CNPJ).
 * Usado para disparar a checagem de duplicidade somente quando o campo
 * parece preenchido o suficiente.
 */
export function cpfCnpjCompleto(value: string): boolean {
  const d = limparCpfCnpj(value);
  return d.length === 11 || d.length === 14;
}
