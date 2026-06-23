'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Especie, Raca, TipoPelo, Servico, Profissional,
  VacinaCatalogo, Medicamento,
} from '@/types/petshop';
import {
  createServico, deleteServico, updateServico,
  createProfissional,
  createEspecie, deleteEspecie,
  createRaca, deleteRaca,
  createTipoPelo, deleteTipoPelo,
  createVacinaCatalogo, deleteVacinaCatalogo,
  createMedicamento,
} from '@/app/(petshop)/cadastros/actions';
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
import { Settings, Loader2, AlertCircle, Plus, Trash2, X, Search, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { corServicoCss } from '@/lib/cores';

interface Props {
  especies:     Especie[];
  racas:        Raca[];
  pelos:        TipoPelo[];
  servicos:     Servico[];
  profissionais:Profissional[];
  vacinas:      VacinaCatalogo[];
  medicamentos: Medicamento[];
}

const TABS = [
  { id: 'servicos',       label: 'Serviços' },
  { id: 'profissionais',  label: 'Profissionais' },
  { id: 'especies',       label: 'Espécies' },
  { id: 'racas',          label: 'Raças' },
  { id: 'pelos',          label: 'Tipos de Pelo' },
  { id: 'vacinas',        label: 'Vacinas' },
  { id: 'medicamentos',   label: 'Medicamentos' },
] as const;

type TabId = typeof TABS[number]['id'];

/** Converte a cor gravada (hex ou TColor Delphi) para o formato do <input type="color"> */
function corParaInputHex(cor: string | null | undefined): string {
  const css = corServicoCss(cor);
  if (!css) return '#3b82f6';
  if (css.startsWith('#')) {
    if (css.length === 4) return '#' + css.slice(1).split('').map((c) => c + c).join('');
    return css.toLowerCase();
  }
  const m = css.match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!m) return '#3b82f6';
  const h = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

// ── Componente de linha com delete ────────────────────────────────────────────
function Row({ children, onDelete, onEdit, canDelete = true, isPending }: {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  canDelete?: boolean;
  isPending?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/40">
      <div className="flex-1 min-w-0">{children}</div>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={onEdit}
          disabled={isPending}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {canDelete && onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 text-muted-foreground hover:text-red-600"
          onClick={onDelete}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── Form inline genérico ──────────────────────────────────────────────────────
function AddForm({ onClose, onSubmit, isPending, error, children }: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  error: string;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border p-4 space-y-3 bg-muted/20 mb-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">Novo registro</p>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {children}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ── Seção de Tab ──────────────────────────────────────────────────────────────
function TabSection({ count, total, onAdd, busca, onBusca, children }: {
  count: number;
  total?: number;
  onAdd: () => void;
  busca?: string;
  onBusca?: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {onBusca !== undefined && (
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Pesquisar..."
              value={busca ?? ''}
              onChange={(e) => onBusca(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {count}{total !== undefined && total !== count ? `/${total}` : ''}{' '}
            {count === 1 ? 'registro' : 'registros'}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />Adicionar
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CadastrosView({
  especies, racas, pelos, servicos, profissionais, vacinas, medicamentos,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('servicos');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [servEdit, setServEdit] = useState<Servico | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Select states for forms that need species / porte
  const [racaEspecie, setRacaEspecie] = useState('');
  const [racaPorte, setRacaPorte]     = useState('');
  const [peloEspecie, setPeloEspecie] = useState('');
  const [vacinaEspecie, setVacinaEspecie] = useState('');

  // Filtro de pesquisa (compartilhado — reseta ao trocar de aba)
  const [busca, setBusca] = useState('');

  function switchTab(t: TabId) {
    setTab(t);
    setShowForm(false);
    setServEdit(null);
    setFormError('');
    setBusca('');
    setRacaEspecie('');
    setRacaPorte('');
    setPeloEspecie('');
    setVacinaEspecie('');
  }

  function handleAction(
    fn: (prev: unknown, fd: FormData) => Promise<{ error?: string }>,
  ) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError('');
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const r = await fn(null, fd);
        if (r.error) { setFormError(r.error); return; }
        setShowForm(false);
        setServEdit(null);
        formRef.current?.reset();
        router.refresh();
      });
    };
  }

  function handleDelete(fn: (id: number) => Promise<{ error?: string }>, id: number) {
    startTransition(async () => {
      const r = await fn(id);
      if (r.error) { setFormError(r.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        Cadastros
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px',
              tab === t.id
                ? 'border border-b-background bg-background text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border bg-card p-5">

        {/* ── Serviços ── */}
        {tab === 'servicos' && (() => {
          const q = busca.trim().toLowerCase();
          const lista = (servicos ?? []).filter((s) => !q || s.descricao.toLowerCase().includes(q));
          return (
          <TabSection count={lista.length} total={(servicos ?? []).length} onAdd={() => { setShowForm(true); setFormError(''); }} busca={busca} onBusca={setBusca}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createServico)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Descrição *</Label>
                    <Input name="descricao" required placeholder="Ex: Banho e Tosa" />
                  </div>
                  <div className="space-y-1">
                    <Label>Duração (min)</Label>
                    <Input name="duracao" placeholder="60" />
                  </div>
                  <div className="space-y-1">
                    <Label>Cor do serviço</Label>
                    <input
                      type="color"
                      name="cor_status"
                      defaultValue="#3b82f6"
                      className="h-9 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                      title="Cor exibida nos cards e na legenda da agenda"
                    />
                  </div>
                </div>
              </AddForm>
            )}

            {/* ── Editar serviço ── */}
            {servEdit && (
              <form
                key={servEdit.id}
                onSubmit={handleAction((_prev, fd) => updateServico(servEdit.id, fd))}
                className="rounded-lg border p-4 space-y-3 bg-muted/20 mb-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">Editar serviço — {servEdit.descricao}</p>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setServEdit(null); setFormError(''); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Descrição *</Label>
                    <Input name="descricao" required defaultValue={servEdit.descricao} />
                  </div>
                  <div className="space-y-1">
                    <Label>Duração (min)</Label>
                    <Input name="duracao" defaultValue={servEdit.duracao} placeholder="60" />
                  </div>
                  <div className="space-y-1">
                    <Label>Cor do serviço</Label>
                    <input
                      type="color"
                      name="cor_status"
                      defaultValue={corParaInputHex(servEdit.cor_status)}
                      className="h-9 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                      title="Cor exibida nos cards e na legenda da agenda"
                    />
                  </div>
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{formError}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setServEdit(null); setFormError(''); }}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar alterações'}
                  </Button>
                </div>
              </form>
            )}
            <div className="rounded-md border overflow-hidden">
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">{q ? 'Nenhum serviço encontrado.' : 'Nenhum serviço cadastrado.'}</p>
              )}
              {lista.map((s) => (
                <Row
                  key={s.id}
                  onEdit={() => { setServEdit(s); setShowForm(false); setFormError(''); }}
                  onDelete={() => handleDelete(deleteServico, s.id)}
                  isPending={isPending}
                >
                  <div className="flex items-center gap-3">
                    {corServicoCss(s.cor_status) && (
                      <span
                        className="h-3 w-3 rounded-full shrink-0 border"
                        style={{ background: corServicoCss(s.cor_status)! }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{s.descricao}</p>
                      {s.duracao && <p className="text-xs text-muted-foreground">{s.duracao} min</p>}
                    </div>
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
          );
        })()}

        {/* ── Profissionais ── */}
        {tab === 'profissionais' && (() => {
          const q = busca.trim().toLowerCase();
          const lista = (profissionais ?? []).filter((p) =>
            !q || p.nome.toLowerCase().includes(q) ||
            (p.crmv ?? '').toLowerCase().includes(q) ||
            (p.email ?? '').toLowerCase().includes(q)
          );
          return (
          <TabSection count={lista.length} total={(profissionais ?? []).length} onAdd={() => { setShowForm(true); setFormError(''); }} busca={busca} onBusca={setBusca}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createProfissional)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Nome *</Label>
                    <Input name="nome" required placeholder="Nome completo" />
                  </div>
                  <div className="space-y-1">
                    <Label>CPF</Label>
                    <Input name="cpf" placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-1">
                    <Label>Celular</Label>
                    <Input name="celular" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input name="email" type="email" placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-1">
                    <Label>CRMV</Label>
                    <Input name="crmv" placeholder="CRMV-SP 00000" />
                  </div>
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">{q ? 'Nenhum profissional encontrado.' : 'Nenhum profissional cadastrado.'}</p>
              )}
              {lista.map((p) => (
                <Row key={p.id} canDelete={false} isPending={isPending}>
                  <div>
                    <p className="font-medium text-sm">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.crmv, p.celular, p.email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
          );
        })()}

        {/* ── Espécies ── */}
        {tab === 'especies' && (
          <TabSection count={especies.length} onAdd={() => { setShowForm(true); setFormError(''); }}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createEspecie)} isPending={isPending} error={formError}>
                <div className="space-y-1">
                  <Label>Descrição *</Label>
                  <Input name="descricao" required placeholder="Ex: Canino" />
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {especies.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">Nenhuma espécie cadastrada.</p>
              )}
              {(especies ?? []).map((e) => (
                <Row key={e.id} onDelete={() => handleDelete(deleteEspecie, e.id)} isPending={isPending}>
                  <p className="text-sm">{e.descricao}</p>
                </Row>
              ))}
            </div>
          </TabSection>
        )}

        {/* ── Raças ── */}
        {tab === 'racas' && (() => {
          const q = busca.trim().toLowerCase();
          const lista = (racas ?? []).filter((r) =>
            !q || r.descricao.toLowerCase().includes(q) ||
            (r.especie ?? '').toLowerCase().includes(q)
          );
          return (
          <TabSection count={lista.length} total={(racas ?? []).length} onAdd={() => { setShowForm(true); setFormError(''); }} busca={busca} onBusca={setBusca}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createRaca)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Descrição *</Label>
                    <Input name="descricao" required placeholder="Ex: Labrador" />
                  </div>
                  <div className="space-y-1">
                    <Label>Espécie</Label>
                    <Select value={racaEspecie} onValueChange={(v) => { if (v) setRacaEspecie(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(especies ?? []).map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="id_especie" value={racaEspecie} />
                  </div>
                  <div className="space-y-1">
                    <Label>Porte</Label>
                    <Select value={racaPorte} onValueChange={(v) => { if (v) setRacaPorte(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="P">Pequeno</SelectItem>
                        <SelectItem value="M">Médio</SelectItem>
                        <SelectItem value="G">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="porte" value={racaPorte} />
                  </div>
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">{q ? 'Nenhuma raça encontrada.' : 'Nenhuma raça cadastrada.'}</p>
              )}
              {lista.map((r) => (
                <Row key={r.id} onDelete={() => handleDelete(deleteRaca, r.id)} isPending={isPending}>
                  <div>
                    <p className="text-sm font-medium">{r.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.especie, r.porte === 'P' ? 'Pequeno' : r.porte === 'M' ? 'Médio' : r.porte === 'G' ? 'Grande' : r.porte].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
          );
        })()}

        {/* ── Tipos de Pelo ── */}
        {tab === 'pelos' && (
          <TabSection count={pelos.length} onAdd={() => { setShowForm(true); setFormError(''); }}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createTipoPelo)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Descrição *</Label>
                    <Input name="descricao" required placeholder="Ex: Curto" />
                  </div>
                  <div className="space-y-1">
                    <Label>Espécie</Label>
                    <Select value={peloEspecie} onValueChange={(v) => { if (v) setPeloEspecie(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(especies ?? []).map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="id_especie" value={peloEspecie} />
                  </div>
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {pelos.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">Nenhum tipo de pelo cadastrado.</p>
              )}
              {(pelos ?? []).map((p) => (
                <Row key={p.id} onDelete={() => handleDelete(deleteTipoPelo, p.id)} isPending={isPending}>
                  <div>
                    <p className="text-sm font-medium">{p.descricao}</p>
                    {p.especie && <p className="text-xs text-muted-foreground">{p.especie}</p>}
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
        )}

        {/* ── Vacinas catálogo ── */}
        {tab === 'vacinas' && (() => {
          const q = busca.trim().toLowerCase();
          const lista = (vacinas ?? []).filter((v) =>
            !q || v.descricao.toLowerCase().includes(q) ||
            (v.especie ?? '').toLowerCase().includes(q) ||
            (v.laboratorio ?? '').toLowerCase().includes(q)
          );
          return (
          <TabSection count={lista.length} total={(vacinas ?? []).length} onAdd={() => { setShowForm(true); setFormError(''); }} busca={busca} onBusca={setBusca}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createVacinaCatalogo)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Descrição *</Label>
                    <Input name="descricao" required placeholder="Ex: Antirrábica" />
                  </div>
                  <div className="space-y-1">
                    <Label>Espécie</Label>
                    <Select value={vacinaEspecie} onValueChange={(v) => { if (v) setVacinaEspecie(v); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(especies ?? []).map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="id_especie" value={vacinaEspecie} />
                  </div>
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">{q ? 'Nenhuma vacina encontrada.' : 'Nenhuma vacina cadastrada.'}</p>
              )}
              {lista.map((v) => (
                <Row key={v.id} onDelete={() => handleDelete(deleteVacinaCatalogo, v.id)} isPending={isPending}>
                  <div>
                    <p className="text-sm font-medium">{v.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {[v.especie, v.laboratorio].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
          );
        })()}

        {/* ── Medicamentos ── */}
        {tab === 'medicamentos' && (() => {
          const q = busca.trim().toLowerCase();
          const lista = (medicamentos ?? []).filter((m) =>
            !q || m.medicamento.toLowerCase().includes(q) ||
            (m.laboratorio ?? '').toLowerCase().includes(q) ||
            (m.aplicacao ?? '').toLowerCase().includes(q)
          );
          return (
          <TabSection count={lista.length} total={(medicamentos ?? []).length} onAdd={() => { setShowForm(true); setFormError(''); }} busca={busca} onBusca={setBusca}>
            {showForm && (
              <AddForm onClose={() => setShowForm(false)} onSubmit={handleAction(createMedicamento)} isPending={isPending} error={formError}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Medicamento *</Label>
                    <Input name="medicamento" required placeholder="Ex: Amoxicilina" />
                  </div>
                  <div className="space-y-1">
                    <Label>Laboratório</Label>
                    <Input name="laboratorio" placeholder="Laboratório fabricante" />
                  </div>
                  <div className="space-y-1">
                    <Label>Aplicação</Label>
                    <Input name="aplicacao" placeholder="Ex: Oral, Injetável" />
                  </div>
                </div>
              </AddForm>
            )}
            <div className="rounded-md border overflow-hidden">
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-3">{q ? 'Nenhum medicamento encontrado.' : 'Nenhum medicamento cadastrado.'}</p>
              )}
              {lista.map((m) => (
                <Row key={m.id} canDelete={false} isPending={isPending}>
                  <div>
                    <p className="text-sm font-medium">{m.medicamento}</p>
                    <p className="text-xs text-muted-foreground">
                      {[m.laboratorio, m.aplicacao].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Row>
              ))}
            </div>
          </TabSection>
          );
        })()}

      </div>
    </div>
  );
}
