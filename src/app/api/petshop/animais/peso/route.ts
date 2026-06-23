import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

interface PesoHistItem {
  id:       number;
  peso:     number;
  data:     string;
  anotacao: string;
}
interface PesoHistResponse { dados: PesoHistItem[]; Count: number; CodStatus: number }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const animal_id = searchParams.get('animal_id');
  const filial    = searchParams.get('filial') ?? String(FILIAL);
  const limit     = searchParams.get('limit') ?? '50';

  if (!animal_id) return NextResponse.json({ error: 'animal_id obrigatório' }, { status: 400 });

  try {
    const data = await apiFetch<PesoHistResponse>(
      `/api/petshop/animais/peso?animal_id=${animal_id}&filial=${filial}&limit=${limit}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar histórico de peso' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const data = await apiFetch<ApiWrite>('/api/petshop/animais/peso', {
      method: 'POST',
      body:   JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar peso' }, { status: 500 });
  }
}
