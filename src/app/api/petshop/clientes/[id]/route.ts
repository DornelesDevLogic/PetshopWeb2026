import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';
import { Cliente, ClienteResponse } from '@/types/petshop';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id     = Number(params.id);
  const filial = req.nextUrl.searchParams.get('filial') ?? String(getFilial());

  if (!id) return NextResponse.json(null, { status: 400 });

  try {
    const res = await apiFetch<ClienteResponse>(
      `/api/petshop/clientes?filial=${filial}&limit=1&filter1=s.COD_CLI=${id}`,
    );
    const cliente: Cliente | undefined = res.dados?.[0];
    if (!cliente) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(cliente);
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
