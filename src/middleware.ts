import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — não precisam de sessão
  if (pathname.startsWith('/login')) return NextResponse.next();

  const session = request.cookies.get('ps_auth')?.value;
  const secret  = process.env.SESSION_SECRET;

  if (!session || !secret || session !== secret) {
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
