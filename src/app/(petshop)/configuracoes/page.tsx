import { redirect } from 'next/navigation';
import { isSupervisor } from '@/lib/session';
import { buscarConfiguracoes } from './actions';
import ConfiguracoesView from '@/components/petshop/configuracoes/ConfiguracoesView';

export default async function ConfiguracoesPage() {
  // Regra do legado: somente SENHA.TIPO='S' (Supervisor) acessa esta tela.
  // Bloqueia também o acesso direto pela URL.
  if (!isSupervisor()) redirect('/agenda');

  const dados = await buscarConfiguracoes();

  return <ConfiguracoesView dados={dados} />;
}
