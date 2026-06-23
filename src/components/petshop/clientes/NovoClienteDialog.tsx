'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCliente, buscarCep, verificarCpfDuplicado } from '@/app/(petshop)/clientes/actions';
import { formatarTelefone, validarEmail, cpfCnpjCompleto } from '@/lib/masks';
import { Cliente } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, MapPin, Plus, User } from 'lucide-react';

type ClienteCriado = Pick<
  Cliente,
  'id' | 'filial' | 'nome' | 'nome_fantasia' | 'cpf_cnpj' |
  'celular' | 'telefone' | 'email' | 'pessoa' | 'status_ativo'
>;

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onCriado?: (cliente: ClienteCriado) => void;
  filial?: number;
}

export default function NovoClienteDialog({
  open: openProp,
  onOpenChange,
  onCriado,
  filial = 1,
}: Props) {
  const router = useRouter();
  const modoEmbutido = onCriado !== undefined;
  const [openInterno, setOpenInterno] = useState(false);

  const isOpen = modoEmbutido ? (openProp ?? false) : openInterno;
  function setOpen(v: boolean) {
    modoEmbutido ? onOpenChange?.(v) : setOpenInterno(v);
  }

  const [error, setError]            = useState('');
  const [pessoa, setPessoa]          = useState<string>('F');
  const [isento, setIsento]          = useState(false);
  const [isPending, startTransition] = useTransition();

  // Campos controlados para máscara e validações inline
  const [celular,    setCelular]    = useState('');
  const [telefone,   setTelefone]   = useState('');
  const [cpf,        setCpf]        = useState('');
  const [cpfErro,    setCpfErro]    = useState('');
  const [cpfChecking, setCpfChecking] = useState(false);
  const [emailLocal, setEmailLocal] = useState('');
  const [emailErro,  setEmailErro]  = useState('');

  // Campos de endereço controlados para auto-preenchimento via CEP
  const [cep, setCep]           = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro]     = useState('');
  const [cidade, setCidade]     = useState('');
  const [uf, setUf]             = useState('');
  const [ibge, setIbge]         = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMsg, setCepMsg]         = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function handleCepBlur() {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setCepLoading(true);
    setCepMsg(null);
    const r = await buscarCep(cepLimpo);
    setCepLoading(false);
    if (r) {
      setEndereco(r.logradouro);
      setBairro(r.bairro);
      setCidade(r.cidade);
      setUf(r.uf);
      setIbge(r.ibge);
      setCepMsg({ tipo: 'ok', texto: 'Endereço preenchido automaticamente.' });
    } else {
      setCepMsg({ tipo: 'erro', texto: 'CEP não encontrado. Preencha manualmente.' });
    }
  }

  async function handleCpfBlur() {
    setCpfErro('');
    if (!cpfCnpjCompleto(cpf)) return;
    setCpfChecking(true);
    const r = await verificarCpfDuplicado(cpf);
    setCpfChecking(false);
    if (r.duplicado) {
      setCpfErro(
        `CPF/CNPJ já cadastrado${r.nome ? ` para "${r.nome}"` : ''}${r.id ? ` (Cód. ${r.id})` : ''}.`
      );
    }
  }

  function handleEmailBlur() {
    if (emailLocal && !validarEmail(emailLocal)) {
      setEmailErro('E-mail inválido. Verifique o formato (ex: cliente@empresa.com).');
    } else {
      setEmailErro('');
    }
  }

  function resetForm() {
    setError(''); setPessoa('F'); setIsento(false);
    setCep(''); setEndereco(''); setBairro(''); setCidade(''); setUf(''); setIbge('');
    setCepMsg(null);
    setCelular(''); setTelefone(''); setCpf('');
    setCpfErro(''); setEmailLocal(''); setEmailErro('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    // Bloqueio por erros inline pendentes
    if (cpfErro)   { setError(cpfErro);   return; }
    if (emailErro) { setError(emailErro); return; }

    // Valida e-mail no submit (caso o usuário não tenha saído do campo)
    if (emailLocal && !validarEmail(emailLocal)) {
      setEmailErro('E-mail inválido. Verifique o formato (ex: cliente@empresa.com).');
      setError('Corrija os erros antes de salvar.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('celular',  celular);
    formData.set('telefone', telefone);
    formData.set('pessoa',   pessoa);
    formData.set('endereco', endereco);
    formData.set('bairro',   bairro);
    formData.set('cidade',   cidade);
    formData.set('uf',       uf);
    formData.set('cep',      cep);
    formData.set('ibge',     ibge);
    if (isento) formData.set('ie', 'ISENTO');

    startTransition(async () => {
      const result = await createCliente({}, formData);
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      resetForm();
      if (modoEmbutido && result.id) {
        const s = (k: string) => String(formData.get(k) ?? '');
        const up = (k: string) => s(k).trim().toUpperCase();
        onCriado({
          id:            result.id,
          filial,
          nome:          up('nome'),
          nome_fantasia: up('nome_fantasia'),
          cpf_cnpj:      s('cpf_cnpj'),
          celular:       s('celular'),
          telefone:      s('telefone'),
          email:         s('email'),
          pessoa,
          status_ativo:  0,
        });
      } else {
        router.push(`/clientes/${result.id}`);
      }
    });
  }

  const isJuridica = pessoa === 'J';

  return (
    <>
      {!modoEmbutido && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Cliente
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">

          <DialogHeader className="px-6 pt-5 pb-4 border-b sticky top-0 bg-card z-10 rounded-t-xl">
            <DialogTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <User className="h-4 w-4" />
              </div>
              Novo Cliente
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* 1. Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-nome" className="text-sm">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input id="nc-nome" name="nome" required placeholder="Nome completo" className="h-9" />
            </div>

            {/* 2. Tipo de Pessoa */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de Pessoa</Label>
              <Select value={pessoa} onValueChange={(v) => { if (v) { setPessoa(v); setIsento(false); } }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Pessoa Física</SelectItem>
                  <SelectItem value="J">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. CPF / CNPJ */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-cpf" className="text-sm">
                {isJuridica ? 'CNPJ' : 'CPF'}
              </Label>
              <Input
                id="nc-cpf" name="cpf_cnpj"
                placeholder={isJuridica ? '00.000.000/0000-00' : '000.000.000-00'}
                className={`h-9 ${cpfErro ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={cpf}
                onChange={(e) => { setCpf(e.target.value); setCpfErro(''); }}
                onBlur={handleCpfBlur}
              />
              {cpfChecking && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                </p>
              )}
              {cpfErro && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {cpfErro}
                </p>
              )}
            </div>

            {/* 4–5. IE + Isento (só PJ) */}
            {isJuridica && (
              <div className="space-y-1.5">
                <Label htmlFor="nc-ie" className="text-sm">Inscrição Estadual</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="nc-ie" name="ie"
                    placeholder="000.000.000.000"
                    className="h-9 flex-1"
                    disabled={isento}
                    value={isento ? '' : undefined}
                  />
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={isento}
                      onChange={(e) => setIsento(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    Isento
                  </label>
                </div>
              </div>
            )}

            {/* ── Endereço ── */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
              Endereço
            </p>

            {/* 6. CEP */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-cep" className="text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                CEP
              </Label>
              <div className="relative">
                <Input
                  id="nc-cep" name="cep"
                  placeholder="00000-000"
                  className="h-9 pr-8"
                  value={cep}
                  onChange={(e) => { setCep(e.target.value); setCepMsg(null); }}
                  onBlur={handleCepBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCepBlur(); } }}
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {cepMsg && (
                <p className={`text-xs ${cepMsg.tipo === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {cepMsg.texto}
                </p>
              )}
            </div>

            {/* 7. Endereço */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-end" className="text-sm">Endereço</Label>
              <Input
                id="nc-end" name="endereco"
                placeholder="Rua, Avenida, Travessa..."
                className="h-9"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            {/* 8–9. Número + Complemento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nc-num" className="text-sm">Número</Label>
                <Input id="nc-num" name="numero" placeholder="N°" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-comp" className="text-sm">Complemento</Label>
                <Input id="nc-comp" name="complemento" placeholder="Apto, Sala..." className="h-9" />
              </div>
            </div>

            {/* 10. Bairro */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-bairro" className="text-sm">Bairro</Label>
              <Input
                id="nc-bairro" name="bairro" className="h-9"
                value={bairro} onChange={(e) => setBairro(e.target.value)}
              />
            </div>

            {/* 11–12. Cidade + UF */}
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nc-cidade" className="text-sm">Cidade</Label>
                <Input
                  id="nc-cidade" name="cidade" className="h-9"
                  value={cidade} onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-uf" className="text-sm">UF</Label>
                <Input
                  id="nc-uf" name="uf"
                  maxLength={2} placeholder="RS"
                  className="h-9 uppercase text-center"
                  value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* 13. IBGE */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-ibge" className="text-sm">
                Código IBGE
                <span className="text-muted-foreground font-normal ml-1">(preenchido automaticamente)</span>
              </Label>
              <Input
                id="nc-ibge" name="ibge"
                placeholder="0000000"
                className="h-9"
                value={ibge}
                onChange={(e) => setIbge(e.target.value)}
              />
            </div>

            {/* ── Contato ── */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 rounded px-2 py-1 w-fit">
              Contato
            </p>

            {/* 14. Telefones */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nc-celular" className="text-sm">Celular</Label>
                <Input
                  id="nc-celular" name="celular"
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="h-9"
                  value={celular}
                  onChange={(e) => setCelular(formatarTelefone(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-telefone" className="text-sm">Telefone</Label>
                <Input
                  id="nc-telefone" name="telefone"
                  placeholder="(00) 0000-0000"
                  inputMode="tel"
                  className="h-9"
                  value={telefone}
                  onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                />
              </div>
            </div>

            {/* 15. E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-email" className="text-sm">E-mail</Label>
              <Input
                id="nc-email" name="email"
                type="text"
                inputMode="email"
                placeholder="email@exemplo.com"
                className={`h-9 ${emailErro ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={emailLocal}
                onChange={(e) => { setEmailLocal(e.target.value); setEmailErro(''); }}
                onBlur={handleEmailBlur}
              />
              {emailErro && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {emailErro}
                </p>
              )}
            </div>

            {/* 16. Data de Nascimento */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-nasc" className="text-sm">Data de Nascimento</Label>
              <Input id="nc-nasc" name="data_nascimento" type="date" className="h-9 w-48" />
            </div>

            {/* 17. Comentários */}
            <div className="space-y-1.5">
              <Label htmlFor="nc-obs" className="text-sm">Comentários</Label>
              <textarea
                id="nc-obs" name="comentario" rows={2}
                placeholder="Observações sobre o cliente..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : 'Salvar Cliente'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
