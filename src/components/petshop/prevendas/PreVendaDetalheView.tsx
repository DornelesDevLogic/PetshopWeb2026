'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, X, Save, CheckCircle, XCircle, Bell, Printer } from 'lucide-react';
import { printWindow } from '@/lib/printWindow';
import { gerarComandaPreVenda } from '@/components/petshop/print/comandaPreVenda';
import { cn } from '@/lib/utils';
import {
  PreVendaDetalhe,
  ItemPreVenda,
  atualizarPreVenda,
  confirmarPreVenda,
  cancelarPreVenda,
  adicionarItemPreVenda,
  removerItemPreVenda,
  buscarProdutosPrevenda,
  ProdutoBuscaItem,
} from '@/app/(petshop)/prevendas/actions';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import { FILIAL } from '@/lib/filial';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(s: string) {
  if (!s) return '-';
  const d = s.split('T')[0];
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const STATUS_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  2: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  4: { label: 'Cancelado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

interface Props {
  prevenda: PreVendaDetalhe;
  itens:    ItemPreVenda[];
}

export default function PreVendaDetalheView({ prevenda, itens: itensInit }: Props) {
  const router = useRouter();
  const [pending, startT] = useTransition();
  const [itens, setItens] = useState(itensInit);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const editavel = prevenda.status === 1 || prevenda.status === 2;

  // campos editáveis
  const [profissional, setProfissional] = useState(prevenda.profissional);
  const [animal, setAnimal] = useState(prevenda.animal);
  const [dataEntrega, setDataEntrega] = useState(prevenda.data_entrega?.split('T')[0] ?? '');
  const [horaEntrega, setHoraEntrega] = useState(prevenda.hora_entrega ?? '');
  const [pzEntrega, setPzEntrega] = useState(prevenda.pz_entrega ?? '');
  const [formapgto, setFormapgto] = useState(prevenda.formapgto);
  const [condpgto, setCondpgto] = useState(prevenda.condpgto);
  const [frete, setFrete] = useState(prevenda.frete ?? '');
  const [dados, setDados] = useState(prevenda.dados ?? '');

  // modal cancelamento
  const [showCancel, setShowCancel] = useState(false);
  const [just, setJust] = useState('');

  // produto
  const [showProdDlg, setShowProdDlg] = useState(false);
  const [buscaPro, setBuscaPro] = useState('');
  const [prodOpts, setProdOpts] = useState<ProdutoBuscaItem[]>([]);
  const [proIdx, setProIdx] = useState(-1);
  const [proSel, setProSel] = useState<ProdutoBuscaItem | null>(null);
  const [proQtd, setProQtd] = useState('1');
  const [proDesc, setProDesc] = useState('0');
  const [proRegra, setProRegra] = useState<RegraProduto | null>(null);
  const [proDias, setProDias] = useState<number | null>(null);
  const proRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showProdDlg || buscaPro.length < 2) { setProdOpts([]); return; }
    const t = setTimeout(async () => setProdOpts(await buscarProdutosPrevenda(buscaPro)), 300);
    return () => clearTimeout(t);
  }, [buscaPro, showProdDlg]);

  async function selProd(p: ProdutoBuscaItem) {
    setProSel(p); setBuscaPro(p.descricao); setProdOpts([]); setProIdx(-1);
    setProDias(null);
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setProRegra(regras[0] ?? null);
    if (!regras[0]) setProDias(0);
  }

  async function handleAddProduto() {
    if (!proSel) return;
    const qtd  = parseFloat(proQtd) || 1;
    const desc = parseFloat(proDesc) || 0;
    const valorUnit = proSel.preco;
    const valorTotal = valorUnit * qtd;
    const valorLiq   = valorTotal * (1 - desc / 100);
    startT(async () => {
      const r = await adicionarItemPreVenda({
        id_orca:        prevenda.id,
        fk_id_dadospro: proSel!.id_dadospro,
        fk_cod_filial:  proSel!.filial,
        cod_prod:       proSel!.cod_pro,
        descpro:        proSel!.descricao,
        qtd, valor: valorTotal, valorliq: valorLiq,
        desconto: desc, preco_tabela: valorUnit,
        ordem: itens.length + 1,
      });
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus ?? 'Erro ao adicionar.'); return; }
      if (proRegra && (proDias ?? 0) > 0) {
        await criarEstimativa({
          clienteId:     prevenda.cliente_id,
          clienteFilial: FILIAL,
          clienteNome:   prevenda.cliente,
          animalId:      0,
          animalFilial:  FILIAL,
          animalNome:    prevenda.animal ?? '',
          dadosproId:    proSel!.id_dadospro,
          descPro:       proSel!.descricao,
          qtd,
          dataCompra:    new Date().toISOString().split('T')[0],
          dias:          proDias!,
          orcaId:        prevenda.id,
          orcaFilial:    FILIAL,
        }).catch(() => null);
      }
      setItens(prev => [...prev, {
        id_prodorca: r.id_prodorca ?? 0,
        id_orca: prevenda.id,
        cod_prod: proSel!.cod_pro,
        desc_pro: proSel!.descricao,
        descpro:  proSel!.descricao,
        qtd, valor: valorTotal, valorliq: valorLiq,
        desconto: desc, preco_tabela: valorUnit,
        unid_pro: proSel!.unidade, status_vendido: 'N',
        ordem: itens.length + 1,
      }]);
      setShowProdDlg(false); setBuscaPro(''); setProSel(null); setProQtd('1'); setProDesc('0'); setProdOpts([]);
      setProRegra(null); setProDias(null);
      setSucesso('Produto adicionado.'); setTimeout(() => setSucesso(''), 3000);
    });
  }

  async function handleRemoverItem(item: ItemPreVenda) {
    if (!confirm(`Remover "${item.desc_pro || item.descpro}"?`)) return;
    startT(async () => {
      const r = await removerItemPreVenda(item.id_prodorca);
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus ?? 'Erro ao remover.'); return; }
      setItens(prev => prev.filter(i => i.id_prodorca !== item.id_prodorca));
    });
  }

  async function handleSalvar() {
    setErro(''); setSucesso('');
    const subTotal = itens.reduce((s, i) => s + i.valor, 0);
    const totalDesc = itens.reduce((s, i) => s + i.valor * (i.desconto / 100), 0);
    startT(async () => {
      const r = await atualizarPreVenda({
        id: prevenda.id,
        profissional, animal, data_entrega: dataEntrega,
        hora_entrega: horaEntrega, pz_entrega: pzEntrega,
        formapgto, condpgto, frete, dados,
        sub_total: subTotal, desconto: totalDesc,
        val_produtos: subTotal, valor: subTotal - totalDesc,
      });
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus); return; }
      setSucesso('Salvo com sucesso!'); setTimeout(() => setSucesso(''), 3000);
      router.refresh();
    });
  }

  async function handleConfirmar() {
    startT(async () => {
      const r = await confirmarPreVenda(prevenda.id);
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus); return; }
      router.refresh();
    });
  }

  async function handleCancelar() {
    if (!just.trim()) { setErro('Informe a justificativa.'); return; }
    startT(async () => {
      const r = await cancelarPreVenda(prevenda.id, just.trim());
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus); return; }
      setShowCancel(false); router.refresh();
    });
  }

  const subTotal  = itens.reduce((s, i) => s + i.valor, 0);
  const totalDesc = itens.reduce((s, i) => s + i.valor * (i.desconto / 100), 0);
  const totalFinal = subTotal - totalDesc;

  function handlePrint() {
    const html = gerarComandaPreVenda({
      id:           prevenda.id,
      cliente:      prevenda.cliente,
      data:         prevenda.data,
      hora:         prevenda.hora,
      data_entrega: dataEntrega,
      hora_entrega: horaEntrega,
      pz_entrega:   pzEntrega,
      animal:       animal,
      profissional: profissional,
      formapgto:    formapgto,
      condpgto:     condpgto,
      dados:        dados,
      desconto:     totalDesc,
      itens:        itens.map(i => ({
        produto: i.desc_pro || i.descpro,
        qtd:     i.qtd,
        valor:   i.valorliq,
      })),
    });
    printWindow(html);
  }

  const st = STATUS_LABEL[prevenda.status] ?? { label: String(prevenda.status), cls: 'bg-gray-100 text-gray-600' };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pré-venda #{prevenda.id}</h1>
          <p className="text-sm text-muted-foreground">{prevenda.cliente} · {fmtDate(prevenda.data)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${st.cls}`}>{st.label}</span>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Alertas */}
      {erro    && <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/30">{erro}</p>}
      {sucesso && <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950/30">{sucesso}</p>}

      {prevenda.status === 4 && prevenda.justificativa && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900 dark:bg-red-950/30">
          <span className="font-medium text-red-700 dark:text-red-400">Cancelado: </span>
          <span className="text-red-600 dark:text-red-300">{prevenda.justificativa}</span>
        </div>
      )}

      {/* Dados gerais */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Dados da Venda</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Animal / Pet</label>
            <input value={animal} onChange={e => setAnimal(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Profissional / Vendedor</label>
            <input value={profissional} onChange={e => setProfissional(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Prazo de Entrega</label>
            <input value={pzEntrega} onChange={e => setPzEntrega(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Data de Entrega</label>
            <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Hora de Entrega</label>
            <input type="time" value={horaEntrega} onChange={e => setHoraEntrega(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo de Frete</label>
            <input value={frete} onChange={e => setFrete(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Forma de Pagamento</label>
            <input value={formapgto} onChange={e => setFormapgto(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Condição de Pagamento</label>
            <input value={condpgto} onChange={e => setCondpgto(e.target.value)} disabled={!editavel}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Observações</label>
          <textarea value={dados} onChange={e => setDados(e.target.value)} rows={2} disabled={!editavel}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </section>

      {/* Produtos */}
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Produtos</h2>
          {editavel && (
            <button onClick={() => setShowProdDlg(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </button>
          )}
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-muted-foreground">
                <th className="py-1 text-left">Produto</th>
                <th className="py-1 text-right">Qtd</th>
                <th className="py-1 text-right">Valor</th>
                <th className="py-1 text-right">Desc%</th>
                <th className="py-1 text-right">Líquido</th>
                {editavel && <th className="py-1" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.map(item => (
                <tr key={item.id_prodorca}>
                  <td className="py-1.5">
                    <span className="font-medium">{item.desc_pro || item.descpro}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.cod_prod}</span>
                  </td>
                  <td className="py-1.5 text-right">{item.qtd} {item.unid_pro}</td>
                  <td className="py-1.5 text-right">{fmt(item.valor)}</td>
                  <td className="py-1.5 text-right">{item.desconto}%</td>
                  <td className="py-1.5 text-right font-medium">{fmt(item.valorliq)}</td>
                  {editavel && (
                    <td className="py-1.5 text-right">
                      <button onClick={() => handleRemoverItem(item)} disabled={pending}
                        className="text-red-500 hover:text-red-700 disabled:opacity-40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
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

      {/* Botões de ação */}
      {editavel && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button onClick={() => { setShowCancel(true); setJust(''); setErro(''); }}
              disabled={pending}
              className="flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50">
              <XCircle className="h-4 w-4" /> Cancelar Pré-venda
            </button>
            {prevenda.status === 1 && (
              <button onClick={handleConfirmar} disabled={pending}
                className="flex items-center gap-2 rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> Confirmar
              </button>
            )}
          </div>
          <button onClick={handleSalvar} disabled={pending}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {pending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}

      {/* Modal cancelamento */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">Cancelar Pré-venda #{prevenda.id}</h2>
            <label className="mb-1 block text-sm font-medium">Justificativa <span className="text-red-500">*</span></label>
            <textarea value={just} onChange={e => setJust(e.target.value)} rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setShowCancel(false); setErro(''); }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent">
                Voltar
              </button>
              <button onClick={handleCancelar} disabled={pending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog produto */}
      {showProdDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Adicionar Produto</h2>
              <button onClick={() => { setShowProdDlg(false); setBuscaPro(''); setProSel(null); setProdOpts([]); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                ref={proRef}
                autoFocus
                value={buscaPro}
                onChange={e => { setBuscaPro(e.target.value); if (proSel) setProSel(null); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') setProIdx(i => Math.min(i + 1, prodOpts.length - 1));
                  if (e.key === 'ArrowUp')   setProIdx(i => Math.max(i - 1, 0));
                  if (e.key === 'Enter' && proIdx >= 0) selProd(prodOpts[proIdx]);
                  if (e.key === 'Escape') { setProdOpts([]); setProIdx(-1); }
                }}
                placeholder="Buscar produto..."
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {prodOpts.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
                  {prodOpts.map((p, i) => (
                    <li key={p.id_dadospro} onClick={() => selProd(p)}
                      className={cn('cursor-pointer px-3 py-2 text-sm hover:bg-accent', i === proIdx && 'bg-accent')}>
                      <span className="font-medium">{p.descricao}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{p.cod_pro} · {fmt(p.preco)} · Est: {p.estoque}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {proSel && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
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
                    <button key={opt.val} onClick={() => setProDias(opt.val)}
                      className={cn('rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                        proDias === opt.val
                          ? opt.val === 0 ? 'border-gray-400 bg-gray-400 text-white' : 'border-amber-500 bg-amber-500 text-white'
                          : opt.val === 0 ? 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                          : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40',
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>
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
              <button onClick={handleAddProduto} disabled={!proSel || pending || (proRegra !== null && proDias === null)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                {pending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
