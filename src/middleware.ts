import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — não precisam de sessão nem de empresa resolvida
  if (pathname.startsWith('/login'))              return NextResponse.next();
  if (pathname.startsWith('/registro'))           return NextResponse.next();
  if (pathname.startsWith('/confirmacao'))        return NextResponse.next();

  // Assets PWA — precisam ser acessíveis sem login (PWABuilder, instalação, SW)
  if (pathname === '/manifest.webmanifest')       return NextResponse.next();
  if (pathname === '/manifest.json')              return NextResponse.next();
  if (pathname === '/sw.js')                      return NextResponse.next();
  if (pathname === '/offline')                    return NextResponse.next();
  if (pathname.startsWith('/api/pwa-icon'))       return NextResponse.next();
  if (pathname.startsWith('/icons/'))             return NextResponse.next();
  // Arquivos estáticos públicos (imagens, etc.) — ex.: /loguin.png na tela de login
  if (/\.(png|jpe?g|svg|gif|webp|ico|bmp)$/i.test(pathname)) return NextResponse.next();

  // 1) Empresa/dispositivo resolvido (via giro360_backend em /registro ou
  //    /confirmacao) — sem isso não há backend_url pra falar com o Delphi.
  const empresaRaw = request.cookies.get('ps_empresa')?.value;
  let empresaOk = false;
  if (empresaRaw) {
    try {
      const cfg = JSON.parse(empresaRaw) as { cnpj?: string; backend_url?: string; device_id?: string };
      empresaOk = !!(cfg.cnpj && cfg.backend_url && cfg.device_id);
    } catch { /* cookie corrompido — trata como ausente */ }
  }
  if (!empresaOk) {
    const url = request.nextUrl.clone();
    url.pathname = '/registro';
    return NextResponse.redirect(url);
  }

  // 2) Sessão pessoal (pós-login) — Bearer JWT vinculado ao device_id.
  const authRaw = request.cookies.get('ps_auth')?.value;
  let sessaoOk = false;
  if (authRaw) {
    try {
      sessaoOk = !!(JSON.parse(authRaw) as { token?: string }).token;
    } catch { /* cookie corrompido — trata como ausente */ }
  }
  if (!sessaoOk) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica o middleware em todas as rotas exceto assets estáticos e _next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
