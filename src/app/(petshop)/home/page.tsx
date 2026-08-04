import { Suspense } from 'react';
import Link from 'next/link';
import HojeSection from '@/components/petshop/home/HojeSection';
import AltoGiroSection from '@/components/petshop/home/AltoGiroSection';
import EstoqueBaixoSection from '@/components/petshop/home/EstoqueBaixoSection';
import AcessosRapidos from '@/components/petshop/home/AcessosRapidos';
import { KpisSkeleton, ListaSkeleton } from '@/components/petshop/home/HomeSkeletons';
import { obterAcessosRapidos } from '@/lib/acessos-rapidos';
import { Home as HomeIcon, TrendingUp, PackageX } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmtDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

// Página síncrona (sem await no topo): o layout aparece instantâneo no clique
// e cada seção abaixo é um Server Component assíncrono próprio, streamado via
// Suspense — a mais rápida (hoje) aparece primeiro, sem esperar a mais pesada
// (alto giro, que faz UNION em 3 tabelas de movimento).
export default function HomePage() {
  const acessosRapidos = obterAcessosRapidos(4);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#6366F1] text-white shrink-0">
          <HomeIcon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Início</h1>
          <p className="text-sm text-muted-foreground capitalize">Bem-vindo de volta — {fmtDataHoje()}</p>
        </div>
      </div>

      <AcessosRapidos itens={acessosRapidos} />

      <Suspense fallback={<KpisSkeleton />}>
        <HojeSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" /> Produtos de alto giro (30 dias)
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Mais usados em agendas e vendidos em cupons.</p>
          <Suspense fallback={<ListaSkeleton />}>
            <AltoGiroSection />
          </Suspense>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <PackageX className="h-4 w-4 text-red-600 dark:text-red-400" /> Estoque baixo
            </h2>
            <Link
              href="/produtos"
              className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] bg-[#4F46E5]/10 dark:bg-[#6366F1]/15 rounded-full px-3 py-1 hover:bg-[#4F46E5]/20 dark:hover:bg-[#6366F1]/25 transition-colors"
            >
              Ver produtos
            </Link>
          </div>
          <Suspense fallback={<ListaSkeleton />}>
            <EstoqueBaixoSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
