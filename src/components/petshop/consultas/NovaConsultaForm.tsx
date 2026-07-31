'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarClientes,
  buscarAnimais,
  createConsulta,
  buscarItensAgenda,
  type ItemAgendaConsulta,
} from '@/app/(petshop)/consultas/nova/actions';
import {
  buscarProdutos,
  adicionarItemNaAgenda,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/nova/actions';
import { excluirItemAgenda } from '@/app/(petshop)/agenda/[id]/actions';
import { Cliente, Animal, Profissional } from '@/types/petshop';
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
  Loader2,
  AlertCircle,
  User,
  PawPrint,
  X,
  Search,
  CalendarClock,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Dados pré-preenchidos quando a consulta é iniciada a partir de um agendamento */
export interface AgendaOrigem {
  agendaId:      number;
  filial:        number;
  clienteId:     number;
  clienteFilial: number;
  clienteNome:   string;
  animalId:      number;
  animalFilial:  number;
  animalNome:    string;
  vetId:         number;
  vetFilial:     number;
  vetNome:       string;
  data:          string; // YYYY-MM-DD
  motivo:        string;
}

interface Props {
  profissionais: Profissional[];
  agendaOrigem?: AgendaOrigem;
}

function clienteMinimo(id: number, filial: number, nome: string): Cliente {
  return {
    id, filial, nome, nome_fantasia: '', cpf_cnpj: '', telefone: '', telefone2: '',
    celular: '', email: '', contato: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', uf: '', cep: '', data_cadastro: '', data_nascimento: '',
    situacao: '', pessoa: 'F', comentario: '', ie: '', atacadista: 0, mei: 0,
    status_ativo: 0, saldo_disponivel: 0, data_ult_compra: '',
  };
}

function animalMinimo(id: number, filial: number, nome: string, clienteId: number): Animal {
  return {
    id, filial, nome, apelido: '', especie: '', raca: '', pelo: '', sexo: '',
    castrado: 0, data_nascimento: '', peso: '', cor: '', tipo_animal: '',
    id_especie: 0, id_raca: 0, id_pelo: 0, id_cliente: clienteId, filial_cliente: filial,
    nome_cliente: '', ativo: 0, obito: 0, obs: '', id_veterinario: 0, veterinario: '',
  };
}

export default function NovaConsultaForm({ profissionais, agendaOrigem }: Props) {
  const router = useRouter();

  // ── Cliente ──
  const [clienteQ, setClienteQ]            = useState('');
  const [clienteRes, setClienteRes]        = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel]        = useState<Cliente | null>(
    agendaOrigem ? clienteMinimo(agendaOrigem.clienteId, agendaOrigem.clienteFilial, agendaOrigem.clienteNome) : null,
  );
  const [isBuscando, startBusca]           = useTransition();
  const debounceRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animais ──
  const [animais, setAnimais]              = useState<Animal[]>([]);
  const [animalSel, setAnimalSel]          = useState<Animal | null>(
    agendaOrigem
      ? animalMinimo(agendaOrigem.animalId, agendaOrigem.animalFilial, agendaOrigem.animalNome, agendaOrigem.clienteId)
      : null,
  );
  const [isLoadingAnimais, startAnimais]   = useTransition();

  // ── Veterinário ──
  const [vetId, setVetId]                  = useState(agendaOrigem?.vetId ? String(agendaOrigem.vetId) : '');
  const [vetNome, setVetNome]              = useState(agendaOrigem?.vetNome ?? '');
  const [vetFilial, setVetFilial]          = useState(agendaOrigem?.vetFilial ? String(agendaOrigem.vetFilial) : '');

  // ── Produtos/medicamentos lançados na agenda de origem ──
  const [itensAgenda, setItensAgenda]      = useState<ItemAgendaConsulta[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(!!agendaOrigem);
  const [buscaPro, setBuscaPro]            = useState('');
  const [proOpts, setProOpts]              = useState<ProdutoResultado[]>([]);
  const [proSel, setProSel]                = useState<ProdutoResultado | null>(null);
  const [proQtd, setProQtd]                = useState('1');
  const [salvandoItem, setSalvandoItem]    = useState(false);
  const [erroItem, setErroItem]            = useState('');

  useEffect(() => {
    if (!agendaOrigem) return;
    buscarItensAgenda(agendaOrigem.agendaId, agendaOrigem.filial)
      .then(setItensAgenda)
      .finally(() => setCarregandoItens(false));
  }, [agendaOrigem]);

  useEffect(() => {
    const termo = buscaPro.trim();
    if (termo.length < 3) { setProOpts([]); return; }
    const t = setTimeout(async () => {
      const r = await buscarProdutos(termo, agendaOrigem?.filial);
      setProOpts(r);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaPro, agendaOrigem]);

  async function handleAddItem() {
    if (!proSel || !agendaOrigem) return;
    const qtd = parseFloat(proQtd) || 1;
    setSalvandoItem(true);
    setErroItem('');
    const r = await adicionarItemNaAgenda(
      agendaOrigem.agendaId, agendaOrigem.filial,
      proSel.id_dadospro, proSel.cod_filial,
      qtd, proSel.preco, 0, proSel.nome_produto,
      proSel.nome_produto, proSel.preco, proSel.cod_pro,
    );
    setSalvandoItem(false);
    if (r.error) { setErroItem(r.error); return; }
    setItensAgenda((prev) => [...prev, {
      id_item: 0, cod_pro: proSel.cod_pro, produto: proSel.nome_produto,
      descricao: proSel.nome_produto, unidade: proSel.unidade,
      qtd: String(qtd), valor: String(proSel.preco),
    }]);
    setBuscaPro(''); setProOpts([]); setProSel(null); setProQtd('1');
  }

  async function handleRemoverItem(item: ItemAgendaConsulta) {
    if (!agendaOrigem || !item.id_item) return;
    if (!confirm(`Remover "${item.descricao || item.produto}"?`)) return;
    const r = await excluirItemAgenda(agendaOrigem.agendaId, item.id_item, agendaOrigem.filial);
    if (r.error) { setErroItem(r.error); return; }
    setItensAgenda((prev) => prev.filter((i) => i.id_item !== item.id_item));
  }

  // ── Submit ──
  const [isPending, startSubmit]           = useTransition();
  const [errorMsg, setErrorMsg]            = useState('');
  const formRef                            = useRef<HTMLFormElement>(null);
  const hoje = new Date().toISOString().split('T')[0];

  // ── Validação com sinalização visual (em vez de desabilitar o botão) ──
  const clienteRef                    = useRef<HTMLDivElement>(null);
  const animalRef                     = useRef<HTMLDivElement>(null);
  const vetRef                        = useRef<HTMLDivElement>(null);
  const [clientePiscando, setClientePiscando] = useState(false);
  const [animalPiscando,  setAnimalPiscando]  = useState(false);
  const [vetPiscando,     setVetPiscando]     = useState(false);

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
    if (agendaOrigem) return; // não desvincula o proprietário quando veio de uma agenda
    setClienteSel(null);
    setClienteRes([]);
    setAnimais([]);
    setAnimalSel(null);
  }

  function handleVetChange(val: string) {
    const p = profissionais.find((p) => String(p.id) === val);
    setVetId(val);
    setVetNome(p?.nome ?? '');
    setVetFilial(String(p?.filial ?? ''));
  }

  function piscar(setPiscando: (v: boolean) => void, ref: React.RefObject<HTMLDivElement>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPiscando(true);
    setTimeout(() => setPiscando(false), 1600);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    // Validação sinalizada: em vez de manter o botão desabilitado, avisa
    // visualmente qual campo falta preencher.
    if (!clienteSel) { piscar(setClientePiscando, clienteRef); setErrorMsg('Selecione o proprietário.'); return; }
    if (!animalSel)  { piscar(setAnimalPiscando,  animalRef);  setErrorMsg('Selecione o animal.'); return; }
    if (!vetId)       { piscar(setVetPiscando,     vetRef);     setErrorMsg('Selecione o veterinário.'); return; }

    const formData = new FormData(e.currentTarget);
    formData.set('cliente_id',     String(clienteSel?.id     ?? ''));
    formData.set('cliente_filial', String(clienteSel?.filial ?? ''));
    formData.set('cliente_nome',   clienteSel?.nome           ?? '');
    formData.set('animal_id',      String(animalSel?.id      ?? ''));
    formData.set('animal_filial',  String(animalSel?.filial  ?? ''));
    formData.set('animal_nome',    animalSel?.nome            ?? '');
    formData.set('vet_id',         vetId);
    formData.set('vet_filial',     vetFilial);
    formData.set('vet_nome',       vetNome);
    if (agendaOrigem) {
      formData.set('agenda_id',     String(agendaOrigem.agendaId));
      formData.set('agenda_filial', String(agendaOrigem.filial));
    }

    startSubmit(async () => {
      const result = await createConsulta({}, formData);
      if (result.error) { setErrorMsg(result.error); return; }
      router.push(`/consultas/${result.id}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/consultas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Consultas
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Nova Consulta</h1>
      </div>

      {agendaOrigem && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">
          <CalendarClock className="h-4 w-4 shrink-0" />
          Consulta iniciada a partir do agendamento #{agendaOrigem.agendaId} — os dados abaixo já vieram preenchidos.
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Cliente */}
        <div
          ref={clienteRef}
          className={cn(
            'rounded-xl border bg-card p-5 space-y-3 transition-shadow',
            clientePiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
          )}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Proprietário *
          </h2>

          {clienteSel ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="font-medium">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || '—'}
                </p>
              </div>
              {!agendaOrigem && (
                <Button type="button" variant="ghost" size="icon" onClick={limparCliente}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nome, CPF ou telefone..."
                  value={clienteQ}
                  onChange={(e) => setClienteQ(e.target.value)}
                  className="pl-9 pr-9"
                  autoComplete="off"
                />
                {isBuscando && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {clienteQ.length > 0 && clienteQ.length < 3 && (
                <p className="text-xs text-muted-foreground">Digite ao menos 3 letras para pesquisar...</p>
              )}
              {clienteRes.length > 0 && (
                <div className="rounded-md border divide-y bg-card shadow-sm overflow-hidden">
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
            </>
          )}
        </div>

        {/* Animal */}
        <div
          ref={animalRef}
          className={cn(
            'rounded-xl border bg-card p-5 space-y-3 transition-shadow',
            animalPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
          )}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <PawPrint className="h-3.5 w-3.5" />
            Animal *
          </h2>

          {agendaOrigem && animalSel ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="font-medium text-sm">{animalSel.nome}</p>
            </div>
          ) : !clienteSel ? (
            <p className="text-sm text-muted-foreground">Selecione um proprietário primeiro.</p>
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

        {/* Detalhes */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dados da Consulta
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" name="data" type="date" defaultValue={agendaOrigem?.data || hoje} required />
            </div>
            <div
              ref={vetRef}
              className={cn(
                'space-y-1.5 rounded-md transition-shadow',
                vetPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
              )}
            >
              <Label>Veterinário *</Label>
              <Select
                value={vetId}
                onValueChange={(v) => { if (v) handleVetChange(v); }}
                items={(profissionais ?? []).map((p) => ({ value: String(p.id), label: p.nome }))}
              >
                <SelectTrigger className={!vetId ? 'border-destructive/50' : ''}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(profissionais ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input id="peso" name="peso" placeholder="0,000" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperatura">Temperatura (°C)</Label>
              <Input id="temperatura" name="temperatura" placeholder="38,5" inputMode="decimal" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo / Queixa principal</Label>
            <textarea
              id="motivo"
              name="motivo"
              rows={3}
              defaultValue={agendaOrigem?.motivo ?? ''}
              placeholder="Descreva o motivo da consulta..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Produtos / Medicamentos — só quando a consulta está vinculada a uma agenda,
            pois é nela (ORCA/PRODORCA) que os itens ficam gravados para o Frente de Caixa. */}
        {agendaOrigem && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Produtos / Medicamentos
            </h2>
            <p className="text-xs text-muted-foreground -mt-2">
              Lançados aqui já ficam vinculados à agenda #{agendaOrigem.agendaId} para faturar no Frente de Caixa.
            </p>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar produto ou medicamento..."
                value={buscaPro}
                onChange={(e) => { setBuscaPro(e.target.value); setProSel(null); }}
                className="pl-9"
                autoComplete="off"
              />
              {proOpts.length > 0 && !proSel && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
                  {proOpts.map((p) => (
                    <button
                      key={p.id_dadospro}
                      type="button"
                      onClick={() => { setProSel(p); setBuscaPro(p.nome_produto); setProOpts([]); }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent border-b last:border-b-0"
                    >
                      <p className="font-medium leading-tight">{p.nome_produto}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.cod_pro} · R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Est: {p.estoque}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {proSel && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{proSel.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">R$ {proSel.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <Input
                  type="number" min="0.01" step="0.01" value={proQtd}
                  onChange={(e) => setProQtd(e.target.value)}
                  className="w-20"
                />
                <Button type="button" size="sm" onClick={handleAddItem} disabled={salvandoItem}>
                  {salvandoItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => { setProSel(null); setBuscaPro(''); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {erroItem && <p className="text-xs text-destructive">{erroItem}</p>}

            {carregandoItens ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Carregando itens já lançados...</p>
            ) : itensAgenda.length > 0 && (
              <div className="rounded-md border divide-y">
                {itensAgenda.map((it, i) => (
                  <div key={it.id_item || i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{it.descricao || it.produto}</p>
                      <p className="text-xs text-muted-foreground">{it.qtd} {it.unidade} · R$ {parseFloat(it.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    {!!it.id_item && (
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-600" onClick={() => handleRemoverItem(it)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/consultas">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo consulta...</>
              : 'Abrir Consulta'}
          </Button>
        </div>

      </form>
    </div>
  );
}
