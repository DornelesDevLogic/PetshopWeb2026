'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Consulta, Profissional, Cliente, Animal } from '@/types/petshop';
import { buscarClientes, buscarAnimais } from '@/app/(petshop)/consultas/nova/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Stethoscope,
  Plus,
  Eye,
  ChevronRight,
  PawPrint,
  User,
  Search,
  X,
  Loader2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  items:            Consulta[];
  profissionais:    Profissional[];
  dataDe:           string;
  dataAte:          string;
  statusAtual:      string;
  profIdAtual:      string;
  animalIdAtual:    string;
  clienteIdAtual:   string;
  numConsultaAtual: string;
  agendaIdAtual:    string;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTO:  'bg-blue-100 text-blue-700 border-blue-200',
  FECHADO: 'bg-green-100 text-green-700 border-green-200',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-muted text-muted-foreground border-border';
  const label = status === 'ABERTO' ? 'Aberto' : status === 'FECHADO' ? 'Fechado' : status;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', color)}>
      {label}
    </span>
  );
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

export default function ConsultasView({
  items,
  profissionais,
  dataDe,
  dataAte,
  statusAtual,
  profIdAtual,
  animalIdAtual,
  clienteIdAtual,
  numConsultaAtual,
  agendaIdAtual,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ── Busca de cliente ──────────────────────────────────────────────
  const [clienteQ, setClienteQ]        = useState('');
  const [clienteRes, setClienteRes]    = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel]    = useState<Cliente | null>(null);
  const [isBuscando, startBusca]       = useTransition();
  const debounceRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animais do cliente ────────────────────────────────────────────
  const [animais, setAnimais]          = useState<Animal[]>([]);
  const [isLoadingAnimais, startAnim]  = useTransition();

  // Derive animal/cliente name from items when filter is active
  const animalAtivaNome  = animalIdAtual  && items.length > 0 ? items[0].animal      : '';
  const clienteAtivaNome = clienteIdAtual && items.length > 0 ? items[0].proprietario : '';

  // ── Num. Consulta local input ─────────────────────────────────────
  const [numConsultaInput, setNumConsultaInput] = useState(numConsultaAtual);

  // ── Modal prontuário ──────────────────────────────────────────────
  const [modalProntuario, setModalProntuario] = useState(false);
  const [gerandoPDF, setGerandoPDF] = useState(false);

  // Carrega animais quando o cliente_id vem da URL (recarregamento da página)
  useEffect(() => {
    if (!clienteIdAtual || animais.length > 0) return;
    startAnim(async () => {
      const lista = await buscarAnimais(Number(clienteIdAtual));
      setAnimais(lista);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteIdAtual]);

  useEffect(() => {
    if (clienteSel) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (clienteQ.length === 0) { setClienteRes([]); return; }
    if (clienteQ.length < 3) return;
    debounceRef.current = setTimeout(() => {
      startBusca(async () => {
        const lista = await buscarClientes(clienteQ);
        setClienteRes(lista);
      });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [clienteQ, clienteSel]);

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data_de',  dataDe);
    sp.set('data_ate', dataAte);
    if (statusAtual)      sp.set('status',      statusAtual);
    if (profIdAtual)      sp.set('prof_id',      profIdAtual);
    if (animalIdAtual)    sp.set('animal_id',    animalIdAtual);
    if (clienteIdAtual)   sp.set('cliente_id',   clienteIdAtual);
    if (numConsultaAtual) sp.set('num_consulta', numConsultaAtual);
    if (agendaIdAtual)    sp.set('agenda_id',    agendaIdAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/consultas?' + sp.toString()));
  }

  function selecionarCliente(c: Cliente) {
    setClienteSel(c);
    setClienteRes([]);
    setClienteQ('');
    setAnimais([]);
    startAnim(async () => {
      const lista = await buscarAnimais(c.id);
      setAnimais(lista);
    });
    // navigate with cliente_id, clear animal_id
    navigate({ cliente_id: String(c.id), animal_id: undefined });
  }

  function limparCliente() {
    setClienteSel(null);
    setClienteRes([]);
    setAnimais([]);
    navigate({ cliente_id: undefined, animal_id: undefined });
  }

  function selecionarAnimal(a: Animal) {
    navigate({ animal_id: String(a.id) });
  }

  function limparAnimalAtivo() {
    navigate({ animal_id: undefined });
  }

  function limparClienteAtivo() {
    navigate({ cliente_id: undefined, animal_id: undefined });
  }

  function buscarNumConsulta() {
    navigate({ num_consulta: numConsultaInput.trim() || undefined });
  }

  async function gerarProntuario(tipo: 'completo' | 'resumido') {
    setGerandoPDF(true);
    setModalProntuario(false);
    const params = new URLSearchParams({
      animal_id: animalIdAtual,
      data_ini:  dataDe,
      data_fim:  dataAte,
      tipo,
    });
    window.open(`/api/petshop/prontuario-pdf?${params}`, '_blank');
    setGerandoPDF(false);
  }

  const podeProntuario = !!(animalIdAtual && dataDe && dataAte);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b bg-background px-4 sm:px-6 py-4 space-y-3">

        {/* Título + botões */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Consultas
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {items.length} {items.length === 1 ? 'consulta' : 'consultas'}
            </span>
            {podeProntuario && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalProntuario(true)}
                disabled={gerandoPDF}
              >
                {gerandoPDF
                  ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  : <FileText className="h-4 w-4 mr-1.5" />
                }
                Prontuário
              </Button>
            )}
            <Link href="/consultas/nova">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova
              </Button>
            </Link>
          </div>
        </div>

        {/* Linha 1: Período */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground w-16">Período:</span>
          <Input
            type="date"
            value={dataDe}
            className="w-36"
            onChange={(e) => navigate({ data_de: e.target.value })}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={dataAte}
            className="w-36"
            onChange={(e) => navigate({ data_ate: e.target.value })}
          />
        </div>

        {/* Linha 2: Busca cliente */}
        {!clienteIdAtual ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar proprietário..."
                  value={clienteSel ? clienteSel.nome : clienteQ}
                  onChange={(e) => { if (!clienteSel) setClienteQ(e.target.value); }}
                  className="pl-9 pr-9"
                  readOnly={!!clienteSel}
                  autoComplete="off"
                />
                {isBuscando && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
            {clienteQ.length > 0 && clienteQ.length < 3 && (
              <p className="text-xs text-muted-foreground pl-1">Digite ao menos 3 letras...</p>
            )}
            {clienteRes.length > 0 && (
              <div className="rounded-md border divide-y bg-card shadow-sm overflow-hidden max-w-xs">
                {clienteRes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.celular || c.telefone || c.cpf_cnpj || '—'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Proprietário:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
              <User className="h-3.5 w-3.5" />
              {clienteAtivaNome || `Cliente #${clienteIdAtual}`}
              <button type="button" onClick={limparClienteAtivo} className="ml-1 hover:opacity-70">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}

        {/* Linha 3: Animal (após selecionar cliente) */}
        {clienteIdAtual && (
          <>
            {!animalIdAtual ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground w-16">Animal:</span>
                {isLoadingAnimais ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : animais.length > 0 ? (
                  animais.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => selecionarAnimal(a)}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-muted/50 transition-colors"
                    >
                      {a.nome}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum animal.</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-16">Animal:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1">
                  <PawPrint className="h-3.5 w-3.5" />
                  {animalAtivaNome || `Animal #${animalIdAtual}`}
                  <button type="button" onClick={limparAnimalAtivo} className="ml-1 hover:opacity-70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            )}
          </>
        )}

        {/* Linha 4: Filtros complementares */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Num. Consulta */}
          <div className="flex items-center gap-1">
            <Input
              placeholder="Nº Consulta"
              value={numConsultaInput}
              onChange={(e) => setNumConsultaInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') buscarNumConsulta(); }}
              onBlur={buscarNumConsulta}
              className="w-32"
            />
            {numConsultaAtual && (
              <button
                type="button"
                onClick={() => { setNumConsultaInput(''); navigate({ num_consulta: undefined }); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Veterinário */}
          <Select
            value={profIdAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ prof_id: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Veterinário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os veterinários</SelectItem>
              {(profissionais ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={statusAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ status: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="FECHADO">Fechado</SelectItem>
            </SelectContent>
          </Select>

          <span className="sm:hidden text-sm text-muted-foreground ml-auto">
            {items.length} {items.length === 1 ? 'consulta' : 'consultas'}
          </span>
        </div>
      </div>

      {/* ── Resultados ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma consulta encontrada.</p>
          </div>
        ) : (
          <>
            {/* Cards (mobile) */}
            <div className="flex flex-col gap-3 md:hidden">
              {items.map((item) => (
                <Link key={`card-${item.id}-${item.filial}`} href={`/consultas/${item.id}`}>
                  <div className="rounded-xl border bg-card p-4 hover:shadow-md active:scale-[0.99] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm leading-tight truncate flex items-center gap-1">
                            <PawPrint className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {item.animal}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          {item.proprietario}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-mono font-medium text-foreground/70">
                            {fmtData(item.data)}
                          </span>
                          <span className="font-mono text-foreground/50">#{item.id}</span>
                          {item.veterinario && <span>{item.veterinario}</span>}
                        </div>
                        {item.motivo && (
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 italic">
                            {item.motivo}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Tabela (desktop) */}
            <div className="hidden md:block rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Código</TableHead>
                    <TableHead className="w-28">Data</TableHead>
                    <TableHead>Proprietário</TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead className="hidden lg:table-cell">Veterinário</TableHead>
                    <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.id}-${item.filial}`} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{item.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fmtData(item.data)}</TableCell>
                      <TableCell>{item.proprietario}</TableCell>
                      <TableCell className="font-medium">{item.animal}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {item.veterinario || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.motivo || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/consultas/${item.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Prontuário ────────────────────────────────────────── */}
      {modalProntuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalProntuario(false)}
          />
          <div className="relative bg-card rounded-xl shadow-xl border p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Gerar Prontuário Veterinário
              </h2>
              <button type="button" onClick={() => setModalProntuario(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {animalAtivaNome} — {fmtData(dataDe)} a {fmtData(dataAte)}
            </p>

            <div className="space-y-2">
              <Button
                className="w-full justify-start gap-3"
                onClick={() => gerarProntuario('completo')}
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium">Prontuário Completo</p>
                  <p className="text-xs font-normal opacity-80">Com todas as observações e prescrições</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => gerarProntuario('resumido')}
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <p className="font-medium">Prontuário Resumido</p>
                  <p className="text-xs font-normal text-muted-foreground">Apenas dados essenciais da consulta</p>
                </div>
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => setModalProntuario(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
