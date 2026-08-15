import Link from 'next/link';
import { BarChart3, Users, ShoppingBag, UserRound, CalendarClock, Receipt, Ticket, Package } from 'lucide-react';

const relatorios = [
  {
    href:    '/relatorios/comissoes',
    icon:    Users,
    titulo:  'Comissões',
    descricao: 'Comissão por produto, técnico e atendente no período.',
  },
  {
    href:    '/relatorios/comissao-profissional',
    icon:    UserRound,
    titulo:  'Comissão por Profissional',
    descricao: 'Total de comissão agrupado por profissional/técnico no período.',
  },
  {
    href:    '/relatorios/atendimentos',
    icon:    CalendarClock,
    titulo:  'Agendas / Atendimentos',
    descricao: 'Atendimentos do período por profissional ou serviço, com totais.',
  },
  {
    href:    '/relatorios/vendas-secao',
    icon:    ShoppingBag,
    titulo:  'Vendas por Seção',
    descricao: 'Itens vendidos agrupados por seção/categoria no período.',
  },
  {
    href:    '/relatorios/espelho-cupons',
    icon:    Receipt,
    titulo:  'Espelho de Cupons',
    descricao: 'Cupons/NFC-e emitidos no período, com itens de cada cupom.',
  },
  {
    href:    '/relatorios/vales',
    icon:    Ticket,
    titulo:  'Vales de Clientes',
    descricao: 'Consulta de crédito/vale-troca gerado por devolução (somente leitura).',
  },
  {
    href:    '/relatorios/produtos',
    icon:    Package,
    titulo:  'Relatório de Produtos',
    descricao: 'Indicadores de precificação e estoque dos produtos cadastrados.',
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
            className="rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
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
