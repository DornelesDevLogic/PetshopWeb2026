/**
 * Cache em memória do processo pra foto de animal, compartilhado entre a
 * rota `GET /api/petshop/animais/[id]/foto` (que popula) e as actions de
 * upload/remoção (que precisam invalidar na hora, senão o upload funciona
 * no backend mas a tela continua servindo o "sem foto" antigo por até
 * TTL_SEM_FOTO_MS — o bug original que motivou esse arquivo existir).
 */
export const TTL_SEM_FOTO_MS = 7_200_000; // 2h
export const TTL_COM_FOTO_MS = 3_600_000; // 1h

interface EntradaCache {
  buf:    Buffer | null;
  expira: number;
}

const cacheFoto = new Map<string, EntradaCache>();

function chaveFoto(animalId: number, filial: number): string {
  return `${animalId}:${filial}`;
}

export function getFotoCache(animalId: number, filial: number): EntradaCache | undefined {
  return cacheFoto.get(chaveFoto(animalId, filial));
}

export function setFotoCache(animalId: number, filial: number, entrada: EntradaCache): void {
  cacheFoto.set(chaveFoto(animalId, filial), entrada);
}

export function invalidarFotoCache(animalId: number, filial: number): void {
  cacheFoto.delete(chaveFoto(animalId, filial));
}
