'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fecharConsulta,
  reabrirConsulta,
  addProntuario,
  deleteProntuario,
  addExame,
  deleteExame,
  addVacina,
  deleteVacina,
} from '@/app/(petshop)/consultas/[id]/actions';
import {
  ConsultaDetalhe,
  Prontuario,
  Exame,
  VacinaAplicada,
} from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Syringe,
  PawPrint,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  consulta:    ConsultaDetalhe;
  prontuarios: Prontuario[];
  exames:      Exame[];
  vacinas:     VacinaAplicada[];
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

export default function ConsultaDetalheView({ consulta, prontuarios, exames, vacinas }: Props) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // ── Prontuário add form ──
  const [showProntuarioForm, setShowProntuarioForm] = useState(false);
  const prontuarioRef = useRef<HTMLFormElement>(null);
  const hoje = new Date().toISOString().split('T')[0];
  const agora = new Date().toTimeString().slice(0, 5);

  // ── Exame add form ──
  const [showExameForm, setShowExameForm] = useState(false);
  const [novoExame, setNovoExame] = useState('');

  // ── Vacina add form ──
  const [showVacinaForm, setShowVacinaForm] = useState(false);
  const vacinaRef = useRef<HTMLFormElement>(null);

  function act(fn: () => Promise<{ error?: string }>) {
    setErrorMsg('');
    startTransition(async () => {
      const r = await fn();
      if (r.error) setErrorMsg(r.error);
      else router.refresh();
    });
  }

  function handleAddProntuario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    act(() =>
      addProntuario(
        consulta.id,
        consulta.animal_id,
        consulta.proprietario_id,
        consulta.animal,
        consulta.proprietario,
        consulta.veterinario_id,
        fd,
      ),
    );
    setShowProntuarioForm(false);
    prontuarioRef.current?.reset();
  }

  function handleAddExame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    act(() => addExame(consulta.id, consulta.animal_id, novoExame));
    setNovoExame('');
    setShowExameForm(false);
  }

  function handleAddVacina(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    act(() =>
      addVacina(
        consulta.id,
        consulta.animal_id,
        consulta.animal,
        consulta.veterinario_id,
        consulta.veterinario,
        fd,
      ),
    );
    setShowVacinaForm(false);
    vacinaRef.current?.reset();
  }

  const statusColor = STATUS_COLOR[consulta.status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const isAberto = consulta.status === 'ABERTO';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

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
            {consulta.status === 'ABERTO' ? 'Aberta' : 'Fechada'}
          </span>

          {isAberto ? (
            <Button
              size="sm"
              onClick={() => act(() => fecharConsulta(consulta.id))}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Fechar Consulta
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(() => reabrirConsulta(consulta.id))}
              disabled={isPending}
            >
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

      {/* Informações */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-1.5">
          <PawPrint className="h-3.5 w-3.5" />
          Paciente & Veterinário
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Animal</p>
            <Link href={`/clientes/${consulta.proprietario_id}`} className="font-medium hover:underline text-primary">
              {consulta.animal}
            </Link>
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

      {/* Dados Clínicos */}
      <div className="rounded-xl border bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Dados Clínicos
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Peso</p>
            <p className="font-medium">{consulta.peso ? `${consulta.peso} kg` : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Temperatura</p>
            <p className="font-medium">{consulta.temperatura ? `${consulta.temperatura} °C` : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Prognóstico</p>
            <p className="font-medium">{consulta.prognostico || '—'}</p>
          </div>
        </div>
        {consulta.motivo && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Motivo / Queixa</p>
            <p className="text-sm leading-relaxed bg-muted/30 rounded-md px-3 py-2">{consulta.motivo}</p>
          </div>
        )}
      </div>

      {/* Diagnóstico & Prescrição */}
      {(consulta.diagnostico || consulta.diagnostico_def || consulta.prescricao || consulta.obs_gerais || consulta.texto) && (
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Diagnóstico & Prescrição
          </h2>
          {consulta.diagnostico && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Diagnóstico Provisório</p>
              <p className="text-sm leading-relaxed">{consulta.diagnostico}</p>
            </div>
          )}
          {consulta.diagnostico_def && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Diagnóstico Definitivo</p>
              <p className="text-sm leading-relaxed">{consulta.diagnostico_def}</p>
            </div>
          )}
          {consulta.prescricao && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prescrição</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-md px-3 py-2">{consulta.prescricao}</p>
            </div>
          )}
          {consulta.obs_gerais && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações Gerais</p>
              <p className="text-sm leading-relaxed">{consulta.obs_gerais}</p>
            </div>
          )}
        </div>
      )}

      {/* Prontuários */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Prontuário ({prontuarios.length})
          </h2>
          {isAberto && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowProntuarioForm((v) => !v)}
            >
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
              <textarea
                id="p_obs"
                name="obs"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Registre a evolução do paciente..."
              />
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
              <Button type="button" variant="outline" size="sm" onClick={() => setShowProntuarioForm(false)}>
                Cancelar
              </Button>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      💊 {p.medicacao}{p.dose ? ` — ${p.dose}` : ''}
                    </p>
                  )}
                </div>
                {isAberto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => act(() => deleteProntuario(consulta.id, p.id))}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exames */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Exames Solicitados ({exames.length})
          </h2>
          {isAberto && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowExameForm((v) => !v)}
            >
              {showExameForm ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {showExameForm ? 'Cancelar' : 'Adicionar'}
            </Button>
          )}
        </div>

        {showExameForm && (
          <form onSubmit={handleAddExame} className="flex gap-2">
            <Input
              placeholder="Tipo de exame (ex: Hemograma, Ultrassom...)"
              value={novoExame}
              onChange={(e) => setNovoExame(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={isPending || !novoExame.trim()}>
              Adicionar
            </Button>
          </form>
        )}

        {exames.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum exame solicitado.</p>
        ) : (
          <div className="space-y-1.5">
            {exames.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                <span className="text-sm">{ex.tipo_exame}</span>
                {isAberto && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                    onClick={() => act(() => deleteExame(consulta.id, ex.id))}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vacinas */}
      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Syringe className="h-3.5 w-3.5" />
            Vacinas do Paciente ({vacinas.length})
          </h2>
          {isAberto && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowVacinaForm((v) => !v)}
            >
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
              <Button type="button" variant="outline" size="sm" onClick={() => setShowVacinaForm(false)}>
                Cancelar
              </Button>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-600"
                    onClick={() => act(() => deleteVacina(consulta.id, v.id))}
                    disabled={isPending}
                  >
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
