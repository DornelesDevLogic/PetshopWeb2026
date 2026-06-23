import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, FILIAL } from '@/lib/api';
import { AgendaItensResponse } from '@/types/petshop';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id     = searchParams.get('id');
  const filial = searchParams.get('filial') ?? String(FILIAL);

  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  try {
    const data = await apiFetch<AgendaItensResponse>(
      `/api/petshop/agenda/itens?id=${id}&filial=${filial}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 });
  }
}
