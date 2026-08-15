'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarClientes,
  buscarAnimaisPorNome,
  buscarAnimais,
  type AnimalBuscaItem,
  createConsulta,
  buscarItensAgenda,
  type ItemAgendaConsulta,
} from '@/app/(petshop)/consultas/nova/actions';
import {
  buscarProdutos,
  adicionarItemNaAgenda,
  carregarListasFormAgenda,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/nova/actions';
import { excluirItemAgenda, atualizarItemAgenda } from '@/app/(petshop)/agenda/[id]/actions';
import EditableValor from '@/components/petshop/EditableValor';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import { updateCliente, buscarCep, buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { updateAnimal } from '@/app/(petshop)/animais/[id]/actions';
import MicrochipBadge from '@/components/petshop/animais/MicrochipBadge';
import NovoClienteDialog from '@/components/petshop/clientes/NovoClienteDialog';
import NovoAnimalDialog from '@/components/petshop/animais/NovoAnimalDialog';
import PesoHistorico from '@/components/petshop/animais/PesoHistorico';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cliente, Animal, Profissional, Especie, Raca, TipoPelo } from '@/types/petshop';
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
  Bell,
  Pencil,
  Check,
  Scale,
  TrendingUp,
  TrendingDown,
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

  // ── Cliente ── (busca única, igual à Agenda: mistura cliente + pet, e
  // "dono/pet" ou "pet/dono" busca combinada — resultado do pet vem em
  // destaque âmbar, igual à Agenda)
  const [clienteQ, setClienteQ]            = useState('');
  type ResultadoBusca = { tipo: 'cliente'; cliente: Cliente } | { tipo: 'pet'; animal: AnimalBuscaItem };
  const [resultados, setResultados]        = useState<ResultadoBusca[]>([]);
  const [clienteSel, setClienteSel]        = useState<Cliente | null>(
    agendaOrigem ? clienteMinimo(agendaOrigem.clienteId, agendaOrigem.clienteFilial, agendaOrigem.clienteNome) : null,
  );
  const [isBuscando, startBusca]           = useTransition();
  const debounceRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Novo cliente / novo pet (mesmo padrão da Agenda) ──
  const [novoCliOpen,   setNovoCliOpen]    = useState(false);
  const [novoAnimalOpen, setNovoAnimalOpen] = useState(false);
  const [especies, setEspecies]            = useState<Especie[]>([]);
  const [racas,    setRacas]               = useState<Raca[]>([]);
  const [pelos,    setPelos]               = useState<TipoPelo[]>([]);

  useEffect(() => {
    carregarListasFormAgenda(agendaOrigem?.filial).then((d) => {
      setEspecies(d.especies);
      setRacas(d.racas);
      setPelos(d.pelos);
    });
  }, [agendaOrigem]);

  // ── Peso: indicador subiu/desceu (igual Agenda) + histórico ──
  const [pesoInput, setPesoInput] = useState('');
  const [pesoHistOpen, setPesoHistOpen] = useState(false);

  // ── Animais ──
  const [animais, setAnimais]              = useState<Animal[]>([]);
  const [animalSel, setAnimalSel]          = useState<Animal | null>(
    agendaOrigem
      ? animalMinimo(agendaOrigem.animalId, agendaOrigem.animalFilial, agendaOrigem.animalNome, agendaOrigem.clienteId)
      : null,
  );
  useEffect(() => { setPesoInput(''); }, [animalSel?.id]);
  const [isLoadingAnimais, startAnimais]   = useTransition();
  // Contador do "Motivo" — MOTIVO_CONSULTA no banco só aceita 60 caracteres
  // (ver "displasia coxofemoral..." travando em Controllers.PetShop.pas).
  const [motivoValue, setMotivoValue]      = useState(agendaOrigem?.motivo ?? '');
  const [motivoLen, setMotivoLen]          = useState((agendaOrigem?.motivo ?? '').length);

  // ── Edição inline de cliente / animal (mesmo padrão da Agenda) ──
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [editAnimalOpen,  setEditAnimalOpen]  = useState(false);
  const [salvandoCli,     setSalvandoCli]     = useState(false);
  const [salvandoAni,     setSalvandoAni]     = useState(false);
  const [erroCli,         setErroCli]         = useState('');
  const [erroAni,         setErroAni]         = useState('');

  // Campos controlados do painel de edição do cliente
  const [cliNome,     setCliNome]     = useState('');
  const [cliCelular,  setCliCelular]  = useState('');
  const [cliTelefone, setCliTelefone] = useState('');
  const [cliEmail,    setCliEmail]    = useState('');
  const [cliCpf,      setCliCpf]      = useState('');
  const [cliCep,      setCliCep]      = useState('');
  const [cliEndereco,     setCliEndereco]     = useState('');
  const [cliNumero,       setCliNumero]       = useState('');
  const [cliComplemento,  setCliComplemento]  = useState('');
  const [cliBairro,       setCliBairro]       = useState('');
  const [cliCidade,       setCliCidade]       = useState('');
  const [cliUf,           setCliUf]           = useState('');
  const [cliCepLoading,    setCliCepLoading]    = useState(false);
  const [cliCepMsg,        setCliCepMsg]        = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [cliPanelLoading,  setCliPanelLoading]  = useState(false);

  async function handleCliCepBlur() {
    const limpo = cliCep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setCliCepLoading(true);
    setCliCepMsg(null);
    const r = await buscarCep(limpo);
    setCliCepLoading(false);
    if (r) {
      setCliEndereco(r.logradouro);
      setCliBairro(r.bairro);
      setCliCidade(r.cidade);
      setCliUf(r.uf);
      setCliCepMsg({ tipo: 'ok', texto: 'Endereço preenchido automaticamente.' });
    } else {
      setCliCepMsg({ tipo: 'erro', texto: 'CEP não encontrado. Preencha manualmente.' });
    }
  }

  // Campos controlados do painel de edição do animal
  const [aniNome,      setAniNome]      = useState('');
  const [aniSexo,      setAniSexo]      = useState('');
  const [aniCastrado,  setAniCastrado]  = useState('0');
  const [aniNasc,      setAniNasc]      = useState('');
  const [aniCor,       setAniCor]       = useState('');
  const [aniObs,       setAniObs]       = useState('');
  const [aniMicrochip, setAniMicrochip] = useState('');

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
  const [proValor, setProValor]            = useState('');
  const [salvandoItem, setSalvandoItem]    = useState(false);
  const [erroItem, setErroItem]            = useState('');
  // ── Estimativa (lembrete de recompra) — mesmo padrão da Pré-venda/Tele-entrega ──
  const [proRegra, setProRegra]            = useState<RegraProduto | null>(null);
  const [proDias, setProDias]              = useState<number | null>(null);

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

  async function selecionarProdutoOpt(p: ProdutoResultado) {
    setProSel(p);
    setBuscaPro(p.nome_produto);
    setProOpts([]);
    setProValor(p.preco.toFixed(2));
    setProDias(null);
    // verifica regra de estimativa (lembrete de recompra) — igual Pré-venda/Tele-entrega
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setProRegra(regras[0] ?? null);
    if (!regras[0]) setProDias(0); // sem regra → não cria
  }

  async function handleAddItem() {
    if (!proSel || !agendaOrigem) return;
    if (proRegra && proDias === null) return; // deve escolher prazo primeiro
    const qtd = parseFloat(proQtd) || 1;
    const valor = parseFloat(proValor);
    if (!valor || valor <= 0) { setErroItem('Informe um valor válido (maior que zero).'); return; }
    setSalvandoItem(true);
    setErroItem('');
    const r = await adicionarItemNaAgenda(
      agendaOrigem.agendaId, agendaOrigem.filial,
      proSel.id_dadospro, proSel.cod_filial,
      qtd, valor, 0, proSel.nome_produto,
      proSel.nome_produto, proSel.preco, proSel.cod_pro,
    );
    if (r.error) { setSalvandoItem(false); setErroItem(r.error); return; }

    // cria a estimativa se um prazo foi escolhido
    if (proRegra && (proDias ?? 0) > 0) {
      criarEstimativa({
        clienteId:     agendaOrigem.clienteId,
        clienteFilial: agendaOrigem.clienteFilial,
        clienteNome:   agendaOrigem.clienteNome,
        animalId:      agendaOrigem.animalId,
        animalFilial:  agendaOrigem.animalFilial,
        animalNome:    agendaOrigem.animalNome,
        dadosproId:    proSel.id_dadospro,
        descPro:       proSel.nome_produto,
        qtd,
        dataCompra:    hoje,
        dias:          proDias!,
        orcaId:        agendaOrigem.agendaId,
        orcaFilial:    agendaOrigem.filial,
      }).catch(() => null);
    }

    // Recarrega do servidor (em vez de só empilhar localmente) pra pegar o
    // id_item real — sem isso o item recém-lançado não podia ser editado
    // (EditableValor) nem excluído até a página ser recarregada.
    buscarItensAgenda(agendaOrigem.agendaId, agendaOrigem.filial).then(setItensAgenda);
    setSalvandoItem(false);
    setBuscaPro(''); setProOpts([]); setProSel(null); setProQtd('1'); setProValor('');
    setProRegra(null); setProDias(null);
  }

  async function alterarValorItemAgenda(it: ItemAgendaConsulta, novoValor: number) {
    if (!agendaOrigem || !it.id_item) return;
    const res = await atualizarItemAgenda(
      agendaOrigem.agendaId, it.id_item, agendaOrigem.filial,
      Number(it.qtd) || 1, novoValor, 0, it.descricao || it.produto,
    );
    if (!res.error) {
      setItensAgenda((prev) => prev.map((x) => x.id_item === it.id_item ? { ...x, valor: String(novoValor) } : x));
    }
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
  const motivoRef                     = useRef<HTMLDivElement>(null);
  const [clientePiscando, setClientePiscando] = useState(false);
  const [animalPiscando,  setAnimalPiscando]  = useState(false);
  const [vetPiscando,     setVetPiscando]     = useState(false);
  const [motivoPiscando,  setMotivoPiscando]  = useState(false);

  useEffect(() => {
    if (clienteSel) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const texto = clienteQ.trim();
    if (texto.length === 0) { setResultados([]); return; }

    // "dono/pet" ou "pet/dono" — a ordem não importa, só pets aparecem
    // (em destaque âmbar), igual à Agenda.
    if (texto.includes('/')) {
      const [parteA, parteB] = texto.split('/').map((s) => s.trim());
      if (!parteA || !parteB || parteA.length < 2 || parteB.length < 2) { setResultados([]); return; }
      debounceRef.current = setTimeout(() => {
        startBusca(async () => {
          const pets = await buscarAnimaisPorNome(parteA, parteB);
          setResultados(pets.map((a): ResultadoBusca => ({ tipo: 'pet', animal: a })));
        });
      }, 300);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }

    if (texto.length < 3) { setResultados([]); return; }
    debounceRef.current = setTimeout(() => {
      startBusca(async () => {
        const [clientes, pets] = await Promise.all([
          buscarClientes(texto),
          buscarAnimaisPorNome(texto),
        ]);
        setResultados([
          ...clientes.slice(0, 6).map((c): ResultadoBusca => ({ tipo: 'cliente', cliente: c })),
          ...pets.slice(0, 6).map((a): ResultadoBusca => ({ tipo: 'pet', animal: a })),
        ]);
      });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [clienteQ, clienteSel]);

  function selecionarCliente(c: Cliente, animalPreSel?: Animal) {
    setClienteSel(c);
    setResultados([]);
    setClienteQ('');
    setAnimalSel(animalPreSel ?? null);
    setAnimais(animalPreSel ? [animalPreSel] : []);
    startAnimais(async () => {
      const lista = await buscarAnimais(c.id);
      setAnimais(lista);
      if (animalPreSel) {
        setAnimalSel(lista.find((a) => a.id === animalPreSel.id) ?? animalPreSel);
      }
    });
  }

  /** Selecionou um pet no resultado da busca — já resolve o dono. */
  function selecionarPet(item: AnimalBuscaItem) {
    const clienteParcial = clienteMinimo(item.id_cliente, item.filial, item.nome_cliente);
    const animalParcial  = animalMinimo(item.id, item.filial, item.nome, item.id_cliente);
    selecionarCliente(clienteParcial, animalParcial);
  }

  function limparCliente() {
    if (agendaOrigem) return; // não desvincula o proprietário quando veio de uma agenda
    setClienteSel(null);
    setResultados([]);
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
    if (!motivoValue.trim()) { piscar(setMotivoPiscando, motivoRef); setErrorMsg('Informe o motivo da consulta.'); return; }

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
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Proprietário *
            </h2>
            {!clienteSel && (
              <Button type="button" size="sm" variant="outline" onClick={() => setNovoCliOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Cliente
              </Button>
            )}
          </div>

          {clienteSel ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                <div>
                  <p className="font-medium">{clienteSel.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button" variant="ghost" size="icon"
                    title="Editar cliente"
                    onClick={async () => {
                      if (editClienteOpen) { setEditClienteOpen(false); return; }
                      setErroCli('');
                      setCliPanelLoading(true);
                      setEditClienteOpen(true);
                      const completo = await buscarClienteCompleto(clienteSel.id).catch(() => null);
                      const c = completo ?? clienteSel;
                      setCliNome(c.nome ?? '');
                      setCliCelular(c.celular ?? '');
                      setCliTelefone(c.telefone ?? '');
                      setCliEmail(c.email ?? '');
                      setCliCpf(c.cpf_cnpj ?? '');
                      setCliCep(c.cep ?? '');
                      setCliEndereco(c.endereco ?? '');
                      setCliNumero(c.numero ?? '');
                      setCliComplemento(c.complemento ?? '');
                      setCliBairro(c.bairro ?? '');
                      setCliCidade(c.cidade ?? '');
                      setCliUf(c.uf ?? '');
                      setCliCepMsg(null);
                      setCliPanelLoading(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!agendaOrigem && (
                    <Button type="button" variant="ghost" size="icon" onClick={limparCliente}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Painel inline de edição rápida do cliente */}
              {editClienteOpen && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                    Editar dados do cliente
                    {cliPanelLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </p>
                  {erroCli && <p className="text-xs text-destructive">{erroCli}</p>}
                  <div className={`grid grid-cols-2 gap-3 transition-opacity ${cliPanelLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={cliNome} onChange={e => setCliNome(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Celular</Label>
                      <Input value={cliCelular} onChange={e => setCliCelular(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={cliTelefone} onChange={e => setCliTelefone(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input type="email" value={cliEmail} onChange={e => setCliEmail(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input value={cliCpf} onChange={e => setCliCpf(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CEP</Label>
                      <div className="relative">
                        <Input
                          value={cliCep}
                          onChange={e => { setCliCep(e.target.value); setCliCepMsg(null); }}
                          onBlur={handleCliCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                          className="h-8 text-sm pr-7"
                        />
                        {cliCepLoading && (
                          <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {cliCepMsg && (
                        <p className={`text-[11px] ${cliCepMsg.tipo === 'ok' ? 'text-emerald-600' : 'text-destructive'}`}>
                          {cliCepMsg.texto}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Endereço</Label>
                      <Input value={cliEndereco} onChange={e => setCliEndereco(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número</Label>
                      <Input value={cliNumero} onChange={e => setCliNumero(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Complemento</Label>
                      <Input value={cliComplemento} onChange={e => setCliComplemento(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={cliBairro} onChange={e => setCliBairro(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={cliCidade} onChange={e => setCliCidade(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UF</Label>
                      <Input value={cliUf} onChange={e => setCliUf(e.target.value)} maxLength={2} className="h-8 text-sm uppercase" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditClienteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={salvandoCli || !cliNome.trim()}
                      onClick={async () => {
                        setSalvandoCli(true); setErroCli('');
                        const fd = new FormData();
                        fd.set('nome',            cliNome);
                        fd.set('celular',         cliCelular);
                        fd.set('telefone',        cliTelefone);
                        fd.set('email',           cliEmail);
                        fd.set('cpf_cnpj',        cliCpf);
                        fd.set('cep',             cliCep);
                        fd.set('endereco',        cliEndereco);
                        fd.set('numero',          cliNumero);
                        fd.set('complemento',     cliComplemento);
                        fd.set('bairro',          cliBairro);
                        fd.set('cidade',          cliCidade);
                        fd.set('uf',              cliUf);
                        fd.set('pessoa',          clienteSel.pessoa        ?? 'F');
                        fd.set('status_ativo',    String(clienteSel.status_ativo ?? 0));
                        fd.set('ibge',            '');
                        fd.set('ie',              clienteSel.ie            ?? '');
                        fd.set('data_nascimento', clienteSel.data_nascimento ?? '');
                        fd.set('comentario',      clienteSel.comentario    ?? '');
                        fd.set('nome_fantasia',   clienteSel.nome_fantasia ?? '');
                        const res = await updateCliente(clienteSel.id, fd);
                        setSalvandoCli(false);
                        if (res.error) { setErroCli(res.error); return; }
                        setClienteSel(prev => prev ? {
                          ...prev,
                          nome: cliNome, celular: cliCelular, telefone: cliTelefone,
                          email: cliEmail, cpf_cnpj: cliCpf, cep: cliCep,
                          endereco: cliEndereco, numero: cliNumero, complemento: cliComplemento,
                          bairro: cliBairro, cidade: cliCidade, uf: cliUf,
                        } : prev);
                        setEditClienteOpen(false);
                      }}
                    >
                      {salvandoCli ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Pesquisa do pet ou proprietário..."
                  value={clienteQ}
                  onChange={(e) => setClienteQ(e.target.value)}
                  className="pl-9 pr-9"
                  autoComplete="off"
                />
                {isBuscando && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {(() => {
                const texto = clienteQ.trim();
                if (texto.includes('/')) {
                  const [a, b] = texto.split('/').map((s) => s.trim());
                  if (!a || a.length < 2 || !b || b.length < 2) {
                    return <p className="text-xs text-muted-foreground">Digite pelo menos 2 letras em cada lado da barra...</p>;
                  }
                  return null;
                }
                if (texto.length > 0 && texto.length < 3) {
                  return <p className="text-xs text-muted-foreground">Digite ao menos 3 letras para pesquisar...</p>;
                }
                return null;
              })()}

              {resultados.length > 0 && (
                <div className="rounded-md border divide-y bg-card shadow-sm overflow-hidden">
                  {resultados.map((r, i) => (
                    r.tipo === 'cliente' ? (
                      <button
                        key={`cli-${r.cliente.id}-${i}`}
                        type="button"
                        onClick={() => selecionarCliente(r.cliente)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{r.cliente.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.cliente.celular || r.cliente.telefone || r.cliente.cpf_cnpj || 'Cliente'}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <button
                        key={`pet-${r.animal.id}-${i}`}
                        type="button"
                        onClick={() => selecionarPet(r.animal)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 mt-0.5">
                          <PawPrint className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {r.animal.nome}
                            <MicrochipBadge value={r.animal.apelido} className="text-[11px]" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[r.animal.especie, r.animal.raca].filter(Boolean).join(' · ')}
                            {' — '}
                            <span className="font-medium text-foreground/70">{r.animal.nome_cliente}</span>
                          </p>
                        </div>
                      </button>
                    )
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
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              Animal *
            </h2>
            {clienteSel && !(agendaOrigem && animalSel) && (
              <Button type="button" size="sm" variant="outline" onClick={() => setNovoAnimalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Pet
              </Button>
            )}
          </div>

          {agendaOrigem && animalSel ? (
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="font-medium text-sm flex items-center gap-1.5">
                {animalSel.nome}
                <MicrochipBadge value={animalSel.apelido} className="text-[11px]" />
              </p>
            </div>
          ) : !clienteSel ? (
            <p className="text-sm text-muted-foreground">Selecione um proprietário primeiro.</p>
          ) : isLoadingAnimais ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Carregando animais...
            </div>
          ) : animais.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum animal cadastrado para este cliente.{' '}
              <button type="button" className="text-primary underline underline-offset-2" onClick={() => setNovoAnimalOpen(true)}>
                Cadastrar agora
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                {animais.map((a) => (
                  <div key={a.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const next = animalSel?.id === a.id ? null : a;
                        setAnimalSel(next);
                        if (editAnimalOpen && animalSel?.id !== a.id) setEditAnimalOpen(false);
                      }}
                      className={cn(
                        'w-full text-left rounded-lg border px-3 py-2.5 transition-colors pr-8',
                        animalSel?.id === a.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        {a.nome}
                        <MicrochipBadge value={a.apelido} className="text-[11px]" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[a.especie, a.raca, a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : '']
                          .filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    <button
                      type="button"
                      title="Editar animal"
                      onClick={() => {
                        setAnimalSel(a);
                        const abrindo = animalSel?.id !== a.id || !editAnimalOpen;
                        if (abrindo) {
                          setAniNome(a.nome ?? '');
                          setAniSexo(a.sexo ?? '');
                          setAniCastrado(String(a.castrado ?? 0));
                          setAniNasc(a.data_nascimento?.slice(0, 10) ?? '');
                          setAniCor(a.cor ?? '');
                          setAniObs(a.obs ?? '');
                          setAniMicrochip(a.apelido ?? '');
                        }
                        setEditAnimalOpen(abrindo);
                        setErroAni('');
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Painel inline de edição rápida do animal */}
              {editAnimalOpen && animalSel && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Editar dados de {animalSel.nome}
                  </p>
                  {erroAni && <p className="text-xs text-destructive">{erroAni}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={aniNome} onChange={e => setAniNome(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Microchip</Label>
                      <Input value={aniMicrochip} onChange={e => setAniMicrochip(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sexo</Label>
                      <select value={aniSexo} onChange={e => setAniSexo(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="">—</option>
                        <option value="M">Macho</option>
                        <option value="F">Fêmea</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Castrado</Label>
                      <select value={aniCastrado} onChange={e => setAniCastrado(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="0">Não</option>
                        <option value="1">Sim</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Nascimento</Label>
                      <Input type="date" value={aniNasc} onChange={e => setAniNasc(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input value={aniCor} onChange={e => setAniCor(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input value={aniObs} onChange={e => setAniObs(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditAnimalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={salvandoAni || !aniNome.trim()}
                      onClick={async () => {
                        setSalvandoAni(true); setErroAni('');
                        const fd = new FormData();
                        fd.set('nome',            aniNome);
                        fd.set('sexo',            aniSexo);
                        fd.set('castrado',        aniCastrado);
                        fd.set('data_nascimento', aniNasc);
                        fd.set('cor',             aniCor);
                        fd.set('obs',             aniObs);
                        fd.set('apelido',         aniMicrochip);
                        fd.set('peso',            animalSel.peso          ?? '');
                        fd.set('tipo_animal',     animalSel.tipo_animal   ?? '');
                        fd.set('id_especie',      String(animalSel.id_especie ?? 0));
                        fd.set('especie',         animalSel.especie       ?? '');
                        fd.set('id_raca',         String(animalSel.id_raca   ?? 0));
                        fd.set('raca',            animalSel.raca          ?? '');
                        fd.set('id_pelo',         String(animalSel.id_pelo   ?? 0));
                        fd.set('pelo',            animalSel.pelo          ?? '');
                        fd.set('controla_racao',  '0');
                        fd.set('obito',           String(animalSel.obito  ?? 0));
                        // Convenção do legado: ATIVO=1 significa INATIVO — default seguro é 0 (ativo)
                        fd.set('ativo',           String(animalSel.ativo  ?? 0));
                        const res = await updateAnimal(animalSel.id, animalSel.id_cliente, {}, fd);
                        setSalvandoAni(false);
                        if (res.error) { setErroAni(res.error); return; }
                        const updated: Animal = {
                          ...animalSel,
                          nome: aniNome, sexo: aniSexo,
                          castrado: aniCastrado === '1' ? 1 : 0,
                          data_nascimento: aniNasc, cor: aniCor, obs: aniObs,
                          apelido: aniMicrochip,
                        };
                        setAnimais(prev => prev.map(x => x.id === animalSel.id ? updated : x));
                        setAnimalSel(updated);
                        setEditAnimalOpen(false);
                      }}
                    >
                      {salvandoAni ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="peso">
                  Peso (kg)
                  {animalSel?.peso && Number(animalSel.peso) > 0 && (
                    <span className="ml-1.5 font-normal text-xs text-muted-foreground">
                      (último registrado: {animalSel.peso} kg)
                    </span>
                  )}
                </Label>
                {animalSel && (
                  <button
                    type="button"
                    onClick={() => setPesoHistOpen(true)}
                    title="Ver histórico de peso"
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0"
                  >
                    <Scale className="h-3 w-3" />
                    Histórico
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="peso"
                  name="peso"
                  placeholder="0,000"
                  inputMode="decimal"
                  value={pesoInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v !== '' && Number(v.replace(',', '.')) > 999) return;
                    setPesoInput(v);
                  }}
                />
                {pesoInput && Number(pesoInput) > 0 && animalSel?.peso && Number(animalSel.peso) > 0 && (
                  <span className={cn(
                    'flex items-center gap-0.5 text-xs font-medium shrink-0 whitespace-nowrap',
                    Number(pesoInput) > Number(animalSel.peso) ? 'text-orange-500' : 'text-green-600',
                  )}>
                    {Number(pesoInput) > Number(animalSel.peso)
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : <TrendingDown className="h-3.5 w-3.5" />}
                    {Math.abs(Number(pesoInput) - Number(animalSel.peso)).toFixed(2)} kg
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperatura">Temperatura (°C)</Label>
              <Input id="temperatura" name="temperatura" placeholder="38,5" inputMode="decimal" />
            </div>
          </div>

          <div
            ref={motivoRef}
            className={cn(
              'space-y-1.5 rounded-md transition-shadow',
              motivoPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
            )}
          >
            <Label htmlFor="motivo">Motivo / Queixa principal *</Label>
            <textarea
              id="motivo"
              name="motivo"
              rows={3}
              value={motivoValue}
              onChange={(e) => { setMotivoValue(e.target.value); setMotivoLen(e.target.value.length); }}
              maxLength={60}
              required
              placeholder="Descreva o motivo da consulta..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            <p className={cn('text-[11px]', motivoLen >= 60 ? 'text-destructive' : 'text-muted-foreground')}>
              {motivoLen}/60 caracteres
            </p>
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
                      onClick={() => selecionarProdutoOpt(p)}
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
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-end gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{proSel.nome_produto}</p>
                    <p className="text-xs text-muted-foreground">
                      Tabela: R$ {proSel.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="w-24 space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Valor (R$)</Label>
                    <Input
                      type="number" min="0.01" step="0.01" value={proValor}
                      onChange={(e) => setProValor(e.target.value)}
                    />
                  </div>
                  <div className="w-16 space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                    <Input
                      type="number" min="0.01" step="0.01" value={proQtd}
                      onChange={(e) => setProQtd(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button" size="sm" onClick={handleAddItem}
                    disabled={salvandoItem || (proRegra !== null && proDias === null)}
                  >
                    {salvandoItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => { setProSel(null); setBuscaPro(''); setProRegra(null); setProDias(null); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Estimativa (lembrete de recompra) — mesmo padrão da Pré-venda/Tele-entrega */}
                {proRegra && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <Bell className="h-3.5 w-3.5" />
                      Lembrete de recompra — escolha o prazo:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: `Mínimo (${proRegra.dias_min} dias)`, val: proRegra.dias_min },
                        { label: `Máximo (${proRegra.dias_max} dias)`, val: proRegra.dias_max },
                        { label: 'Não criar lembrete', val: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setProDias(opt.val)}
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                            proDias === opt.val
                              ? opt.val === 0
                                ? 'border-gray-400 bg-gray-400 text-white'
                                : 'border-amber-500 bg-amber-500 text-white'
                              : opt.val === 0
                                ? 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {proDias === null && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">* Escolha uma opção para lançar o produto</p>
                    )}
                  </div>
                )}
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
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {it.qtd} {it.unidade} · R${' '}
                        {it.id_item ? (
                          <EditableValor
                            valor={parseFloat(it.valor || '0')}
                            fmt={(v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            onCommit={(v) => alterarValorItemAgenda(it, v)}
                          />
                        ) : (
                          parseFloat(it.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                        )}
                      </p>
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

      <NovoClienteDialog
        open={novoCliOpen}
        onOpenChange={setNovoCliOpen}
        onCriado={(cliente) => selecionarCliente(cliente as Cliente)}
      />
      {clienteSel && (
        <NovoAnimalDialog
          clienteId={clienteSel.id}
          filialCliente={clienteSel.filial}
          especies={especies}
          racas={racas}
          pelos={pelos}
          open={novoAnimalOpen}
          onOpenChange={setNovoAnimalOpen}
          onCriado={(animal) => selecionarCliente(clienteSel, animal as Animal)}
        />
      )}

      {animalSel && (
        <Dialog open={pesoHistOpen} onOpenChange={setPesoHistOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Histórico de Peso — {animalSel.nome}
              </DialogTitle>
            </DialogHeader>
            <PesoHistorico
              animalId={animalSel.id}
              filial={animalSel.filial}
              pesoAtual={Number(animalSel.peso) || undefined}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
