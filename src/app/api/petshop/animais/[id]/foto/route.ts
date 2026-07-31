import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';

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
      `/api/petshop/animais/foto?animal_id=${id}&filial=${getFilial()}`,
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!data?.foto) return new NextResponse(null, { status: 404 });

  // Remove eventuais quebras de linha MIME (CRLF/LF) antes de decodificar
  const buf = Buffer.from(data.foto.replace(/[\r\n]/g, ''), 'base64');
  return new NextResponse(buf, {
    headers: {
      'Content-Type':  'image/jpeg',
      'Cache-Control': 'no-store',
    },
  });
}
