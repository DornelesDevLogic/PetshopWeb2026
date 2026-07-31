'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface Props {
  dataIni: string;   // YYYY-MM-DD
  dataFim: string;
  preset:  string;   // 'hoje' | '7d' | 'mes' | 'custom'
  base:    string;   // rota base, ex.: '/dashboards/executivo'
}

const PRESETS = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d',   label: '7 dias' },
  { key: 'mes',  label: 'Mês' },
];

export default function FiltroPeriodo({ dataIni, dataFim, preset, base }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ini, setIni] = useState(dataIni);
  const [fim, setFim] = useState(dataFim);

  function irPreset(key: string) {
    startTransition(() => router.push(`${base}?preset=${key}`));
  }

  function aplicarCustom() {
    startTransition(() =>
      router.push(`${base}?preset=custom&data_ini=${ini}&data_fim=${fim}`),
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? 'default' : 'outline'}
            onClick={() => irPreset(p.key)}
            disabled={isPending}
            className="h-9"
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="flex items-end gap-1.5">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">De</label>
          <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-9 w-[9.5rem] text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase">Até</label>
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-9 w-[9.5rem] text-sm" />
        </div>
        <Button size="sm" variant="secondary" onClick={aplicarCustom} disabled={isPending} className="h-9">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
    </div>
  );
}
