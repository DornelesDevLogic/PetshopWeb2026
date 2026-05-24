'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const username = (formData.get('username') as string | null) ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  const validUser = process.env.APP_USER;
  const validPass = process.env.APP_PASS;
  const secret    = process.env.SESSION_SECRET;

  if (!validUser || !validPass || !secret) {
    return { error: 'Configuração de autenticação ausente no servidor.' };
  }

  if (username !== validUser || password !== validPass) {
    return { error: 'Usuário ou senha incorretos.' };
  }

  cookies().set('ps_auth', secret, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  });

  redirect('/');
}

export async function logout() {
  cookies().delete('ps_auth');
  redirect('/login');
}
