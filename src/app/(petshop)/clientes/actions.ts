'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL, qs } from '@/lib/api';
import { ApiWrite, ClienteResponse } from '@/types/petshop';
import { validarEmail, limparCpfCnpj } from '@/lib/masks';

// ─── Busca de CEP ────────────────────────────────────────────────────────────

export interface CepResultado {
  cep:        string;
  logradouro: string;
  bairro:     string;
  cidade:     string;
  uf:         string;
  ibge:       string;
}

/**
 * Tenta ViaCEP (online); se falhar chama o banco local via backend Delphi.
 * Retorna null se não encontrar.
 */
export async function buscarCep(cep: string): Promise<CepResultado | null> {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return null;

  // 1️⃣ ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      next: { revalidate: 86400 }, // cache 24h
    });
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          cep:        cepLimpo,
          logradouro: data.logradouro ?? '',
          bairro:     data.bairro     ?? '',
          cidade:     data.localidade ?? '',
          uf:         data.uf         ?? '',
          ibge:       data.ibge       ?? '',
        };
      }
    }
  } catch { /* sem internet ou timeout → tenta local */ }

  // 2️⃣ Banco local via Delphi
  try {
    const res = await apiFetch<{
      CodStatus: number;
      logradouro?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
    }>(`/api/petshop/cep?cep=${cepLimpo}`);
    if (res.CodStatus === 1) {
      return {
        cep:        cepLimpo,
        logradouro: res.logradouro ?? '',
        bairro:     res.bairro     ?? '',
        cidade:     res.cidade     ?? '',
        uf:         res.uf         ?? '',
        ibge:       '',
      };
    }
  } catch { /* banco local não disponível */ }

  return null;
}

// ─── Verificação de CPF/CNPJ duplicado ───────────────────────────────────────

export interface CpfDuplicadoResult {
  duplicado: boolean;
  id?:   number;
  nome?: string;
}

/**
 * Verifica se já existe cliente com o mesmo CPF/CNPJ.
 * excludeId: ignora o próprio registro ao editar.
 */
export async function verificarCpfDuplicado(
  cpf: string,
  excludeId?: number,
): Promise<CpfDuplicadoResult> {
  const cpfLimpo = limparCpfCnpj(cpf);
  if (cpfLimpo.length < 11) return { duplicado: false };
  try {
    const res = await apiFetch<ClienteResponse>(
      `/api/petshop/clientes${qs({ filial: FILIAL, limit: 5, filter1: `s.CGC_CLI='${cpfLimpo}'` })}`,
    );
    const dados = res.dados ?? [];
    const encontrado = dados.find((c) => !excludeId || c.id !== excludeId);
    if (encontrado) return { duplicado: true, id: encontrado.id, nome: encontrado.nome };
  } catch { /* ignora erro de rede — validação do backend ainda ocorre */ }
  return { duplicado: false };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const up = (v: FormDataEntryValue | null) =>
  ((v as string | null)?.trim() ?? '').toUpperCase();

export async function createCliente(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const nome = up(formData.get('nome'));
  if (!nome) return { error: 'Nome é obrigatório.' };

  // Validação de e-mail
  const emailRaw = String(formData.get('email') ?? '').trim();
  if (emailRaw && !validarEmail(emailRaw)) {
    return { error: 'E-mail inválido. Verifique o formato (ex: cliente@empresa.com).' };
  }

  // Verificação de CPF/CNPJ duplicado
  const cpfRaw = limparCpfCnpj(String(formData.get('cpf_cnpj') ?? ''));
  if (cpfRaw.length >= 11) {
    const dup = await verificarCpfDuplicado(cpfRaw);
    if (dup.duplicado) {
      return {
        error: `CPF/CNPJ já cadastrado${dup.nome ? ` para "${dup.nome}"` : ''}${dup.id ? ` (Cód. ${dup.id})` : ''}.`,
      };
    }
  }

  const body = {
    filial:          FILIAL,
    nome,
    nome_fantasia:   up(formData.get('nome_fantasia')),
    cpf_cnpj:        formData.get('cpf_cnpj')        ?? '',
    telefone:        formData.get('telefone')         ?? '',
    celular:         formData.get('celular')          ?? '',
    email:           formData.get('email')            ?? '',
    endereco:        up(formData.get('endereco')),
    numero:          up(formData.get('numero')),
    complemento:     up(formData.get('complemento')),
    bairro:          up(formData.get('bairro')),
    cidade:          up(formData.get('cidade')),
    uf:              up(formData.get('uf')),
    cep:             formData.get('cep')              ?? '',
    ibge:            formData.get('ibge')             ?? '',
    ie:              formData.get('ie')               ?? '',
    data_nascimento: formData.get('data_nascimento')  ?? '',
    comentario:      up(formData.get('comentario')),
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

export async function updateCliente(
  id: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const nome = up(formData.get('nome'));
  if (!nome) return { error: 'Nome é obrigatório.' };

  // Validação de e-mail
  const emailRaw = String(formData.get('email') ?? '').trim();
  if (emailRaw && !validarEmail(emailRaw)) {
    return { error: 'E-mail inválido. Verifique o formato (ex: cliente@empresa.com).' };
  }

  // Verificação de CPF/CNPJ duplicado (excluindo o próprio registro)
  const cpfRaw = limparCpfCnpj(String(formData.get('cpf_cnpj') ?? ''));
  if (cpfRaw.length >= 11) {
    const dup = await verificarCpfDuplicado(cpfRaw, id);
    if (dup.duplicado) {
      return {
        error: `CPF/CNPJ já cadastrado${dup.nome ? ` para "${dup.nome}"` : ''}${dup.id ? ` (Cód. ${dup.id})` : ''}.`,
      };
    }
  }

  const body = {
    id,
    nome,
    nome_fantasia:   up(formData.get('nome_fantasia')),
    cpf_cnpj:        formData.get('cpf_cnpj')        ?? '',
    telefone:        formData.get('telefone')         ?? '',
    celular:         formData.get('celular')          ?? '',
    email:           formData.get('email')            ?? '',
    endereco:        up(formData.get('endereco')),
    numero:          up(formData.get('numero')),
    complemento:     up(formData.get('complemento')),
    bairro:          up(formData.get('bairro')),
    cidade:          up(formData.get('cidade')),
    uf:              up(formData.get('uf')),
    cep:             formData.get('cep')              ?? '',
    ibge:            formData.get('ibge')             ?? '',
    ie:              formData.get('ie')               ?? '',
    data_nascimento: formData.get('data_nascimento')  ?? '',
    comentario:      up(formData.get('comentario')),
    pessoa:          formData.get('pessoa')           ?? 'F',
    status_ativo:    Number(formData.get('status_ativo') ?? 0),
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/clientes', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/clientes/${id}`);
  revalidatePath('/clientes');
  return {};
}

/** Cadastro rápido de cliente — campos mínimos, sem FormData */
export async function criarClienteRapido(dados: {
  nome:      string;
  telefone?: string;
  celular?:  string;
  cpf_cnpj?: string;
}): Promise<{ id?: number; error?: string }> {
  const nome = dados.nome.trim().toUpperCase();
  if (!nome) return { error: 'Nome é obrigatório.' };
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/clientes', {
      method: 'POST',
      body: JSON.stringify({
        filial:    FILIAL,
        nome,
        telefone:  dados.telefone?.trim() ?? '',
        celular:   dados.celular?.trim()  ?? '',
        cpf_cnpj:  dados.cpf_cnpj?.trim() ?? '',
        situacao:  'A',
        pessoa:    'F',
      }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/clientes');
    return { id: res.id as number };
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}
