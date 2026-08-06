'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Especie, Raca, TipoPelo, Cliente, Animal } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/animais/novo/actions';
import { createAnimal as createAnimalCliente } from '@/app/(petshop)/clientes/[id]/actions';
import { createAnimal as createAnimalNovo } from '@/app/(petshop)/animais/novo/actions';
import { uploadFoto } from '@/app/(petshop)/animais/[id]/actions';
import { comprimirParaBase64, validarArquivo } from '@/lib/foto';
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
import { AlertCircle, ArrowLeft, Camera, ImageUp, Loader2, PawPrint, Plus, Search, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AnimalCriado = Pick<
  Animal,
  'id' | 'filial' | 'nome' | 'apelido' | 'especie' | 'raca' |
  'sexo' | 'castrado' | 'peso' | 'id_especie' | 'id_raca' |
  'id_cliente' | 'filial_cliente'
>;

interface Props {
  especies:      Especie[];
  racas:         Raca[];
  pelos:         TipoPelo[];
  /** Se fornecido, pula busca de cliente e usa diretamente */
  clienteId?:     number;
  filialCliente?: number;
  /** Modo inline: renderiza como página (sem Dialog), com busca de cliente */
  modoInline?:    boolean;
  /** Controle externo do dialog */
  open?:          boolean;
  onOpenChange?:  (v: boolean) => void;
  /** Callback ao criar (modo embutido em outro formulário) */
  onCriado?:      (animal: AnimalCriado) => void;
}

export default function NovoAnimalDialog({
  especies,
  racas,
  pelos,
  clienteId: clienteIdProp,
  filialCliente: filialClienteProp,
  modoInline = false,
  open: openProp,
  onOpenChange,
  onCriado,
}: Props) {
  const router = useRouter();
  const modoEmbutido = onCriado !== undefined;

  // Controle do dialog (quando não é inline)
  const [openInterno, setOpenInterno] = useState(false);
  const isOpen = modoEmbutido ? (openProp ?? false) : openInterno;
  function setOpen(v: boolean) {
    modoEmbutido ? onOpenChange?.(v) : setOpenInterno(v);
  }

  // ── Busca de cliente (só quando clienteId não é fornecido) ────────────────
  const precisaBuscarCliente = !clienteIdProp;
  const [buscaCliente, setBuscaCliente] = useState('');
  const [resultados, setResultados]     = useState<Cliente[]>([]);
  const [buscando, setBuscando]         = useState(false);
  const [clienteSel, setClienteSel]     = useState<Cliente | null>(null);

  const clienteId     = clienteIdProp     ?? clienteSel?.id     ?? 0;
  const filialCliente = filialClienteProp ?? clienteSel?.filial ?? 1;

  async function handleBuscarCliente() {
    if (!buscaCliente.trim()) return;
    setBuscando(true);
    const res = await buscarClientes(buscaCliente);
    setResultados(res);
    setBuscando(false);
  }

  // ── Foto do animal ────────────────────────────────────────────────────────
  const [fotoB64,    setFotoB64]    = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoErro,   setFotoErro]   = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const erroVal = validarArquivo(file);
    if (erroVal) { setFotoErro(erroVal); return; }
    setFotoErro('');
    try {
      const b64 = await comprimirParaBase64(file);
      setFotoB64(b64);
      setFotoPreview(`data:image/jpeg;base64,${b64}`);
    } catch (e: unknown) {
      setFotoErro(e instanceof Error ? e.message : 'Erro ao processar imagem.');
    }
  }

  // ── Campos do animal ──────────────────────────────────────────────────────
  const [error, setError]             = useState('');
  const [sexo, setSexo]               = useState('');
  const [castrado, setCastrado]       = useState('0');
  const [idEspecie, setIdEspecie]     = useState('');
  const [especieNome, setEspecieNome] = useState('');
  const [idRaca, setIdRaca]           = useState('');
  const [racaNome, setRacaNome]       = useState('');
  const [racaBusca, setRacaBusca]     = useState('');
  const [racaAberta, setRacaAberta]   = useState(false);
  const [idPelo, setIdPelo]           = useState('');
  const [peloNome, setPeloNome]       = useState('');
  const [controlaRacao, setControlaRacao] = useState(false);
  const [isPending, startTransition]  = useTransition();

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
    setIdRaca(''); setRacaNome(''); setRacaBusca('');
    setIdPelo(''); setPeloNome('');
  }

  function resetForm() {
    setError('');
    setSexo(''); setCastrado('0');
    setIdEspecie(''); setEspecieNome('');
    setIdRaca(''); setRacaNome(''); setRacaBusca('');
    setIdPelo(''); setPeloNome('');
    setControlaRacao(false);
    setFotoB64(null); setFotoPreview(null); setFotoErro('');
    if (precisaBuscarCliente) {
      setClienteSel(null); setResultados([]); setBuscaCliente('');
    }
  }

  function handleClose() { setOpen(false); resetForm(); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (precisaBuscarCliente && !clienteSel) {
      setError('Selecione um cliente.'); return;
    }
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('sexo',           sexo);
    formData.set('castrado',       castrado);
    formData.set('id_especie',     idEspecie);
    formData.set('especie',        especieNome);
    formData.set('id_raca',        idRaca);
    formData.set('raca',           racaNome);
    formData.set('id_pelo',        idPelo);
    formData.set('pelo',           peloNome);
    formData.set('controla_racao', controlaRacao ? '1' : '0');

    startTransition(async () => {
      let result: { error?: string; id?: number };
      if (precisaBuscarCliente) {
        // Modo página /animais/novo
        formData.set('cliente_id',    String(clienteId));
        formData.set('filial_cliente', String(filialCliente));
        formData.set('especie_nome',  especieNome);
        formData.set('raca_nome',     racaNome);
        formData.set('pelo_nome',     peloNome);
        result = await createAnimalNovo({}, formData);
      } else {
        result = await createAnimalCliente(clienteId, filialCliente, {}, formData);
      }

      if (result.error) { setError(result.error); return; }

      // Upload silencioso da foto, se o usuário selecionou uma
      if (fotoB64 && result.id) {
        await uploadFoto(result.id, clienteId, fotoB64);
      }

      if (modoInline) {
        router.push(result.id ? `/animais/${result.id}` : '/animais');
        return;
      }

      handleClose();

      if (modoEmbutido && result.id) {
        onCriado({
          id:             result.id,
          filial:         filialCliente,
          nome:           String(formData.get('nome') ?? ''),
          apelido:        String(formData.get('apelido') ?? ''),
          especie:        especieNome,
          raca:           racaNome,
          sexo,
          castrado:       Number(castrado),
          peso:           String(formData.get('peso') ?? ''),
          id_especie:     Number(idEspecie || 0),
          id_raca:        Number(idRaca || 0),
          id_cliente:     clienteId,
          filial_cliente: filialCliente,
        });
      } else {
        router.refresh();
      }
    });
  }

  // ── Conteúdo do formulário ────────────────────────────────────────────────
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Busca de cliente — só quando não foi passado clienteId */}
      {precisaBuscarCliente && (
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
            Proprietário
          </p>

          {clienteSel ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <User className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {[clienteSel.cpf_cnpj, clienteSel.celular || clienteSel.telefone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                onClick={() => { setClienteSel(null); setResultados([]); setBuscaCliente(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscarCliente(); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleBuscarCliente} disabled={buscando}>
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {resultados.length > 0 && (
                <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                  {resultados.map((c) => (
                    <button key={c.id} type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                      onClick={() => { setClienteSel(c); setResultados([]); }}>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {[c.cpf_cnpj, c.celular || c.telefone].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {resultados.length === 0 && buscaCliente && !buscando && (
                <p className="text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
              )}
            </>
          )}
        </section>
      )}

      {/* Dados do animal */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
          Dados do Animal
        </p>

        {/* Foto + Nome + Apelido em linha */}
        <div className="flex gap-4 items-end">

          {/* Área da foto */}
          <div className="shrink-0 space-y-1.5">
            <Label className="text-sm">Foto</Label>
            <div className="relative">
              {/* Input câmera (abre câmera traseira no celular) */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleFotoChange} />
              {/* Input galeria / explorador */}
              <input ref={fileRef} type="file" accept="image/*"
                className="hidden" onChange={handleFotoChange} />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Clique para escolher foto"
                className="h-[72px] w-[72px] rounded-xl border-2 border-dashed border-muted bg-muted/30 flex items-center justify-center overflow-hidden hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                {fotoPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={fotoPreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground/40" />
                )}
              </button>

              {fotoPreview && (
                <button
                  type="button"
                  title="Remover foto"
                  onClick={() => { setFotoB64(null); setFotoPreview(null); setFotoErro(''); }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Links câmera / arquivo */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <button type="button" onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                <Camera className="h-3 w-3" />Câmera
              </button>
              <span className="opacity-40">·</span>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                <ImageUp className="h-3 w-3" />Arquivo
              </button>
            </div>

            {fotoErro && (
              <p className="text-[10px] text-destructive leading-tight max-w-[72px]">{fotoErro}</p>
            )}
          </div>

          {/* Nome + Apelido */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="na-nome" className="text-sm">Nome <span className="text-destructive">*</span></Label>
              <Input id="na-nome" name="nome" required placeholder="Nome do animal" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-apelido" className="text-sm">Microchip</Label>
              <Input id="na-apelido" name="apelido" placeholder="Número do microchip" className="h-9" />
            </div>
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
                onChange={(e) => { setRacaBusca(e.target.value); setIdRaca(''); setRacaNome(''); setRacaAberta(true); }}
                onFocus={() => { if (idEspecie) setRacaAberta(true); }}
                onBlur={() => setTimeout(() => setRacaAberta(false), 150)}
                className={cn('h-9', !idEspecie && 'opacity-50')}
              />
              {racaAberta && racasFiltBusca.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                  {racasFiltBusca.map((r) => (
                    <button key={r.id} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIdRaca(String(r.id)); setRacaNome(r.descricao);
                        setRacaBusca(r.descricao); setRacaAberta(false);
                      }}>
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
              onValueChange={(v) => { if (v) { setIdPelo(v); setPeloNome(pelos.find((p) => String(p.id) === v)?.descricao ?? ''); } }}
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

      {/* Características */}
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
            <Label htmlFor="na-tipo" className="text-sm">Tipo</Label>
            <Input id="na-tipo" name="tipo_animal" placeholder="Ex: Doméstico" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="na-nasc" className="text-sm">Data de Nascimento</Label>
            <Input id="na-nasc" name="data_nascimento" type="date" className="h-9" />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={controlaRacao} onChange={(e) => setControlaRacao(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer" />
          <span className="text-sm">Controla Ração</span>
        </label>
      </section>

      {/* Dados Físicos */}
      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
          Dados Físicos
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="na-peso" className="text-sm">Peso (kg)</Label>
            <Input id="na-peso" name="peso" placeholder="Ex: 4.500" inputMode="decimal" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="na-cor" className="text-sm">Cor / Pelagem</Label>
            <Input id="na-cor" name="cor" placeholder="Ex: Caramelo" className="h-9" />
          </div>
        </div>
      </section>

      {/* Observações */}
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
          Observações
        </p>
        <textarea name="obs" rows={2} placeholder="Informações relevantes sobre o animal..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
      </section>

      {/* Avisos */}
      {precisaBuscarCliente && !clienteSel && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Selecione o proprietário antes de salvar.
        </p>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Botões */}
      <div className={cn('flex gap-3 pt-3 border-t', modoInline ? 'justify-end' : 'justify-end')}>
        <Button type="button" variant="outline" onClick={modoInline ? () => router.back() : handleClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || (precisaBuscarCliente && !clienteSel)}>
          {isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            : 'Salvar Animal'}
        </Button>
      </div>
    </form>
  );

  // ── Modo inline (página /animais/novo) ────────────────────────────────────
  if (modoInline) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
            Novo Animal
          </h1>
        </div>
        <div className="rounded-xl border bg-card p-5">
          {formContent}
        </div>
      </div>
    );
  }

  // ── Modo dialog ───────────────────────────────────────────────────────────
  return (
    <>
      {!modoEmbutido && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Animal
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b sticky top-0 bg-card z-10 rounded-t-xl">
            <DialogTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <PawPrint className="h-4 w-4" />
              </div>
              Novo Animal
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5">
            {formContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
