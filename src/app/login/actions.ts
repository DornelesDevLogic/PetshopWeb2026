'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getEmpresaAtiva } from '@/lib/empresa';
import { salvarSessaoAtiva, limparSessaoAtiva } from '@/lib/sessao';

interface LoginApiResult {
  ok: boolean;
  codigo?: number;
  nome?: string;
  tipo?: string;
  empresa?: number;
  tecnico_id?: number;    // profissional vinculado (TBLTECNICO.FK_USUARIO)
  tecnico_nome?: string;
  vendedor_id?: number;     // vendedor vinculado (VENDEDOR.FK_USUARIO)
  vendedor_filial?: number;
  vendedor_nome?: string;
  erro?: string;
  token?: string;          // JWT pessoal vinculado ao device_id — usado como Bearer em todas as chamadas seguintes
}

export async function login(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const codigo = (formData.get('codigo') as string | null) ?? '';
  const senha  = (formData.get('senha')  as string | null) ?? '';
  const filialRaw  = (formData.get('filial')      as string | null) ?? '';
  const filialNome = (formData.get('filial_nome') as string | null) ?? '';

  if (!codigo.trim() || !senha.trim()) {
    return { error: 'Preencha o código do usuário e a senha.' };
  }

  // Espelha o legado (Usenha.pas): login bloqueado sem filial selecionada
  const filial = Number(filialRaw);
  if (!Number.isFinite(filial) || filial <= 0) {
    return { error: 'Selecione a filial para continuar.' };
  }

  // Empresa/dispositivo resolvido via giro360_backend (/registro ou
  // /confirmacao) — sem isso não há backend_url pra falar com o Delphi.
  // O middleware já deveria ter redirecionado pra /registro antes disso,
  // mas confere de novo por segurança (Server Action pode ser chamada direto).
  const empresa = getEmpresaAtiva();
  if (!empresa) {
    return { error: 'Nenhuma empresa registrada neste dispositivo. Registre novamente.' };
  }

  // apiFetch usa o token de APLICAÇÃO (por CNPJ, via giro360_backend) pois
  // ainda não há sessão pessoal nesta chamada — é exatamente essa chamada
  // que troca código+senha pelo JWT pessoal.
  let result: LoginApiResult;
  try {
    result = await apiFetch<LoginApiResult>('/api/petshop/auth/login', {
      method: 'POST',
      body: JSON.stringify({ codigo: Number(codigo), senha, device_id: empresa.device_id }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor. Verifique a conexão.' };
  }

  if (!result.ok) {
    return { error: result.erro ?? 'Usuário ou senha incorretos.' };
  }
  if (!result.token) {
    return { error: 'Servidor não emitiu token de sessão.' };
  }

  const cookieStore = cookies();

  // Sessão pessoal — Bearer JWT vinculado ao device_id, usado por apiFetch
  // em todas as chamadas seguintes (ver lib/api.ts).
  salvarSessaoAtiva(result.token);

  // Cookie com dados do usuário logado
  // filial = filial ATIVA da sessão (escolhida no login);
  // empresa = filial de cadastro do usuário (SENHA.EMPRESA no legado)
  cookieStore.set('ps_user', JSON.stringify({
    codigo:       result.codigo,
    nome:         result.nome   ?? '',
    tipo:         result.tipo   ?? '',
    empresa:      result.empresa ?? 0,
    filial,
    filial_nome:  filialNome,
    tecnico_id:   result.tecnico_id ?? 0,
    tecnico_nome: result.tecnico_nome ?? '',
    vendedor_id:     result.vendedor_id ?? 0,
    vendedor_filial: result.vendedor_filial ?? 0,
    vendedor_nome:   result.vendedor_nome ?? '',
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  // Cookie legível no client (não é segredo) — também serve de memória
  // da última filial usada, como o Config.ini ID_EMPRESA do legado
  cookieStore.set('ps_filial', String(filial), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180, // 180 dias
  });

  redirect('/');
}

export async function logout() {
  limparSessaoAtiva();
  cookies().delete('ps_user');
  // ps_filial e ps_empresa são preservados de propósito: memorizam a última
  // filial escolhida e o dispositivo/tenant já aprovado (não precisa
  // registrar de novo no próximo login).
  redirect('/login');
}
