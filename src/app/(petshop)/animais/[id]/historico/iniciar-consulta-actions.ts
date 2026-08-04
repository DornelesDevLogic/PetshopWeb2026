'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';
import type { ProdutoResultado } from '@/app/(petshop)/agenda/nova/actions';

export interface ItemEstimativaSelecionado {
  dadosproId: number;
  descPro:    string;
  qtd:        number;
}

export interface DadosIniciarConsulta {
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

/**
 * Cria Agenda + Consulta a partir de itens selecionados no histórico de
 * Estimativas do animal: a Agenda é o documento que o Frente de Caixa cobra
 * (mesmo padrão já usado quando uma Consulta nasce de um agendamento comum),
 * a Consulta já nasce vinculada a ela (FK_ID_AGENDA), e os produtos das
 * estimativas selecionadas são lançados na mesma ORCA/PRODORCA de ambas.
 */
export async function criarConsultaDeEstimativas(
  dados: DadosIniciarConsulta,
): Promise<{ error?: string; consultaId?: number }> {
  if (!dados.animalId)  return { error: 'Animal inválido.' };
  if (!dados.vetId)     return { error: 'Selecione o veterinário.' };
  if (!dados.servicoId) return { error: 'Selecione o serviço.' };
  // itens vazio é permitido — o veterinário pode iniciar a consulta sem
  // nenhuma estimativa selecionada e lançar produtos manualmente depois.

  const filial = getFilial();

  // 1. Cria a Agenda
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
        obs:             'Consulta iniciada a partir do histórico de estimativas',
        tipo_ocorrencia: 1,
      }),
    });
    if (resAgenda.CodStatus !== 1 || !resAgenda.id) {
      return { error: resAgenda.DescricaoStatus || 'Não foi possível criar a agenda.' };
    }
    agendaId = resAgenda.id as number;
  } catch {
    return { error: 'Não foi possível conectar ao servidor (agenda).' };
  }

  // 2. Lança cada item selecionado na agenda recém-criada, buscando o
  //    preço/código atuais do produto (a Estimativa só guarda o nome e a
  //    quantidade da época da compra, não o preço).
  const errosItens: string[] = [];
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
    } catch {
      errosItens.push(`${item.descPro}: falha ao lançar na agenda.`);
    }
  }

  // 3. Cria a Consulta já vinculada à agenda
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
    if (errosItens.length > 0) {
      return { consultaId: resConsulta.id as number, error: `Consulta criada, mas alguns itens falharam: ${errosItens.join('; ')}` };
    }
    return { consultaId: resConsulta.id as number };
  } catch {
    return { error: 'Agenda criada, mas não foi possível conectar ao servidor (consulta).' };
  }
}
