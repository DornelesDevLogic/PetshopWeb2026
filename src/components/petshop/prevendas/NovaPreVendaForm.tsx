'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, X, UserPlus, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  criarPreVenda,
  adicionarItemPreVenda,
  buscarClientesPrevenda,
  buscarClienteDetalhe,
  buscarProdutosPrevenda,
  ClienteBuscaItem,
  ProdutoBuscaItem,
} from '@/app/(petshop)/prevendas/actions';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import NovoClienteModal, { type ClienteCriado } from '@/components/petshop/NovoClienteModal';
import { FILIAL } from '@/lib/filial';
import type { Vendedor } from '@/app/(petshop)/vendedores/actions';

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

  // Dados gerais
  const [animal, setAnimal] = useState('');
  const [profissional, setProfissional] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('');
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
  const [proDesc, setProDesc] = useState('0');
  const [proRegra, setProRegra] = useState<RegraProduto | null>(null);
  const [proDias, setProDias] = useState<number | null>(null); // null=pendente escolha
  const proRef = useRef<HTMLInputElement>(null);

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
  }

  function aoNovoClienteCriado(c: ClienteCriado) {
    setShowNovoCliente(false);
    selecionarCliente({ id: c.id, filial: FILIAL, nome: c.nome, telefone: c.telefone, celular: c.celular });
  }

  // Busca produto
  useEffect(() => {
    if (!showProdDlg || buscaPro.length < 2) { setProdOpts([]); return; }
    const t = setTimeout(async () => {
      setProdOpts(await buscarProdutosPrevenda(buscaPro));
    }, 300);
    return () => clearTimeout(t);
  }, [buscaPro, showProdDlg]);

  async function selecionarProduto(p: ProdutoBuscaItem) {
    setProSel(p);
    setBuscaPro(p.descricao);
    setProdOpts([]);
    setProIdx(-1);
    setProDias(null);
    // verifica regra de estimativa
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setProRegra(regras[0] ?? null);
    if (!regras[0]) setProDias(0); // sem regra → não cria
  }

  function adicionarProdutoLocal() {
    if (!proSel) return;
    if (proRegra && proDias === null) return; // deve escolher prazo
    const qtd  = parseFloat(proQtd) || 1;
    const desc = parseFloat(proDesc) || 0;
    const total = proSel.preco * qtd * (1 - desc / 100);
    setProdutos(prev => [...prev, {
      id_dadospro: proSel!.id_dadospro,
      filial:      proSel!.filial,
      cod_pro:     proSel!.cod_pro,
      descricao:   proSel!.descricao,
      unidade:     proSel!.unidade,
      preco:       proSel!.preco,
      qtd, desconto: desc, total,
      regra: proRegra ?? undefined,
      dias:  proDias ?? 0,
    }]);
    setShowProdDlg(false);
    setBuscaPro(''); setProSel(null); setProQtd('1'); setProDesc('0');
    setProdOpts([]); setProRegra(null); setProDias(null);
  }

  function removerProduto(i: number) {
    setProdutos(prev => prev.filter((_, idx) => idx !== i));
  }

  const subTotal = produtos.reduce((s, p) => s + p.preco * p.qtd, 0);
  const totalDesc = produtos.reduce((s, p) => s + p.preco * p.qtd * (p.desconto / 100), 0);
  const totalFinal = subTotal - totalDesc;

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
        animal,
        profissional: vendedores.find(v => String(v.id) === vendedorId)?.nome ?? '',
        codvend:      Number(vendedorId) || undefined,
        vend_filial:  vendedores.find(v => String(v.id) === vendedorId)?.filial,
        data_entrega: dataEntrega,
        hora_entrega: horaEntrega, pz_entrega: pzEntrega,
        formapgto, condpgto, frete, dados,
      });
      if (r.CodStatus !== 1 || !r.id) { setErro(r.DescricaoStatus); return; }
      const idOrca = r.id;

      for (let i = 0; i < produtos.length; i++) {
        const p = produtos[i];
        await adicionarItemPreVenda({
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

        // cria estimativa se prazo foi escolhido
        if (p.regra && (p.dias ?? 0) > 0) {
          await criarEstimativa({
            clienteId:     clienteSel.id,
            clienteFilial: FILIAL,
            clienteNome:   clienteSel.nome,
            animalId:      0,
            animalFilial:  FILIAL,
            animalNome:    animal,
            dadosproId:    p.id_dadospro,
            descPro:       p.descricao,
            qtd:           p.qtd,
            dataCompra:    dataHoje(),
            dias:          p.dias!,
            orcaId:        idOrca,
            orcaFilial:    FILIAL,
          }).catch(() => null);
        }
      }

      router.push(`/prevendas/${idOrca}`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Nova Pré-venda</h1>

      {/* Cliente */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Cliente</h2>
          <button
            onClick={() => setShowNovoCliente(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {clienteOpts.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
              {clienteOpts.map((c, i) => (
                <li
                  key={c.id}
                  onClick={() => selecionarCliente(c)}
                  className={cn('cursor-pointer px-3 py-2 text-sm hover:bg-accent', i === cliIdx && 'bg-accent')}
                >
                  <span className="font-medium">{c.nome}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.telefone || c.celular}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {clienteSel && (
          <p className="text-sm text-muted-foreground">
            Selecionado: <strong>{clienteSel.nome}</strong>
            {(clienteSel.telefone || clienteSel.celular) && (
              <span className="ml-2">· {clienteSel.telefone || clienteSel.celular}</span>
            )}
          </p>
        )}
      </section>

      {/* Dados da venda */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Dados da Venda</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Vendedor <span className="text-destructive">*</span>
            </label>
            <select
              value={vendedorId}
              onChange={e => setVendedorId(e.target.value)}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                !vendedorId ? 'border-destructive/50' : '',
              )}
            >
              <option value="">— Selecione —</option>
              {vendedores.map(v => (
                <option key={v.id} value={String(v.id)}>{v.nome}</option>
              ))}
            </select>
          </div>
          {[
            { label: 'Animal / Pet', value: animal, set: setAnimal, placeholder: 'Ex: Rex' },
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
          <div>
            <label className="mb-1 block text-xs font-medium">Hora de Entrega</label>
            <input type="time" value={horaEntrega} onChange={e => setHoraEntrega(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Observações</label>
          <textarea value={dados} onChange={e => setDados(e.target.value)} rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </section>

      {/* Produtos */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Produtos</h2>
          <button
            onClick={() => setShowProdDlg(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
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

      {/* Totais */}
      <section className="rounded-lg border bg-card p-4">
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
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Salvando...' : 'Salvar Pré-venda'}
        </button>
      </div>

      {/* Dialog produto */}
      {showProdDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Adicionar Produto</h2>
              <button onClick={() => { setShowProdDlg(false); setBuscaPro(''); setProSel(null); setProdOpts([]); setProRegra(null); setProDias(null); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                ref={proRef}
                autoFocus
                value={buscaPro}
                onChange={e => { setBuscaPro(e.target.value); if (proSel) { setProSel(null); setProRegra(null); setProDias(null); } }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') setProIdx(i => Math.min(i + 1, prodOpts.length - 1));
                  if (e.key === 'ArrowUp')   setProIdx(i => Math.max(i - 1, 0));
                  if (e.key === 'Enter' && proIdx >= 0) selecionarProduto(prodOpts[proIdx]);
                  if (e.key === 'Escape') { setProdOpts([]); setProIdx(-1); }
                }}
                placeholder="Buscar produto..."
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {prodOpts.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
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

            {proSel && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">{proSel.descricao}</p>
                <p className="text-muted-foreground">Preço: {fmt(proSel.preco)} · Estoque: {proSel.estoque} {proSel.unidade}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Quantidade</label>
                <input type="number" min="0.01" step="0.01" value={proQtd} onChange={e => setProQtd(e.target.value)}
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
              </div>
            )}

            {proSel && (
              <p className="text-sm font-medium">
                Total: {fmt(proSel.preco * (parseFloat(proQtd) || 1) * (1 - (parseFloat(proDesc) || 0) / 100))}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowProdDlg(false); setBuscaPro(''); setProSel(null); setProdOpts([]); setProRegra(null); setProDias(null); }}
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
