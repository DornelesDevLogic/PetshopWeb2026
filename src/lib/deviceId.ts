'use client';

const DEVICE_KEY = 'ps_device_id';

/**
 * Retorna (ou cria) um identificador persistente deste navegador/dispositivo.
 * Mesmo padrão usado no giro_web (src/lib/discovery.ts) — preparação para a
 * futura API de aprovação de dispositivo, que ainda não tem endpoint definido.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
          (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16),
        );
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
