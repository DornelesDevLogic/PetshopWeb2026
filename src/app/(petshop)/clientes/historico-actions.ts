'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface CompraHistItem {
  data:       string;
  produto:    string;
  qtd:        string;
  valor_unit: string;
  num_nf:     number;
  unidade:    string;
}

export interface AgendaHistItem {
  id:          number;
  data:        string;
  hora:        string;
  servico:     string;
  animal:      string;
  profissional:string;
  status:      number;
}

export interface PreVendaHistItem {
  id:     number;
  data:   string;
  status: number;
  valor:  number;
  animal: string;
}

export interface TeleEntregaHistItem {
  id:           number;
  data:         string;
  data_entrega: string;
  status:       number;
  valor:        number;
}

export interface ConsultaHistItem {
  id:      number;
  data:    string;
  animal:  string;
  motivo:  string;
  status:  number;
}

export interface HistoricoCliente {
  compras:      CompraHistItem[];
  agendas:      AgendaHistItem[];
  prevendas:    PreVendaHistItem[];
  teleentregas: TeleEntregaHistItem[];
  consultas:    ConsultaHistItem[];
  totalGasto:   number;
  ultimaCompra: string | null;
}

// ─── Action ─────────────────────────────────────────────────────────────────

export async function buscarHistoricoCliente(
  clienteId: number,
  filial?: number,
): Promise<HistoricoCliente> {
  const fil = filial ?? getFilial();

  const [comprasRes, agendasRes, prevendasRes, teleRes, consultasRes] = await Promise.all([
    // Compras via NF (historico do animal filtrado por cliente)
    apiFetch<any>(
      `/api/petshop/animais/historico${qs({ filial: fil, cliente_id: clienteId, limit: 200 })}`,
    ).catch(() => ({ dados: [] })),

    // Agendas do cliente
    apiFetch<any>(
      `/api/petshop/agenda${qs({ filial: fil, cliente_id: clienteId, limit: 200 })}`,
    ).catch(() => ({ dados: [] })),

    // Pré-vendas do cliente
    apiFetch<any>(
      `/api/petshop/prevendas${qs({ filial: fil, cliente_id: clienteId, limit: 100 })}`,
    ).catch(() => ({ dados: [] })),

    // Tele-entregas do cliente
    apiFetch<any>(
      `/api/petshop/tele-entregas${qs({ filial: fil, cliente_id: clienteId, limit: 100 })}`,
    ).catch(() => ({ dados: [] })),

    // Consultas do cliente
    apiFetch<any>(
      `/api/petshop/consultas${qs({ filial: fil, cliente_id: clienteId, limit: 100 })}`,
    ).catch(() => ({ dados: [] })),
  ]);

  const compras: CompraHistItem[] = (comprasRes.dados ?? []).map((c: any) => ({
    data:       c.data       ?? '',
    produto:    c.produto    ?? '',
    qtd:        c.qtd        ?? '0',
    valor_unit: c.valor_unit ?? '0',
    num_nf:     c.num_nf     ?? 0,
    unidade:    c.unidade    ?? '',
  }));

  const agendas: AgendaHistItem[] = (agendasRes.dados ?? []).map((a: any) => ({
    id:           a.id           ?? 0,
    data:         a.data         ?? '',
    hora:         a.hora         ?? '',
    servico:      a.servico      ?? '',
    animal:       a.animal       ?? '',
    profissional: a.profissional ?? '',
    status:       Number(a.status ?? 0),
  }));

  const prevendas: PreVendaHistItem[] = (prevendasRes.dados ?? []).map((p: any) => ({
    id:     p.id     ?? 0,
    data:   p.data   ?? '',
    status: Number(p.status ?? 0),
    valor:  Number(p.valor  ?? 0),
    animal: p.animal ?? '',
  }));

  const teleentregas: TeleEntregaHistItem[] = (teleRes.dados ?? []).map((t: any) => ({
    id:           t.id           ?? 0,
    data:         t.data         ?? '',
    data_entrega: t.data_entrega ?? '',
    status:       Number(t.status ?? 0),
    valor:        Number(t.valor  ?? 0),
  }));

  const consultas: ConsultaHistItem[] = (consultasRes.dados ?? []).map((c: any) => ({
    id:     c.id     ?? 0,
    data:   c.data   ?? '',
    animal: c.animal ?? '',
    motivo: c.motivo ?? '',
    status: Number(c.status ?? 0),
  }));

  // Total gasto em NF
  const totalGasto = compras.reduce((s, c) => {
    const v = parseFloat(String(c.valor_unit).replace(',', '.')) || 0;
    const q = parseFloat(String(c.qtd).replace(',', '.')) || 0;
    return s + v * q;
  }, 0);

  // Última compra
  const datas = compras.map((c) => c.data).filter(Boolean).sort().reverse();
  const ultimaCompra = datas[0] ?? null;

  return { compras, agendas, prevendas, teleentregas, consultas, totalGasto, ultimaCompra };
}

// Versão leve só para o painel de tele-entrega (top 10 produtos mais recentes)
export async function buscarUltimasComprasCliente(
  clienteId: number,
  filial?: number,
): Promise<CompraHistItem[]> {
  const fil = filial ?? getFilial();
  const res = await apiFetch<any>(
    `/api/petshop/animais/historico${qs({ filial: fil, cliente_id: clienteId, limit: 50 })}`,
  ).catch(() => ({ dados: [] }));

  return (res.dados ?? [])
    .slice(0, 20)
    .map((c: any) => ({
      data:       c.data       ?? '',
      produto:    c.produto    ?? '',
      qtd:        c.qtd        ?? '0',
      valor_unit: c.valor_unit ?? '0',
      num_nf:     c.num_nf     ?? 0,
      unidade:    c.unidade    ?? '',
    }));
}
