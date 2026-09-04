/**
 * Ponte entre o petshop_web e a extensão de navegador "PetShop Web - Envio em
 * Lote WhatsApp" (pasta whatsapp-extension/ na raiz do repo).
 *
 * A extensão expõe `externally_connectable` para a origem do app, então a
 * comunicação é feita direto via chrome.runtime.sendMessage/connect,
 * passando o ID da extensão (guardado no localStorage, colado uma vez pelo
 * usuário após instalar). Nenhuma credencial ou token trafega aqui — é só
 * telefone + texto da mensagem, que é exatamente o que já vai pra URL do
 * wa.me hoje.
 */

export interface ItemEnvioWA {
  id: number | string;
  telefone: string;
  mensagem: string;
}

export type StatusEnvioWA = 'aguardando' | 'enviando' | 'enviado' | 'erro' | 'telefone_invalido';

export interface ProgressoEnvioWA {
  id: number | string;
  status: StatusEnvioWA;
  motivo?: string;
}

const LS_KEY = 'petshop_wa_extension_id';

interface ChromePort {
  postMessage(msg: unknown): void;
  disconnect(): void;
  onMessage: { addListener(cb: (msg: any) => void): void }; // eslint-disable-line @typescript-eslint/no-explicit-any
  onDisconnect: { addListener(cb: () => void): void };
}

interface ChromeRuntimeApi {
  runtime?: {
    lastError?: unknown;
    sendMessage(extensionId: string, msg: unknown, cb: (resp: { ok?: boolean } | undefined) => void): void;
    connect(extensionId: string, opts: { name: string }): ChromePort;
  };
}

function chromeApi(): ChromeRuntimeApi | undefined {
  return typeof window !== 'undefined' ? (window as unknown as { chrome?: ChromeRuntimeApi }).chrome : undefined;
}

export function getExtensionId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LS_KEY) || '';
}

export function setExtensionId(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LS_KEY, id.trim());
}

/** A API chrome.runtime só existe em navegadores Chromium (Chrome/Edge/Brave). */
export function chromeDisponivel(): boolean {
  return !!chromeApi()?.runtime?.sendMessage;
}

/** Faz um "ping" na extensão pra confirmar que está instalada, habilitada
 * e com o ID configurado corretamente. */
export function pingExtensao(timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const api = chromeApi();
    const runtime = api?.runtime;
    const id = getExtensionId();
    if (!id || !runtime?.sendMessage) { resolve(false); return; }
    const timer = setTimeout(() => resolve(false), timeoutMs);
    try {
      runtime.sendMessage(id, { type: 'ping' }, (resp: { ok?: boolean } | undefined) => {
        clearTimeout(timer);
        resolve(!runtime.lastError && !!resp?.ok);
      });
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/** Dispara o envio em lote. Retorna um handle com `cancelar()` — o cancelamento
 * é "gentil": termina o item em andamento e não inicia o próximo. */
export function enviarLoteWhatsApp(
  itens: ItemEnvioWA[],
  onProgresso: (p: ProgressoEnvioWA) => void,
  onFim: (resumo: { enviados: number; erros: number }) => void,
  opts?: { intervaloMinSeg?: number; intervaloMaxSeg?: number },
): { cancelar: () => void } {
  const api = chromeApi();
  const id = getExtensionId();

  if (!id || !api?.runtime?.connect) {
    onFim({ enviados: 0, erros: itens.length });
    return { cancelar: () => {} };
  }

  const port = api.runtime.connect(id, { name: 'wa-queue' });
  let finalizado = false;

  port.onMessage.addListener((msg) => {
    if (msg?.type === 'progresso') onProgresso(msg.item);
    else if (msg?.type === 'concluido') {
      finalizado = true;
      onFim(msg.resumo);
      try { port.disconnect(); } catch {}
    }
  });

  port.onDisconnect.addListener(() => {
    if (!finalizado) {
      finalizado = true;
      onFim({ enviados: 0, erros: itens.length });
    }
  });

  port.postMessage({
    type: 'enviarLote',
    itens,
    intervaloMinSeg: opts?.intervaloMinSeg ?? 10,
    intervaloMaxSeg: opts?.intervaloMaxSeg ?? 20,
  });

  return {
    cancelar: () => {
      try { port.postMessage({ type: 'cancelar' }); } catch {}
    },
  };
}
