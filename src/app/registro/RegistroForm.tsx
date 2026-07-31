'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, RefreshCw, Mail, Clock } from 'lucide-react';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import { confirmarRegistroDispositivo } from '@/lib/empresaActions';

// Chamado direto do browser pro giro360_backend — CORS_ORIGINS já libera a
// origem do petshop_web na VPS (http://localhost:3005, por ora).
const VPS = process.env.NEXT_PUBLIC_VPS_URL || '';
const APLICACAO = 'petshop_web';
const POLL_INTERVAL_MS = 5000;

function fmtCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

type Tela = 'form' | 'enviando' | 'aguardando';

export default function RegistroForm() {
  const router = useRouter();

  const [tela, setTela]     = useState<Tela>('form');
  const [cnpj, setCnpj]     = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha]   = useState('');
  const [captchaInput, setCaptchaInput]   = useState('');
  const [captchaSvg, setCaptchaSvg]       = useState('');
  const [captchaSecret, setCaptchaSecret] = useState('');
  const [erro, setErro]                 = useState('');
  const [mensagemEmail, setMensagemEmail] = useState('');
  const [temEmail, setTemEmail]           = useState(true);
  const [carregandoCaptcha, setCarregandoCaptcha] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gerado só depois de montar no client (evita mismatch de hidratação —
  // no servidor "window" não existe, então o valor inicial teria que ser
  // diferente do que o client calcularia no mesmo render).
  const [deviceId, setDeviceId] = useState('');
  useEffect(() => { setDeviceId(getOrCreateDeviceId()); }, []);

  const buscarCaptcha = useCallback(async () => {
    setCarregandoCaptcha(true);
    setCaptchaInput('');
    try {
      const r = await fetch(`${VPS}/giro/captcha`);
      const d = await r.json();
      setCaptchaSvg(d.svg);
      setCaptchaSecret(d.secret);
    } catch {
      setErro('Não foi possível carregar o captcha. Verifique a conexão.');
    } finally {
      setCarregandoCaptcha(false);
    }
  }, []);

  useEffect(() => { buscarCaptcha(); }, [buscarCaptcha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setTela('enviando');

    try {
      const r = await fetch(`${VPS}/giro/registro-empresa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj:      cnpj.replace(/\D/g, ''),
          codigo:    Number(codigo),
          senha,
          captcha:   captchaInput,
          secret:    captchaSecret,
          device_id: deviceId,
          aplicacao: APLICACAO,
        }),
      });
      const d = await r.json();

      if (!r.ok) {
        setErro(d.erro || 'Erro ao registrar.');
        setTela('form');
        if (r.status === 400 && d.erro?.includes('aptcha')) buscarCaptcha();
        return;
      }

      setMensagemEmail(d.message);
      setTemEmail(d.tem_email !== false);
      setTela('aguardando');
    } catch {
      setErro('Erro de conexão com o servidor.');
      setTela('form');
    }
  }

  // Polling: consulta status da aprovação a cada 5s enquanto aguarda
  useEffect(() => {
    if (tela !== 'aguardando') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    async function checarStatus() {
      try {
        const cnpjNumeros = cnpj.replace(/\D/g, '');
        const r = await fetch(
          `${VPS}/giro/status/${deviceId}?cnpj=${cnpjNumeros}&aplicacao=${APLICACAO}`,
        );
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === 'aprovado' && d.config) {
          if (pollRef.current) clearInterval(pollRef.current);
          await confirmarRegistroDispositivo({
            cnpj:        d.config.cnpj,
            codigo:      d.config.codigo,
            backend_url: d.config.backend_url,
            device_id:   d.config.device_id,
            salvo_em:    d.config.salvo_em,
          });
          router.push('/login');
        } else if (d.status === 'bloqueado') {
          if (pollRef.current) clearInterval(pollRef.current);
          setErro('Acesso bloqueado pelo administrador.');
          setTela('form');
        }
      } catch {
        // silencia erros de rede — tenta de novo no próximo tick
      }
    }

    checarStatus(); // primeira verificação imediata
    pollRef.current = setInterval(checarStatus, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tela, cnpj, deviceId, router]);

  // ── Aguardando confirmação ───────────────────────────────────
  if (tela === 'aguardando') {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${temEmail ? 'bg-green-50' : 'bg-amber-50'}`}>
            {temEmail
              ? <Mail className="h-8 w-8 text-green-600" />
              : <Clock className="h-8 w-8 text-amber-600" />}
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-900">
          {temEmail ? 'Verifique seu email' : 'Aguardando aprovação'}
        </h2>

        <p className="text-sm text-muted-foreground">{mensagemEmail}</p>

        {temEmail ? (
          <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-700">
            Após clicar no link do email, você será redirecionado automaticamente.
          </div>
        ) : (
          <div className="bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-700">
            O administrador precisa aprovar seu acesso pelo portal.
            Esta página será atualizada automaticamente quando for liberado.
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Verificando a cada 5 segundos...
        </div>

        <button
          onClick={() => router.push('/login')}
          className="text-xs text-indigo-600 hover:underline"
        >
          Já aprovado? Ir para o login
        </button>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="cnpj">CNPJ da empresa</Label>
        <Input
          id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00"
          value={fmtCnpj(cnpj)}
          onChange={(e) => setCnpj(e.target.value.replace(/\D/g, ''))}
          maxLength={18} required className="h-11 rounded-lg"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="codigo">Código do usuário</Label>
        <Input
          id="codigo" type="number" inputMode="numeric" placeholder="ex: 1"
          value={codigo} onChange={(e) => setCodigo(e.target.value)}
          required className="h-11 rounded-lg"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha" type="password" placeholder="••••••••"
          value={senha} onChange={(e) => setSenha(e.target.value)}
          required className="h-11 rounded-lg"
        />
      </div>

      {/* Captcha (real, servido pelo giro360_backend) */}
      <div className="space-y-2">
        <Label>Código de verificação</Label>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg border border-input bg-slate-50 overflow-hidden flex items-center justify-center"
            style={{ minHeight: 60 }}
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
          <button
            type="button"
            onClick={buscarCaptcha}
            disabled={carregandoCaptcha}
            className="p-2.5 rounded-lg border border-input hover:bg-muted text-muted-foreground shrink-0"
            title="Gerar novo captcha"
          >
            <RefreshCw className={`h-4 w-4 ${carregandoCaptcha ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <Input
          placeholder="Digite os caracteres acima"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          required autoComplete="off" className="h-11 rounded-lg"
        />
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2 border border-input">
        <p className="text-xs text-muted-foreground mb-0.5">ID do dispositivo</p>
        <code className="text-xs text-muted-foreground font-mono break-all">{deviceId}</code>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 rounded-lg bg-blue-700 hover:bg-blue-800 text-base font-semibold"
        disabled={tela === 'enviando' || cnpj.length < 14 || !codigo || !senha || !captchaInput}
      >
        {tela === 'enviando' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
        ) : (
          'Registrar dispositivo'
        )}
      </Button>

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="w-full text-center text-xs text-muted-foreground hover:text-blue-700 transition-colors"
      >
        Já tem acesso? Fazer login
      </button>
    </form>
  );
}
