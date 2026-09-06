'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Estimativa } from '@/app/(petshop)/estimativas/actions';
import { atualizarStatusEstimativa } from '@/app/(petshop)/estimativas/actions';
import { buscarMensagensRapidas, type MensagemRapida } from '@/app/(petshop)/configuracoes/mensagens-rapidas/actions';
import { linkWhatsApp, preencherModelo } from '@/lib/whatsapp';
import {
  getExtensionId, setExtensionId, pingExtensao, enviarLoteWhatsApp,
  type ProgressoEnvioWA, type StatusEnvioWA,
} from '@/lib/waExtensionBridge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, Send, CheckCircle2, XCircle, PhoneOff, Clock, Puzzle, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  estimativas: Estimativa[]; // já filtradas para as selecionadas
  onClose: () => void;
  onAtualizado: () => void; // chamado quando ao menos 1 foi marcada como enviada
}

function fmtData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_INFO: Record<StatusEnvioWA, { label: string; cls: string; icon: typeof Clock }> = {
  aguardando:        { label: 'Aguardando',       cls: 'text-muted-foreground',                icon: Clock },
  enviando:          { label: 'Enviando...',      cls: 'text-blue-600',                         icon: Loader2 },
  enviado:           { label: 'Enviada',          cls: 'text-green-600',                        icon: CheckCircle2 },
  erro:              { label: 'Erro',             cls: 'text-red-600',                          icon: XCircle },
  telefone_invalido: { label: 'Telefone inválido', cls: 'text-amber-600',                        icon: PhoneOff },
};

export default function EnvioLoteWhatsAppModal({ estimativas, onClose, onAtualizado }: Props) {
  const [extId, setExtId]           = useState(getExtensionId());
  const [conectado, setConectado]   = useState<'checando' | 'ok' | 'falhou'>('checando');
  const [modelos, setModelos]       = useState<MensagemRapida[] | null>(null);
  const [modeloSel, setModeloSel]   = useState<string>('');
  const [intervaloMin, setIntervaloMin] = useState('10');
  const [intervaloMax, setIntervaloMax] = useState('20');
  const [enviando, setEnviando]     = useState(false);
  const [status, setStatus]         = useState<Record<number, ProgressoEnvioWA>>({});
  const [resumo, setResumo]         = useState<{ enviados: number; erros: number } | null>(null);
  const [cancelHandle, setCancelHandle] = useState<{ cancelar: () => void } | null>(null);

  useEffect(() => {
    buscarMensagensRapidas().then((r) => {
      setModelos(r);
      if (r.length > 0) setModeloSel(String(r[0].id));
    });
  }, []);

  useEffect(() => { testarConexao(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function testarConexao() {
    setConectado('checando');
    pingExtensao().then((ok) => setConectado(ok ? 'ok' : 'falhou'));
  }

  function salvarExtId() {
    setExtensionId(extId);
    testarConexao();
  }

  const modeloEscolhido = useMemo(
    () => modelos?.find((m) => String(m.id) === modeloSel) ?? null,
    [modelos, modeloSel],
  );

  const elegiveis = useMemo(
    () => estimativas.filter((e) => !!linkWhatsApp(e.celular || e.telefone, 'x')),
    [estimativas],
  );
  const semTelefone = estimativas.length - elegiveis.length;

  function iniciarEnvio() {
    if (!moldeVariantes.length) return;
    setEnviando(true);
    setResumo(null);
    const inicial: Record<number, ProgressoEnvioWA> = {};
    elegiveis.forEach((e) => { inicial[e.id] = { id: e.id, status: 'aguardando' }; });
    setStatus(inicial);

    const itens = elegiveis.map((e, i) => ({
      id: e.id,
      telefone: e.celular || e.telefone,
      mensagem: preencherModelo(moldeVariantes[i % moldeVariantes.length], {
        pet: e.animal_nome,
        cliente: e.cliente_nome,
        data: fmtData(e.data_estimada),
      }),
    }));

    const handle = enviarLoteWhatsApp(
      itens,
      (p) => {
        setStatus((prev) => ({ ...prev, [p.id as number]: p }));
        if (p.status === 'enviado') {
          atualizarStatusEstimativa(p.id as number, 1).then(() => onAtualizado());
        }
      },
      (r) => { setResumo(r); setEnviando(false); setCancelHandle(null); },
      { intervaloMinSeg: parseInt(intervaloMin) || 10, intervaloMaxSeg: parseInt(intervaloMax) || 20 },
    );
    setCancelHandle(handle);
  }

  const moldeVariantes = useMemo(
    () => (modeloEscolhido?.mensagens || []).map((v) => v.mensagem).filter((m) => m.trim()),
    [modeloEscolhido],
  );

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !enviando) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-green-600" />
            Enviar selecionadas pelo WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1">
          {conectado === 'checando' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Verificando extensão...
            </div>
          )}

          {conectado === 'falhou' && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <Puzzle className="h-4 w-4 shrink-0" />Extensão não conectada
              </p>
              <p className="text-xs text-amber-800/90">
                Instale a extensão &ldquo;PetShop Web - Envio em Lote WhatsApp&rdquo; (pasta{' '}
                <code className="font-mono">whatsapp-extension/</code> do projeto — veja o
                README dela para instalar em modo desenvolvedor) e cole o ID abaixo.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={extId}
                  onChange={(e) => setExtId(e.target.value)}
                  placeholder="ID da extensão (chrome://extensions)"
                  className="h-8 text-xs font-mono"
                />
                <Button size="sm" className="h-8 shrink-0" onClick={salvarExtId}>Testar conexão</Button>
              </div>
            </div>
          )}

          {conectado === 'ok' && !resumo && (
            <>
              <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {elegiveis.length} de {estimativas.length} selecionadas têm telefone válido
                {semTelefone > 0 && ` (${semTelefone} sem telefone será ignorada${semTelefone > 1 ? 's' : ''})`}.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mensagem (Configurações → Mensagens Rápidas)</label>
                <Select
                  value={modeloSel}
                  onValueChange={(v) => setModeloSel(v ?? '')}
                  disabled={enviando}
                  items={(modelos ?? []).map((m) => ({ value: String(m.id), label: m.titulo }))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                  <SelectContent>
                    {(modelos ?? []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {modelos !== null && modelos.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum modelo cadastrado ainda em Configurações → Mensagens Rápidas.
                  </p>
                )}
                {modeloEscolhido && moldeVariantes.length === 0 && (
                  <p className="text-xs text-amber-600">Esse modelo não tem nenhuma variação de texto preenchida.</p>
                )}
                {moldeVariantes.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {moldeVariantes.length} variações cadastradas — serão alternadas entre as mensagens.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Intervalo mínimo (seg.)</label>
                  <Input value={intervaloMin} onChange={(e) => setIntervaloMin(e.target.value)} inputMode="numeric" disabled={enviando} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Intervalo máximo (seg.)</label>
                  <Input value={intervaloMax} onChange={(e) => setIntervaloMax(e.target.value)} inputMode="numeric" disabled={enviando} />
                </div>
              </div>
            </>
          )}

          {Object.keys(status).length > 0 && (
            <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
              {elegiveis.map((e) => {
                const s = status[e.id]?.status ?? 'aguardando';
                const info = STATUS_INFO[s];
                const Icon = info.icon;
                return (
                  <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.cliente_nome || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.animal_nome} · {e.produto}</p>
                    </div>
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium shrink-0', info.cls)}>
                      <Icon className={cn('h-3.5 w-3.5', s === 'enviando' && 'animate-spin')} />
                      {info.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {resumo && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2.5 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Concluído: {resumo.enviados} enviada{resumo.enviados === 1 ? '' : 's'}, {resumo.erros} com erro.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {enviando ? (
            <Button variant="destructive" onClick={() => cancelHandle?.cancelar()}>
              <X className="h-4 w-4 mr-1" />Cancelar envio
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>{resumo ? 'Fechar' : 'Cancelar'}</Button>
              {!resumo && (
                <Button
                  onClick={iniciarEnvio}
                  disabled={conectado !== 'ok' || elegiveis.length === 0 || moldeVariantes.length === 0}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Iniciar envio ({elegiveis.length})
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
