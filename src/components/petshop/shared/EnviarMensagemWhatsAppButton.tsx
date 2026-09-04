'use client';

import { useState } from 'react';
import { buscarMensagensRapidas, type MensagemRapida } from '@/app/(petshop)/configuracoes/mensagens-rapidas/actions';
import { linkWhatsApp, preencherModelo } from '@/lib/whatsapp';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2, Send } from 'lucide-react';

interface Props {
  telefone: string;
  pet?:     string;
  cliente?: string;
  data?:    string;
  /** Ícone sozinho (uso em linha de tabela) por padrão; texto completo se false. */
  compacto?: boolean;
}

/** Botão "Enviar mensagem" — deixa escolher um modelo cadastrado em
 * Configurações > Mensagens Rápidas (com as variações de texto), preenche
 * {pet}/{cliente}/{data} e abre o wa.me já com o texto pronto (quem manda
 * é o próprio usuário, não existe envio automático). */
export default function EnviarMensagemWhatsAppButton({ telefone, pet, cliente, data, compacto = true }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [msgs, setMsgs] = useState<MensagemRapida[] | null>(null);

  const link = linkWhatsApp(telefone, '');
  if (!link) return null; // sem telefone válido, nem mostra o botão

  function abrir() {
    setAberto(true);
    if (msgs === null) {
      setCarregando(true);
      buscarMensagensRapidas().then((r) => { setMsgs(r); setCarregando(false); });
    }
  }

  function enviar(texto: string) {
    const url = linkWhatsApp(telefone, preencherModelo(texto, { pet, cliente, data }));
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    setAberto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Enviar mensagem pelo WhatsApp"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        {!compacto && <span className="ml-1.5 text-sm">Enviar mensagem</span>}
      </button>

      {aberto && (
        <Dialog open onOpenChange={(v) => { if (!v) setAberto(false); }}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                Enviar mensagem — {cliente || 'cliente'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-3">
              {carregando ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : !msgs || msgs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma mensagem rápida cadastrada ainda — cadastre em
                  Configurações → Mensagens Rápidas.
                </p>
              ) : (
                msgs.map((m) => (
                  <div key={m.id} className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.titulo}</p>
                    {m.mensagens.length === 0 ? (
                      <p className="text-xs text-muted-foreground/70 italic">Sem variações de texto cadastradas.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {m.mensagens.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => enviar(v.mensagem)}
                            disabled={!v.mensagem.trim()}
                            className="w-full text-left rounded-md border px-3 py-2 text-xs hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-start gap-2"
                          >
                            <Send className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <span className="whitespace-pre-wrap">
                              {preencherModelo(v.mensagem, { pet, cliente, data }) || '(vazio)'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
