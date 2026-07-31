import { getFilial } from '@/lib/api';
import NovoAgendamentoForm from '@/components/petshop/agenda/NovoAgendamentoForm';

interface Props {
  searchParams: { data?: string; hora?: string; prof_id?: string; filial?: string };
}

export default function NovoAgendamentoPage({ searchParams }: Props) {
  const filialHome = getFilial();
  // Filial de destino: normalmente a da sessão, mas pode vir na URL quando o
  // usuário optou por inserir a agenda em outra filial a partir do grid.
  const filialAlvo = Number(searchParams.filial) || filialHome;

  // Carregamento progressivo: o formulário abre imediatamente (sem esperar as
  // listas do backend). As listas de referência (profissionais, serviços, raças,
  // etc.) são carregadas em segundo plano pelo próprio form, enquanto o usuário
  // já começa selecionando o cliente. Ver carregarListasFormAgenda().
  return (
    <NovoAgendamentoForm
      profissionais={[]}
      servicos={[]}
      especies={[]}
      racas={[]}
      pelos={[]}
      vendedores={[]}
      dataInicial={searchParams.data ?? ''}
      horaInicial={searchParams.hora ?? ''}
      profInicial={searchParams.prof_id ? Number(searchParams.prof_id) : undefined}
      filial={filialAlvo}
      filialHome={filialHome}
      carregarListas
    />
  );
}
