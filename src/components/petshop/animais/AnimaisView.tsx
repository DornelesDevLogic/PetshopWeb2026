'use client';

import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Animal, AnimalAniversariante, Especie } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { PawPrint, Cake, ChevronRight, Phone, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import MicrochipBadge from '@/components/petshop/animais/MicrochipBadge';

interface Props {
  animais:         Animal[];
  aniversariantes: AnimalAniversariante[];
  especies:        Especie[];
  mes:             number;
  buscaInicial?:   string;   // busca aplicada no servidor (vazio = nada carregado)
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function calcIdade(dataNasc: string): string {
  if (!dataNasc) return '—';
  const nasc = new Date(dataNasc);
  if (isNaN(nasc.getTime())) return '—';
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

function fmtData(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('pt-BR');
}

function diaAniversario(dataNasc: string) {
  if (!dataNasc) return '';
  const d = new Date(dataNasc);
  if (isNaN(d.getTime())) return '';
  return String(d.getUTCDate()).padStart(2, '0');
}

export default function AnimaisView({ animais, aniversariantes, especies, mes, buscaInicial = '' }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'lista' | 'aniversariantes'>('lista');
  const [busca, setBusca] = useState(buscaInicial);
  const [especieId, setEspecieId] = useState('');
  const [isPending, startTransition] = useTransition();
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Raça: campo de busca com filtro ao digitar, derivado dos resultados já
  // carregados (não faz sentido buscar num catálogo à parte — só interessam
  // as raças que realmente aparecem nesta busca). ──
  const [racaSel, setRacaSel] = useState('');
  const [racaBusca, setRacaBusca] = useState('');
  const [racaDropdownAberto, setRacaDropdownAberto] = useState(false);
  const racaWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (racaWrapRef.current && !racaWrapRef.current.contains(e.target as Node)) {
        setRacaDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  function changeMes(m: string | null) {
    if (m) startTransition(() => router.push(`/animais?mes=${m}`));
  }

  // Busca server-side (só carrega ao pesquisar). Debounce de 400ms.
  function onBuscaChange(v: string) {
    setBusca(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      const q = v.trim();
      startTransition(() => router.push(q ? `/animais?busca=${encodeURIComponent(q)}` : '/animais'));
    }, 400);
  }

  const buscaAtiva = buscaInicial.trim().length >= 2;

  // Filtros de espécie e raça continuam client-side (sobre o que o servidor
  // retornou pra busca atual).
  const porEspecie = (animais ?? []).filter((a) => !especieId || String(a.id_especie) === especieId);
  const filtrados = porEspecie.filter((a) => !racaSel || a.raca === racaSel);

  // Raças disponíveis entre os animais já carregados (respeitando a espécie
  // selecionada), pra alimentar o combobox de busca.
  const racasDisponiveis = useMemo(() => {
    const vistas = new Set<string>();
    for (const a of porEspecie) {
      if (a.raca) vistas.add(a.raca);
    }
    return Array.from(vistas).sort((x, y) => x.localeCompare(y, 'pt-BR'));
  }, [porEspecie]);
  const racasFiltradasPorBusca = racaBusca.trim()
    ? racasDisponiveis.filter((r) => r.toUpperCase().includes(racaBusca.trim().toUpperCase()))
    : racasDisponiveis;

  useEffect(() => {
    if (racaSel && !racasDisponiveis.includes(racaSel)) { setRacaSel(''); setRacaBusca(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especieId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            Animais
          </h1>
          <Link href="/animais/novo">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Animal
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 border-b -mb-4">
          {(['lista', 'aniversariantes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px',
                tab === t
                  ? 'border border-b-background bg-background text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'lista' ? 'Todos os Animais' : (
                <span className="flex items-center gap-1.5">
                  <Cake className="h-3.5 w-3.5" />
                  Aniversariantes
                  {aniversariantes.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 leading-none">
                      {aniversariantes.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── Aba: Todos os Animais ── */}
        {tab === 'lista' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                placeholder="Buscar por nome do animal ou dono... (mín. 2 letras)"
                value={busca}
                onChange={(e) => onBuscaChange(e.target.value)}
                className="max-w-sm"
              />
              <Select
                value={especieId || 'todas'}
                onValueChange={(v) => { if (v) setEspecieId(v === 'todas' ? '' : v); }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Espécie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as espécies</SelectItem>
                  {especies.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div ref={racaWrapRef} className="relative w-48">
                <Input
                  value={racaBusca}
                  onChange={(e) => { setRacaBusca(e.target.value); setRacaSel(''); setRacaDropdownAberto(true); }}
                  onFocus={() => setRacaDropdownAberto(true)}
                  placeholder="Todas as raças"
                  className="pr-7"
                />
                {(racaBusca || racaSel) && (
                  <button
                    type="button"
                    onClick={() => { setRacaBusca(''); setRacaSel(''); setRacaDropdownAberto(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {racaDropdownAberto && racasFiltradasPorBusca.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
                    {racasFiltradasPorBusca.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRacaSel(r); setRacaBusca(r); setRacaDropdownAberto(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="ml-auto text-sm text-muted-foreground">
                {filtrados.length} {filtrados.length === 1 ? 'animal' : 'animais'}
              </span>
            </div>

            {/* Tabela */}
            {!buscaAtiva ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border border-dashed bg-card">
                <PawPrint className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Digite ao menos 2 letras para buscar animais.</p>
                {isPending && <p className="text-xs mt-1">Buscando...</p>}
              </div>
            ) : filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
                <PawPrint className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{isPending ? 'Buscando...' : 'Nenhum animal encontrado.'}</p>
              </div>
            ) : (
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Animal</TableHead>
                      <TableHead>Espécie / Raça</TableHead>
                      <TableHead className="hidden md:table-cell">Dono</TableHead>
                      <TableHead className="hidden lg:table-cell w-24">Sexo</TableHead>
                      <TableHead className="hidden lg:table-cell w-28">Nascimento</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/animais/${a.id}`)}
                      >
                        <TableCell>
                          <p className="font-medium flex items-center gap-1.5">
                            {a.nome}
                            <MicrochipBadge value={a.apelido} className="text-[11px]" />
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{a.especie}</p>
                          {a.raca && (
                            <p className="text-xs text-muted-foreground">{a.raca}</p>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Link
                            href={`/clientes/${a.id_cliente}`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.nome_cliente}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : '—'}
                          {a.castrado === 1 && (
                            <span className="ml-1 text-xs">(cast.)</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-mono">
                          {fmtData(a.data_nascimento)}
                          {a.data_nascimento && (
                            <p className="text-xs">{calcIdade(a.data_nascimento)}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* ── Aba: Aniversariantes ── */}
        {tab === 'aniversariantes' && (
          <div className="space-y-4">
            {/* Seletor de mês */}
            <div className="flex items-center gap-3">
              <Select value={String(mes)} onValueChange={changeMes}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {aniversariantes.length} {aniversariantes.length === 1 ? 'aniversariante' : 'aniversariantes'} em {MESES[mes - 1]}
              </span>
            </div>

            {aniversariantes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
                <Cake className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhum aniversariante em {MESES[mes - 1]}.</p>
              </div>
            ) : (
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Dia</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Espécie / Raça</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead className="hidden md:table-cell">Contato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aniversariantes.map((a) => (
                      <TableRow key={a.id} className="hover:bg-muted/40">
                        <TableCell>
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-pink-100 text-pink-700 text-sm font-bold">
                            {diaAniversario(a.data_nascimento)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="flex items-center gap-1.5">
                            <Link href={`/animais/${a.id}`} className="font-medium hover:text-primary">
                              {a.nome}
                            </Link>
                            <MicrochipBadge value={a.apelido} className="text-[11px]" />
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{a.especie}</p>
                          {a.raca && <p className="text-xs text-muted-foreground">{a.raca}</p>}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clientes/${a.id_cliente}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {a.nome_cliente}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <div className="flex flex-col gap-0.5">
                            {(a.celular_cliente || a.fone_cliente) && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {a.celular_cliente || a.fone_cliente}
                              </span>
                            )}
                            {a.email_cliente && (
                              <span className="text-xs">{a.email_cliente}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
