import { carregarDashboardExecutivo, type KpiPeriodo } from '@/app/(petshop)/dashboards/actions';
import KpiCard from '@/components/petshop/dashboards/KpiCard';
import AreaFaturamento from '@/components/petshop/dashboards/AreaFaturamento';
import AgendasPorTipo from '@/components/petshop/dashboards/AgendasPorTipo';
import ProdutosMaisVendidos from '@/components/petshop/dashboards/ProdutosMaisVendidos';
import FiltroPeriodo from '@/components/petshop/dashboards/FiltroPeriodo';
import {
  DollarSign, ShoppingBag, Users, Receipt, AlertTriangle, LineChart,
  Ticket, CalendarDays, Truck, ClipboardList, Package,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Helpers de data (sem UTC shift) ─────────────────────────────────────────
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcularPeriodo(preset: string, iniParam?: string, fimParam?: string): { ini: string; fim: string; preset: string } {
  const hoje = new Date();
  if (preset === 'custom' && iniParam && fimParam) {
    return { ini: iniParam, fim: fimParam, preset: 'custom' };
  }
  if (preset === '7d') {
    const de = new Date(hoje); de.setDate(de.getDate() - 6);
    return { ini: ymd(de), fim: ymd(hoje), preset: '7d' };
  }
  if (preset === 'hoje') {
    return { ini: ymd(hoje), fim: ymd(hoje), preset: 'hoje' };
  }
  // padrão: mês corrente
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { ini: ymd(primeiro), fim: ymd(hoje), preset: 'mes' };
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function delta(atual: number, anterior: number): number | null {
  if (!anterior || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

interface Props {
  searchParams: { preset?: string; data_ini?: string; data_fim?: string };
}

export default async function DashboardExecutivoPage({ searchParams }: Props) {
  const { ini, fim, preset } = calcularPeriodo(
    searchParams.preset ?? 'mes',
    searchParams.data_ini,
    searchParams.data_fim,
  );

  const dados = await carregarDashboardExecutivo(ini, fim);
  const p: KpiPeriodo | undefined = dados?.periodo;
  const ant: KpiPeriodo | undefined = dados?.periodo_anterior;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Cabeçalho + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Dashboard Executivo</h1>
        </div>
        <FiltroPeriodo dataIni={ini} dataFim={fim} preset={preset} base="/dashboards/executivo" />
      </div>

      {!dados ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Endpoint de dashboard indisponível. É necessário recompilar e reimplantar o backend
          (novo endpoint <code className="mx-1">/api/petshop/dashboard/executivo</code>).
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Faturamento"
              valor={fmtMoeda(p!.faturamento)}
              delta={ant ? delta(p!.faturamento, ant.faturamento) : null}
              hint="vs. período anterior"
              icon={<DollarSign className="h-4 w-4" />}
              accent="green"
            />
            <KpiCard
              label="Vendas"
              valor={String(p!.qtd_vendas)}
              delta={ant ? delta(p!.qtd_vendas, ant.qtd_vendas) : null}
              hint="vs. anterior"
              icon={<ShoppingBag className="h-4 w-4" />}
              accent="blue"
            />
            <KpiCard
              label="Clientes"
              valor={String(p!.qtd_clientes)}
              delta={ant ? delta(p!.qtd_clientes, ant.qtd_clientes) : null}
              hint="vs. anterior"
              icon={<Users className="h-4 w-4" />}
              accent="primary"
            />
            <KpiCard
              label="Ticket médio"
              valor={fmtMoeda(p!.ticket_medio)}
              delta={ant ? delta(p!.ticket_medio, ant.ticket_medio) : null}
              hint="vs. anterior"
              icon={<Receipt className="h-4 w-4" />}
              accent="amber"
            />
          </div>

          {/* Gráfico de evolução */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-3">Evolução do faturamento</h2>
            <AreaFaturamento serie={dados.serie} />
          </div>

          {/* Movimento por tipo de operação */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Cupons emitidos"
              valor={String(dados.cupons?.total ?? 0)}
              hint={fmtMoeda(dados.cupons?.faturamento ?? 0)}
              icon={<Ticket className="h-4 w-4" />}
              accent="violet"
            />
            <KpiCard
              label="Agendas"
              valor={String(dados.agendas?.total ?? 0)}
              hint="banho, tosa, consultas..."
              icon={<CalendarDays className="h-4 w-4" />}
              accent="blue"
            />
            <KpiCard
              label="Tele-entregas"
              valor={String(dados.tele_entregas?.total ?? 0)}
              icon={<Truck className="h-4 w-4" />}
              accent="amber"
            />
            <KpiCard
              label="Pré-vendas"
              valor={String(dados.prevendas?.total ?? 0)}
              icon={<ClipboardList className="h-4 w-4" />}
              accent="rose"
            />
          </div>

          {/* Agendas por tipo + Produtos mais vendidos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" /> Agendas por tipo de serviço
              </h2>
              <AgendasPorTipo dados={dados.agendas?.por_tipo ?? []} />
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" /> Produtos mais vendidos
              </h2>
              <ProdutosMaisVendidos produtos={dados.produtos_mais_vendidos ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
