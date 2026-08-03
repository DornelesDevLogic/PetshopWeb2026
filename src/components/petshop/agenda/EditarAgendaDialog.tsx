'use client';

import { useState, useTransition } from 'react';
import { AgendaDetalhe, Profissional, Servico, Vendedor } from '@/types/petshop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { editarAgenda } from '@/app/(petshop)/agenda/editar/actions';
import ProdutosAgenda from './ProdutosAgenda';
import PesoHistorico from '@/components/petshop/animais/PesoHistorico';

interface Props {
  open:          boolean;
  onClose:       () => void;
  item:          AgendaDetalhe;
  profissionais: Profissional[];
  servicos:      Servico[];
  vendedores:    Vendedor[];
  onSalvo:       (item: AgendaDetalhe) => void;
}

export default function EditarAgendaDialog({
  open, onClose, item, profissionais, servicos, vendedores, onSalvo,
}: Props) {
  const [profId,    setProfId]    = useState(String(item.prof_id));
  const [profNome,  setProfNome]  = useState(item.profissional);
  const [profFil,   setProfFil]   = useState(String(item.filial));
  const [servId,    setServId]    = useState(String(item.servico_id));
  const [servNome,  setServNome]  = useState(item.servico);
  const [servFil,   setServFil]   = useState(String(item.filial));
  const [vendId,    setVendId]    = useState(String(item.vend_id ?? ''));
  const [vendFil,   setVendFil]   = useState(String(item.vend_filial ?? item.filial));
  const [obs,       setObs]       = useState(item.obs ?? '');
  const [peso,      setPeso]      = useState('');
  const [erro,      setErro]      = useState('');
  const [pending,   startTransition] = useTransition();

  function handleProfChange(val: string | null) {
    if (!val) return;
    const p = profissionais.find(x => String(x.id) === val);
    setProfId(val);
    setProfNome(p?.nome ?? '');
    setProfFil(String(p?.filial ?? item.filial));
  }

  function handleServChange(val: string | null) {
    if (!val) return;
    const s = servicos.find(x => String(x.id) === val);
    setServId(val);
    setServNome(s?.descricao ?? '');
    setServFil(String(s?.filial ?? item.filial));
  }

  function handleVendChange(val: string | null) {
    if (!val) return;
    const [fil, id] = val.split(':');
    setVendId(id ?? '');
    setVendFil(fil ?? String(item.filial));
  }

  function handleSalvar() {
    setErro('');
    startTransition(async () => {
      const res = await editarAgenda({
        id:            item.id,
        filial:        item.filial,
        animal_id:     item.animal_id,
        animal_filial: item.filial,
        prof_id:       Number(profId),
        prof_filial:   Number(profFil),
        prof_nome:     profNome,
        servico_id:    Number(servId),
        servico_filial:Number(servFil),
        servico_nome:  servNome,
        vend_id:       Number(vendId),
        vend_filial:   Number(vendFil),
        obs,
        peso:          Number(peso) > 0 ? Number(peso) : undefined,
      });
      if (res.error) { setErro(res.error); return; }
      onSalvo({
        ...item,
        prof_id:     Number(profId),
        profissional: profNome,
        servico_id:  Number(servId),
        servico:     servNome,
        vend_id:     Number(vendId),
        vend_filial: Number(vendFil),
        obs,
      });
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Agendamento #{item.id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vendedor */}
          <div className="space-y-1.5">
            <Label>Vendedor</Label>
            <Select value={vendId ? `${vendFil}:${vendId}` : ''} onValueChange={handleVendChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map(v => (
                  <SelectItem key={`${v.filial}:${v.id}`} value={`${v.filial}:${v.id}`}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profissional */}
          <div className="space-y-1.5">
            <Label>Profissional</Label>
            <Select value={profId} onValueChange={handleProfChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de serviço */}
          <div className="space-y-1.5">
            <Label>Tipo de Serviço</Label>
            <Select value={servId} onValueChange={handleServChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {servicos.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Peso */}
          <div className="space-y-1.5">
            <Label>Peso do Animal</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={peso}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPeso(e.target.value)}
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Opcional. Atualiza o cadastro e o histórico do animal.</p>
          </div>

          {/* Histórico de peso */}
          {item.animal_id > 0 && (
            <div className="space-y-1.5">
              <Label>Histórico de Peso</Label>
              <PesoHistorico animalId={item.animal_id} filial={item.filial} />
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <textarea
              value={obs}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObs(e.target.value)}
              rows={3}
              placeholder="Observações da agenda..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Produtos */}
          <div className="space-y-1.5">
            <Label>Produtos</Label>
            <ProdutosAgenda
              agendaId={item.id}
              filial={item.filial}
              itensInic={[]}
              podeEditar={true}
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
