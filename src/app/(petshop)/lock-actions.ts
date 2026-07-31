'use server';

import { apiFetch } from '@/lib/api';
import { getUsuarioLogado } from '@/lib/session';

interface LockResponse {
  CodStatus: number;
  DescricaoStatus: string;
  usuario_nome?: string;
}

/**
 * Adquire (ou renova, se for a mesma aba/sessão) a trava de edição de uma
 * agenda/tele-entrega/pré-venda (todas gravam na tabela ORCA — trava genérica
 * por id_orca+filial). A identidade da trava é a ABA do navegador (sessaoId),
 * não o usuário — assim funciona mesmo com login compartilhado entre pessoas.
 * O nome exibido vem da sessão, que foi populada a partir de SENHA.NOME no login.
 */
export async function adquirirLockEdicao(
  idOrca: number,
  filial: number,
  sessaoId: string,
): Promise<{ ok: boolean; usuarioNome?: string; error?: string }> {
  const usuario = getUsuarioLogado();
  if (!usuario) return { ok: false, error: 'Sessão expirada.' };

  try {
    const res = await apiFetch<LockResponse>('/api/petshop/lock/adquirir', {
      method: 'POST',
      body: JSON.stringify({
        id_orca: idOrca,
        filial,
        sessao_id: sessaoId,
        usuario_nome: usuario.nome,
      }),
    });
    if (res.CodStatus === 1) return { ok: true };
    if (res.CodStatus === -2) return { ok: false, usuarioNome: res.usuario_nome };
    return { ok: false, error: res.DescricaoStatus };
  } catch {
    return { ok: false, error: 'Não foi possível verificar a trava de edição.' };
  }
}

export async function liberarLockEdicao(idOrca: number, filial: number, sessaoId: string): Promise<void> {
  try {
    await apiFetch('/api/petshop/lock/liberar', {
      method: 'POST',
      body: JSON.stringify({ id_orca: idOrca, filial, sessao_id: sessaoId }),
    });
  } catch {
    // liberação é best-effort — a trava expira sozinha em alguns minutos
  }
}
