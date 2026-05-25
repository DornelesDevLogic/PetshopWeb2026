'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Especie, Raca, TipoPelo, Cliente } from '@/types/petshop';
import { buscarClientes, createAnimal } from '@/app/(petshop)/animais/novo/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Search, Loader2, AlertCircle, PawPrint, User, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  especies: Especie[];
  racas:    Raca[];
  pelos:    TipoPelo[];
}

export default function NovoAnimalForm({ especies, racas, pelos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState('');

  // ── Passo 1: busca de cliente ─────────────────────────────────────────────
  const [buscaCliente, setBuscaCliente]   = useState('');
  const [resultados, setResultados]       = useState<Cliente[]>([]);
  const [buscando, setBuscando]           = useState(false);
  const [clienteSel, setClienteSel]       = useState<Cliente | null>(null);

  async function handleBuscarCliente() {
    if (!buscaCliente.trim()) return;
    setBuscando(true);
    const res = await buscarClientes(buscaCliente);
    setResultados(res);
    setBuscando(false);
  }

  // ── Passo 2: campos do animal ─────────────────────────────────────────────
  const [sexo,       setSexo]       = useState('');
  const [castrado,   setCastrado]   = useState('0');
  const [especieId,  setEspecieId]  = useState('');
  const [racaId,     setRacaId]     = useState('');
  const [peloId,     setPeloId]     = useState('');

  const especieSel   = especies.find((e) => String(e.id) === especieId);
  const racasFilt    = especieId ? (racas  ?? []).filter((r) => String(r.id_especie) === especieId) : (racas  ?? []);
  const pelosFilt    = especieId ? (pelos  ?? []).filter((p) => String(p.id_especie) === especieId) : (pelos  ?? []);
  const racaSel      = racas.find((r) => String(r.id) === racaId);
  const peloSel      = pelos.find((p) => String(p.id) === peloId);

  function handleChangeEspecie(v: string) {
    setEspecieId(v);
    setRacaId('');
    setPeloId('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clienteSel) { setFormError('Selecione um cliente.'); return; }
    setFormError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createAnimal({}, fd);
      if (r.error) { setFormError(r.error); return; }
      router.push(r.id ? `/animais/${r.id}` : '/animais');
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-primary" />
          Novo Animal
        </h1>
      </div>

      {/* ── Passo 1: Cliente ── */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <User className="h-4 w-4" />
          Proprietário
        </h2>

        {clienteSel ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex-1">
              <p className="font-semibold">{clienteSel.nome}</p>
              <p className="text-xs text-muted-foreground">
                {[clienteSel.cpf_cnpj, clienteSel.celular || clienteSel.telefone].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => { setClienteSel(null); setResultados([]); setBuscaCliente(''); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscarCliente(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleBuscarCliente} disabled={buscando}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {resultados.length > 0 && (
              <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors"
                    onClick={() => { setClienteSel(c); setResultados([]); }}
                  >
                    <p className="text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.cpf_cnpj, c.celular || c.telefone].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {resultados.length === 0 && buscaCliente && !buscando && (
              <p className="text-xs text-muted-foreground">Nenhum cliente encontrado. Tente outro termo.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Passo 2: Dados do animal ── */}
      <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <PawPrint className="h-4 w-4" />
          Dados do Animal
        </h2>

        {/* Hidden fields */}
        <input type="hidden" name="cliente_id"     value={clienteSel?.id         ?? ''} />
        <input type="hidden" name="filial_cliente"  value={clienteSel?.filial      ?? ''} />
        <input type="hidden" name="id_especie"      value={especieId} />
        <input type="hidden" name="especie_nome"    value={especieSel?.descricao   ?? ''} />
        <input type="hidden" name="id_raca"         value={racaId} />
        <input type="hidden" name="raca_nome"       value={racaSel?.descricao      ?? ''} />
        <input type="hidden" name="id_pelo"         value={peloId} />
        <input type="hidden" name="pelo_nome"       value={peloSel?.descricao      ?? ''} />
        <input type="hidden" name="sexo"            value={sexo} />
        <input type="hidden" name="castrado"        value={castrado} />

        <div className="grid grid-cols-2 gap-4">
          {/* Nome */}
          <div className="space-y-1 col-span-2">
            <Label>Nome *</Label>
            <Input name="nome" required placeholder="Ex: Rex" />
          </div>

          {/* Apelido */}
          <div className="space-y-1">
            <Label>Apelido</Label>
            <Input name="apelido" placeholder="Ex: Reizinho" />
          </div>

          {/* Data nascimento */}
          <div className="space-y-1">
            <Label>Data de Nascimento</Label>
            <Input name="data_nascimento" type="date" />
          </div>

          {/* Sexo */}
          <div className="space-y-1">
            <Label>Sexo</Label>
            <Select value={sexo} onValueChange={(v) => { if (v) setSexo(v); }}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Macho</SelectItem>
                <SelectItem value="F">Fêmea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Castrado */}
          <div className="space-y-1">
            <Label>Castrado</Label>
            <Select value={castrado} onValueChange={(v) => { if (v) setCastrado(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Não</SelectItem>
                <SelectItem value="1">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Espécie */}
          <div className="space-y-1 col-span-2">
            <Label>Espécie</Label>
            <Select value={especieId} onValueChange={(v) => { if (v) handleChangeEspecie(v); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a espécie..." /></SelectTrigger>
              <SelectContent>
                {(especies ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Raça */}
          <div className="space-y-1">
            <Label>Raça</Label>
            <Select
              value={racaId}
              onValueChange={(v) => { if (v) setRacaId(v); }}
              disabled={!especieId}
            >
              <SelectTrigger>
                <SelectValue placeholder={especieId ? 'Selecione...' : 'Selecione a espécie primeiro'} />
              </SelectTrigger>
              <SelectContent>
                {racasFilt.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pelo */}
          <div className="space-y-1">
            <Label>Tipo de Pelo</Label>
            <Select
              value={peloId}
              onValueChange={(v) => { if (v) setPeloId(v); }}
              disabled={!especieId}
            >
              <SelectTrigger>
                <SelectValue placeholder={especieId ? 'Selecione...' : 'Selecione a espécie primeiro'} />
              </SelectTrigger>
              <SelectContent>
                {pelosFilt.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Peso */}
          <div className="space-y-1">
            <Label>Peso (kg)</Label>
            <Input name="peso" placeholder="Ex: 12.5" />
          </div>

          {/* Cor */}
          <div className="space-y-1">
            <Label>Cor / Pelagem</Label>
            <Input name="cor" placeholder="Ex: Caramelo" />
          </div>

          {/* Obs */}
          <div className="space-y-1 col-span-2">
            <Label>Observações</Label>
            <Input name="obs" placeholder="Alergias, comportamento, etc." />
          </div>
        </div>

        {/* Erro */}
        {formError && (
          <div className={cn('flex items-center gap-2 text-sm text-red-600')}>
            <AlertCircle className="h-4 w-4 shrink-0" />{formError}
          </div>
        )}

        {/* Cliente não selecionado */}
        {!clienteSel && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Selecione o proprietário antes de salvar.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || !clienteSel}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar Animal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
