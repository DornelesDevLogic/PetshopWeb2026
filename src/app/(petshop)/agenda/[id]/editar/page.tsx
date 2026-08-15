import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  AgendaDetalhe,
  ProfissionalResponse, ServicoResponse,
  EspecieResponse, RacaResponse, TipoPeloResponse, VendedorResponse,
} from '@/types/petshop';
import NovoAgendamentoForm, { ItemSalvo } from '@/components/petshop/agenda/NovoAgendamentoForm';
import EdicaoLockGuard from '@/components/petshop/EdicaoLockGuard';
import { buttonVariants } from '@/components/ui/button';

interface Props {
  params: { id: string };
}

export default async function EditarAgendaPage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [detalhe, itensRes, profsRes, servsRes, especiesRes, racasRes, pelosRes, vendsRes] = await Promise.all([
    apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe${qs({ id, filial: getFilial() })}`,
    ).catch(() => null),

    apiFetch<{ dados: ItemSalvo[]; Count: number }>(
      `/api/petshop/agenda/itens?id=${id}&filial=${getFilial()}`,
    ).catch(() => ({ dados: [] as ItemSalvo[], Count: 0 })),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: getFilial(), limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: getFilial(), limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: getFilial(), limit: 3000 })}`,
    ).catch(() => empty),
    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: getFilial(), limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
  ]);

  if (!detalhe) notFound();

  if (!detalhe.pode_editar) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 text-center space-y-4">
        <Lock className="h-10 w-10 text-destructive mx-auto" />
        <h1 className="text-lg font-semibold">Edição não permitida</h1>
        <p className="text-sm text-muted-foreground">
          Esta agenda só pode ser alterada pelo usuário que a criou ou por um usuário com nível Supervisor.
        </p>
        <div className="flex justify-center pt-2">
          <Link href={`/agenda/${id}`} className={buttonVariants({ variant: 'outline' })}>
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EdicaoLockGuard idOrca={id} filial={detalhe.filial} voltarHref={`/agenda/${id}`}>
      <NovoAgendamentoForm
        modo="editar"
        agendaId={id}
        agendaInicial={detalhe}
        itensIniciais={itensRes.dados}
        profissionais={profsRes.dados}
        servicos={servsRes.dados}
        especies={especiesRes.dados}
        racas={racasRes.dados}
        pelos={pelosRes.dados}
        vendedores={vendsRes.dados}
        filial={getFilial()}
      />
    </EdicaoLockGuard>
  );
}
