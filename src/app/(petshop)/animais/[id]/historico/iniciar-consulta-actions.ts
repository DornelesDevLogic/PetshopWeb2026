'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';
import type { ProdutoResultado } from '@/app/(petshop)/agenda/nova/actions';
import { atualizarStatusEstimativa, criarEstimativa } from '@/app/(petshop)/estimativas/actions';

export interface ItemEstimativaSelecionado {
  id:         number;
  dadosproId: number;
  descPro:    string;
  qtd:        number;
  /** Prazo (em dias) escolhido pra criar um novo lembrete de recompra; 0 = não criar. */
  dias?:      number;
}

export interface DadosIniciarAtendimento {
  animalId:      number;
  animalFilial:  number;
  animalNome:    string;
  clienteId:     number;
  clienteFilial: number;
  clienteNome:   string;
  vetId:         number;
  vetFilial:     number;
  vetNome:       string;
  servicoId:     number;
  servicoFilial: number;
  servicoNome:   string;
  data:          string; // yyyy-mm-dd
  itens:         ItemEstimativaSelecionado[];
}

/** @deprecated use DadosIniciarAtendimento — mantido pelo nome usado no dialog existente */
export type DadosIniciarConsulta = DadosIniciarAtendimento;

interface ResultadoAgendaComItens {
  error?:        string;
  agendaId?:     number;
  idsAtendidos:  number[];
}

/**
 * Cria a Agenda e lança nela os itens das estimativas selecionadas — parte
 * comum entre "só criar Agenda" e "criar Agenda + Consulta". A Agenda é o
 * documento que o Frente de Caixa cobra (mesmo padrão já usado quando uma
 * Consulta nasce de um agendamento comum).
 */
async function criarAgendaComItens(
  dados: DadosIniciarAtendimento,
  obs: string,
): Promise<ResultadoAgendaComItens> {
  const filial = getFilial();

  let agendaId: number;
  try {
    const resAgenda = await apiFetch<ApiWrite>('/api/petshop/agenda', {
      method: 'POST',
      body: JSON.stringify({
        filial,
        cliente_id:      dados.clienteId,
        cliente_filial:  dados.clienteFilial,
        cliente_nome:    dados.clienteNome,
        data:            dados.data,
        hora:            new Date().toTimeString().slice(0, 8),
        animal_id:       dados.animalId,
        animal_filial:   dados.animalFilial,
        animal_nome:     dados.animalNome,
        raca:            '',
        prof_id:         dados.vetId,
        prof_filial:     dados.vetFilial,
        prof_nome:       dados.vetNome,
        servico_id:      dados.servicoId,
        servico_filial:  dados.servicoFilial,
        servico_nome:    dados.servicoNome,
        valor:           0,
        desconto:        0,
        obs,
        tipo_ocorrencia: 1,
      }),
    });
    if (resAgenda.CodStatus !== 1 || !resAgenda.id) {
      return { error: resAgenda.DescricaoStatus || 'Não foi possível criar a agenda.', idsAtendidos: [] };
    }
    agendaId = resAgenda.id as number;
  } catch {
    return { error: 'Não foi possível conectar ao servidor (agenda).', idsAtendidos: [] };
  }

  // Lança cada item selecionado na agenda recém-criada, buscando o
  // preço/código atuais do produto (a Estimativa só guarda o nome e a
  // quantidade da época da compra, não o preço).
  const errosItens: string[] = [];
  const idsAtendidos: number[] = [];
  let valorTotal = 0;
  for (const item of dados.itens) {
    try {
      const resProduto = await apiFetch<{ dados: ProdutoResultado[] }>(
        `/api/petshop/produtos${qs({ id_dadospro: item.dadosproId, filial })}`,
      );
      const produto = resProduto.dados?.[0];
      if (!produto) {
        errosItens.push(`${item.descPro}: produto não encontrado (pode estar inativo).`);
        continue;
      }
      const resItem = await apiFetch<ApiWrite>('/api/petshop/agenda/itens', {
        method: 'POST',
        body: JSON.stringify({
          agenda_id: agendaId, agenda_filial: filial,
          dadospro_id: produto.id_dadospro, prod_filial: produto.cod_filial,
          qtd: item.qtd, valor: produto.preco, desconto: 0,
          descricao: produto.nome_produto, desc_pro: produto.nome_produto,
          preco_tabela: produto.preco, cod_prod: produto.cod_pro,
        }),
      });
      if (resItem.CodStatus !== 1) errosItens.push(`${item.descPro}: ${resItem.DescricaoStatus}`);
      else {
        idsAtendidos.push(item.id);
        valorTotal += item.qtd * produto.preco;
        // Prazo escolhido pra recompra > 0: gera a próxima estimativa (a
        // atual é marcada como atendida por quem chamou esta função).
        if (item.dias && item.dias > 0) {
          await criarEstimativa({
            clienteId:     dados.clienteId,
            clienteFilial: dados.clienteFilial,
            clienteNome:   dados.clienteNome,
            animalId:      dados.animalId,
            animalFilial:  dados.animalFilial,
            animalNome:    dados.animalNome,
            dadosproId:    produto.id_dadospro,
            descPro:       produto.nome_produto,
            qtd:           item.qtd,
            dataCompra:    dados.data,
            dias:          item.dias,
            orcaId:        agendaId,
            orcaFilial:    filial,
          }).catch(() => {});
        }
      }
    } catch {
      errosItens.push(`${item.descPro}: falha ao lançar na agenda.`);
    }
  }

  // A Agenda nasceu com valor=0 (preço só se sabe depois de buscar cada
  // produto); agora que os itens foram lançados, sincroniza o total real.
  if (valorTotal > 0) {
    try {
      await apiFetch<ApiWrite>('/api/petshop/agenda', {
        method: 'PUT',
        body: JSON.stringify({ id: agendaId, filial, valor: valorTotal, desconto: 0 }),
      });
    } catch {
      // Segue o fluxo mesmo se a sincronização de total falhar — os itens
      // já estão lançados corretamente, o valor pode ser ajustado depois.
    }
  }

  if (errosItens.length > 0) {
    return { agendaId, idsAtendidos, error: `Alguns itens falharam: ${errosItens.join('; ')}` };
  }
  return { agendaId, idsAtendidos };
}

/**
 * Cria só a Agenda a partir de itens selecionados no histórico de
 * Estimativas do animal — sem abrir uma Consulta. Útil quando o
 * atendimento não é uma consulta veterinária (ex.: só entregar/vender os
 * produtos de recompra).
 */
export async function criarAgendaDeEstimativas(
  dados: DadosIniciarAtendimento,
): Promise<{ error?: string; agendaId?: number }> {
  if (!dados.animalId)  return { error: 'Animal inválido.' };
  if (!dados.vetId)     return { error: 'Selecione o profissional.' };
  if (!dados.servicoId) return { error: 'Selecione o serviço.' };

  const resultado = await criarAgendaComItens(dados, 'Agenda criada a partir do histórico de estimativas');
  if (!resultado.agendaId) return { error: resultado.error };

  await Promise.all(resultado.idsAtendidos.map((id) => atualizarStatusEstimativa(id, 3)));

  if (resultado.error) return { agendaId: resultado.agendaId, error: resultado.error };
  return { agendaId: resultado.agendaId };
}

/**
 * Cria Agenda + Consulta a partir de itens selecionados no histórico de
 * Estimativas do animal: a Consulta já nasce vinculada à Agenda
 * (FK_ID_AGENDA), e os produtos das estimativas selecionadas são lançados
 * na mesma ORCA/PRODORCA de ambas.
 */
export async function criarConsultaDeEstimativas(
  dados: DadosIniciarAtendimento,
): Promise<{ error?: string; consultaId?: number }> {
  if (!dados.animalId)  return { error: 'Animal inválido.' };
  if (!dados.vetId)     return { error: 'Selecione o veterinário.' };
  if (!dados.servicoId) return { error: 'Selecione o serviço.' };
  // itens vazio é permitido — o veterinário pode iniciar a consulta sem
  // nenhuma estimativa selecionada e lançar produtos manualmente depois.

  const filial = getFilial();

  const resultado = await criarAgendaComItens(dados, 'Consulta iniciada a partir do histórico de estimativas');
  if (!resultado.agendaId) return { error: resultado.error };
  const agendaId = resultado.agendaId;

  // Cria a Consulta já vinculada à agenda
  try {
    const resConsulta = await apiFetch<ApiWrite>('/api/petshop/consultas', {
      method: 'POST',
      body: JSON.stringify({
        filial,
        agenda_id:           agendaId,
        agenda_filial:       filial,
        animal_id:           dados.animalId,
        animal_filial:       dados.animalFilial,
        animal_nome:         dados.animalNome,
        proprietario_id:     dados.clienteId,
        proprietario_filial: dados.clienteFilial,
        proprietario_nome:   dados.clienteNome,
        vet_id:              dados.vetId,
        vet_filial:          dados.vetFilial,
        vet_nome:            dados.vetNome,
        data:                dados.data,
        motivo:              'Retorno a partir de estimativa',
      }),
    });
    if (resConsulta.CodStatus !== 1 || !resConsulta.id) {
      return { error: resConsulta.DescricaoStatus || 'Agenda criada, mas não foi possível abrir a consulta.' };
    }

    // Estimativas cujo item foi lançado com sucesso: marca como atendida
    // (status 3) pra não continuar aparecendo como pendente no histórico.
    await Promise.all(resultado.idsAtendidos.map((id) => atualizarStatusEstimativa(id, 3)));

    if (resultado.error) {
      return { consultaId: resConsulta.id as number, error: `Consulta criada, mas ${resultado.error}` };
    }
    return { consultaId: resConsulta.id as number };
  } catch {
    return { error: 'Agenda criada, mas não foi possível conectar ao servidor (consulta).' };
  }
}
