import { NextRequest, NextResponse } from 'next/server';
import { apiFetch, qs } from '@/lib/api';

/**
 * Estoque do produto em todas as filiais (botão "estoque das lojas").
 *
 * 1) Tenta o endpoint dedicado do backend (/api/petshop/produtos/estoque-filiais,
 *    equivalente à tela Saldos do legado).
 * 2) Se o servidor ainda roda a versão antiga (rota inexistente → HTTP 404),
 *    agrega o resultado consultando a pesquisa de produtos filial a filial —
 *    mesmo saldo, apenas mais requisições.
 */

export interface EstoqueFilial {
  filial:      number;
  nome_filial: string;
  /** null = produto sem cadastro/inativo naquela filial */
  estoque:     number | null;
}

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams;
  const idPro     = Number(sp.get('id_pro'));
  const codFilial = Number(sp.get('cod_filial')) || 1;
  const busca     = sp.get('busca') ?? '';
  if (!idPro) return NextResponse.json({ erro: 'id_pro obrigatório' }, { status: 400 });

  try {
    const res = await apiFetch<{ CodStatus?: number; dados?: EstoqueFilial[] }>(
      `/api/petshop/produtos/estoque-filiais${qs({ id_pro: idPro, cod_filial: codFilial })}`,
    );
    if (res.dados && (res.CodStatus === undefined || res.CodStatus >= 0)) {
      return NextResponse.json({ dados: res.dados });
    }
  } catch {
    // backend antigo sem a rota — segue para a agregação
  }

  try {
    const fil = await apiFetch<{ dados?: { id: number; nome: string }[] }>(
      '/api/petshop/filiais',
    );
    const dados: EstoqueFilial[] = await Promise.all(
      (fil.dados ?? []).map(async (f) => {
        try {
          const r = await apiFetch<{ dados?: { id_pro: number; estoque: number }[] }>(
            `/api/petshop/produtos/pesquisa${qs({ filial: f.id, busca, limit: 200 })}`,
          );
          const p = (r.dados ?? []).find((x) => x.id_pro === idPro);
          return { filial: f.id, nome_filial: f.nome, estoque: p ? p.estoque : null };
        } catch {
          return { filial: f.id, nome_filial: f.nome, estoque: null };
        }
      }),
    );
    return NextResponse.json({ dados });
  } catch {
    return NextResponse.json({ erro: 'Falha ao consultar estoque das lojas' }, { status: 502 });
  }
}
