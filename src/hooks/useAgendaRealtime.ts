'use client';

import { useEffect, useRef } from 'react';

export interface AgendaEvent {
  tipo: string;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  idAgenda: number;
  filial: number;
  dataAgenda?: string;
}

interface Options {
  filial: number;
  onEvent: (event: AgendaEvent) => void;
  enabled?: boolean;
}

export function useAgendaRealtime({ filial, onEvent, enabled = true }: Options) {
  // Ref para sempre ter o callback mais recente sem reconectar
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let retryMs = 1_000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      es = new EventSource(`/api/sse/agenda?filial=${filial}`);

      es.onopen = () => { retryMs = 1_000; };

      es.onmessage = (e) => {
        try {
          const ev: AgendaEvent = JSON.parse(e.data);
          onEventRef.current(ev);
        } catch { /* ignora JSON inválido (ex: heartbeat já filtrado pelo browser) */ }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!destroyed) {
          retryTimer = setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, 30_000); // back-off exponencial, máx 30s
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [filial, enabled]);
}
