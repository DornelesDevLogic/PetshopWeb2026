import { agendaHub, AgendaEvent } from '@/lib/agenda-events';
import { getFilial } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url    = new URL(req.url);
  const filial = Number(url.searchParams.get('filial') ?? getFilial());

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'));

      const handler = (ev: AgendaEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch { /* cliente desconectou */ }
      };

      unsubscribe = agendaHub.subscribe(filial, handler);

      // Heartbeat a cada 25s para manter conexão viva em proxies/nginx
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); }
        catch { clearInterval(hb); }
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        unsubscribe?.();
        clearInterval(hb);
        try { controller.close(); } catch { /* já fechado */ }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no', // desativa buffer do nginx
    },
  });
}
