'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAnimal } from '@/app/(petshop)/clientes/[id]/actions';
import { Especie, Raca, TipoPelo } from '@/types/petshop';
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
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Plus } from 'lucide-react';

interface Props {
  clienteId:     number;
  filialCliente: number;
  especies:      Especie[];
  racas:         Raca[];
  pelos:         TipoPelo[];
}

export default function NovoAnimalDialog({
  clienteId,
  filialCliente,
  especies,
  racas,
  pelos,
}: Props) {
  const router = useRouter();
  const [open, setOpen]              = useState(false);
  const [error, setError]            = useState('');
  const [sexo, setSexo]              = useState<string>('');
  const [castrado, setCastrado]      = useState<string>('0');
  const [idEspecie, setIdEspecie]    = useState<string>('');
  const [especieNome, setEspecieNome]= useState<string>('');
  const [idRaca, setIdRaca]          = useState<string>('');
  const [racaNome, setRacaNome]      = useState<string>('');
  const [idPelo, setIdPelo]          = useState<string>('');
  const [peloNome, setPeloNome]      = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Raças filtradas pela espécie selecionada
  const racasFiltradas = idEspecie
    ? racas.filter((r) => String(r.id_especie) === idEspecie)
    : racas;

  // Pelos filtrados pela espécie selecionada (0 = geral)
  const pelosFiltrados = idEspecie
    ? pelos.filter((p) => p.id_especie === 0 || String(p.id_especie) === idEspecie)
    : pelos;

  function handleEspecieChange(val: string) {
    setIdEspecie(val);
    const esp = especies.find((e) => String(e.id) === val);
    setEspecieNome(esp?.descricao ?? '');
    setIdRaca('');
    setRacaNome('');
    setIdPelo('');
    setPeloNome('');
  }

  function handleRacaChange(val: string) {
    setIdRaca(val);
    const r = racas.find((r) => String(r.id) === val);
    setRacaNome(r?.descricao ?? '');
  }

  function handlePeloChange(val: string) {
    setIdPelo(val);
    const p = pelos.find((p) => String(p.id) === val);
    setPeloNome(p?.descricao ?? '');
  }

  function handleClose() {
    setOpen(false);
    setError('');
    setSexo('');
    setCastrado('0');
    setIdEspecie('');
    setEspecieNome('');
    setIdRaca('');
    setRacaNome('');
    setIdPelo('');
    setPeloNome('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    // Injetar valores controlados
    formData.set('sexo',      sexo);
    formData.set('castrado',  castrado);
    formData.set('id_especie', idEspecie);
    formData.set('especie',    especieNome);
    formData.set('id_raca',    idRaca);
    formData.set('raca',       racaNome);
    formData.set('id_pelo',    idPelo);
    formData.set('pelo',       peloNome);

    startTransition(async () => {
      const result = await createAnimal(clienteId, filialCliente, {}, formData);
      if (result.error) { setError(result.error); return; }
      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Novo Animal
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>

      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Animal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Nome + Apelido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required placeholder="Nome do animal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apelido">Apelido</Label>
              <Input id="apelido" name="apelido" placeholder="Como é chamado" />
            </div>
          </div>

          {/* Espécie + Raça */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Espécie</Label>
              <Select value={idEspecie} onValueChange={(v) => { if (v) handleEspecieChange(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {especies.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Raça</Label>
              <Select
                value={idRaca}
                onValueChange={(v) => { if (v) handleRacaChange(v); }}
                disabled={racasFiltradas.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {racasFiltradas.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pelo + Tipo animal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Pelo</Label>
              <Select
                value={idPelo}
                onValueChange={(v) => { if (v) handlePeloChange(v); }}
                disabled={pelosFiltrados.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {pelosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo_animal">Tipo</Label>
              <Input id="tipo_animal" name="tipo_animal" placeholder="Ex: Doméstico" />
            </div>
          </div>

          {/* Sexo + Castrado + Data nasc */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={sexo} onValueChange={(v) => { if (v) setSexo(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Macho</SelectItem>
                  <SelectItem value="F">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Castrado</Label>
              <Select value={castrado} onValueChange={(v) => { if (v) setCastrado(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Não</SelectItem>
                  <SelectItem value="1">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_nascimento">Data Nascimento</Label>
              <Input id="data_nascimento" name="data_nascimento" type="date" />
            </div>
          </div>

          {/* Peso + Cor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input id="peso" name="peso" placeholder="Ex: 4.5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor / Pelagem</Label>
              <Input id="cor" name="cor" placeholder="Ex: Caramelo" />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              name="obs"
              rows={2}
              placeholder="Informações relevantes..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : 'Salvar Animal'}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
