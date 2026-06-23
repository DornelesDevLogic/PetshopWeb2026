import { cookies } from 'next/headers';

export interface UsuarioLogado {
  codigo:  number;
  nome:    string;
  tipo:    string;   // S=Supervisor, G=Gerente, F=Ger. Especial, O=Operador (SENHA.TIPO)
  empresa: number;
  tecnico_id?:   number;  // profissional vinculado via TBLTECNICO.FK_USUARIO (0 = sem vínculo)
  tecnico_nome?: string;
}

/** Lê o usuário logado do cookie de sessão (server-side only). */
export function getUsuarioLogado(): UsuarioLogado | null {
  try {
    const raw = cookies().get('ps_user')?.value;
    if (!raw) return null;
    return JSON.parse(raw) as UsuarioLogado;
  } catch {
    return null;
  }
}

/** Regra do legado: tela de Configurações Gerais exige SENHA.TIPO = 'S'. */
export function isSupervisor(): boolean {
  return getUsuarioLogado()?.tipo === 'S';
}
