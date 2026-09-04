'use client';

import { useEffect, useState } from 'react';
import {
  buscarHistoricoProdutoMovimentacao,
  buscarHistoricoProdutoGiro,
} from '@/app/(petshop)/produtos/actions';
import {
  buscarCupomPorNumero,
  buscarItensCupom,
  buscarPagamentosCupom,
  type ItemCupomEspelho,
  type PagamentoCupom,
} from '@/app/(petshop)/relatorios/espelho-cupons/actions';
import type { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';
import CupomPreviewModal from '@/components/petshop/relatorios/CupomPreviewModal';
import type {
  HistoricoProdutoMovItem,
  HistoricoProdutoGiroResponse,
} from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { History, Loader2, TrendingUp, AlertTriangle, Receipt } from 'lucide-react';

interface Props {
  idPro:     number;
  codFilial: number;
  descricao: string;
  codPro:    string;
  onClose:   () => void;
}

function fmtMoeda(n: number): string {
  return (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtQtd(n: number): string {
  return (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function fmtData(s: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}/${m}/${y}` : s;
}

function hojeMenos(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

const HOJE = new Date().toISOString().slice(0, 10);

export default function HistoricoProdutoModal({ idPro, codFilial, descricao, codPro, onClose }: Props) {
  const [aba, setAba] = useState<'mov' | 'giro'>('mov');

  // ── Movimentação ──
  const [dataDe, setDataDe] = useState(hojeMenos(60));
  const [dataAte, setDataAte] = useState(HOJE);
  const [tipo, setTipo] = useState<'T' | 'S' | 'E'>('T');
  const [semTransf, setSemTransf] = useState(false);
  const [mov, setMov] = useState<HistoricoProdutoMovItem[]>([]);
  const [carregandoMov, setCarregandoMov] = useState(true);

  useEffect(() => {
    setCarregandoMov(true);
    buscarHistoricoProdutoMovimentacao({
      idPro, codFilial, filial: 0, tipo, dataDe, dataAte, semTransf,
    }).then((r) => {
      setMov(r.dados);
      setCarregandoMov(false);
    });
  }, [idPro, codFilial, tipo, dataDe, dataAte, semTransf]);

  // ── Cupom (drill-down a partir de uma linha "VENDA CUPOM") ──
  const [cupom, setCupom] = useState<CupomEspelho | null>(null);
  const [itensCupom, setItensCupom] = useState<ItemCupomEspelho[]>([]);
  const [pagamentosCupom, setPagamentosCupom] = useState<PagamentoCupom[]>([]);
  const [carregandoCupomItens, setCarregandoCupomItens] = useState(false);
  const [carregandoCupomPag, setCarregandoCupomPag] = useState(false);
  const [buscandoCupom, setBuscandoCupom] = useState(false);

  async function abrirCupom(m: HistoricoProdutoMovItem) {
    const numero = Number(m.nro_doc);
    if (!numero) return;
    setBuscandoCupom(true);
    const c = await buscarCupomPorNumero(numero, m.filial, m.data_doc);
    setBuscandoCupom(false);
    if (!c) return;
    setCupom(c);
    setItensCupom([]);
    setPagamentosCupom([]);
    setCarregandoCupomItens(true);
    setCarregandoCupomPag(true);
    buscarItensCupom(numero, c.filial, c.data).then((r) => {
      setItensCupom(r);
      setCarregandoCupomItens(false);
    });
    buscarPagamentosCupom(numero, c.filial, c.caixa, c.digito).then((r) => {
      setPagamentosCupom(r);
      setCarregandoCupomPag(false);
    });
  }

  // ── Giro ──
  const [giro, setGiro] = useState<HistoricoProdutoGiroResponse | null>(null);
  const [carregandoGiro, setCarregandoGiro] = useState(false);
  const [giroCarregado, setGiroCarregado] = useState(false);
  const [prazoEntrega, setPrazoEntrega] = useState('7');
  const [periodoCobertura, setPeriodoCobertura] = useState('30');

  function carregarGiro() {
    setCarregandoGiro(true);
    buscarHistoricoProdutoGiro({
      idPro, codFilial, filial: 0,
      prazoEntrega: Number(prazoEntrega) || 7,
      periodoCobertura: Number(periodoCobertura) || 30,
    }).then((r) => {
      setGiro(r);
      setCarregandoGiro(false);
      setGiroCarregado(true);
    });
  }

  useEffect(() => {
    if (aba === 'giro' && !giroCarregado) carregarGiro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  const a = giro?.analise;
  const temRuptura = (a?.dias_ruptura ?? 0) > 0 || (a?.ruptura_ate_entrega ?? 0) > 0;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico — {descricao}
            <span className="text-xs font-mono text-muted-foreground font-normal">{codPro}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b -mt-1">
          {(['mov', 'giro'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAba(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                aba === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'mov' ? 'Movimentação' : 'Giro / Sugestão de compra'}
            </button>
          ))}
        </div>

        {aba === 'mov' ? (
          <>
            <div className="flex items-end gap-3 flex-wrap pt-1">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">De</label>
                <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Até</label>
                <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tipo</label>
                <Select
                  value={tipo}
                  onValueChange={(v) => v && setTipo(v as 'T' | 'S' | 'E')}
                  items={[{ value: 'T', label: 'Todos' }, { value: 'S', label: 'Saída' }, { value: 'E', label: 'Entrada' }]}
                >
                  <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="T">Todos</SelectItem>
                    <SelectItem value="S">Saída</SelectItem>
                    <SelectItem value="E">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-1.5 text-sm pb-1.5">
                <input type="checkbox" checked={semTransf} onChange={(e) => setSemTransf(e.target.checked)} />
                Excluir transferências
              </label>
              <span className="ml-auto text-xs text-muted-foreground pb-1.5">
                {mov.length} {mov.length === 1 ? 'movimento' : 'movimentos'}
              </span>
            </div>

            <div className="flex-1 overflow-auto rounded-md border mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Saída</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Envolvido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carregandoMov ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell></TableRow>
                  ) : mov.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma movimentação no período.
                    </TableCell></TableRow>
                  ) : mov.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-mono whitespace-nowrap">
                        {fmtData(m.data_doc)} {m.hora && <span className="text-muted-foreground">{m.hora}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{m.tipo}</TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {m.qtd_entrada > 0 ? fmtQtd(m.qtd_entrada) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {m.qtd_saida > 0 ? fmtQtd(m.qtd_saida) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {m.preco > 0 ? `R$ ${fmtMoeda(m.preco)}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {m.nro_doc || '—'}
                          {m.tipo === 'VENDA CUPOM' && m.nro_doc && (
                            <button
                              type="button"
                              onClick={() => abrirCupom(m)}
                              disabled={buscandoCupom}
                              className="rounded border p-0.5 text-muted-foreground hover:text-primary hover:border-primary transition-colors disabled:opacity-50"
                              title="Ver cupom"
                            >
                              <Receipt className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.vendedor || m.fornecedor || m.entidade || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-auto space-y-4 pt-1">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Prazo de entrega (dias)</label>
                <Input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} className="h-8 text-sm w-24" inputMode="numeric" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Período de cobertura (dias)</label>
                <Input value={periodoCobertura} onChange={(e) => setPeriodoCobertura(e.target.value)} className="h-8 text-sm w-24" inputMode="numeric" />
              </div>
              <Button size="sm" variant="outline" onClick={carregarGiro} disabled={carregandoGiro}>
                {carregandoGiro ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Recalcular'}
              </Button>
            </div>

            {carregandoGiro ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !giro || !a ? (
              <p className="text-sm text-muted-foreground text-center py-16">Não foi possível carregar os dados de giro.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Estoque atual</p>
                    <p className="text-lg font-semibold font-mono">{fmtQtd(giro.estoque_atual)}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Vendas 7d / 30d / 90d</p>
                    <p className="text-sm font-semibold font-mono">
                      {fmtQtd(giro.vendas_7)} / {fmtQtd(giro.vendas_30)} / {fmtQtd(giro.vendas_90)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Cobertura atual</p>
                    <p className="text-lg font-semibold font-mono">{a.dias_cobertura_atual} dias</p>
                  </div>
                  <div className={`rounded-lg border p-3 ${temRuptura ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {temRuptura && <AlertTriangle className="h-3 w-3 text-red-600" />}
                      Sugestão de compra
                    </p>
                    <p className={`text-lg font-semibold font-mono ${temRuptura ? 'text-red-600' : ''}`}>
                      {fmtQtd(a.sugestao_compra)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-3 text-sm space-y-1">
                  <p className="font-medium flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    Análise de {fmtData(a.periodo_de)} a {fmtData(a.periodo_ate)} ({a.dias_periodo} dias)
                  </p>
                  <p className="text-muted-foreground">
                    Média de venda no período: <strong>{fmtQtd(a.media_venda_periodo)}/dia</strong> (média 30d: {fmtQtd(a.media_venda_30d)}/dia)
                  </p>
                  <p className="text-muted-foreground">
                    Consumo estimado até a entrega ({a.prazo_entrega}d): <strong>{fmtQtd(a.consumo_ate_entrega)}</strong>
                    {a.ruptura_ate_entrega > 0 && (
                      <span className="text-red-600 font-medium"> — ruptura projetada de {fmtQtd(a.ruptura_ate_entrega)} un.</span>
                    )}
                  </p>
                  {a.dias_ruptura > 0 && (
                    <p className="text-red-600 font-medium">
                      Estoque atual cobre só {a.dias_cobertura_atual} dos {a.prazo_entrega} dias até a próxima entrega — faltam {a.dias_ruptura} dias.
                    </p>
                  )}
                </div>

                {giro.estatistica_mensal.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Venda (qtd)</TableHead>
                          <TableHead className="text-right">Venda (R$)</TableHead>
                          <TableHead className="text-right">Compra (qtd)</TableHead>
                          <TableHead className="text-right">Compra (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {giro.estatistica_mensal.map((mes) => (
                          <TableRow key={mes.mes}>
                            <TableCell className="text-sm">{mes.mes_label}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{fmtQtd(mes.venda_qtd)}</TableCell>
                            <TableCell className="text-right text-sm font-mono">R$ {fmtMoeda(mes.venda_total)}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{fmtQtd(mes.compra_qtd)}</TableCell>
                            <TableCell className="text-right text-sm font-mono">R$ {fmtMoeda(mes.compra_total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {giro.compras_recentes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Últimas compras</p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Custo unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>NF</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {giro.compras_recentes.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm font-mono">{fmtData(c.data)}</TableCell>
                              <TableCell className="text-sm">{c.fornecedor || '—'}</TableCell>
                              <TableCell className="text-right text-sm font-mono">{fmtQtd(c.qtd)}</TableCell>
                              <TableCell className="text-right text-sm font-mono">R$ {fmtMoeda(c.custo)}</TableCell>
                              <TableCell className="text-right text-sm font-mono">R$ {fmtMoeda(c.total)}</TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{c.numeronf || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </div>

        {cupom && (
          <CupomPreviewModal
            cupom={cupom}
            itens={itensCupom}
            pagamentos={pagamentosCupom}
            carregandoItens={carregandoCupomItens}
            carregandoPagamentos={carregandoCupomPag}
            onClose={() => setCupom(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
