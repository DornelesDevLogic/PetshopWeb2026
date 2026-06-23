'use client';

import { useState, useTransition, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  consulta:    ConsultaDetalhe;
  prontuarios: Prontuario[];
  exames:      Exame[];
  vacinas:     VacinaAplicada[];
  config:      ConfigAnamnese | null;
  animal:      Animal | null;
  anexos:      AnexoExame[];
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
  consulta, prontuarios, exames, vacinas, config, animal, anexos,
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
            <p className="text-sm text-muted-foreground mt-0.5">{fmtData(consulta.data)}</p>
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
