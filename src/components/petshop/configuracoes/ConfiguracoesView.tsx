'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  salvarConfiguracoes,
  type ConfiguracoesData,
} from '@/app/(petshop)/configuracoes/actions';
import { GRUPOS, type ParamDef, type Tabela } from './definicoes';
import IntegracoesPanel from './IntegracoesPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SlidersHorizontal, Loader2, AlertCircle, CheckCircle2, ShieldAlert,
  Search, X, Plug, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ABA_INTEGRACOES = 'integracoes';

interface Props {
  dados: ConfiguracoesData | null;
}

type Valores = Record<Tabela, Record<string, string>>;

function clonar(d: ConfiguracoesData): Valores {
  return {
    config:     { ...d.config },
    pet_config: { ...d.pet_config },
    confmail:   { ...d.confmail },
    anamnese:   { ...d.anamnese },
  };
}

/** Remove acentos para busca tolerante (configuração = configuracao) */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function ConfiguracoesView({ dados }: Props) {
  const router = useRouter();
  const [aba, setAba] = useState(GRUPOS[0].id);
  const [buscaCfg, setBuscaCfg] = useState('');
  const [valores, setValores] = useState<Valores | null>(dados ? clonar(dados) : null);
  const [isPending, startT]   = useTransition();
  const [msg, setMsg]   = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const original = useMemo(() => (dados ? clonar(dados) : null), [dados]);

  if (!dados || !valores || !original) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          Não foi possível carregar as configurações. Verifique se a API está
          atualizada (endpoint /configuracoes) e se você tem perfil Supervisor.
        </div>
      </div>
    );
  }

  function setValor(tabela: Tabela, col: string, v: string) {
    setMsg(null);
    setValores((prev) => prev && ({
      ...prev,
      [tabela]: { ...prev[tabela], [col]: v },
    }));
  }

  /** Parâmetro existe neste banco? (coluna veio no GET) */
  function existe(p: ParamDef): boolean {
    return valores![p.tabela][p.col] !== undefined;
  }

  /** Regra de dependência do legado (campo desabilitado se a condição falha) */
  function habilitado(p: ParamDef): boolean {
    if (!p.dependeDe) return true;
    return (valores![p.dependeDe.tabela][p.dependeDe.col] ?? '') === p.dependeDe.valor;
  }

  /** Diff entre valores atuais e originais, agrupado por tabela */
  function calcularAlteracoes(): Partial<ConfiguracoesData> {
    const out: Partial<ConfiguracoesData> = {};
    (['config', 'pet_config', 'confmail', 'anamnese'] as Tabela[]).forEach((t) => {
      const diff: Record<string, string> = {};
      for (const [col, v] of Object.entries(valores![t])) {
        if ((original![t][col] ?? '') !== v) diff[col] = v;
      }
      if (Object.keys(diff).length > 0) out[t] = diff;
    });
    return out;
  }

  const alteracoes  = calcularAlteracoes();
  const qtdAlterada = Object.values(alteracoes).reduce(
    (acc, t) => acc + Object.keys(t).length, 0,
  );

  function salvar() {
    setMsg(null);
    startT(async () => {
      const res = await salvarConfiguracoes(alteracoes);
      if (res.error) { setMsg({ tipo: 'erro', texto: res.error }); return; }
      setMsg({ tipo: 'ok', texto: `Configurações gravadas (${res.alterados} campo${res.alterados === 1 ? '' : 's'}).` });
      router.refresh();
    });
  }

  // ─── renderizadores de campo ───────────────────────────────────────────────

  function BotoesSimNao({ p, simVal, naoVal }: { p: ParamDef; simVal: string; naoVal: string }) {
    const v   = valores![p.tabela][p.col] ?? '';
    const off = !habilitado(p);
    return (
      <div className={cn('flex gap-1', off && 'opacity-40 pointer-events-none')}>
        {[{ val: simVal, lab: 'Sim' }, { val: naoVal, lab: 'Não' }].map(({ val, lab }) => (
          <button
            key={val}
            type="button"
            onClick={() => setValor(p.tabela, p.col, val)}
            className={cn(
              'rounded-md border px-3 py-1 text-xs font-medium transition-colors min-w-[44px]',
              v === val
                ? (lab === 'Sim'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-muted text-foreground border-input font-semibold')
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {lab}
          </button>
        ))}
      </div>
    );
  }

  function Campo({ p }: { p: ParamDef }) {
    const off = !habilitado(p);
    const v   = valores![p.tabela][p.col] ?? '';
    switch (p.tipo) {
      case 'TF': return <BotoesSimNao p={p} simVal="T" naoVal="F" />;
      case '01': return <BotoesSimNao p={p} simVal="1" naoVal="0" />;
      case 'SN': return <BotoesSimNao p={p} simVal="S" naoVal="N" />;
      case 'opcoes':
        return (
          <select
            value={v}
            disabled={off}
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className={cn(
              'rounded-md border border-input bg-background px-2 py-1.5 text-xs min-w-[140px]',
              off && 'opacity-40',
            )}
          >
            {p.opcoes!.map((o) => (
              <option key={o.valor} value={o.valor}>{o.label}</option>
            ))}
            {/* valor atual fora das opções conhecidas */}
            {v !== '' && !p.opcoes!.some((o) => o.valor === v) && (
              <option value={v}>{v}</option>
            )}
          </select>
        );
      case 'num':
        return (
          <Input
            value={v}
            disabled={off}
            inputMode="decimal"
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className="h-8 w-28 text-right text-sm"
          />
        );
      case 'hora':
        return (
          <Input
            value={v}
            disabled={off}
            placeholder="00:10:00"
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className="h-8 w-28 text-center text-sm font-mono"
          />
        );
      case 'senha':
        return (
          <Input
            type="password"
            value={v}
            disabled={off}
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className="h-8 w-56 text-sm"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={v}
            disabled={off}
            rows={3}
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className={cn(
              'w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm resize-y',
              off && 'opacity-40',
            )}
          />
        );
      default: // texto
        return (
          <Input
            value={v}
            disabled={off}
            onChange={(e) => setValor(p.tabela, p.col, e.target.value)}
            className="h-8 w-72 max-w-full text-sm"
          />
        );
    }
  }

  const naIntegracoes = aba === ABA_INTEGRACOES;
  const grupo = GRUPOS.find((g) => g.id === aba);

  // Busca global: pesquisa em todas as abas por label, coluna ou texto de ajuda
  const termo = normalizar(buscaCfg.trim());
  const buscando = !naIntegracoes && termo.length >= 2;

  const paramsVisiveis: { p: ParamDef; grupoTitulo?: string }[] = naIntegracoes
    ? []
    : buscando
    ? GRUPOS.flatMap((g) =>
        g.params
          .filter(existe)
          .filter((p) =>
            normalizar(p.label).includes(termo) ||
            p.col.includes(termo) ||
            (p.ajuda ? normalizar(p.ajuda).includes(termo) : false),
          )
          .map((p) => ({ p, grupoTitulo: g.titulo })),
      )
    : (grupo?.params ?? []).filter(existe).map((p) => ({ p }));

  const paramsFaltando = naIntegracoes || buscando ? 0 : (grupo?.params.length ?? 0) - paramsVisiveis.length;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          Configurações Gerais
        </h1>
        <div className="flex items-center gap-3">
          {qtdAlterada > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {qtdAlterada} alteraç{qtdAlterada === 1 ? 'ão' : 'ões'} não salva{qtdAlterada === 1 ? '' : 's'}
            </span>
          )}
          <Button onClick={salvar} disabled={isPending || qtdAlterada === 0}>
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gravando...</>
              : 'Gravar'}
          </Button>
        </div>
      </div>

      {msg && (
        <div className={cn(
          'flex items-center gap-2 rounded-md px-4 py-2.5 text-sm',
          msg.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {msg.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {msg.texto}
        </div>
      )}

      {/* Busca global */}
      <div className="flex items-center gap-2 rounded-md border border-input px-3 max-w-md">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={buscaCfg}
          onChange={(e) => setBuscaCfg(e.target.value)}
          placeholder="Pesquisar configuração... (em todas as abas)"
          className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {buscaCfg && (
          <button type="button" onClick={() => setBuscaCfg('')}>
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Abas (ocultas durante a busca global) */}
      {!buscando && (
        <div className="flex items-center gap-1.5 flex-wrap border-b pb-3">
          {GRUPOS.map((g) => (
            <button
              key={g.id}
              onClick={() => setAba(g.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                aba === g.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {g.titulo}
            </button>
          ))}
          <button
            onClick={() => setAba(ABA_INTEGRACOES)}
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              naIntegracoes
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            <Plug className="h-3 w-3" /> Integrações
          </button>
        </div>
      )}

      {buscando && (
        <p className="text-xs text-muted-foreground">
          {paramsVisiveis.length} resultado{paramsVisiveis.length === 1 ? '' : 's'} para
          {' '}<strong className="text-foreground">&ldquo;{buscaCfg.trim()}&rdquo;</strong> em todas as abas
        </p>
      )}

      {/* Aba Integrações — não é data-driven pelas 4 tabelas de config */}
      {naIntegracoes ? (
        <IntegracoesPanel />
      ) : (
      <div className="rounded-xl border bg-card divide-y">
        {paramsVisiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {buscando
              ? 'Nenhuma configuração encontrada para essa pesquisa.'
              : 'Nenhum parâmetro deste grupo existe no banco de dados atual.'}
          </p>
        ) : (
          paramsVisiveis.map(({ p, grupoTitulo }) => {
            const alterado = (original![p.tabela][p.col] ?? '') !== (valores![p.tabela][p.col] ?? '');
            return (
              <div
                key={`${p.tabela}.${p.col}`}
                className={cn(
                  'gap-4 px-4 py-2.5',
                  p.tipo === 'textarea' ? 'flex flex-col' : 'flex items-center justify-between',
                  alterado && 'bg-amber-50/50 dark:bg-amber-950/20',
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm flex items-center gap-1.5">
                    {p.label}
                    {grupoTitulo && (
                      <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold align-middle">
                        {grupoTitulo}
                      </span>
                    )}
                    <span
                      className="inline-flex text-muted-foreground/60 hover:text-muted-foreground cursor-help shrink-0"
                      title={`Chave técnica: ${p.tabela.toUpperCase()}.${p.col.toUpperCase()}`}
                    >
                      <Info className="h-3 w-3" />
                    </span>
                  </p>
                  {(p.ajuda || (p.dependeDe && !habilitado(p))) && (
                    <p className="text-[11px] text-muted-foreground">
                      {p.ajuda && <span>{p.ajuda}</span>}
                      {p.dependeDe && !habilitado(p) && (
                        <span className="ml-2 text-amber-600">· depende de outra opção ativa</span>
                      )}
                    </p>
                  )}
                </div>
                <Campo p={p} />
              </div>
            );
          })
        )}
      </div>
      )}

      {paramsFaltando > 0 && (
        <p className="text-xs text-muted-foreground">
          {paramsFaltando} parâmetro{paramsFaltando === 1 ? '' : 's'} deste grupo não exist{paramsFaltando === 1 ? 'e' : 'em'} no
          schema do banco atual e {paramsFaltando === 1 ? 'foi ocultado' : 'foram ocultados'}.
        </p>
      )}
    </div>
  );
}
