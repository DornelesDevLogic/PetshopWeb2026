import { NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  ConsultaDetalhe, AnimalResponse, ClienteResponse, Animal, Cliente,
  DadosEmpresa, AnexoExameResponse, AnexoExame,
} from '@/types/petshop';
import ConsultaPDF from '@/components/petshop/consultas/ConsultaPDF';

const EMPRESA_FALLBACK: DadosEmpresa = {
  id: 0, nome: 'PetShop', fantasia: '', cnpj: '', endereco: '', numero: '',
  bairro: '', cidade: '', uf: '', cep: '', fone: '', celular: '', email: '',
  site: '', logo_base64: '',
};

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const id     = sp.get('id');
  const filial = sp.get('filial') || String(getFilial());

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  try {
    // 1. Detalhe da consulta
    const consulta = await apiFetch<ConsultaDetalhe>(
      `/api/petshop/consultas/detalhe${qs({ id, filial })}`,
    ).catch(() => null);

    if (!consulta || consulta.CodStatus === -5) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });
    }

    // 2. Empresa, animal, cliente e anexos em paralelo
    const [empresaRes, animalRes, anexosRes] = await Promise.all([
      apiFetch<DadosEmpresa>(`/api/petshop/empresa${qs({ filial })}`).catch(() => EMPRESA_FALLBACK),
      apiFetch<AnimalResponse>(
        `/api/petshop/animais${qs({ filial, filter1: `a.PET_ID=${consulta.animal_id}`, limit: 1 })}`,
      ).catch(() => ({ dados: [] as Animal[], Count: 0, StartsAt: '', EndsAt: '' })),
      apiFetch<AnexoExameResponse>(
        `/api/petshop/exames/anexos${qs({ consulta_id: id, filial })}`,
      ).catch(() => ({ dados: [] as AnexoExame[], Count: 0 })),
    ]);

    const empresa = empresaRes?.id ? empresaRes : EMPRESA_FALLBACK;
    const animal  = animalRes.dados[0] ?? null;

    let cliente: Cliente | null = null;
    const clienteId = animal?.id_cliente ?? consulta.proprietario_id;
    if (clienteId) {
      const clienteRes = await apiFetch<ClienteResponse>(
        `/api/petshop/clientes${qs({ filial, filter1: `s.COD_CLI=${clienteId}`, limit: 1 })}`,
      ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
      cliente = clienteRes.dados[0] ?? null;
    }
    if (!cliente && consulta.proprietario) {
      cliente = { nome: consulta.proprietario } as Cliente;
    }

    // 3. Protocolo e data
    const protocolo = `CVET-${String(consulta.id).padStart(5, '0')}-${(filial || '1')}`;
    const now = new Date();
    const dataGeracao =
      `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
      + ` ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 4. Renderizar
    const element = createElement(ConsultaPDF, {
      empresa,
      consulta,
      animal,
      cliente,
      anexos: anexosRes.dados ?? [],
      protocolo,
      dataGeracao,
    });

    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
    const nomeArquivo = `consulta-${consulta.id}-${(animal?.nome ?? 'pet').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[consulta-pdf]', err);
    return NextResponse.json(
      { error: 'Erro ao gerar PDF da consulta. Verifique os logs do servidor.' },
      { status: 500 },
    );
  }
}
