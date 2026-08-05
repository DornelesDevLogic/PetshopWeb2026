'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Animal, Profissional, Servico } from '@/types/petshop';
import { verificarRegrasProdutos, type Estimativa, type RegraProduto } from '@/app/(petshop)/estimativas/actions';
import { criarConsultaDeEstimativas } from '@/app/(petshop)/animais/[id]/historico/iniciar-consulta-actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Stethoscope, X, AlertCircle, Loader2, Package, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  animal:        Animal;
  filial:        number;
  estimativas:   Estimativa[];
  profissionais: Profissional[];
  servicos:      Servico[];
  onClose:       () => void;
}

export default function IniciarConsultaDialog({
  animal, filial, estimativas, profissionais, servicos, onClose,
}: Props) {
  const router = useRouter();
  const hoje = new Date().toISOString().split('T')[0];

  const [vetId, setVetId]         = useState('');
  const [servicoId, setServicoId] = useState('');
  const [data, setData]           = useState(hoje);
  const [erro, setErro]           = useState('');
  const [isPending, startT]       = useTransition();

  const [etapa, setEtapa]         = useState<'form' | 'prazos'>('form');
  const [regras, setRegras]       = useState<Record<number, RegraProduto>>({});
  const [prazos, setPrazos]       = useState<Record<number, number | null>>({});

  /** Itens da estimativa cujo produto tem regra de recompra cadastrada. */
  const itensComRegra = estimativas.filter((e) => regras[e.dadospro_id]);

  function irParaConfirmacao() {
    const vet = profissionais.find((p) => String(p.id) === vetId);
    const servico = servicos.find((s) => String(s.id) === servicoId);
    if (!vet)     { setErro('Selecione o veterinário.'); return; }
    if (!servico) { setErro('Selecione o serviço.'); return; }
    setErro('');

    // Só busca as regras (e mostra a pergunta) no momento de gravar —
    // enquanto o usuário só está preenchendo vet/serviço/data, não interessa.
    const ids = Array.from(new Set(estimativas.map((e) => e.dadospro_id)));
    if (ids.length === 0) { finalizar(); return; }
    startT(async () => {
      const lista = await verificarRegrasProdutos(ids);
      if (lista.length === 0) { finalizar(); return; }
      const mapa: Record<number, RegraProduto> = {};
      lista.forEach((r) => { mapa[r.dadospro_id] = r; });
      setRegras(mapa);
      setPrazos((prev) => {
        const novo = { ...prev };
        estimativas.forEach((e) => { if (mapa[e.dadospro_id]) novo[e.id] = novo[e.id] ?? null; });
        return novo;
      });
      setEtapa('prazos');
    });
  }

  function handleConfirmar() {
    if (etapa === 'form') { irParaConfirmacao(); return; }

    const pendente = itensComRegra.some((e) => prazos[e.id] === null || prazos[e.id] === undefined);
    if (pendente) { setErro('Escolha o prazo do lembrete pra cada item.'); return; }
    setErro('');
    finalizar();
  }

  function finalizar() {
    const vet = profissionais.find((p) => String(p.id) === vetId);
    const servico = servicos.find((s) => String(s.id) === servicoId);
    if (!vet || !servico) return;

    startT(async () => {
      const r = await criarConsultaDeEstimativas({
        animalId:      animal.id,
        animalFilial:  animal.filial,
        animalNome:    animal.nome,
        clienteId:     animal.id_cliente,
        clienteFilial: animal.filial_cliente,
        clienteNome:   animal.nome_cliente,
        vetId:         vet.id,
        vetFilial:     vet.filial,
        vetNome:       vet.nome,
        servicoId:     servico.id,
        servicoFilial: servico.filial,
        servicoNome:   servico.descricao,
        data,
        itens: estimativas.map((e) => ({
          id:         e.id,
          dadosproId: e.dadospro_id,
          descPro:    e.produto,
          qtd:        e.qtd,
          dias:       prazos[e.id] ?? 0,
        })),
      });
      if (!r.consultaId) { setErro(r.error || 'Não foi possível iniciar a consulta.'); return; }
      router.push(`/consultas/${r.consultaId}`);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Iniciar Consulta</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {etapa === 'form' ? (
            <>
              <p className="text-sm text-muted-foreground">
                {estimativas.length > 0
                  ? <>Isso cria uma nova Agenda e uma Consulta para <b>{animal.nome}</b>, já com os itens abaixo lançados — prontos para faturar no Frente de Caixa.</>
                  : <>Isso cria uma nova Agenda e uma Consulta para <b>{animal.nome}</b>, sem produtos pré-lançados — você pode adicionar durante o atendimento.</>}
              </p>

              {estimativas.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {estimativas.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{e.produto}</span>
                      <span className="text-xs text-muted-foreground shrink-0">qtd {e.qtd}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Veterinário *</Label>
                <Select value={vetId} onValueChange={(v) => { if (v) setVetId(v); }} items={(profissionais ?? []).map((p) => ({ value: String(p.id), label: p.nome }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(profissionais ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Serviço *</Label>
                <Select value={servicoId} onValueChange={(v) => { if (v) setServicoId(v); }} items={(servicos ?? []).map((s) => ({ value: String(s.id), label: s.descricao }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(servicos ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="data-consulta">Data *</Label>
                <Input id="data-consulta" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Alguns produtos têm regra de recompra cadastrada — escolha o prazo do lembrete pra cada um antes de gravar:
              </p>
              <div className="rounded-lg border divide-y">
                {itensComRegra.map((e) => {
                  const regra = regras[e.dadospro_id];
                  return (
                    <div key={e.id} className="px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate font-medium">{e.produto}</span>
                        <span className="text-xs text-muted-foreground shrink-0">qtd {e.qtd}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        {[
                          { label: `Mínimo (${regra.dias_min}d)`, val: regra.dias_min },
                          { label: `Máximo (${regra.dias_max}d)`, val: regra.dias_max },
                          { label: 'Não criar', val: 0 },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setPrazos((prev) => ({ ...prev, [e.id]: opt.val }))}
                            className={cn(
                              'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                              prazos[e.id] === opt.val
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
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {erro && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex justify-end gap-2 shrink-0">
          {etapa === 'prazos' && (
            <Button variant="outline" onClick={() => { setEtapa('form'); setErro(''); }} disabled={isPending}>Voltar</Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={isPending}>
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{etapa === 'form' ? 'Verificando...' : 'Gravando...'}</>
              : etapa === 'form' ? 'Continuar' : 'Iniciar Consulta'}
          </Button>
        </div>
      </div>
    </div>
  );
}
