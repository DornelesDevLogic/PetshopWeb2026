'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, getFilial } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

const up = (v: FormDataEntryValue | null) =>
  ((v as string | null)?.trim() ?? '').toUpperCase();

export async function createAnimal(
  clienteId: number,
  filialCliente: number,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const nome = up(formData.get('nome'));
  if (!nome) return { error: 'Nome é obrigatório.' };

  const body = {
    filial:          getFilial(),
    id_cliente:      clienteId,
    filial_cliente:  filialCliente,
    nome,
    apelido:         up(formData.get('apelido')),
    sexo:            formData.get('sexo')            ?? '',
    castrado:        formData.get('castrado') === '1' ? 1 : 0,
    data_nascimento: formData.get('data_nascimento') ?? '',
    peso:            formData.get('peso')            ?? '',
    cor:             up(formData.get('cor')),
    tipo_animal:     formData.get('tipo_animal')     ?? '',
    id_especie:      Number(formData.get('id_especie')  || 0),
    especie:         formData.get('especie')         ?? '',
    id_raca:         Number(formData.get('id_raca')     || 0),
    raca:            formData.get('raca')            ?? '',
    id_pelo:         Number(formData.get('id_pelo')     || 0),
    pelo:            formData.get('pelo')            ?? '',
    obs:             up(formData.get('obs')),
    controla_racao:  Number(formData.get('controla_racao') || 0),
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/clientes/${clienteId}`);
  return { id: res.id as number };
}
