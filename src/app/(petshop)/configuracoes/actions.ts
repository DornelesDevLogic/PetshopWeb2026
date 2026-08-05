'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { isSupervisor } from '@/lib/session';
import { ApiWrite } from '@/types/petshop';

/** Valores das 4 tabelas de configuração, chaveados por coluna (lowercase). */
export interface ConfiguracoesData {
  config:     Record<string, string>;
  pet_config: Record<string, string>;
  confmail:   Record<string, string>;
  anamnese:   Record<string, string>;
}

/**
 * Texto de "Dados adicionais na comanda" (config.imprim_obs_agenda), usado
 * no rodapé da comanda impressa da Agenda. Ao contrário de
 * `buscarConfiguracoes`, não é restrito a Supervisor — qualquer operador
 * precisa poder imprimir a comanda. Só repassa esse único campo pro
 * client, nunca o restante (senhas de e-mail, etc).
 */
export async function buscarObsComanda(): Promise<string> {
  try {
    const res = await apiFetch<ConfiguracoesData & { CodStatus: number }>(
      '/api/petshop/configuracoes',
    );
    return res.config?.imprim_obs_agenda ?? '';
  } catch {
    return '';
  }
}

export async function buscarConfiguracoes(): Promise<ConfiguracoesData | null> {
  if (!isSupervisor()) return null;
  try {
    const res = await apiFetch<ConfiguracoesData & { CodStatus: number }>(
      '/api/petshop/configuracoes',
    );
    return {
      config:     res.config     ?? {},
      pet_config: res.pet_config ?? {},
      confmail:   res.confmail   ?? {},
      anamnese:   res.anamnese   ?? {},
    };
  } catch {
    return null;
  }
}

/** Grava apenas os campos alterados. Restrito a Supervisor (SENHA.TIPO='S'). */
export async function salvarConfiguracoes(
  alteracoes: Partial<ConfiguracoesData>,
): Promise<{ error?: string; alterados?: number }> {
  // Validação server-side: mesmo que a UI esteja escondida, a action recusa
  if (!isSupervisor()) {
    return { error: 'Acesso negado: apenas usuários Supervisor podem alterar configurações.' };
  }
  try {
    const res = await apiFetch<ApiWrite & { campos_alterados?: number }>(
      '/api/petshop/configuracoes',
      { method: 'PUT', body: JSON.stringify(alteracoes) },
    );
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/configuracoes');
    return { alterados: res.campos_alterados ?? 0 };
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

// ─── Integrações (Petlove) ──────────────────────────────────────────────────
//
// Não existe uma API pública/documentada da Petlove pra consulta de sócio por
// CPF ou nº de carteirinha — o que a Petlove disponibiliza publicamente no
// GitHub (github.com/petlove) são ferramentas internas deles (ex.: httpet,
// pitbull), não uma API de parceiro. Uma integração real exigiria contrato
// comercial direto com a Petlove, que forneceria URL base + credenciais.
//
// Esta action já está pronta pra virar a chamada real: se PETLOVE_API_URL e
// PETLOVE_API_TOKEN estiverem configurados no .env, ela tenta a chamada de
// verdade; sem isso, devolve uma simulação deixando isso explícito (nunca
// finge sucesso com dado real).

export interface TesteIntegracaoPetlove {
  ok:        boolean;
  simulado:  boolean;
  mensagem:  string;
  dados?:    Record<string, unknown>;
}

export async function testarIntegracaoPetlove(
  busca: string,
): Promise<TesteIntegracaoPetlove> {
  if (!isSupervisor()) {
    return { ok: false, simulado: false, mensagem: 'Acesso negado: apenas usuários Supervisor.' };
  }

  const valor = busca.trim();
  if (!valor) {
    return { ok: false, simulado: false, mensagem: 'Informe o CPF do proprietário ou o número da carteirinha.' };
  }

  const baseUrl = process.env.PETLOVE_API_URL;
  const token   = process.env.PETLOVE_API_TOKEN;

  if (!baseUrl || !token) {
    return {
      ok:       false,
      simulado: true,
      mensagem:
        'Simulação — nenhuma credencial real da Petlove configurada ' +
        '(PETLOVE_API_URL / PETLOVE_API_TOKEN no .env). Não existe API ' +
        'pública/parceira documentada da Petlove; a integração de verdade ' +
        'depende de um contrato comercial com eles, que forneceria a URL ' +
        'base e o token de acesso. Assim que tiver esses dados, essa mesma ' +
        'tela já testa a chamada real.',
    };
  }

  try {
    const res = await fetch(`${baseUrl}?busca=${encodeURIComponent(valor)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, simulado: false, mensagem: `Petlove respondeu ${res.status}.`, dados: json ?? undefined };
    }
    return { ok: true, simulado: false, mensagem: 'Consulta realizada com sucesso.', dados: json };
  } catch {
    return { ok: false, simulado: false, mensagem: 'Não foi possível conectar à API da Petlove.' };
  }
}
