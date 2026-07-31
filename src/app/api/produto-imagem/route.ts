import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';

/**
 * Proxy da imagem do produto (DET_PROD.IMAGEM).
 * O backend devolve base64; aqui convertemos para binário com o mime correto,
 * para usar direto em <img src="/api/produto-imagem?id_pro=...">.
 */
export async function GET(req: NextRequest) {
  const idPro = req.nextUrl.searchParams.get('id_pro');
  if (!idPro) return new NextResponse('id_pro obrigatório', { status: 400 });

  // A imagem fica em DET_PROD com a filial DONA do cadastro (SRQPRO.COD_FILIAL),
  // que pode diferir da filial logada — o chamador envia `filial` do produto.
  const filial = Number(req.nextUrl.searchParams.get('filial')) || getFilial();

  try {
    const res = await apiFetch<{ CodStatus: number; mime?: string; imagem?: string }>(
      `/api/petshop/produtos/imagem?id_pro=${encodeURIComponent(idPro)}&filial=${filial}`,
    );
    if (res.CodStatus !== 1 || !res.imagem) {
      return new NextResponse('Sem imagem', { status: 404 });
    }
    const buffer = Buffer.from(res.imagem, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.mime ?? 'image/jpeg',
        // imagem de produto muda raramente — cache de 1h no navegador
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Erro ao buscar imagem', { status: 502 });
  }
}
