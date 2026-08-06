'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAnimal } from '@/app/(petshop)/animais/[id]/actions';
import { Animal, Especie, Raca, TipoPelo } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2, Pencil, PawPrint, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import AnimalFotoUpload from './AnimalFotoUpload';
import PesoHistorico from './PesoHistorico';

interface Props {
  animal:   Animal;
  especies: Especie[];
  racas:    Raca[];
  pelos:    TipoPelo[];
  open?:          boolean;
  onOpenChange?:  (v: boolean) => void;
}

export default function EditarAnimalDialog({
  animal,
  especies,
  racas,
  pelos,
  open: openProp,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const modoExterno = openProp !== undefined;

  const [openInterno, setOpenInterno] = useState(false);
  const isOpen = modoExterno ? openProp! : openInterno;
  function setOpen(v: boolean) {
    modoExterno ? onOpenChange?.(v) : setOpenInterno(v);
  }

  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [isPending, startTransition]  = useTransition();

  const [sexo,        setSexo]        = useState(animal.sexo        || '');
  const [castrado,    setCastrado]    = useState(String(animal.castrado ?? 0));
  const [idEspecie,   setIdEspecie]   = useState(String(animal.id_especie || ''));
  const [especieNome, setEspecieNome] = useState(animal.especie     || '');
  const [idRaca,      setIdRaca]      = useState(String(animal.id_raca    || ''));
  const [racaNome,    setRacaNome]    = useState(animal.raca         || '');
  const [racaBusca,   setRacaBusca]   = useState(animal.raca         || '');
  const [racaAberta,  setRacaAberta]  = useState(false);
  const [idPelo,      setIdPelo]      = useState(String(animal.id_pelo    || ''));
  const [peloNome,    setPeloNome]    = useState(animal.pelo         || '');
  const [controlaRacao, setControlaRacao] = useState(
    (animal as any).controla_racao === 1 || (animal as any).controla_racao === '1'
  );
  const [obito,         setObito]         = useState(animal.obito === 1);
  const [confirmaObito, setConfirmaObito] = useState(false);

  const especieSel     = especies.find((e) => String(e.id) === idEspecie);
  const peloSel        = pelos.find((p) => String(p.id) === idPelo);
  // Lista completa, sem filtrar por espécie — muitas raças do cadastro
  // legado não têm espécie definida (ex.: variações de "SRD"), então
  // filtrar por espécie escondia opções válidas.
  const racasFiltradas = racas;
  const racasFiltBusca = racasFiltradas.filter((r) => r.descricao.toLowerCase().includes(racaBusca.toLowerCase()));
  const pelosFiltrados = idEspecie
    ? pelos.filter((p) => p.id_especie === 0 || String(p.id_especie) === idEspecie)
    : pelos;

  function handleEspecieChange(val: string) {
    setIdEspecie(val);
    setEspecieNome(especies.find((e) => String(e.id) === val)?.descricao ?? '');
    setIdRaca('');    setRacaNome('');    setRacaBusca('');
    setIdPelo('');    setPeloNome('');
  }

  function handleOpen() {
    setSexo(animal.sexo || '');
    setCastrado(String(animal.castrado ?? 0));
    setIdEspecie(String(animal.id_especie || ''));
    setEspecieNome(animal.especie || '');
    setIdRaca(String(animal.id_raca || ''));
    setRacaNome(animal.raca || '');
    setRacaBusca(animal.raca || '');
    setIdPelo(String(animal.id_pelo || ''));
    setPeloNome(animal.pelo || '');
    setControlaRacao(
      (animal as any).controla_racao === 1 || (animal as any).controla_racao === '1'
    );
    setObito(animal.obito === 1);
    setConfirmaObito(false);
    setError('');
    setSuccess(false);
    setOpen(true);
  }

  function buildFormData(form: HTMLFormElement): FormData {
    const fd = new FormData(form);
    fd.set('sexo',           sexo);
    fd.set('castrado',       castrado);
    fd.set('id_especie',     idEspecie);
    fd.set('especie',        especieNome);
    fd.set('id_raca',        idRaca);
    fd.set('raca',           racaNome);
    fd.set('id_pelo',        idPelo);
    fd.set('pelo',           peloNome);
    fd.set('controla_racao', controlaRacao ? '1' : '0');
    fd.set('obito',          obito ? '1' : '0');
    // Convenção do legado: PET_CADANIMAL.ATIVO = 1 significa INATIVO (invertido).
    // Óbito → ATIVO=1 (inativo); edição normal mantém ATIVO=0 (ativo).
    fd.set('ativo', obito ? '1' : '0');
    return fd;
  }

  const formRef2 = React.useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Se óbito está sendo marcado pela primeira vez, pede confirmação
    if (obito && animal.obito !== 1) {
      setConfirmaObito(true);
      return;
    }

    salvar(buildFormData(e.currentTarget));
  }

  function salvar(fd: FormData) {
    startTransition(async () => {
      const result = await updateAnimal(animal.id, animal.id_cliente, {}, fd);
      if (result.error) { setError(result.error); return; }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setOpen(false), 1200);
    });
  }

  function confirmarObitoESalvar() {
    setConfirmaObito(false);
    if (!formRef2.current) return;
    salvar(buildFormData(formRef2.current));
  }

  return (
    <>
      {!modoExterno && (
        <Button size="sm" variant="outline" onClick={handleOpen}>
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(v) => {
          if (v) handleOpen();
          else   setOpen(false);
        }}
      >
        <DialogContent className="w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">

          <DialogHeader className="px-6 pt-5 pb-4 border-b sticky top-0 bg-card z-10 rounded-t-xl">
            <DialogTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <PawPrint className="h-4 w-4" />
              </div>
              Editar Animal
              <span className="ml-1 text-muted-foreground font-normal text-sm">— {animal.nome}</span>
            </DialogTitle>
          </DialogHeader>

          <form ref={formRef2} onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* ── Foto do Animal ───────────────────────────────────── */}
            <AnimalFotoUpload animalId={animal.id} clienteId={animal.id_cliente} />

            {/* ── Dados do Animal ──────────────────────────────────── */}
            <section className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
                Dados do Animal
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ea-nome" className="text-sm">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ea-nome" name="nome" required
                    defaultValue={animal.nome}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ea-apelido" className="text-sm">Microchip</Label>
                  <Input
                    id="ea-apelido" name="apelido"
                    defaultValue={animal.apelido}
                    placeholder="Número do microchip"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Espécie */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Espécie</Label>
                  <Select value={idEspecie} onValueChange={(v) => { if (v) handleEspecieChange(v); }}>
                    <SelectTrigger className="h-9">
                      {especieSel
                        ? <span className="truncate text-sm">{especieSel.descricao}</span>
                        : <span className="text-muted-foreground text-sm">Selecione...</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {especies.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Raça — combobox com busca */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Raça</Label>
                  <div className="relative">
                    <Input
                      placeholder={idEspecie ? 'Buscar raça...' : 'Espécie primeiro'}
                      disabled={!idEspecie}
                      value={racaBusca}
                      onChange={(e) => {
                        setRacaBusca(e.target.value);
                        setIdRaca('');
                        setRacaNome('');
                        setRacaAberta(true);
                      }}
                      onFocus={() => { if (idEspecie) setRacaAberta(true); }}
                      onBlur={() => setTimeout(() => setRacaAberta(false), 150)}
                      className={cn('h-9', !idEspecie && 'opacity-50')}
                    />
                    {racaAberta && racasFiltBusca.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {racasFiltBusca.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIdRaca(String(r.id));
                              setRacaNome(r.descricao);
                              setRacaBusca(r.descricao);
                              setRacaAberta(false);
                            }}
                          >
                            {r.descricao}
                          </button>
                        ))}
                      </div>
                    )}
                    {racaAberta && racaBusca && racasFiltBusca.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                        Nenhuma raça encontrada.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tipo de Pelo */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo de Pelo</Label>
                  <Select
                    value={idPelo}
                    onValueChange={(v) => {
                      if (v) { setIdPelo(v); setPeloNome(pelos.find((p) => String(p.id) === v)?.descricao ?? ''); }
                    }}
                    disabled={pelosFiltrados.length === 0}
                  >
                    <SelectTrigger className="h-9">
                      {peloSel
                        ? <span className="truncate text-sm">{peloSel.descricao}</span>
                        : <span className="text-muted-foreground text-sm">Selecione...</span>}
                    </SelectTrigger>
                    <SelectContent>
                      {pelosFiltrados.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── Características ──────────────────────────────────── */}
            <section className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
                Características
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Sexo</Label>
                  <Select value={sexo} onValueChange={(v) => { if (v) setSexo(v); }}>
                    <SelectTrigger className="h-9">
                      {sexo
                        ? <span>{sexo === 'M' ? 'Macho' : 'Fêmea'}</span>
                        : <span className="text-muted-foreground text-sm">Selecione...</span>}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Macho</SelectItem>
                      <SelectItem value="F">Fêmea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Castrado</Label>
                  <Select value={castrado} onValueChange={(v) => { if (v) setCastrado(v); }}>
                    <SelectTrigger className="h-9">
                      <span>{castrado === '1' ? 'Sim' : 'Não'}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Não</SelectItem>
                      <SelectItem value="1">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ea-tipo" className="text-sm">Tipo</Label>
                  <Input
                    id="ea-tipo" name="tipo_animal"
                    defaultValue={animal.tipo_animal}
                    placeholder="Ex: Doméstico"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ea-nasc" className="text-sm">Data de Nascimento</Label>
                  <Input
                    id="ea-nasc" name="data_nascimento"
                    type="date"
                    defaultValue={animal.data_nascimento?.slice(0, 10)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={controlaRacao}
                    onChange={(e) => setControlaRacao(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <span className="text-sm">Controla Ração</span>
                </label>

                <label className={`flex items-center gap-2.5 cursor-pointer select-none w-fit ${obito ? 'opacity-100' : 'opacity-70'}`}>
                  <input
                    type="checkbox"
                    checked={obito}
                    onChange={(e) => setObito(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-destructive cursor-pointer"
                    disabled={animal.obito === 1}
                  />
                  <span className={`text-sm ${obito ? 'text-destructive font-medium' : ''}`}>
                    Óbito
                  </span>
                </label>
              </div>

              {obito && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  {animal.obito === 1
                    ? 'Este pet já está marcado como óbito.'
                    : 'Ao salvar, todas as agendas e estimativas futuras serão canceladas.'}
                </div>
              )}
            </section>

            {/* ── Dados Físicos ─────────────────────────────────────── */}
            <section className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
                Dados Físicos
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ea-peso" className="text-sm">Peso (kg)</Label>
                  <Input
                    id="ea-peso" name="peso"
                    defaultValue={animal.peso}
                    placeholder="Ex: 4.500"
                    inputMode="decimal"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ea-cor" className="text-sm">Cor / Pelagem</Label>
                  <Input
                    id="ea-cor" name="cor"
                    defaultValue={animal.cor}
                    placeholder="Ex: Caramelo"
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            {/* ── Histórico de Peso ────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
                Histórico de Peso
              </p>
              <PesoHistorico animalId={animal.id} filial={animal.filial} pesoAtual={Number(animal.peso) || undefined} />
            </section>

            {/* ── Observações ──────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
                Observações
              </p>
              <textarea
                name="obs"
                rows={2}
                defaultValue={animal.obs}
                placeholder="Informações relevantes sobre o animal..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </section>

            {/* Feedback */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Alterações salvas com sucesso!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || success}>
                {isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de confirmação de óbito ── */}
      {confirmaObito && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <TriangleAlert className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">Atenção!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ao marcar este Pet como <strong className="text-foreground">"Óbito"</strong>,
                  ele será definido como <strong className="text-foreground">Inativo</strong> e
                  todas as agendas e estimativas futuras vinculadas a este cadastro serão
                  <strong className="text-destructive"> canceladas automaticamente</strong>.
                </p>
                <p className="text-sm font-medium pt-1">Deseja continuar?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setConfirmaObito(false); setObito(false); }}
              >
                Não
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmarObitoESalvar}
                disabled={isPending}
              >
                {isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : 'Sim, registrar óbito'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
