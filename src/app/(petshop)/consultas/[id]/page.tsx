import { apiFetch, qs, getFilial } from '@/lib/api';
import { getUsuarioLogado } from '@/lib/session';
import {
  ConsultaDetalhe,
  ProntuarioResponse,
  ExameResponse,
  VacinaResponse,
  ConfigAnamnese,
  AnimalResponse,
  Animal,
  AnexoExameResponse,
  VendedorResponse,
} from '@/types/petshop';
import ConsultaDetalheView from '@/components/petshop/consultas/ConsultaDetalheView';
import { buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { notFound } from 'next/navigation';
import ErroCarregarDados from '@/components/petshop/ErroCarregarDados';

interface Props {
  params: { id: string };
}

export default async function ConsultaDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  // Erros de conexão/backend (timeout, 500, etc.) não devem virar "404 não
  // encontrada" — isso mascara o problema real e o torna impossível de
  // diagnosticar depois (ex: consulta 17151, dado gravado mas tela mostrou
  // 404). Captura aqui pra mostrar a mensagem real; só CodStatus -5 (backend
  // confirmou que não existe) vira notFound() de verdade.
  let consulta: ConsultaDetalhe;
  try {
    consulta = await apiFetch<ConsultaDetalhe>(
      `/api/petshop/consultas/detalhe${qs({ id, filial: getFilial() })}`,
    );
  } catch (e) {
    return (
      <ErroCarregarDados
        mensagem={e instanceof Error ? e.message : 'Erro desconhecido ao buscar os dados da consulta.'}
        retryHref={`/consultas/${id}`}
        voltarHref="/consultas"
        voltarLabel="Voltar para Consultas"
      />
    );
  }

  if (consulta.CodStatus === -5) notFound();

  const emptyProntuario: ProntuarioResponse = { consulta_id: id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyExame: ExameResponse            = { consulta_id: id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyVacina: VacinaResponse          = { animal_id: consulta.animal_id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyAnimal: AnimalResponse          = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const emptyAnexo: AnexoExameResponse = { dados: [], Count: 0 };
  const emptyVendedor: VendedorResponse = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [prontuariosRes, examesRes, vacinasRes, configRes, animalRes, anexosRes, cliente, vendedoresRes] = await Promise.all([
    apiFetch<ProntuarioResponse>(
      `/api/petshop/prontuarios${qs({ consulta_id: id, filial: getFilial() })}`,
    ).catch(() => emptyProntuario),

    apiFetch<ExameResponse>(
      `/api/petshop/exames${qs({ consulta_id: id, filial: getFilial() })}`,
    ).catch(() => emptyExame),

    apiFetch<VacinaResponse>(
      `/api/petshop/animais/vacinas-aplicadas${qs({ animal_id: consulta.animal_id, filial: getFilial() })}`,
    ).catch(() => emptyVacina),

    apiFetch<ConfigAnamnese>(
      `/api/petshop/config-anamnese${qs({ filial: getFilial() })}`,
    ).catch(() => null),

    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: getFilial(), filter1: `a.PET_ID=${consulta.animal_id}`, limit: 1 })}`,
    ).catch(() => emptyAnimal),

    apiFetch<AnexoExameResponse>(
      `/api/petshop/exames/anexos${qs({ consulta_id: id, filial: getFilial() })}`,
    ).catch(() => emptyAnexo),

    buscarClienteCompleto(consulta.proprietario_id),

    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => emptyVendedor),
  ]);

  const animal: Animal | null = animalRes.dados[0] ?? null;
  const clienteTelefone = cliente?.celular || cliente?.telefone || '';
  const usuario = getUsuarioLogado();

  return (
    <ConsultaDetalheView
      consulta={consulta}
      prontuarios={prontuariosRes.dados}
      exames={examesRes.dados}
      vacinas={vacinasRes.dados}
      config={configRes}
      animal={animal}
      anexos={anexosRes.dados ?? []}
      clienteTelefone={clienteTelefone}
      vendedores={vendedoresRes.dados}
      vendedorInicial={usuario?.vendedor_id || undefined}
      vendedorFilialInicial={usuario?.vendedor_filial || undefined}
    />
  );
}
