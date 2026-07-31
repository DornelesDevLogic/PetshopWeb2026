import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getEmpresaAtiva } from '@/lib/empresa';
import LoginForm, { FilialOption } from './LoginForm';
import { Headphones, Mail, Globe, Monitor, PawPrint } from 'lucide-react';

interface FiliaisResponse { dados: FilialOption[]; Count: number; }

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Sem empresa/dispositivo resolvido neste navegador ainda não há
  // backend_url pra sequer listar filiais — manda pro registro primeiro
  // (o middleware não cobre /login, que precisa ficar acessível sem sessão).
  if (!getEmpresaAtiva()) redirect('/registro');

  let filiais: FilialOption[] = [];
  let erroFiliais: string | undefined;
  try {
    const res = await apiFetch<FiliaisResponse>('/api/petshop/filiais');
    filiais = res.dados ?? [];
    if (filiais.length === 0) erroFiliais = 'Nenhuma filial cadastrada no sistema.';
  } catch {
    erroFiliais = 'Sem conexão com o servidor. Recarregue a página para tentar novamente.';
  }
  const filialPadrao = Number(cookies().get('ps_filial')?.value ?? process.env.FILIAL ?? 1);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[3fr_2fr]">

        {/* ══ Esquerda: imagem em tela cheia ══ */}
        <div className="hidden lg:block relative overflow-hidden bg-blue-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Loguin4k.png"
            alt="PetShop — LogicBox"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>

        {/* ══ Direita: painel de login ══ */}
        <div className="flex items-center justify-center bg-slate-50 p-6 md:p-10">
          <div className="w-full max-w-[400px] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-8">
              <div className="flex items-center gap-2">
                <PawPrint className="h-7 w-7 text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">PetShop</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-5">Sistema de gestão para petshops</p>
              <LoginForm filiais={filiais} filialPadrao={filialPadrao} erroFiliais={erroFiliais} />
          </div>
        </div>
      </div>

      {/* ══ Rodapé ══ */}
      <footer className="bg-blue-700 text-blue-50 text-xs md:text-sm py-3 px-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><Monitor className="h-4 w-4" /> Sistema desenvolvido pela <strong className="font-semibold">Logicbox Automação</strong></span>
        <span className="inline-flex items-center gap-1.5"><Headphones className="h-4 w-4" /> Suporte (51) 3076-3311</span>
        <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> suporte@logicbox.com.br</span>
        <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4" /> www.logicbox.com.br</span>
      </footer>
    </div>
  );
}
