import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';

/**
 * Versão da API Delphi, exibida no rodapé do menu lateral. Buscada pelo
 * CLIENTE (fetch no useEffect de CollapsibleSidebar) em vez de bloquear o
 * layout no servidor — é só uma informação cosmética, não deve atrasar a
 * primeira renderização de nenhuma tela do sistema.
 */
export async function GET() {
  try {
    const data = await apiFetch<{ versao?: string }>('/api/petshop/status');
    return NextResponse.json({ versao: data.versao ?? '' });
  } catch {
    return NextResponse.json({ versao: '' });
  }
}
