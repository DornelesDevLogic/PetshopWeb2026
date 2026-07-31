import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';

interface AnexoResponse {
  nome:           string;
  tipo:           string;   // extensão: .pdf, .jpg...
  arquivo_base64: string;
}

const MIME_POR_EXT: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Serve o arquivo de um anexo de exame.
 * ?download=1 força o download (Content-Disposition: attachment);
 * sem o parâmetro, exibe inline (PDF/imagem abrem no navegador).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!id) return new NextResponse(null, { status: 404 });

  let data: AnexoResponse;
  try {
    data = await apiFetch<AnexoResponse>(
      `/api/petshop/exames/anexos/arquivo?id=${id}&filial=${getFilial()}`,
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!data?.arquivo_base64) return new NextResponse(null, { status: 404 });

  const ext  = (data.tipo || '').toLowerCase();
  const mime = MIME_POR_EXT[ext] || 'application/octet-stream';
  const buf  = Buffer.from(data.arquivo_base64.replace(/[\r\n]/g, ''), 'base64');

  const baixar    = req.nextUrl.searchParams.get('download') === '1';
  const nomeSeguro = (data.nome || `anexo-${id}${ext}`).replace(/[^\w.\-]/g, '_');
  const dispo     = baixar ? 'attachment' : 'inline';

  return new NextResponse(buf, {
    headers: {
      'Content-Type':        mime,
      'Content-Disposition': `${dispo}; filename="${nomeSeguro}"`,
      'Cache-Control':       'no-store',
    },
  });
}
