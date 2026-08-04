import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';

interface FotoResponse {
  foto: string;
}

// Cache em memória do processo, além do Cache-Control do navegador: o
// Cache-Control só evita reconsulta pelo MESMO usuário/navegador — com
// vários usuários simultâneos, cada um ainda ia ao backend buscar a foto
// do mesmo animal. Aqui a primeira busca (de qualquer usuário) serve todos
// os outros pelo resto da janela de cache.
// "Sem foto" muda muito pouco (só quando alguém cadastra a 1ª foto do
// animal) — pode ficar cacheado mais tempo que uma foto já existente
// (que pode ser trocada pelo usuário). 2h e 1h respectivamente, tanto no
// cache do processo quanto no Cache-Control devolvido ao navegador — assim
// o navegador para de nem perguntar de novo dentro dessa janela.
const TTL_SEM_FOTO_MS = 7_200_000;
const TTL_COM_FOTO_MS = 3_600_000;
const cacheFoto = new Map<string, { buf: ReturnType<typeof Buffer.from> | null; expira: number }>();

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const semFoto = () => new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400' },
  });

  const id = Number(params.id);
  if (!id) return semFoto();

  const chave = `${id}:${getFilial()}`;
  const cache = cacheFoto.get(chave);
  if (cache && cache.expira > Date.now()) {
    if (!cache.buf) return semFoto();
    return new NextResponse(cache.buf, {
      headers: {
        'Content-Type':  'image/jpeg',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  }

  let data: FotoResponse;
  try {
    data = await apiFetch<FotoResponse>(
      `/api/petshop/animais/foto?animal_id=${id}&filial=${getFilial()}`,
    );
  } catch {
    return semFoto();
  }

  if (!data?.foto) {
    cacheFoto.set(chave, { buf: null, expira: Date.now() + TTL_SEM_FOTO_MS });
    return semFoto();
  }

  // Remove eventuais quebras de linha MIME (CRLF/LF) antes de decodificar
  const buf = Buffer.from(data.foto.replace(/[\r\n]/g, ''), 'base64');
  cacheFoto.set(chave, { buf, expira: Date.now() + TTL_COM_FOTO_MS });
  return new NextResponse(buf, {
    headers: {
      'Content-Type':  'image/jpeg',
      // Antes era 'no-store': toda renderização da Agenda buscava de novo a
      // foto de TODO animal do dia, mesmo sem nada ter mudado — com muitos
      // agendamentos isso vira uma enxurrada de requisições que estoura o
      // rate limit do backend e derruba (429) os outros endpoints junto.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
