import { apiFetch, qs, getFilial } from '@/lib/api';
import { AnimalResponse, EspecieResponse, AniversariantesResponse } from '@/types/petshop';
import AnimaisView from '@/components/petshop/animais/AnimaisView';

interface PageProps {
  searchParams: { mes?: string; busca?: string };
}

export default async function AnimaisPage({ searchParams }: PageProps) {
  const empty     = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const mesAtual  = new Date().getMonth() + 1;
  const mes       = Number(searchParams.mes) || mesAtual;
  const busca     = (searchParams.busca ?? '').trim();

  // Só carrega a lista de animais quando há busca (mín. 2 letras) — evita
  // carregar toda a base ao abrir a tela.
  // Maiúsculo: os nomes ficam gravados em CAIXA ALTA no legado, e o CONTAINING
  // do Firebird não dobra maiúscula/minúscula de forma confiável para
  // caracteres acentuados (ex.: "ã" minúsculo não batia com "Ã" armazenado).
  // "nomepet/nomecliente" (ou vice-versa): cada trecho separado por "/" tem
  // que aparecer em QUALQUER um dos dois campos — não necessariamente cada
  // um no seu campo "certo" — pra achar tanto "chaves/logicbox" quanto
  // "logicbox/chaves".
  const termos = busca
    .split('/')
    .map((t) => t.trim().toUpperCase().replace(/'/g, "''"))
    .filter((t) => t.length >= 2);
  const termosBusca = termos.length > 0 ? termos : [busca.toUpperCase().replace(/'/g, "''")];
  const condicaoBusca = termosBusca
    .map((t) => `(a.NOME CONTAINING '${t}' OR a.PET_NOME_CLI CONTAINING '${t}')`)
    .join(' AND ');
  const animaisRes = busca.length >= 2
    ? await apiFetch<AnimalResponse>(
        `/api/petshop/animais${qs({
          filial:  getFilial(),
          limit:   200,
          // Convenção do legado: ATIVO=1 significa INATIVO (invertido).
          filter1: 'a.ATIVO<>1',
          filter2: condicaoBusca,
        })}`,
      ).catch(() => empty)
    : empty;

  const [anivRes, especiesRes] = await Promise.all([
    apiFetch<AniversariantesResponse>(
      `/api/petshop/animais/aniversarios${qs({ filial: getFilial(), mes })}`,
    ).catch(() => ({ mes, dados: [], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
  ]);

  return (
    <AnimaisView
      animais={animaisRes.dados}
      aniversariantes={anivRes.dados}
      especies={especiesRes.dados}
      mes={mes}
      buscaInicial={busca}
    />
  );
}
