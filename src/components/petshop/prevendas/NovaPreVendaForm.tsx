'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Plus, Trash2, X, UserPlus, Bell, User, PawPrint, ClipboardList,
  Package, Wallet, ArrowLeft, Check, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  criarPreVenda,
  adicionarItemPreVenda,
  buscarClientesPrevenda,
  buscarAnimaisPrevenda,
  buscarProdutosPrevenda,
  ClienteBuscaItem,
  AnimalPreVenda,
  ProdutoBuscaItem,
} from '@/app/(petshop)/prevendas/actions';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import NovoClienteModal, { type ClienteCriado } from '@/components/petshop/NovoClienteModal';
import { getFilialClient } from '@/lib/filial';
import type { Vendedor } from '@/app/(petshop)/vendedores/actions';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';

interface ProdutoLinha {
  id_dadospro: number;
  filial:      number;
  cod_pro:     string;
  descricao:   string;
  unidade:     string;
  preco:       number;
  qtd:         number;
  desconto:    number;
  total:       number;
  regra?:      RegraProduto;
  dias?:       number; // 0 = não criar, >0 = criar
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

export default function NovaPreVendaForm({ vendedores = [] }: { vendedores?: Vendedor[] }) {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [erro, setErro] = useState('');

  // Cliente
  const [buscaCli, setBuscaCli] = useState('');
  const [clienteOpts, setClienteOpts] = useState<ClienteBuscaItem[]>([]);
  const [clienteSel, setClienteSel] = useState<ClienteBuscaItem | null>(null);
  const [cliIdx, setCliIdx] = useState(-1);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const cliRef = useRef<HTMLInputElement>(null);

  // Animal / pet (opcional — usado para vincular a estimativa de recompra)
  const [animaisCliente, setAnimaisCliente] = useState<AnimalPreVenda[]>([]);
  const [carregandoAnimais, setCarregandoAnimais] = useState(false);
  const [animalSel, setAnimalSel] = useState<AnimalPreVenda | null>(null);
  const [animalManualOpen, setAnimalManualOpen] = useState(false);
  const [animalManual, setAnimalManual] = useState('');

  // Dados gerais (sem profissional / tipo de serviço / horário — não aplicáveis à pré-venda)
  const [vendedorId, setVendedorId] = useState('');
  const [vendedorFilial, setVendedorFilial] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [pzEntrega, setPzEntrega] = useState('');
  const [formapgto, setFormapgto] = useState('');
  const [condpgto, setCondpgto] = useState('');
  const [frete, setFrete] = useState('');
  const [dados, setDados] = useState('');

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([]);
  const [showProdDlg, setShowProdDlg] = useState(false);
  const [buscaPro, setBuscaPro] = useState('');
  const [prodOpts, setProdOpts] = useState<ProdutoBuscaItem[]>([]);
  const [proIdx, setProIdx] = useState(-1);
  const [proSel, setProSel] = useState<ProdutoBuscaItem | null>(null);
  const [proQtd, setProQtd] = useState('1');
  const [proValor, setProValor] = useState('0');
  const [proDesc, setProDesc] = useState('0');
  const [proRegra, setProRegra] = useState<RegraProduto | null>(null);
  const [proDias, setProDias] = useState<number | null>(null); // null=pendente escolha
  const proRef = useRef<HTMLInputElement>(null);
  const listaProRef = useRef<HTMLUListElement>(null);

  // Busca cliente
  useEffect(() => {
    if (buscaCli.length < 2) { setClienteOpts([]); return; }
    const t = setTimeout(async () => {
      setClienteOpts(await buscarClientesPrevenda(buscaCli));
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCli]);

  async function selecionarCliente(c: ClienteBuscaItem) {
    setClienteSel(c);
    setBuscaCli(c.nome);
    setClienteOpts([]);
    setCliIdx(-1);
    // reseta a seleção de pet ao trocar de cliente
    setAnimalSel(null);
    setAnimalManualOpen(false);
    setAnimalManual('');
    setCarregandoAnimais(true);
    const lista = await buscarAnimaisPrevenda(c.id).catch(() => []);
    setAnimaisCliente(lista);
    setCarregandoAnimais(false);
  }

  function limparCliente() {
    setClienteSel(null);
    setBuscaCli('');
    setAnimaisCliente([]);
    setAnimalSel(null);
    setAnimalManualOpen(false);
    setAnimalManual('');
  }

  function aoNovoClienteCriado(c: ClienteCriado) {
    setShowNovoCliente(false);
    selecionarCliente({ id: c.id, filial: getFilialClient(), nome: c.nome, telefone: c.telefone, celular: c.celular });
  }

  // Busca produto — campo sempre visível na seção Produtos (sem precisar abrir nada antes)
  useEffect(() => {
    const termos = normalizarTermosBusca(buscaPro);
    if (!termos.some(t => t.length >= 2)) { setProdOpts([]); return; }
    const t = setTimeout(async () => {
      const r = await buscarProdutosPrevenda(termoPrincipal(termos));
      setProdOpts(filtrarProdutosPorTermos(r, termos, p => p.descricao + ' ' + p.cod_pro));
    }, 300);
    return () => clearTimeout(t);
  }, [buscaPro]);

  // scroll automático para o item focado
  useEffect(() => {
    if (!listaProRef.current || proIdx < 0) return;
    (listaProRef.current.children[proIdx] as HTMLElement | undefined)
      ?.scrollIntoView({ block: 'nearest' });
  }, [proIdx]);

  async function selecionarProduto(p: ProdutoBuscaItem) {
    setProSel(p);
    setProdOpts([]);
    setProIdx(-1);
    setProDias(null);
    // reseta qtd/valor/desconto do produto anterior — sem isso, cancelar o
    // dialog de um produto (sem adicionar) deixava esses valores "vazarem"
    // pro próximo produto selecionado, aplicando um desconto/valor que o
    // atendente nunca digitou para ele.
    setProQtd('1'); setProDesc('0');
    setProValor(String(p.preco).replace('.', ','));
    setShowProdDlg(true); // abre o dialog de confirmação (qtd/valor/desconto/estimativa) direto
    // verifica regra de estimativa
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setProRegra(regras[0] ?? null);
    if (!regras[0]) setProDias(0); // sem regra → não cria
  }

  function fecharDialogProduto() {
    setShowProdDlg(false);
    setBuscaPro(''); setProSel(null); setProdOpts([]); setProRegra(null); setProDias(null);
    setProQtd('1'); setProDesc('0'); setProValor('0');
  }

  function adicionarProdutoLocal() {
    if (!proSel) return;
    if (proRegra && proDias === null) return; // deve escolher prazo
    const qtd   = parseFloat(proQtd) || 1;
    const desc  = parseFloat(proDesc) || 0;
    // Valor unitário: normalmente o preço de tabela, mas o atendente pode
    // sobrescrever digitando direto no campo (ex.: negociação com o cliente),
    // sem precisar simular isso via desconto.
    const valorUnit = parseFloat(proValor.replace(',', '.')) || proSel.preco;
    const total = valorUnit * qtd * (1 - desc / 100);
    setProdutos(prev => [...prev, {
      id_dadospro: proSel!.id_dadospro,
      filial:      proSel!.filial,
      cod_pro:     proSel!.cod_pro,
      descricao:   proSel!.descricao,
      unidade:     proSel!.unidade,
      preco:       valorUnit,
      qtd, desconto: desc, total,
      regra: proRegra ?? undefined,
      dias:  proDias ?? 0,
    }]);
    setProQtd('1'); setProDesc('0'); setProValor('0');
    fecharDialogProduto();
  }

  function removerProduto(i: number) {
    setProdutos(prev => prev.filter((_, idx) => idx !== i));
  }

  // "totalFinal" vem SEMPRE da soma do total já calculado de cada item (uma
  // única vez, ao adicionar) — nunca de uma segunda fórmula em paralelo
  // (subtotal - desconto), que já divergiu do total real dos itens em
  // produção (desconto aplicado em dobro no cabeçalho de uma pré-venda).
  const subTotal = produtos.reduce((s, p) => s + p.preco * p.qtd, 0);
  const totalFinal = produtos.reduce((s, p) => s + p.total, 0);
  const totalDesc = subTotal - totalFinal;

  // Nome do pet a gravar no texto livre da ORCA (animal selecionado ou digitado manualmente)
  const nomeAnimalTexto = animalSel?.nome ?? animalManual.trim();

  async function handleSalvar() {
    if (!clienteSel)  { setErro('Selecione um cliente.'); return; }
    if (!vendedorId)  { setErro('Selecione o vendedor.'); return; }
    setErro('');
    startT(async () => {
      const r = await criarPreVenda({
        cliente_id:   clienteSel.id,
        cliente:      clienteSel.nome,
        hora:         new Date().toTimeString().slice(0, 5),
        valor:        totalFinal,
        sub_total:    subTotal,
        val_produtos: subTotal,
        val_acresc:   0,
        desconto:     totalDesc,
        valor_frete:  0,
        animal:       nomeAnimalTexto,
        profissional: vendedores.find(v => String(v.id) === vendedorId && String(v.filial) === vendedorFilial)?.nome ?? '',
        codvend:      Number(vendedorId) || undefined,
        vend_filial:  Number(vendedorFilial) || undefined,
        data_entrega: dataEntrega,
        pz_entrega:   pzEntrega,
        formapgto, condpgto, frete, dados,
      });
      if (r.CodStatus !== 1 || !r.id) { setErro(r.DescricaoStatus); return; }
      const idOrca = r.id;

      const errosProdutos: string[] = [];
      for (let i = 0; i < produtos.length; i++) {
        const p = produtos[i];
        const rItem = await adicionarItemPreVenda({
          id_orca:        idOrca,
          fk_id_dadospro: p.id_dadospro,
          fk_cod_filial:  p.filial,
          cod_prod:       p.cod_pro,
          descpro:        p.descricao,
          qtd:            p.qtd,
          valor:          p.preco * p.qtd,
          valorliq:       p.total,
          desconto:       p.desconto,
          preco_tabela:   p.preco,
          ordem:          i + 1,
        });
        if (rItem.CodStatus !== 1) {
          errosProdutos.push(`${p.descricao}: ${rItem.DescricaoStatus}`);
          continue; // não cria estimativa de um item que falhou ao salvar
        }

        // cria estimativa se prazo foi escolhido — vincula ao pet real quando selecionado
        if (p.regra && (p.dias ?? 0) > 0) {
          await criarEstimativa({
            clienteId:     clienteSel.id,
            clienteFilial: getFilialClient(),
            clienteNome:   clienteSel.nome,
            animalId:      animalSel?.id ?? 0,
            animalFilial:  animalSel?.filial ?? getFilialClient(),
            animalNome:    nomeAnimalTexto,
            dadosproId:    p.id_dadospro,
            descPro:       p.descricao,
            qtd:           p.qtd,
            dataCompra:    dataHoje(),
            dias:          p.dias!,
            orcaId:        idOrca,
            orcaFilial:    getFilialClient(),
          }).catch(() => null);
        }
      }

      if (errosProdutos.length > 0) {
        // Mostra o erro real para diagnóstico antes de navegar — a pré-venda #idOrca
        // já foi criada, mas um ou mais produtos não foram salvos nela.
        setErro(`Pré-venda #${idOrca} criada, mas houve erro ao salvar produto(s): ${errosProdutos.join(' | ')}`);
        return;
      }

      router.push('/prevendas');
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/prevendas">
          <button className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Pré-vendas
          </button>
        </Link>
        <h1 className="text-xl font-semibold">Nova Pré-venda</h1>
      </div>

      {/* ── Cliente ── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente *
          </h2>
          {!clienteSel && (
            <button
              onClick={() => setShowNovoCliente(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <UserPlus className="h-3.5 w-3.5" /> Novo cliente
            </button>
          )}
        </div>

        {clienteSel ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel.telefone || clienteSel.celular || '—'}
                </p>
              </div>
            </div>
            <button type="button" onClick={limparCliente} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={cliRef}
                value={buscaCli}
                onChange={e => { setBuscaCli(e.target.value); if (clienteSel) setClienteSel(null); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') setCliIdx(i => Math.min(i + 1, clienteOpts.length - 1));
                  if (e.key === 'ArrowUp')   setCliIdx(i => Math.max(i - 1, 0));
                  if (e.key === 'Enter' && cliIdx >= 0) selecionarCliente(clienteOpts[cliIdx]);
                  if (e.key === 'Escape') setClienteOpts([]);
                }}
                placeholder="Buscar cliente pelo nome..."
                className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoComplete="off"
              />
            </div>
            {clienteOpts.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-lg max-h-80 overflow-y-auto divide-y">
                {clienteOpts.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    onMouseEnter={() => setCliIdx(i)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3',
                      i === cliIdx ? 'bg-primary/10' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.telefone || c.celular || 'Cliente'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Animal / Pet (opcional) — usado para vincular a estimativa de recompra ── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <PawPrint className="h-3.5 w-3.5" />
          Pet (opcional)
        </h2>

        {!clienteSel ? (
          <p className="text-sm text-muted-foreground">Selecione um cliente para escolher o pet.</p>
        ) : carregandoAnimais ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando pets do cliente...
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setAnimalSel(null); setAnimalManualOpen(false); setAnimalManual(''); }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  !animalSel && !animalManualOpen
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted',
                )}
              >
                Nenhum
              </button>
              {animaisCliente.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setAnimalSel(a); setAnimalManualOpen(false); setAnimalManual(''); }}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    animalSel?.id === a.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground hover:bg-muted',
                  )}
                >
                  {a.nome}{a.raca ? ` · ${a.raca}` : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setAnimalSel(null); setAnimalManualOpen(true); }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  animalManualOpen
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-dashed border-input text-muted-foreground hover:bg-muted',
                )}
              >
                <Plus className="h-3 w-3 inline mr-1" />
                Pet não cadastrado
              </button>
            </div>

            {animalManualOpen && (
              <input
                value={animalManual}
                onChange={e => setAnimalManual(e.target.value)}
                placeholder="Digite o nome do pet..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            )}

            {animaisCliente.length === 0 && !carregandoAnimais && !animalManualOpen && (
              <p className="text-xs text-muted-foreground">Este cliente não tem pets cadastrados.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Produtos ── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Produtos
        </h2>

        {/* Busca — sempre visível, sem precisar clicar em nada antes */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            ref={proRef}
            value={buscaPro}
            onChange={e => { setBuscaPro(e.target.value); setProIdx(-1); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setProIdx(i => Math.min(i + 1, prodOpts.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setProIdx(i => Math.max(i - 1, 0));
              } else if (e.key === 'PageDown') {
                e.preventDefault();
                setProIdx(i => Math.min(i + 5, prodOpts.length - 1));
              } else if (e.key === 'PageUp') {
                e.preventDefault();
                setProIdx(i => Math.max(i - 5, 0));
              } else if (e.key === 'Home') {
                e.preventDefault();
                setProIdx(0);
              } else if (e.key === 'End') {
                e.preventDefault();
                setProIdx(prodOpts.length - 1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (proIdx >= 0) selecionarProduto(prodOpts[proIdx]);
              } else if (e.key === 'Escape') {
                setProdOpts([]);
                setProIdx(-1);
              }
            }}
            placeholder="Buscar produto por nome ou código..."
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {prodOpts.length > 0 && (
            <ul ref={listaProRef} className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {prodOpts.map((p, i) => (
                <li
                  key={p.id_dadospro}
                  onClick={() => selecionarProduto(p)}
                  className={cn('cursor-pointer px-3 py-2 text-sm hover:bg-accent', i === proIdx && 'bg-accent')}
                >
                  <span className="font-medium">{p.descricao}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.cod_pro} · {fmt(p.preco)} · Est: {p.estoque}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {produtos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto adicionado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-muted-foreground">
                <th className="py-1 text-left">Produto</th>
                <th className="py-1 text-right">Qtd</th>
                <th className="py-1 text-right">Preço</th>
                <th className="py-1 text-right">Desc%</th>
                <th className="py-1 text-right">Total</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {produtos.map((p, i) => (
                <tr key={i}>
                  <td className="py-1.5">
                    <span className="font-medium">{p.descricao}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.cod_pro}</span>
                    {p.regra && (p.dias ?? 0) > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <Bell className="h-2.5 w-2.5" /> {p.dias}d
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{p.qtd} {p.unidade}</td>
                  <td className="py-1.5 text-right">{fmt(p.preco)}</td>
                  <td className="py-1.5 text-right">{p.desconto}%</td>
                  <td className="py-1.5 text-right font-medium">{fmt(p.total)}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => removerProduto(i)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Dados da Venda (abaixo dos produtos) ── */}
      <section className="rounded-xl border bg-card p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Dados da Venda
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Vendedor <span className="text-destructive">*</span>
            </label>
            <select
              // Vendedores vêm de todas as filiais — o código pode se repetir
              // entre filiais diferentes, então o valor precisa ser filial:id.
              value={vendedorId ? `${vendedorFilial}:${vendedorId}` : ''}
              onChange={e => {
                const [fil, id] = e.target.value.split(':');
                setVendedorId(id ?? '');
                setVendedorFilial(fil ?? '');
              }}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                !vendedorId ? 'border-destructive/50' : '',
              )}
            >
              <option value="">— Selecione —</option>
              {vendedores.map(v => (
                <option key={`${v.filial}:${v.id}`} value={`${v.filial}:${v.id}`}>{v.nome}</option>
              ))}
            </select>
          </div>
          {[
            { label: 'Prazo de Entrega', value: pzEntrega, set: setPzEntrega, placeholder: 'Ex: 3 dias úteis' },
            { label: 'Forma de Pagamento', value: formapgto, set: setFormapgto, placeholder: 'PIX, Cartão...' },
            { label: 'Condição de Pagamento', value: condpgto, set: setCondpgto, placeholder: 'À vista, 30/60...' },
            { label: 'Tipo de Frete', value: frete, set: setFrete, placeholder: 'CIF / FOB' },
          ].map(f => (
            <div key={f.label}>
              <label className="mb-1 block text-xs font-medium">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium">Data de Entrega</label>
            <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Observações</label>
          <textarea value={dados} onChange={e => setDados(e.target.value)} rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </section>

      {/* ── Totais ── */}
      <section className="rounded-xl border bg-card p-5 space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
          <Wallet className="h-3.5 w-3.5" />
          Financeiro
        </h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Descontos</span><span className="text-red-600">-{fmt(totalDesc)}</span></div>
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{fmt(totalFinal)}</span></div>
        </div>
      </section>

      {erro && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30">{erro}</p>}
      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
          Cancelar
        </button>
        <button
          onClick={handleSalvar}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {pending ? 'Salvando...' : 'Salvar Pré-venda'}
        </button>
      </div>

      {/* Dialog produto — confirma qtd/desconto/estimativa do item já escolhido na busca */}
      {showProdDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Adicionar Produto
              </h2>
              <button onClick={fecharDialogProduto}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {proSel && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">{proSel.descricao}</p>
                <p className="text-muted-foreground">
                  {proSel.cod_pro && <span className="font-mono mr-1.5">{proSel.cod_pro}</span>}
                  Preço de tabela: {fmt(proSel.preco)} · Estoque: {proSel.estoque} {proSel.unidade}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Quantidade</label>
                <input type="number" min="0.01" step="0.01" value={proQtd} onChange={e => setProQtd(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Valor (R$)</label>
                <input type="text" inputMode="decimal" value={proValor} onChange={e => setProValor(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Desconto %</label>
                <input type="number" min="0" max="100" value={proDesc} onChange={e => setProDesc(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Estimativa */}
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
                  ].map(opt => (
                    <button
                      key={opt.val}
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
                {proDias === null && proSel && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">* Escolha uma opção para continuar</p>
                )}
                {!animalSel && !animalManual.trim() && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    * Nenhum pet selecionado — o lembrete será criado sem vínculo com um pet específico.
                  </p>
                )}
              </div>
            )}

            {proSel && (
              <p className="text-sm font-medium">
                Total: {fmt((parseFloat(proValor.replace(',', '.')) || proSel.preco) * (parseFloat(proQtd) || 1) * (1 - (parseFloat(proDesc) || 0) / 100))}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={fecharDialogProduto}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
                Cancelar
              </button>
              <button
                onClick={adicionarProdutoLocal}
                disabled={!proSel || (proRegra !== null && proDias === null)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      {showNovoCliente && (
        <NovoClienteModal
          onClose={() => setShowNovoCliente(false)}
          onSuccess={aoNovoClienteCriado}
        />
      )}
    </div>
  );
}
