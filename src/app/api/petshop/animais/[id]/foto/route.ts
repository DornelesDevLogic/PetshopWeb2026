import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, getFilial } from '@/lib/api';
import { getFotoCache, setFotoCache, TTL_SEM_FOTO_MS, TTL_COM_FOTO_MS } from '@/lib/fotoCache';

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
// (que pode ser trocada pelo usuário). 2h e 1h respectivamente — mas isso
// vale só pro cache do PROCESSO (server), que é invalidado na hora por
// lib/fotoCache quando alguém sobe/remove a foto. O Cache-Control devolvido
// ao NAVEGADOR precisa ser bem mais curto: o navegador cacheia pela URL
// exata (com o "v=" incluso), e como cada tela usa seu próprio esquema de
// cache-busting (algumas nem usam), um 404 "sem foto" cacheado por horas no
// navegador continua aparecendo depois do upload já ter sido salvo no
// servidor — foi exatamente o bug relatado (upload funciona no backend,
// tela continua mostrando "sem foto" ao reabrir). Com max-age curto aqui,
// o navegador volta a perguntar pro nosso servidor logo, que responde na
// hora pelo cache em memória (sem bater no backend de novo).

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const semFoto = () => new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
  });

  const id = Number(params.id);
  if (!id) return semFoto();

  const filial = getFilial();
  const cache = getFotoCache(id, filial);
  if (cache && cache.expira > Date.now()) {
    if (!cache.buf) return semFoto();
    return new NextResponse(new Uint8Array(cache.buf), {
      headers: {
        'Content-Type':  'image/jpeg',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  }

  let data: FotoResponse;
  try {
    data = await apiFetch<FotoResponse>(
      `/api/petshop/animais/foto?animal_id=${id}&filial=${filial}`,
    );
  } catch {
    return semFoto();
  }

  if (!data?.foto) {
    setFotoCache(id, filial, { buf: null, expira: Date.now() + TTL_SEM_FOTO_MS });
    return semFoto();
  }

  // Remove eventuais quebras de linha MIME (CRLF/LF) antes de decodificar
  const buf = Buffer.from(data.foto.replace(/[\r\n]/g, ''), 'base64');
  setFotoCache(id, filial, { buf, expira: Date.now() + TTL_COM_FOTO_MS });
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
