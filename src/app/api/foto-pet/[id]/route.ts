import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl, getBearerToken } from '@/lib/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const filial  = req.nextUrl.searchParams.get('filial') ?? '1';

  let res: Response;
  try {
    const base = getBackendUrl();
    const token = await getBearerToken();
    res = await fetch(
      `${base}/api/petshop/animais/foto?animal_id=${id}&filial=${filial}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 401) {
      res = await fetch(
        `${base}/api/petshop/animais/foto?animal_id=${id}&filial=${filial}`,
        { headers: { Authorization: `Bearer ${await getBearerToken(true)}` } },
      );
    }
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!res.ok) return new NextResponse(null, { status: 404 });

  let json: { foto?: string };
  try { json = await res.json(); } catch { return new NextResponse(null, { status: 502 }); }

  const b64 = json.foto;
  if (!b64) return new NextResponse(null, { status: 404 });

  const buf = Buffer.from(b64, 'base64');

  // Detecta tipo pelos magic bytes
  let contentType = 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) contentType = 'image/png';
  else if (buf[0] === 0x47 && buf[1] === 0x49) contentType = 'image/gif';
  else if (buf[0] === 0x42 && buf[1] === 0x4d) contentType = 'image/bmp';

  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
