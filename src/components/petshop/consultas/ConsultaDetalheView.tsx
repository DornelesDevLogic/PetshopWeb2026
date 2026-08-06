'use client';

import { useState, useTransition, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fecharConsulta,
  reabrirConsulta,
  updateConsulta,
  addProntuario,
  deleteProntuario,
  addVacina,
  deleteVacina,
  criarAgendaParaConsulta,
} from '@/app/(petshop)/consultas/[id]/actions';
import {
  ConsultaDetalhe,
  Prontuario,
  Exame,
  VacinaAplicada,
  ConfigAnamnese,
  Animal,
  AnexoExame,
} from '@/types/petshop';
import AnexosExame from '@/components/petshop/consultas/AnexosExame';
import {
  buscarItensAgenda,
  type ItemAgendaConsulta,
} from '@/app/(petshop)/consultas/nova/actions';
import {
  buscarProdutos,
  adicionarItemNaAgenda,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/nova/actions';
import { excluirItemAgenda } from '@/app/(petshop)/agenda/[id]/actions';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import {
  GRUPOS_ANAMNESE,
  gruposVisiveis,
  AnamneseField,
  AnamneseGroup,
} from '@/lib/anamnese';
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
  CheckCircle2,
  Stethoscope,
  ClipboardList,
  Syringe,
  PawPrint,
  Trash2,
  Plus,
  ChevronUp,
  Printer,
  Package,
  Search,
  X,
  MessageCircle,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  consulta:        ConsultaDetalhe;
  prontuarios:     Prontuario[];
  exames:          Exame[];
  vacinas:         VacinaAplicada[];
  config:          ConfigAnamnese | null;
  animal:          Animal | null;
  anexos:          AnexoExame[];
  clienteTelefone?: string;
}

/** Monta o link wa.me a partir de um telefone (com ou sem formatação) + mensagem */
function linkWhatsapp(telefone: string, mensagem: string): string | null {
  let digitos = telefone.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = '55' + digitos; // adiciona DDI Brasil se ausente
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

/**
 * O WhatsApp não permite anexar arquivo via link wa.me (limitação da própria
 * Meta, não dá pra contornar pelo navegador) — então baixamos o PDF pro
 * computador do usuário e, na sequência, abrimos a conversa já com o resumo
 * em texto. Falta só arrastar o PDF baixado pra dentro da conversa.
 */
function baixarPdfEEnviarWhatsapp(consultaId: number, filial: number, linkWa: string | null) {
  if (!linkWa) return;

  const a = document.createElement('a');
  a.href = `/api/petshop/consulta-pdf?id=${consultaId}&filial=${filial}`;
  a.download = `consulta-${consultaId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  window.open(linkWa, '_blank', 'noopener,noreferrer');
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTO:  'bg-blue-100 text-blue-700 border-blue-200',
  FECHADO: 'bg-green-100 text-green-700 border-green-200',
};

const textareaCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none';

export default function ConsultaDetalheView({
  consulta, prontuarios, exames, vacinas, config, animal, anexos, clienteTelefone,
}: Props) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const isAberto = consulta.status === 'ABERTO';
  const statusColor = STATUS_COLOR[consulta.status] ?? 'bg-muted text-muted-foreground border-border';

  // ── Grupos/abas visíveis conforme a configuração de anamnese ──────────────
  const grupos = useMemo(() => gruposVisiveis(config), [config]);
  const [abaAtiva, setAbaAtiva] = useState(grupos[0]?.key ?? 'geral');

  // ── Edição: consulta aberta já abre com os campos editáveis (sem lápis) ───
  const editando = isAberto;

  function valoresIniciais(): Record<string, string> {
    const v: Record<string, string> = {
      motivo:      consulta.motivo      ?? '',
      peso:        consulta.peso        ?? '',
      temperatura: consulta.temperatura ?? '',
    };
    for (const g of GRUPOS_ANAMNESE)
      for (const f of g.fields) {
        const raw = (consulta as unknown as Record<string, unknown>)[f.key];
        v[f.key] = raw === undefined || raw === null ? '' : String(raw);
      }
    return v;
  }
  const [editData, setEditData] = useState<Record<string, string>>(valoresIniciais);

  function setField(key: string, value: string) {
    setEditData((d) => ({ ...d, [key]: value }));
  }

  function act(fn: () => Promise<{ error?: string }>) {
    setErrorMsg('');
    startTransition(async () => {
      const r = await fn();
      if (r.error) setErrorMsg(r.error);
      else router.refresh();
    });
  }

  function salvarEdicao() {
    setErrorMsg('');
    startTransition(async () => {
      const r = await updateConsulta(consulta.id, editData);
      if (r.error) { setErrorMsg(r.error); return; }
      router.refresh();
    });
  }

  // ── Produtos / Medicamentos lançados na agenda vinculada ──────────────────
  // Estado local (em vez de derivar direto de consulta.agenda_id): permite
  // criar a agenda "por trás" na primeira tentativa de adicionar um produto,
  // sem esperar um refresh de página pra refletir o vínculo recém-criado.
  const [agendaId, setAgendaId]            = useState(consulta.agenda_id);
  const temAgenda = agendaId > 0;
  const [itensAgenda, setItensAgenda]      = useState<ItemAgendaConsulta[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(temAgenda);
  const [buscaPro, setBuscaPro]            = useState('');
  const [proOpts, setProOpts]              = useState<ProdutoResultado[]>([]);
  const [proSel, setProSel]                = useState<ProdutoResultado | null>(null);
  const [proQtd, setProQtd]                = useState('1');
  const [salvandoItem, setSalvandoItem]    = useState(false);
  const [erroItem, setErroItem]            = useState('');
  // ── Estimativa (lembrete de recompra) — mesmo padrão da Pré-venda/Tele-entrega ──
  const [proRegra, setProRegra]            = useState<RegraProduto | null>(null);
  const [proDias, setProDias]              = useState<number | null>(null);

  useEffect(() => {
    if (!agendaId) return;
    setCarregandoItens(true);
    buscarItensAgenda(agendaId, consulta.filial)
      .then(setItensAgenda)
      .finally(() => setCarregandoItens(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaId, consulta.filial]);

  const buscaProRef = useRef(buscaPro);
  buscaProRef.current = buscaPro;
  const debProdutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onChangeBuscaPro(v: string) {
    setBuscaPro(v);
    setProSel(null);
    if (debProdutoRef.current) clearTimeout(debProdutoRef.current);
    if (v.trim().length < 3) { setProOpts([]); return; }
    debProdutoRef.current = setTimeout(async () => {
      const r = await buscarProdutos(v.trim(), consulta.filial);
      if (buscaProRef.current.trim() === v.trim()) setProOpts(r);
    }, 300);
  }

  async function selecionarProdutoOpt(p: ProdutoResultado) {
    setProSel(p);
    setBuscaPro(p.nome_produto);
    setProOpts([]);
    setProDias(null);
    // verifica regra de estimativa (lembrete de recompra) — igual Pré-venda/Tele-entrega
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setProRegra(regras[0] ?? null);
    if (!regras[0]) setProDias(0); // sem regra → não cria
  }

  async function handleAddItemAgenda() {
    if (!proSel) return;
    if (proRegra && proDias === null) return; // deve escolher prazo primeiro
    const qtd = parseFloat(proQtd) || 1;
    setSalvandoItem(true);
    setErroItem('');

    // Consulta "tradicional" ainda sem agenda vinculada: cria (e vincula) a
    // agenda agora, na primeira tentativa de adicionar um produto — sem
    // exigir um clique separado antes.
    let alvoAgendaId = agendaId;
    if (!alvoAgendaId) {
      const rAgenda = await criarAgendaParaConsulta({
        consultaId:       consulta.id,
        filial:           consulta.filial,
        animalId:         consulta.animal_id,
        animalNome:       consulta.animal,
        proprietarioId:   consulta.proprietario_id,
        proprietarioNome: consulta.proprietario,
        veterinarioId:    consulta.veterinario_id,
        veterinarioNome:  consulta.veterinario,
        data:             consulta.data?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      });
      if (rAgenda.error || !rAgenda.agendaId) {
        setSalvandoItem(false);
        setErroItem(rAgenda.error || 'Não foi possível criar a agenda.');
        return;
      }
      alvoAgendaId = rAgenda.agendaId;
      setAgendaId(alvoAgendaId);
    }

    const r = await adicionarItemNaAgenda(
      alvoAgendaId, consulta.filial,
      proSel.id_dadospro, proSel.cod_filial,
      qtd, proSel.preco, 0, proSel.nome_produto,
      proSel.nome_produto, proSel.preco, proSel.cod_pro,
    );
    setSalvandoItem(false);
    if (r.error) { setErroItem(r.error); return; }

    // cria a estimativa se um prazo foi escolhido
    if (proRegra && (proDias ?? 0) > 0 && animal) {
      criarEstimativa({
        clienteId:     animal.id_cliente,
        clienteFilial: animal.filial_cliente,
        clienteNome:   animal.nome_cliente,
        animalId:      animal.id,
        animalFilial:  animal.filial,
        animalNome:    animal.nome,
        dadosproId:    proSel.id_dadospro,
        descPro:       proSel.nome_produto,
        qtd,
        dataCompra:    new Date().toISOString().split('T')[0],
        dias:          proDias!,
        orcaId:        alvoAgendaId,
        orcaFilial:    consulta.filial,
      }).catch(() => null);
    }

    setItensAgenda((prev) => [...prev, {
      id_item: 0, cod_pro: proSel.cod_pro, produto: proSel.nome_produto,
      descricao: proSel.nome_produto, unidade: proSel.unidade,
      qtd: String(qtd), valor: String(proSel.preco),
    }]);
    setBuscaPro(''); setProOpts([]); setProSel(null); setProQtd('1');
    setProRegra(null); setProDias(null);
  }

  async function handleRemoverItemAgenda(item: ItemAgendaConsulta) {
    if (!item.id_item) return;
    if (!confirm(`Remover "${item.descricao || item.produto}"?`)) return;
    const r = await excluirItemAgenda(agendaId, item.id_item, consulta.filial);
    if (r.error) { setErroItem(r.error); return; }
    setItensAgenda((prev) => prev.filter((i) => i.id_item !== item.id_item));
  }

  // ── Prontuário / Vacina add forms ─────────────────────────────────────────
  const [showProntuarioForm, setShowProntuarioForm] = useState(false);
  const prontuarioRef = useRef<HTMLFormElement>(null);
  const [showVacinaForm, setShowVacinaForm] = useState(false);
  const vacinaRef = useRef<HTMLFormElement>(null);
  const hoje  = new Date().toISOString().split('T')[0];
  const agora = new Date().toTimeString().slice(0, 5);

  function handleAddProntuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    act(() => addProntuario(consulta.id, consulta.animal_id, consulta.proprietario_id,
      consulta.animal, consulta.proprietario, consulta.veterinario_id, fd));
    setShowProntuarioForm(false);
    prontuarioRef.current?.reset();
  }

  function handleAddVacina(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    act(() => addVacina(consulta.id, consulta.animal_id, consulta.animal,
      consulta.veterinario_id, consulta.veterinario, fd));
    setShowVacinaForm(false);
    vacinaRef.current?.reset();
  }

  // ── Render de um campo da anamnese ────────────────────────────────────────
  function renderCampo(f: AnamneseField) {
    const valEdit = editData[f.key] ?? '';
    const valView = (consulta as unknown as Record<string, unknown>)[f.key];

    if (!editando) {
      // modo leitura
      let display: string;
      if (f.type === 'select' && f.options) {
        const opt = f.options.find((o) => String(o.value) === String(valView ?? ''));
        display = opt && opt.value !== 0 ? opt.label : '';
      } else {
        display = valView === undefined || valView === null ? '' : String(valView);
      }
      if (!display) return null;
      return (
        <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
          <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{display}</p>
        </div>
      );
    }

    // modo edição
    return (
      <div key={f.key} className={cn('space-y-1', f.full && 'sm:col-span-2')}>
        <Label>{f.label}</Label>
        {f.type === 'memo' ? (
          <textarea rows={3} value={valEdit} onChange={(e) => setField(f.key, e.target.value)} className={textareaCls} />
        ) : f.type === 'select' && f.options ? (
          <Select value={valEdit || '0'} onValueChange={(v) => setField(f.key, v ?? '')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={valEdit}
            onChange={(e) => setField(f.key, e.target.value)}
            inputMode={f.type === 'number' ? 'decimal' : undefined}
          />
        )}
      </div>
    );
  }

  function renderGrupo(g: AnamneseGroup) {
    const obrigatorio = g.obrigKey && config ? config[g.obrigKey] === 1 : false;
    return (
      <div className="space-y-4">
        {/* Campos especiais no topo do grupo Geral */}
        {g.key === 'geral' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Data de entrada</p>
              <p className="text-sm font-medium">{fmtData(consulta.data)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Profissional</p>
              <p className="text-sm font-medium">{consulta.veterinario || '—'}</p>
            </div>
            <div className={cn('space-y-1', editando && 'sm:col-span-1')}>
              <Label className="text-xs">Motivo da Consulta</Label>
              {editando
                ? <Input value={editData.motivo} onChange={(e) => setField('motivo', e.target.value)} />
                : <p className="text-sm font-medium">{consulta.motivo || '—'}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Peso (kg)</Label>
              {editando
                ? <Input value={editData.peso} onChange={(e) => setField('peso', e.target.value)} inputMode="decimal" />
                : <p className="text-sm font-medium">{consulta.peso ? `${consulta.peso} kg` : '—'}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temperatura (°C)</Label>
              {editando
                ? <Input value={editData.temperatura} onChange={(e) => setField('temperatura', e.target.value)} inputMode="decimal" />
                : <p className="text-sm font-medium">{consulta.temperatura ? `${consulta.temperatura} °C` : '—'}</p>}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {g.fields.map(renderCampo)}
        </div>

        {obrigatorio && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Preenchimento obrigatório nesta aba.
          </p>
        )}
      </div>
    );
  }

  const grupoAtivo = grupos.find((g) => g.key === abaAtiva) ?? grupos[0];

  // ── Envio do prontuário por WhatsApp — mesmo padrão de link wa.me usado na
  // Agenda; a API do WhatsApp não permite anexar arquivo via URL, então o
  // "prontuário" vai como texto formatado (o PDF completo fica pra imprimir).
  const mensagemWhatsapp = useMemo(() => {
    const linhas: string[] = [
      `*Prontuário — ${consulta.animal}*`,
      `Data: ${fmtData(consulta.data)}${consulta.veterinario ? ` · Dr(a). ${consulta.veterinario}` : ''}`,
    ];
    if (consulta.motivo) linhas.push(`Motivo: ${consulta.motivo}`);
    if (consulta.diagnostico) linhas.push(`Diagnóstico: ${consulta.diagnostico}`);
    if (consulta.prescricao) linhas.push(`Prescrição: ${consulta.prescricao}`);

    const ultimo = prontuarios[prontuarios.length - 1];
    if (ultimo) {
      linhas.push('', `Evolução (${fmtData(ultimo.data)} ${ultimo.hora?.slice(0, 5) ?? ''}):`);
      if (ultimo.obs) linhas.push(ultimo.obs);
      if (ultimo.medicacao) linhas.push(`Medicação: ${ultimo.medicacao}${ultimo.dose ? ` — ${ultimo.dose}` : ''}`);
    }

    linhas.push('', 'Qualquer dúvida, estamos à disposição!');
    return linhas.join('\n');
  }, [consulta, prontuarios]);

  const linkWhatsappConsulta = clienteTelefone ? linkWhatsapp(clienteTelefone, mensagemWhatsapp) : null;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/consultas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Consultas
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Consulta #{consulta.id}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {fmtData(consulta.data)}
              {agendaId > 0 && (
                <>
                  <span>·</span>
                  <Link
                    href={`/agenda/${agendaId}`}
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Agenda #{agendaId}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', statusColor)}>
            {isAberto ? 'Aberta' : 'Fechada'}
          </span>
          <a
            href={`/api/petshop/consulta-pdf?id=${consulta.id}&filial=${consulta.filial}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline">
              <Printer className="h-4 w-4 mr-1.5" />
              Imprimir PDF
            </Button>
          </a>
          <Button
            size="sm"
            variant="outline"
            disabled={!linkWhatsappConsulta}
            title={!linkWhatsappConsulta ? 'Cliente sem telefone/celular cadastrado' : 'Baixa o PDF da consulta e abre a conversa no WhatsApp — é só arrastar o arquivo baixado para dentro da conversa'}
            onClick={() => baixarPdfEEnviarWhatsapp(consulta.id, consulta.filial, linkWhatsappConsulta)}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 disabled:border-input disabled:text-muted-foreground disabled:hover:bg-transparent"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Enviar por WhatsApp
          </Button>
          {isAberto ? (
            <Button size="sm" onClick={() => act(() => fecharConsulta(consulta.id))} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Fechar Consulta
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => act(() => reabrirConsulta(consulta.id))} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}
        </div>
      )}

      {/* Paciente: foto + dados */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex gap-5">
          {/* Foto */}
          <div className="shrink-0">
            <div className="relative h-28 w-28 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center">
              <PawPrint className="h-10 w-10 text-muted-foreground/40" />
              {animal && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/petshop/animais/${animal.id}/foto`}
                  alt={consulta.animal}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>
          {/* Dados */}
          <div className="flex-1 min-w-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Animal</p>
              <p className="font-medium">{consulta.animal}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Espécie / Raça</p>
              <p className="font-medium">{[animal?.especie, animal?.raca].filter(Boolean).join(' · ') || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Nascimento</p>
              <p className="font-medium">{animal?.data_nascimento ? fmtData(animal.data_nascimento) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Proprietário</p>
              <Link href={`/clientes/${consulta.proprietario_id}`} className="font-medium hover:underline text-primary">
                {consulta.proprietario}
              </Link>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Veterinário</p>
              <p className="font-medium">{consulta.veterinario || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Data de Alta</p>
              <p className="font-medium">{fmtData(consulta.data_alta)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Anamnese — abas conforme configuração */}
      <div className="rounded-xl border bg-card">
        {/* Barra de abas + ações */}
        <div className="flex items-center justify-between border-b px-3 pt-2 gap-2">
          <div className="flex flex-wrap gap-1 -mb-px overflow-x-auto">
            {grupos.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setAbaAtiva(g.key)}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  g.key === abaAtiva
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pb-1 shrink-0">
            {editando && (
              <Button type="button" size="sm" disabled={isPending} onClick={salvarEdicao}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Salvar
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        <div className="p-5">
          {grupoAtivo ? renderGrupo(grupoAtivo) : (
            <p className="text-sm text-muted-foreground">Nenhuma aba configurada para exibição.</p>
          )}
        </div>
      </div>

      {/* Produtos / Medicamentos — vinculados diretamente à agenda de origem;
          se a consulta ainda não tiver agenda, ela é criada e vinculada
          automaticamente na primeira tentativa de adicionar um produto. */}
      {(temAgenda || isAberto) && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Produtos / Medicamentos
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            {temAgenda
              ? `Lançados aqui ficam vinculados à agenda #${agendaId} para faturar no Frente de Caixa.`
              : 'Ao adicionar o primeiro produto, uma agenda é criada automaticamente para faturar no Frente de Caixa.'}
          </p>

          {isAberto && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar produto ou medicamento..."
                value={buscaPro}
                onChange={(e) => onChangeBuscaPro(e.target.value)}
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
          )}

          {proSel && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{proSel.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">R$ {proSel.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <Input
                  type="number" min="0.01" step="0.01" value={proQtd}
                  onChange={(e) => setProQtd(e.target.value)}
                  className="w-20"
                />
                <Button
                  type="button" size="sm" onClick={handleAddItemAgenda}
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

          {!temAgenda ? null : carregandoItens ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Carregando itens já lançados...</p>
          ) : itensAgenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto lançado ainda.</p>
          ) : (
            <div className="rounded-md border divide-y">
              {itensAgenda.map((it, i) => (
                <div key={it.id_item || i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.descricao || it.produto}</p>
                    <p className="text-xs text-muted-foreground">{it.qtd} {it.unidade} · R$ {parseFloat(it.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  {isAberto && !!it.id_item && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-600" onClick={() => handleRemoverItemAgenda(it)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Anexos de Exames (PDF / imagem / documento) */}
      <AnexosExame consultaId={consulta.id} anexos={anexos} podeEditar={isAberto} />

      {/* Prontuários */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Prontuário ({prontuarios.length})
          </h2>
          {isAberto && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProntuarioForm((v) => !v)}>
              {showProntuarioForm ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {showProntuarioForm ? 'Cancelar' : 'Adicionar'}
            </Button>
          )}
        </div>

        {showProntuarioForm && (
          <form ref={prontuarioRef} onSubmit={handleAddProntuario} className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p_data">Data</Label>
                <Input id="p_data" name="data" type="date" defaultValue={hoje} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p_hora">Hora</Label>
                <Input id="p_hora" name="hora" type="time" defaultValue={agora} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p_obs">Evolução / Observações</Label>
              <textarea id="p_obs" name="obs" rows={3} className={textareaCls} placeholder="Registre a evolução do paciente..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p_medic">Medicação</Label>
                <Input id="p_medic" name="medicacao" placeholder="Medicação aplicada..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p_dose">Dose</Label>
                <Input id="p_dose" name="dose" placeholder="Dose..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowProntuarioForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        )}

        {prontuarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada de prontuário.</p>
        ) : (
          <div className="space-y-2">
            {prontuarios.map((p) => (
              <div key={p.id} className="rounded-lg border px-4 py-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{fmtData(p.data)} {p.hora?.slice(0, 5)}</span>
                    {p.box && <span className="text-xs bg-muted rounded px-1.5 py-0.5">Box {p.box}</span>}
                  </div>
                  {p.obs && <p className="text-sm leading-relaxed">{p.obs}</p>}
                  {p.medicacao && (
                    <p className="text-xs text-muted-foreground mt-1">💊 {p.medicacao}{p.dose ? ` — ${p.dose}` : ''}</p>
                  )}
                </div>
                {isAberto && (
                  <Button type="button" variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => act(() => deleteProntuario(consulta.id, p.id))} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vacinas */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Syringe className="h-3.5 w-3.5" />
            Vacinas do Paciente ({vacinas.length})
          </h2>
          {isAberto && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowVacinaForm((v) => !v)}>
              {showVacinaForm ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {showVacinaForm ? 'Cancelar' : 'Registrar'}
            </Button>
          )}
        </div>

        {showVacinaForm && (
          <form ref={vacinaRef} onSubmit={handleAddVacina} className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="v_nome">Vacina *</Label>
                <Input id="v_nome" name="vacina_nome" placeholder="Nome da vacina" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="v_data">Data de Aplicação</Label>
                <Input id="v_data" name="data" type="date" defaultValue={hoje} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="v_prox">Próxima Dose</Label>
                <Input id="v_prox" name="data_marcada" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="v_lab">Laboratório</Label>
                <Input id="v_lab" name="laboratorio" placeholder="Fabricante..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="v_obs">Observações</Label>
              <Input id="v_obs" name="obs" placeholder="Observações..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowVacinaForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Registrar'}
              </Button>
            </div>
          </form>
        )}

        {vacinas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma vacina registrada para este paciente.</p>
        ) : (
          <div className="space-y-2">
            {vacinas.map((v) => (
              <div key={v.id} className="rounded-lg border px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{v.vacina}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aplicada: {fmtData(v.data)}
                    {v.data_marcada ? ` · Próxima: ${fmtData(v.data_marcada)}` : ''}
                    {v.laboratorio ? ` · ${v.laboratorio}` : ''}
                  </p>
                  {v.obs && <p className="text-xs text-muted-foreground mt-0.5">{v.obs}</p>}
                </div>
                {isAberto && (
                  <Button type="button" variant="ghost" size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => act(() => deleteVacina(consulta.id, v.id))} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
