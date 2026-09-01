'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

export interface AutorizacaoCred {
  autorizacao_codigo: string;
  autorizacao_senha:  string;
}

interface RespostaComAutorizacao {
  error?:            string;
  requerAutorizacao?: boolean;
}

/**
 * Reproduz o fluxo "desconto acima do limite → senha de supervisor libera"
 * do sistema antigo (Uagenda_veterinario.pas/Uprevenda.pas/Utele_entrega.pas),
 * agora contra o backend novo (ValidaDescontoComAutorizacao em
 * Controllers.PetShop.pas). Uso: chame `comAutorizacao(fn)` no lugar de
 * chamar a action diretamente — `fn` recebe as credenciais quando o backend
 * pedir autorização, e deve repassá-las no body da requisição.
 */
export function useAutorizacaoDesconto() {
  const [aberto, setAberto]     = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [codigo, setCodigo]     = useState('');
  const [senha, setSenha]       = useState('');
  const [enviando, setEnviando] = useState(false);
  const resolverRef = useRef<((v: AutorizacaoCred | null) => void) | null>(null);

  function pedirAutorizacao(msg: string): Promise<AutorizacaoCred | null> {
    setMensagem(msg);
    setCodigo('');
    setSenha('');
    setAberto(true);
    return new Promise((resolve) => { resolverRef.current = resolve; });
  }

  function confirmar() {
    if (!codigo.trim() || !senha.trim()) return;
    setAberto(false);
    resolverRef.current?.({ autorizacao_codigo: codigo.trim(), autorizacao_senha: senha });
    resolverRef.current = null;
  }

  function cancelar() {
    setAberto(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }

  /**
   * Executa `fn`; se a resposta vier com `requerAutorizacao`, abre o dialog
   * de senha de supervisor e repete `fn` com as credenciais — em loop, até
   * liberar, até o usuário cancelar, ou até vir um erro que não seja de
   * autorização (fn não deve retornar requerAutorizacao nesse caso).
   */
  async function comAutorizacao<T extends RespostaComAutorizacao>(
    fn: (auth?: AutorizacaoCred) => Promise<T>,
  ): Promise<T> {
    let res = await fn();
    while (res.requerAutorizacao) {
      const cred = await pedirAutorizacao(res.error || 'Autorização de supervisor necessária.');
      if (!cred) return res; // cancelado — devolve a resposta original (com o erro) pra tela mostrar
      setEnviando(true);
      try {
        res = await fn(cred);
      } finally {
        setEnviando(false);
      }
    }
    return res;
  }

  const dialog: ReactNode = aberto ? (
    <Dialog open onOpenChange={(v) => { if (!v && !enviando) cancelar(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Autorização necessária
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {mensagem}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="autoriz-cod">Usuário (supervisor)</Label>
            <Input
              id="autoriz-cod" className="h-9" autoFocus
              value={codigo} onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="autoriz-senha">Senha</Label>
            <Input
              id="autoriz-senha" type="password" className="h-9"
              value={senha} onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmar(); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancelar} disabled={enviando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={enviando || !codigo.trim() || !senha.trim()}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Autorizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  return { dialog, comAutorizacao };
}
