'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** Número do microchip (hoje gravado no campo legado "apelido"). */
  value: string;
  className?: string;
}

/** Mostra o microchip do pet com um botão de copiar rápido — usado sempre
 * que o nome do pet aparece na tela, pra facilitar colar em outro sistema. */
export default function MicrochipBadge({ value, className }: Props) {
  const [copiado, setCopiado] = useState(false);
  if (!value) return null;

  // <span> em vez de <button> — este badge costuma ficar dentro de linhas
  // clicáveis (selecionar cliente/pet), e <button> dentro de <button> é
  // HTML inválido.
  return (
    <span
      role="button"
      tabIndex={0}
      title="Copiar microchip"
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await navigator.clipboard.writeText(value);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.currentTarget.click(); }
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1 py-0.5 -my-0.5 font-normal text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer',
        className,
      )}
    >
      microchip: <span className="font-mono">{value}</span>
      {copiado ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </span>
  );
}
