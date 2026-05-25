import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, FILIAL } from '@/lib/api';

interface FotoResponse {
  foto: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!id) return new NextResponse(null, { status: 404 });

  let data: FotoResponse;
  try {
    data = await apiFetch<FotoResponse>(
      `/api/petshop/animais/foto?animal_id=${id}&filial=${FILIAL}`,
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!data?.foto) return new NextResponse(null, { status: 404 });

  const buf = Buffer.from(data.foto, 'base64');
  return new NextResponse(buf, {
    headers: {
      'Content-Type':  'image/jpeg',
      'Cache-Control': 'no-store',
    },
  });
}
