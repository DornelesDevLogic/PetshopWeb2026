import Link from 'next/link';
import { BarChart3, Users, ShoppingBag } from 'lucide-react';

const relatorios = [
  {
    href:    '/relatorios/comissoes',
    icon:    Users,
    titulo:  'Comissões',
    descricao: 'Comissão por produto, técnico e atendente no período.',
  },
  {
    href:    '/relatorios/vendas-secao',
    icon:    ShoppingBag,
    titulo:  'Vendas por Seção',
    descricao: 'Itens vendidos agrupados por seção/categoria no período.',
  },
];

export default function RelatoriosPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione um relatório para gerar.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatorios.map(({ href, icon: Icon, titulo, descricao }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border bg-white p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2 group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold">{titulo}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{descricao}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
