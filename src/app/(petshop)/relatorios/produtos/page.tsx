import Link from 'next/link';
import { ArrowLeft, Package, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const cards = [
  {
    href:      '/relatorios/produtos/custo-maior-preco',
    icon:      TrendingDown,
    titulo:    'Custo maior que preço de venda',
    descricao: 'Produtos cujo preço de custo está cadastrado acima do preço de venda — provável erro de precificação.',
  },
];

export default function RelatorioProdutosPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Relatório de Produtos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione um indicador para gerar.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ href, icon: Icon, titulo, descricao }) => (
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
