'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

export async function createCliente(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const nome = (formData.get('nome') as string | null)?.trim() ?? '';
  if (!nome) return { error: 'Nome é obrigatório.' };

  const body = {
    filial:          FILIAL,
    nome,
    nome_fantasia:   formData.get('nome_fantasia')   ?? '',
    cpf_cnpj:        formData.get('cpf_cnpj')        ?? '',
    telefone:        formData.get('telefone')         ?? '',
    celular:         formData.get('celular')          ?? '',
    email:           formData.get('email')            ?? '',
    endereco:        formData.get('endereco')         ?? '',
    numero:          formData.get('numero')           ?? '',
    bairro:          formData.get('bairro')           ?? '',
    cidade:          formData.get('cidade')           ?? '',
    uf:              formData.get('uf')               ?? '',
    cep:             formData.get('cep')              ?? '',
    data_nascimento: formData.get('data_nascimento')  ?? '',
    comentario:      formData.get('comentario')       ?? '',
    pessoa:          formData.get('pessoa')           ?? 'F',
    situacao:        'A',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/clientes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/clientes');
  return { id: res.id as number };
}
