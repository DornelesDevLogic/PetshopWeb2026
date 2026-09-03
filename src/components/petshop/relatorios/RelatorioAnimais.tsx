'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { RelatorioAnimaisResponse, Raca, Cliente } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/agenda/nova/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, PawPrint, AlertCircle, X } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';

interface Filtros {
  clienteId:   string;
  clienteNome: string;
  animalNome:  string;
  racaId:      string;
}

interface Props {
  dados:   RelatorioAnimaisResponse;
  racas:   Raca[];
  filtros: Filtros;
}

export default function RelatorioAnimais({ dados, racas, filtros }: Props) {
  const router = useRouter();
  const [animalNome, setAnimalNome] = useState(filtros.animalNome);
  const [racaId, setRacaId]         = useState(filtros.racaId || 'todas');
  const [, startTransition]         = useTransition();

  // ── Cliente/proprietário: busca com lupa (mesmo padrão dos outros relatórios) ──
  const [clienteQ, setClienteQ]     = useState(filtros.clienteNome);
  const [clienteId, setClienteId]   = useState(filtros.clienteId);
  const [clienteOpts, setClienteOpts] = useState<Cliente[]>([]);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (clienteId) return;
    if (debRef.current) clearTimeout(debRef.current);
    if (clienteQ.trim().length < 3) { setClienteOpts([]); return; }
    debRef.current = setTimeout(async () => {
      setClienteOpts(await buscarClientes(clienteQ.trim()));
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [clienteQ, clienteId]);

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    if (clienteId)          sp.set('cliente_id', clienteId);
    if (clienteQ)           sp.set('cliente_nome', clienteQ);
    if (animalNome)         sp.set('animal_nome', animalNome);
    if (racaId !== 'todas') sp.set('raca_id', racaId);
    startTransition(() => router.push(`/relatorios/animais?${sp.toString()}`));
  }

  function limpar() {
    setAnimalNome('');
    setRacaId('todas');
    setClienteQ('');
    setClienteId('');
    setClienteOpts([]);
    startTransition(() => router.push('/relatorios/animais'));
  }

  function exportar() {
    exportarCsv(
      'relatorio_animais',
      [
        { titulo: 'Animal',      valor: (r) => r.animal },
        { titulo: 'Raça',        valor: (r) => r.raca },
        { titulo: 'Cliente',     valor: (r) => r.cliente },
        { titulo: 'Cód. Cliente', valor: (r) => r.cliente_id },
        { titulo: 'Endereço',    valor: (r) => r.endereco },
        { titulo: 'Bairro',      valor: (r) => r.bairro },
        { titulo: 'Telefone',    valor: (r) => r.telefone },
        { titulo: 'Celular',     valor: (r) => r.celular },
        { titulo: 'E-mail',      valor: (r) => r.email },
      ],
      dados.dados ?? [],
    );
  }

  const filtroAtivo = !!(clienteId || animalNome || (racaId !== 'todas'));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-primary" />
          Relatório de Animais
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <PawPrint className="h-5 w-5" /> Relatório de Animais
        </h1>
        {filtroAtivo && (
          <p className="text-xs">
            {clienteQ && `Proprietário: ${clienteQ} · `}
            {animalNome && `Animal: ${animalNome} · `}
            {racaId !== 'todas' && `Raça: ${racas.find((r) => String(r.id) === racaId)?.descricao ?? racaId}`}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="relative w-56">
          <Input
            value={clienteQ}
            onChange={(e) => { setClienteQ(e.target.value); setClienteId(''); }}
            placeholder="Proprietário..."
            className="h-9 text-sm pr-7"
          />
          {(clienteQ || clienteId) && (
            <button onClick={() => { setClienteQ(''); setClienteId(''); setClienteOpts([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {clienteOpts.length > 0 && !clienteId && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {clienteOpts.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => { setClienteId(String(c.id)); setClienteQ(c.nome); setClienteOpts([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0">
                  {c.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          value={animalNome}
          onChange={(e) => setAnimalNome(e.target.value)}
          placeholder="Nome do animal..."
          className="h-9 text-sm w-52"
        />

        <Select value={racaId} onValueChange={(v) => setRacaId(v ?? 'todas')}
          items={[{ value: 'todas', label: 'Todas as raças' }, ...racas.map((r) => ({ value: String(r.id), label: r.descricao }))]}>
          <SelectTrigger className="h-9 text-sm w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as raças</SelectItem>
            {racas.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.descricao}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={gerar} size="sm">Gerar</Button>
        {filtroAtivo && (
          <Button onClick={limpar} size="sm" variant="ghost">Limpar</Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {dados.Count > 0 && (
            <span className="text-sm text-muted-foreground">{dados.Count} animais</span>
          )}
          <AcoesRelatorio onExportar={exportar} />
        </div>
      </div>

      {dados.CodStatus !== 1 ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {dados.DescricaoStatus || 'Erro ao carregar o relatório.'}
        </div>
      ) : dados.Count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <PawPrint className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">
            {filtroAtivo ? 'Nenhum animal encontrado com esses filtros.' : 'Use os filtros acima e clique em Gerar.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Raça</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>E-mail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.dados.map((item, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="text-sm font-medium">{item.animal}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.raca || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {item.cliente || '—'}
                    <span className="ml-2 text-xs text-muted-foreground">#{item.cliente_id}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.endereco || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.bairro || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.telefone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.celular || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.email || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
