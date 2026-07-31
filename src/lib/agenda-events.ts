import { EventEmitter } from 'events';

export interface AgendaEvent {
  tipo: 'AGENDA_ALTERADA';
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  idAgenda: number;
  filial: number;
  dataAgenda?: string; // YYYY-MM-DD, opcional
}

class AgendaEventHub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500);
  }

  publish(event: AgendaEvent) {
    this.emit(`f_${event.filial}`, event);
  }

  subscribe(filial: number, handler: (ev: AgendaEvent) => void): () => void {
    const key = `f_${filial}`;
    this.on(key, handler);
    return () => this.off(key, handler);
  }
}

// Singleton global — sobrevive ao hot-reload do Next.js em dev
declare global {
  // eslint-disable-next-line no-var
  var __agendaHub: AgendaEventHub | undefined;
}

export const agendaHub: AgendaEventHub =
  globalThis.__agendaHub ?? (globalThis.__agendaHub = new AgendaEventHub());
