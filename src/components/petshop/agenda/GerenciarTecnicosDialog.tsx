'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users2, Loader2, Search, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listarTecnicos, definirAgendaTecnico, ativarTecnico, type TecnicoGerencia,
} from '@/app/(petshop)/agenda/tecnicos-actions';

export default function GerenciarTecnicosDialog() {
  const router = useRouter();
  const [open, setOpen]         = useState(false);
  const [tecnicos, setTecnicos] = useState<TecnicoGerencia[]>([]);
  const [carregando, setCarreg] = useState(false);
  const [busca, setBusca]       = useState('');
  const [salvandoId, setSalvId] = useState<number | null>(null);
  const [, startTransition]     = useTransition();

  async function abrir() {
    setOpen(true);
    setCarreg(true);
    setTecnicos(await listarTecnicos());
    setCarreg(false);
  }

  function fechar(v: boolean) {
    setOpen(v);
    // ao fechar, atualiza o grid da agenda com as mudanças
    if (!v) startTransition(() => router.refresh());
  }

  async function toggleAgenda(t: TecnicoGerencia) {
    setSalvId(t.id);
    const novo = !t.agendaAberta;
    const r = await definirAgendaTecnico(t.id, novo);
    setSalvId(null);
    if (!r.error) {
      setTecnicos((prev) => prev.map((x) => (x.id === t.id ? { ...x, agendaAberta: novo } : x)));
    }
  }

  async function toggleAtivo(t: TecnicoGerencia) {
    setSalvId(t.id);
    const novo = !t.ativo;
    const r = await ativarTecnico(t.id, novo);
    setSalvId(null);
    if (!r.error) {
      setTecnicos((prev) => prev.map((x) => (x.id === t.id ? { ...x, ativo: novo } : x)));
    }
  }

  // Mostra apenas técnicos ativos
  const filtrados = tecnicos.filter(
    (t) => t.ativo && t.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 md:h-8" onClick={abrir}>
        <Users2 className="h-3.5 w-3.5 md:mr-1.5" />
        <span className="hidden md:inline">Gerenciar técnicos</span>
        <span className="md:hidden ml-1">Técnicos</span>
      </Button>

      <Dialog open={open} onOpenChange={fechar}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              Gerenciar técnicos
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1">
            <strong>ON</strong> = a agenda do técnico aparece no grid. <strong>OFF</strong> = não aparece.
            Você também pode reativar técnicos inativos.
          </p>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar técnico..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 divide-y">
            {carregando ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filtrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum técnico encontrado.</p>
            ) : (
              filtrados.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.nome}</p>
                    <button
                      onClick={() => toggleAtivo(t)}
                      disabled={salvandoId === t.id}
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] mt-0.5 rounded px-1 py-0.5 transition-colors',
                        t.ativo
                          ? 'text-green-700 hover:bg-green-50 dark:text-green-400'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                      title={t.ativo ? 'Clique para inativar' : 'Clique para ativar'}
                    >
                      <Power className="h-3 w-3" />
                      {t.ativo ? 'Ativo' : 'Inativo — ativar'}
                    </button>
                  </div>

                  {/* Toggle ON/OFF da agenda */}
                  <button
                    onClick={() => toggleAgenda(t)}
                    disabled={salvandoId === t.id}
                    className={cn(
                      'shrink-0 w-16 h-8 rounded-full text-xs font-bold transition-colors flex items-center justify-center gap-1',
                      t.agendaAberta
                        ? 'bg-green-600 text-white'
                        : 'bg-muted text-muted-foreground',
                    )}
                    title={t.agendaAberta ? 'Fechar agenda (OFF)' : 'Abrir agenda (ON)'}
                  >
                    {salvandoId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (t.agendaAberta ? 'ON' : 'OFF')}
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
