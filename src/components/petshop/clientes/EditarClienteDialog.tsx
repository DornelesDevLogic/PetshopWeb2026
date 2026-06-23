'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCliente, buscarCep, verificarCpfDuplicado } from '@/app/(petshop)/clientes/actions';
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
import { AlertCircle, Loader2, MapPin, Pencil } from 'lucide-react';

interface Props {
  cliente: Cliente;
}

export default function EditarClienteDialog({ cliente: c }: Props) {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [error, setError]             = useState('');
  const [pessoa, setPessoa]           = useState<string>(c.pessoa || 'F');
  const [statusAtivo, setStatusAtivo] = useState<number>(c.status_ativo ?? 0);
  const [isento, setIsento]           = useState(c.ie?.toUpperCase() === 'ISENTO');
  const [isPending, startTransition]  = useTransition();

  // Campos de endereço controlados para auto-preenchimento via CEP
  const [cep, setCep]           = useState(c.cep        ?? '');
  const [endereco, setEndereco] = useState(c.endereco   ?? '');
  const [bairro, setBairro]     = useState(c.bairro     ?? '');
  const [cidade, setCidade]     = useState(c.cidade     ?? '');
  const [uf, setUf]             = useState(c.uf         ?? '');
  const [ibge, setIbge]         = useState((c as any).ibge ?? '');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMsg, setCepMsg]         = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Campos controlados para máscara e validações inline
  const [celular,     setCelular]     = useState(c.celular  ?? '');
  const [telefone,    setTelefone]    = useState(c.telefone ?? '');
  const [cpf,         setCpf]         = useState(c.cpf_cnpj ?? '');
  const [cpfErro,     setCpfErro]     = useState('');
  const [cpfChecking, setCpfChecking] = useState(false);
  const [emailLocal,  setEmailLocal]  = useState(c.email ?? '');
  const [emailErro,   setEmailErro]   = useState('');

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
      setCepMsg({ tipo: 'ok', texto: 'Endereço atualizado automaticamente.' });
    } else {
      setCepMsg({ tipo: 'erro', texto: 'CEP não encontrado. Preencha manualmente.' });
    }
  }

  async function handleCpfBlur() {
    setCpfErro('');
    if (!cpfCnpjCompleto(cpf)) return;
    setCpfChecking(true);
    const r = await verificarCpfDuplicado(cpf, c.id);
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

  function handleOpen() {
    setCep(c.cep ?? ''); setEndereco(c.endereco ?? '');
    setBairro(c.bairro ?? ''); setCidade(c.cidade ?? '');
    setUf(c.uf ?? ''); setIbge((c as any).ibge ?? '');
    setPessoa(c.pessoa || 'F');
    setStatusAtivo(c.status_ativo ?? 0);
    setIsento(c.ie?.toUpperCase() === 'ISENTO');
    setCelular(c.celular ?? '');
    setTelefone(c.telefone ?? '');
    setCpf(c.cpf_cnpj ?? '');
    setEmailLocal(c.email ?? '');
    setCpfErro(''); setEmailErro('');
    setError(''); setCepMsg(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (cpfErro)   { setError(cpfErro);   return; }
    if (emailErro) { setError(emailErro); return; }

    if (emailLocal && !validarEmail(emailLocal)) {
      setEmailErro('E-mail inválido. Verifique o formato (ex: cliente@empresa.com).');
      setError('Corrija os erros antes de salvar.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('celular',   celular);
    formData.set('telefone',  telefone);
    formData.set('cpf_cnpj',  cpf);
    formData.set('email',     emailLocal);
    formData.set('pessoa',       pessoa);
    formData.set('status_ativo', String(statusAtivo));
    formData.set('endereco',     endereco);
    formData.set('bairro',       bairro);
    formData.set('cidade',       cidade);
    formData.set('uf',           uf);
    formData.set('cep',          cep);
    formData.set('ibge',         ibge);
    if (isento) formData.set('ie', 'ISENTO');

    startTransition(async () => {
      const result = await updateCliente(c.id, formData);
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  const isJuridica = pessoa === 'J';

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <Pencil className="h-4 w-4 mr-1" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(''); }}>
        <DialogContent className="w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-0">

          <DialogHeader className="px-6 pt-5 pb-4 border-b sticky top-0 bg-card z-10 rounded-t-xl">
            <DialogTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Pencil className="h-4 w-4" />
              </div>
              Editar Cliente
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* 1. Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="ec-nome" className="text-sm">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input id="ec-nome" name="nome" required defaultValue={c.nome} className="h-9" />
            </div>

            {/* Situação (só no Editar) */}
            <div className="space-y-1.5">
              <Label className="text-sm">Situação</Label>
              <Select value={String(statusAtivo)} onValueChange={(v) => setStatusAtivo(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Ativo</SelectItem>
                  <SelectItem value="1">Inativo</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="ec-cpf" className="text-sm">
                {isJuridica ? 'CNPJ' : 'CPF'}
              </Label>
              <Input
                id="ec-cpf" name="cpf_cnpj"
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
                <Label htmlFor="ec-ie" className="text-sm">Inscrição Estadual</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    id="ec-ie" name="ie"
                    placeholder="000.000.000.000"
                    className="h-9 flex-1"
                    disabled={isento}
                    defaultValue={isento ? '' : (c.ie !== 'ISENTO' ? c.ie : '')}
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
              <Label htmlFor="ec-cep" className="text-sm flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                CEP
              </Label>
              <div className="relative">
                <Input
                  id="ec-cep" name="cep"
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
              <Label htmlFor="ec-end" className="text-sm">Endereço</Label>
              <Input
                id="ec-end" name="endereco"
                placeholder="Rua, Avenida, Travessa..."
                className="h-9"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            {/* 8–9. Número + Complemento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-num" className="text-sm">Número</Label>
                <Input id="ec-num" name="numero" defaultValue={c.numero} placeholder="N°" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-comp" className="text-sm">Complemento</Label>
                <Input id="ec-comp" name="complemento" defaultValue={c.complemento} placeholder="Apto, Sala..." className="h-9" />
              </div>
            </div>

            {/* 10. Bairro */}
            <div className="space-y-1.5">
              <Label htmlFor="ec-bairro" className="text-sm">Bairro</Label>
              <Input
                id="ec-bairro" name="bairro" className="h-9"
                value={bairro} onChange={(e) => setBairro(e.target.value)}
              />
            </div>

            {/* 11–12. Cidade + UF */}
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ec-cidade" className="text-sm">Cidade</Label>
                <Input
                  id="ec-cidade" name="cidade" className="h-9"
                  value={cidade} onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-uf" className="text-sm">UF</Label>
                <Input
                  id="ec-uf" name="uf"
                  maxLength={2} placeholder="RS"
                  className="h-9 uppercase text-center"
                  value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* 13. IBGE */}
            <div className="space-y-1.5">
              <Label htmlFor="ec-ibge" className="text-sm">
                Código IBGE
                <span className="text-muted-foreground font-normal ml-1">(preenchido automaticamente)</span>
              </Label>
              <Input
                id="ec-ibge" name="ibge"
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
                <Label htmlFor="ec-celular" className="text-sm">Celular</Label>
                <Input
                  id="ec-celular" name="celular"
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="h-9"
                  value={celular}
                  onChange={(e) => setCelular(formatarTelefone(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec-telefone" className="text-sm">Telefone</Label>
                <Input
                  id="ec-telefone" name="telefone"
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
              <Label htmlFor="ec-email" className="text-sm">E-mail</Label>
              <Input
                id="ec-email" name="email"
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
              <Label htmlFor="ec-nasc" className="text-sm">Data de Nascimento</Label>
              <Input id="ec-nasc" name="data_nascimento" type="date" defaultValue={c.data_nascimento} className="h-9 w-48" />
            </div>

            {/* 17. Comentários */}
            <div className="space-y-1.5">
              <Label htmlFor="ec-obs" className="text-sm">Comentários</Label>
              <textarea
                id="ec-obs" name="comentario"
                rows={2}
                defaultValue={c.comentario}
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
