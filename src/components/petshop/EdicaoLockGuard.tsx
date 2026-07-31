'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, ArrowLeft, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adquirirLockEdicao, liberarLockEdicao } from '@/app/(petshop)/lock-actions';

const HEARTBEAT_MS = 60_000; // renova a trava a cada 1 min enquanto a tela estiver aberta
const SESSAO_STORAGE_KEY = 'ps_edicao_sessao_id';

/**
 * Identidade da ABA/JANELA do navegador (não do usuário) — assim, mesmo que
 * duas pessoas usem o mesmo login compartilhado, cada navegador tem sua
 * própria trava e a segunda pessoa é bloqueada corretamente.
 * sessionStorage não é compartilhado entre abas, então cada aba gera a sua.
 */
function obterSessaoId(): string {
  try {
    let id = sessionStorage.getItem(SESSAO_STORAGE_KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
      sessionStorage.setItem(SESSAO_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

interface Props {
  idOrca:  number;
  filial:  number;
  voltarHref?: string;
  children: React.ReactNode;
}

/**
 * Bloqueia a edição de uma agenda/tele-entrega/pré-venda (tabela ORCA) quando
 * outra aba/navegador já está com a tela aberta. Adquire a trava ao montar,
 * renova periodicamente (heartbeat) e libera ao desmontar.
 */
export default function EdicaoLockGuard({ idOrca, filial, voltarHref, children }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<'verificando' | 'liberado' | 'bloqueado'>('verificando');
  const [usuarioNome, setUsuarioNome] = useState('');
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const temTravaPropria = useRef(false);
  const sessaoIdRef = useRef<string>('');

  async function tentarAdquirir() {
    const sessaoId = sessaoIdRef.current || obterSessaoId();
    sessaoIdRef.current = sessaoId;
    const res = await adquirirLockEdicao(idOrca, filial, sessaoId);
    if (res.ok) {
      temTravaPropria.current = true;
      setEstado('liberado');
    } else {
      setUsuarioNome(res.usuarioNome || 'outro usuário');
      setEstado('bloqueado');
    }
  }

  useEffect(() => {
    sessaoIdRef.current = obterSessaoId();
    tentarAdquirir();

    heartbeatRef.current = setInterval(() => {
      // Só faz heartbeat se esta aba já detém a trava — se estiver bloqueado,
      // o heartbeat serve para detectar quando a outra aba liberar.
      adquirirLockEdicao(idOrca, filial, sessaoIdRef.current).then((res) => {
        if (res.ok) {
          temTravaPropria.current = true;
          setEstado('liberado');
        } else {
          setUsuarioNome(res.usuarioNome || 'outro usuário');
          setEstado('bloqueado');
        }
      });
    }, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (temTravaPropria.current) liberarLockEdicao(idOrca, filial, sessaoIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrca, filial]);

  if (estado === 'verificando') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (estado === 'bloqueado') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold">Em edição por outro usuário</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Esta tela está sendo editada agora por <strong className="text-foreground">{usuarioNome}</strong>.
          Para evitar que as alterações se sobreponham, espere a edição terminar e tente novamente.
        </p>
        <div className="flex gap-2 mt-2">
          {voltarHref && (
            <Button variant="outline" onClick={() => router.push(voltarHref)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button onClick={tentarAdquirir}>
            <RotateCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
