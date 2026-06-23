'use client';

import { useState, useEffect } from 'react';
import { PesoHistItem } from '@/types/petshop';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  animalId: number;
  filial:   number;
  pesoAtual?: number;
}

function fmtPeso(p: number) {
  return p.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
}

function fmtData(d: string) {
  // "DD/MM/YYYY HH:MM:SS" ou "YYYY-MM-DD HH:MM:SS"
  const part = d?.split(' ')[0] ?? d;
  if (part.includes('/')) return part;
  const [y, m, dia] = part.split('-');
  return `${dia}/${m}/${y}`;
}

export default function PesoHistorico({ animalId, filial, pesoAtual }: Props) {
  const [itens,   setItens]   = useState<PesoHistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/petshop/animais/peso?animal_id=${animalId}&filial=${filial}&limit=20`)
      .then(r => r.json())
      .then(d => setItens(d.dados ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [animalId, filial]);

  if (loading) return <p className="text-xs text-muted-foreground py-2">Carregando...</p>;
  if (itens.length === 0) return (
    <p className="text-xs text-muted-foreground py-2">Nenhum registro de peso encontrado.</p>
  );

  return (
    <div className="space-y-1.5">
      {itens.map((item, idx) => {
        const prox  = itens[idx + 1];
        const diff  = prox ? item.peso - prox.peso : null;
        const igual = diff !== null && Math.abs(diff) < 0.01;
        const subiu = diff !== null && diff > 0.01;
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm bg-muted/30"
          >
            <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-bold w-20 shrink-0">{fmtPeso(item.peso)}</span>
            <span className="text-xs text-muted-foreground flex-1 truncate">{fmtData(item.data)}</span>
            {diff !== null && !igual && (
              <span className={cn(
                'flex items-center gap-0.5 text-xs font-medium shrink-0',
                subiu ? 'text-orange-500' : 'text-green-600',
              )}>
                {subiu
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {subiu ? '+' : ''}{diff.toFixed(2)} kg
              </span>
            )}
            {igual && <Minus className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}
