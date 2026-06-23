import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.BACKEND_URL!;
const USER = process.env.BACKEND_USER!;
const PASS = process.env.BACKEND_PASS!;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const filial  = req.nextUrl.searchParams.get('filial') ?? '1';
  const auth    = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

  let res: Response;
  try {
    res = await fetch(
      `${BASE}/api/petshop/animais/foto?animal_id=${id}&filial=${filial}`,
      { headers: { Authorization: auth } },
    );
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
