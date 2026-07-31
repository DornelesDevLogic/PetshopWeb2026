'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Animal, AnimalHistoricoItem, Especie, Raca, TipoPelo,
} from '@/types/petshop';
import { deactivateAnimal } from '@/app/(petshop)/animais/[id]/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Pencil, Trash2, Loader2, AlertCircle,
  PawPrint, ShoppingBag, User, History, Scale,
} from 'lucide-react';
import AnimalFotoUpload from '@/components/petshop/animais/AnimalFotoUpload';
import EditarAnimalDialog from '@/components/petshop/animais/EditarAnimalDialog';
import PesoHistorico from '@/components/petshop/animais/PesoHistorico';
import { cn } from '@/lib/utils';

interface Props {
  animal:    Animal;
  historico: AnimalHistoricoItem[] | undefined;
  especies:  Especie[];
  racas:     Raca[];
  pelos:     TipoPelo[];
}

function fmtData(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('pt-BR');
}

function calcIdade(s: string) {
  if (!s) return '';
  const nasc = new Date(s);
  if (isNaN(nasc.getTime())) return '';
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  if (anos < 1) {
    const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

function fmtMoeda(s: string) {
  const v = parseFloat(s.replace(',', '.'));
  if (isNaN(v)) return s || '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function AnimalDetalheView({ animal, historico, especies, racas, pelos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen,    setEditOpen]    = useState(false);
  const [deactError,  setDeactError]  = useState('');
  const [confirmDeact, setConfirmDeact] = useState(false);
  const [pesoHistOpen, setPesoHistOpen] = useState(false);

  function handleDeactivate() {
    setDeactError('');
    startTransition(async () => {
      const r = await deactivateAnimal(animal.id, animal.id_cliente);
      if (r.error) { setDeactError(r.error); setConfirmDeact(false); return; }
      router.push('/animais');
    });
  }

  const idade = calcIdade(animal.data_nascimento);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Voltar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            {animal.nome}
            {animal.apelido && (
              <span className="text-base font-normal text-muted-foreground">"{animal.apelido}"</span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/animais/${animal.id}/historico`}>
            <Button variant="outline" size="sm">
              <History className="h-3.5 w-3.5 mr-1.5" />
              Histórico
            </Button>
          </Link>
          <EditarAnimalDialog
            animal={animal}
            especies={especies}
            racas={racas}
            pelos={pelos}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setConfirmDeact(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Desativar
          </Button>
        </div>
      </div>

      {deactError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />{deactError}
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados do animal */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Animal</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Espécie</dt>
            <dd className="font-medium">{animal.especie || '—'}</dd>

            <dt className="text-muted-foreground">Raça</dt>
            <dd className="font-medium">{animal.raca || '—'}</dd>

            <dt className="text-muted-foreground">Pelo</dt>
            <dd className="font-medium">{animal.pelo || '—'}</dd>

            <dt className="text-muted-foreground">Sexo</dt>
            <dd className="font-medium">
              {animal.sexo === 'M' ? 'Macho' : animal.sexo === 'F' ? 'Fêmea' : '—'}
              {animal.castrado === 1 && <span className="ml-1 text-muted-foreground">(castrado)</span>}
            </dd>

            <dt className="text-muted-foreground">Nascimento</dt>
            <dd className="font-medium">
              {fmtData(animal.data_nascimento)}
              {idade && <span className="ml-1 text-muted-foreground text-xs">({idade})</span>}
            </dd>

            <dt className="text-muted-foreground">Peso</dt>
            <dd className="font-medium flex items-center gap-2">
              {animal.peso ? `${animal.peso} kg` : '—'}
              <button
                type="button"
                onClick={() => setPesoHistOpen(true)}
                title="Ver histórico de peso"
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                <Scale className="h-3 w-3" />
                Histórico
              </button>
            </dd>

            <dt className="text-muted-foreground">Cor</dt>
            <dd className="font-medium">{animal.cor || '—'}</dd>

            <dt className="text-muted-foreground">Veterinário</dt>
            <dd className="font-medium">{animal.veterinario || '—'}</dd>
          </dl>
          {animal.obs && (
            <div className="mt-2 p-3 rounded-md bg-muted/30 text-sm">
              <p className="text-muted-foreground text-xs mb-1">Observações</p>
              <p>{animal.obs}</p>
            </div>
          )}
        </div>

        {/* Dono */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Proprietário</h2>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <Link
                href={`/clientes/${animal.id_cliente}`}
                className="font-semibold text-primary hover:underline"
              >
                {animal.nome_cliente}
              </Link>
              <p className="text-xs text-muted-foreground">Cliente #{animal.id_cliente}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {/* Convenção do legado: ATIVO=1 significa INATIVO (invertido) */}
            <span className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
              animal.ativo === 1
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-green-100 text-green-700 border-green-200',
            )}>
              {animal.ativo === 1 ? 'Inativo' : 'Ativo'}
            </span>
            {animal.obito === 1 && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border-border">
                Óbito
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Foto do animal */}
      <AnimalFotoUpload animalId={animal.id} clienteId={animal.id_cliente} />

      {/* Histórico de compras */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/20">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Histórico de Compras</h2>
          <span className="ml-auto text-xs text-muted-foreground">{(historico ?? []).length} itens</span>
        </div>

        {(historico ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <ShoppingBag className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma compra registrada.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right w-20">Qtd</TableHead>
                <TableHead className="text-right w-28">Valor Unit.</TableHead>
                <TableHead className="hidden md:table-cell text-muted-foreground w-24">NF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(historico ?? []).map((h, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-sm">{fmtData(h.data)}</TableCell>
                  <TableCell>
                    <p className="text-sm">{h.produto}</p>
                    <p className="text-xs text-muted-foreground">{h.unidade}</p>
                  </TableCell>
                  <TableCell className="text-right text-sm">{h.qtd}</TableCell>
                  <TableCell className="text-right text-sm">{fmtMoeda(h.valor_unit)}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{h.num_nf || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Dialog Histórico de Peso ── */}
      <Dialog open={pesoHistOpen} onOpenChange={setPesoHistOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Histórico de Peso — {animal.nome}
            </DialogTitle>
          </DialogHeader>
          <PesoHistorico animalId={animal.id} filial={animal.filial} pesoAtual={Number(animal.peso) || undefined} />
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Desativação ── */}
      <Dialog open={confirmDeact} onOpenChange={setConfirmDeact}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar animal?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            O animal <strong>{animal.nome}</strong> será marcado como inativo.
            Esta operação pode ser revertida pelo sistema.
          </p>
          {deactError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />{deactError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDeact(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleDeactivate}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desativar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
