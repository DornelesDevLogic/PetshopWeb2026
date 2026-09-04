import { limparTelefone } from '@/lib/masks';

/** Monta o link wa.me pronto pra abrir o WhatsApp Web/app com o texto
 * preenchido — não usa nenhuma API de envio, quem manda é o próprio
 * usuário. Retorna null se o telefone não tiver DDD+número suficientes. */
export function linkWhatsApp(telefone: string, mensagem: string): string | null {
  const fone = limparTelefone(telefone || '');
  if (fone.length < 10) return null;
  const numero = fone.length <= 11 ? `55${fone}` : fone;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Substitui placeholders {pet}, {cliente} e {data} numa mensagem-modelo.
 * Usado tanto nas Mensagens Rápidas (Configurações) quanto em qualquer
 * outro lugar que monte um texto de WhatsApp a partir de um modelo. */
export function preencherModelo(
  modelo: string,
  vars: { pet?: string; cliente?: string; data?: string },
): string {
  const primeiroNome = (s?: string) => {
    const p = (s ?? '').trim().split(' ')[0];
    return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '';
  };
  return modelo
    .replace(/\{pet\}/gi, vars.pet ?? '')
    .replace(/\{cliente\}/gi, primeiroNome(vars.cliente))
    .replace(/\{data\}/gi, vars.data ?? '');
}
