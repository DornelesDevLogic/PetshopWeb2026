'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface LoginApiResult {
  ok: boolean;
  codigo?: number;
  nome?: string;
  tipo?: string;
  empresa?: number;
  erro?: string;
}

export async function login(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const codigo = (formData.get('codigo') as string | null) ?? '';
  const senha  = (formData.get('senha')  as string | null) ?? '';

  if (!codigo.trim() || !senha.trim()) {
    return { error: 'Preencha o código do usuário e a senha.' };
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return { error: 'Configuração de autenticação ausente no servidor.' };
  }

  let result: LoginApiResult;
  try {
    result = await apiFetch<LoginApiResult>('/api/petshop/auth/login', {
      method: 'POST',
      body: JSON.stringify({ codigo: Number(codigo), senha }),
    });
  } catch (_e) {
    return { error: 'Não foi possível conectar ao servidor. Verifique a conexão.' };
  }

  if (!result.ok) {
    return { error: result.erro ?? 'Usuário ou senha incorretos.' };
  }

  const cookieStore = cookies();

  // Cookie de autenticação (valida pelo middleware)
  cookieStore.set('ps_auth', secret, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  });

  // Cookie com dados do usuário logado
  cookieStore.set('ps_user', JSON.stringify({
    codigo:  result.codigo,
    nome:    result.nome   ?? '',
    tipo:    result.tipo   ?? '',
    empresa: result.empresa ?? 0,
  }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect('/');
}

export async function logout() {
  cookies().delete('ps_auth');
  cookies().delete('ps_user');
  redirect('/login');
}
