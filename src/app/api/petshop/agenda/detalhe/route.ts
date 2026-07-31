import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';
import { AgendaDetalhe } from '@/types/petshop';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id     = searchParams.get('id');
  const filial = searchParams.get('filial') ?? String(getFilial());

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  try {
    const data = await apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe?id=${id}&filial=${filial}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar detalhe' }, { status: 500 });
  }
}
