import { carregarResumoHoje } from '@/app/(petshop)/home/actions';
import KpiCard from '@/components/petshop/dashboards/KpiCard';
import { CalendarDays, Truck, ClipboardList, Ticket, AlertTriangle } from 'lucide-react';

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function HojeSection() {
  const hoje = await carregarResumoHoje();

  if (!hoje) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Resumo do dia indisponível. É necessário recompilar e reimplantar o backend
        (endpoint <code className="mx-1">/api/petshop/dashboard/home/hoje</code>).
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Agendas hoje"
        valor={String(hoje.agendas)}
        hint="banho, tosa, consultas..."
        icon={<CalendarDays className="h-4 w-4" />}
        accent="blue"
      />
      <KpiCard
        label="Pré-vendas hoje"
        valor={String(hoje.prevendas)}
        icon={<ClipboardList className="h-4 w-4" />}
        accent="rose"
      />
      <KpiCard
        label="Tele-entregas hoje"
        valor={String(hoje.tele_entregas)}
        icon={<Truck className="h-4 w-4" />}
        accent="amber"
      />
      <KpiCard
        label="Cupons hoje"
        valor={String(hoje.cupons.qtd)}
        hint={fmtMoeda(hoje.cupons.faturamento)}
        icon={<Ticket className="h-4 w-4" />}
        accent="green"
      />
    </div>
  );
}
