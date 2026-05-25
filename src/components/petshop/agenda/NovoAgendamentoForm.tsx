'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarClientes,
  buscarAnimais,
  createAgenda,
} from '@/app/(petshop)/agenda/nova/actions';
import { Cliente, Animal, Profissional, Servico } from '@/types/petshop';
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
  ArrowLeft,
  Search,
  Loader2,
  AlertCircle,
  User,
  PawPrint,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  profissionais: Profissional[];
  servicos:      Servico[];
}

export default function NovoAgendamentoForm({ profissionais, servicos }: Props) {
  const router = useRouter();

  // ── Busca de cliente ──
  const [clienteQ, setClienteQ]             = useState('');
  const [clienteResultados, setClienteRes]  = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel]         = useState<Cliente | null>(null);
  const [isBuscando, startBusca]            = useTransition();

  // ── Animais ──
  const [animais, setAnimais]               = useState<Animal[]>([]);
  const [animalSel, setAnimalSel]           = useState<Animal | null>(null);
  const [isLoadingAnimais, startAnimais]    = useTransition();

  // ── Seleções controladas ──
  const [profId, setProfId]                 = useState('');
  const [profNome, setProfNome]             = useState('');
  const [profFilial, setProfFilial]         = useState('');
  const [servicoId, setServicoId]           = useState('');
  const [servicoNome, setServicoNome]       = useState('');
  const [servicoFilial, setServicoFilial]   = useState('');

  // ── Submit ──
  const [isPending, startSubmit]            = useTransition();
  const [errorMsg, setErrorMsg]             = useState('');
  const formRef                             = useRef<HTMLFormElement>(null);

  // ── Hoje como data padrão ──
  const hoje = new Date().toISOString().split('T')[0];

  function handleBuscarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteQ.trim()) return;
    startBusca(async () => {
      const lista = await buscarClientes(clienteQ);
      setClienteRes(lista);
    });
  }

  function selecionarCliente(c: Cliente) {
    setClienteSel(c);
    setClienteRes([]);
    setClienteQ('');
    setAnimalSel(null);
    setAnimais([]);
    startAnimais(async () => {
      const lista = await buscarAnimais(c.id);
      setAnimais(lista);
    });
  }

  function limparCliente() {
    setClienteSel(null);
    setClienteRes([]);
    setAnimais([]);
    setAnimalSel(null);
  }

  function handleProfChange(val: string) {
    const p = profissionais.find((p) => String(p.id) === val);
    setProfId(val);
    setProfNome(p?.nome ?? '');
    setProfFilial(String(p?.filial ?? ''));
  }

  function handleServicoChange(val: string) {
    const s = servicos.find((s) => String(s.id) === val);
    setServicoId(val);
    setServicoNome(s?.descricao ?? '');
    setServicoFilial(String(s?.filial ?? ''));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    // Injetar campos controlados
    formData.set('cliente_id',      String(clienteSel?.id      ?? ''));
    formData.set('cliente_filial',  String(clienteSel?.filial  ?? ''));
    formData.set('cliente_nome',    clienteSel?.nome            ?? '');
    formData.set('animal_id',       String(animalSel?.id       ?? ''));
    formData.set('animal_filial',   String(animalSel?.filial   ?? ''));
    formData.set('animal_nome',     animalSel?.nome             ?? '');
    formData.set('raca',            animalSel?.raca             ?? '');
    formData.set('prof_id',         profId);
    formData.set('prof_filial',     profFilial);
    formData.set('prof_nome',       profNome);
    formData.set('servico_id',      servicoId);
    formData.set('servico_filial',  servicoFilial);
    formData.set('servico_nome',    servicoNome);

    startSubmit(async () => {
      const result = await createAgenda({}, formData);
      if (result.error) { setErrorMsg(result.error); return; }
      router.push(`/agenda/${result.id}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/agenda">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Agenda
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Novo Agendamento</h1>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* ── Cliente ── */}
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente *
          </h2>

          {clienteSel ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="font-medium">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || '—'}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={limparCliente}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome, CPF ou telefone do cliente..."
                  value={clienteQ}
                  onChange={(e) => setClienteQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscarCliente(e as unknown as React.FormEvent); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleBuscarCliente} disabled={isBuscando}>
                  {isBuscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {clienteResultados.length > 0 && (
                <div className="rounded-md border divide-y bg-white shadow-sm overflow-hidden">
                  {clienteResultados.map((c) => (
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
            </>
          )}
        </div>

        {/* ── Animal ── */}
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <PawPrint className="h-3.5 w-3.5" />
            Animal
          </h2>

          {!clienteSel ? (
            <p className="text-sm text-muted-foreground">Selecione um cliente primeiro.</p>
          ) : isLoadingAnimais ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Carregando animais...
            </div>
          ) : animais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum animal cadastrado para este cliente.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {animais.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAnimalSel(animalSel?.id === a.id ? null : a)}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2.5 transition-colors',
                    animalSel?.id === a.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/40',
                  )}
                >
                  <p className="font-medium text-sm">{a.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[a.especie, a.raca, a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : '']
                      .filter(Boolean).join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Data / Hora / Profissional / Serviço ── */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Detalhes do Agendamento
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" name="data" type="date" defaultValue={hoje} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" name="hora" type="time" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={profId} onValueChange={(v) => { if (v) handleProfChange(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(profissionais ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select value={servicoId} onValueChange={(v) => { if (v) handleServicoChange(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(servicos ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input id="valor" name="valor" placeholder="0,00" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desconto">Desconto (R$)</Label>
              <Input id="desconto" name="desconto" placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              name="obs"
              rows={2}
              placeholder="Informações adicionais..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/agenda">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isPending || !clienteSel}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            ) : 'Criar Agendamento'}
          </Button>
        </div>

      </form>
    </div>
  );
}
