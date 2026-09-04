'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export interface VarianteMensagem {
  id:       number;
  mensagem: string;
}

export interface MensagemRapida {
  id:        number;
  filial:    number;
  titulo:    string;
  mensagens: VarianteMensagem[];
}

export async function buscarMensagensRapidas(filial: number = getFilial()): Promise<MensagemRapida[]> {
  const res = await apiFetch<{ dados: MensagemRapida[]; Count: number }>(
    `/api/petshop/mensagens-rapidas${qs({ filial })}`,
  ).catch(() => ({ dados: [] as MensagemRapida[], Count: 0 }));
  return res.dados ?? [];
}

export async function criarMensagemRapida(titulo: string, filial: number = getFilial()) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string; id?: number }>(
    '/api/petshop/mensagens-rapidas',
    { method: 'POST', body: JSON.stringify({ titulo, filial }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}

export async function renomearMensagemRapida(id: number, titulo: string) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/mensagens-rapidas',
    { method: 'PUT', body: JSON.stringify({ id, titulo }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}

export async function excluirMensagemRapida(id: number) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/mensagens-rapidas',
    { method: 'DELETE', body: JSON.stringify({ id }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}

export async function adicionarVariante(idMsg: number, mensagem: string, filial: number = getFilial()) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string; id?: number }>(
    '/api/petshop/mensagens-rapidas/variantes',
    { method: 'POST', body: JSON.stringify({ id_msg: idMsg, mensagem, filial }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}

export async function editarVariante(id: number, mensagem: string) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/mensagens-rapidas/variantes',
    { method: 'PUT', body: JSON.stringify({ id, mensagem }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}

export async function excluirVariante(id: number) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/mensagens-rapidas/variantes',
    { method: 'DELETE', body: JSON.stringify({ id }) },
  );
  if (res.CodStatus === 1) revalidatePath('/configuracoes');
  return res;
}
