'use server';

import { salvarEmpresaAtiva, type EmpresaConfig } from './empresa';

/**
 * Chamado por /registro (após status "aprovado" no polling) e por
 * /confirmacao (após o clique no link do e-mail) — os dois pontos de entrada
 * onde o giro360_backend confirma que o dispositivo foi aprovado para o CNPJ.
 */
export async function confirmarRegistroDispositivo(cfg: EmpresaConfig): Promise<void> {
  salvarEmpresaAtiva(cfg);
}
