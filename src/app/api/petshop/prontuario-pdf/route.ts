import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ConsultaDetalhe, ConsultaResponse, AnimalResponse, ClienteResponse, Animal, Cliente } from '@/types/petshop';
import ProntuarioPDF from '@/components/petshop/consultas/ProntuarioPDF';

function gerarProtocolo(animalId: string, dataIni: string, dataFim: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const ai = animalId.padStart(4, '0');
  return `PVET-${ai}-${dataIni.replace(/-/g, '')}-${ts}`;
}

function fmtDataBR(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

export async function GET(req: NextRequest) {
  const sp         = req.nextUrl.searchParams;
  const animalId   = sp.get('animal_id');
  const dataIni    = sp.get('data_ini') || '';
  const dataFim    = sp.get('data_fim') || '';
  const tipo       = (sp.get('tipo') || 'resumido') as 'completo' | 'resumido';
  const filial     = sp.get('filial') || String(getFilial());

  if (!animalId) {
    return NextResponse.json({ error: 'animal_id é obrigatório' }, { status: 400 });
  }

  try {
    // 1. Buscar lista de consultas
    const consultasRes = await apiFetch<ConsultaResponse>(
      `/api/petshop/consultas${qs({
        filial,
        animal_id: animalId,
        data_ini:  dataIni || undefined,
        data_fim:  dataFim || undefined,
        limit:     500,
      })}`,
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' }));

    // 2. Buscar detalhes de cada consulta
    const detalhes: ConsultaDetalhe[] = await Promise.all(
      consultasRes.dados.map((c) =>
        apiFetch<ConsultaDetalhe>(
          `/api/petshop/consultas/detalhe?id=${c.id}&filial=${filial}`,
        ).catch(() => null as unknown as ConsultaDetalhe),
      ),
    ).then((arr) => arr.filter(Boolean));

    // 3. Ordenar cronologicamente (mais antiga primeiro)
    detalhes.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    // 4. Buscar dados do animal
    const animalRes = await apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial, filter1: `a.PET_ID=${animalId}`, limit: 1 })}`,
    ).catch(() => ({ dados: [] as Animal[], Count: 0, StartsAt: '', EndsAt: '' }));
    const animal = animalRes.dados[0];

    if (!animal) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 404 });
    }

    // 5. Buscar dados do cliente/tutor
    const clienteId  = animal.id_cliente;
    const clienteRes = await apiFetch<ClienteResponse>(
      `/api/petshop/clientes${qs({ filial, filter1: `s.COD_CLI=${clienteId}`, limit: 1 })}`,
    ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
    const cliente = clienteRes.dados[0] ?? { nome: animal.nome_cliente } as Cliente;

    // 6. Buscar nome da empresa/filial
    type FilialItem = { id: number; nome: string };
    type FilialResp = { dados: FilialItem[]; Count: number; StartsAt: string; EndsAt: string };
    const filiaisRes = await apiFetch<FilialResp>(
      `/api/petshop/filiais${qs({ filial, limit: 1 })}`,
    ).catch(() => ({ dados: [] as FilialItem[], Count: 0, StartsAt: '', EndsAt: '' }));
    const empresa = filiaisRes.dados[0]?.nome || 'PetShop';

    // 7. Gerar protocolo e data de geração
    const protocolo   = gerarProtocolo(animalId, dataIni, dataFim);
    const now         = new Date();
    const dataGeracao = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const periodo     = dataIni && dataFim
      ? `${fmtDataBR(dataIni)} a ${fmtDataBR(dataFim)}`
      : 'Período completo';

    // 8. Renderizar PDF
    const element = createElement(ProntuarioPDF, {
      empresa,
      protocolo,
      dataGeracao,
      animal,
      cliente,
      consultas: detalhes,
      tipo,
      periodo,
    });

    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

    const nomeArquivo = `prontuario-${animal.nome.replace(/[^a-zA-Z0-9]/g, '_')}-${dataIni}-${dataFim}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[prontuario-pdf]', err);
    return NextResponse.json(
      { error: 'Erro ao gerar prontuário. Verifique os logs do servidor.' },
      { status: 500 },
    );
  }
}
