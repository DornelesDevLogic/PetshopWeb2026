'use client';

import { useState, useTransition } from 'react';
import { X, UserPlus } from 'lucide-react';
import { criarClienteRapido } from '@/app/(petshop)/clientes/actions';

export interface ClienteCriado {
  id:       number;
  nome:     string;
  telefone: string;
  celular:  string;
}

interface Props {
  onSuccess: (cliente: ClienteCriado) => void;
  onClose:   () => void;
}

export default function NovoClienteModal({ onSuccess, onClose }: Props) {
  const [pending, startT] = useTransition();
  const [nome,     setNome]     = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular,  setCelular]  = useState('');
  const [cpf,      setCpf]      = useState('');
  const [erro,     setErro]     = useState('');

  function handleSalvar() {
    setErro('');
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return; }
    startT(async () => {
      const r = await criarClienteRapido({ nome, telefone, celular, cpf_cnpj: cpf });
      if (r.error || !r.id) { setErro(r.error ?? 'Erro ao cadastrar cliente.'); return; }
      onSuccess({ id: r.id, nome: nome.trim().toUpperCase(), telefone, celular });
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-sm">
            <UserPlus className="h-4 w-4 text-primary" />
            Cadastrar Novo Cliente
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome <span className="text-red-500">*</span></label>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSalvar()}
              placeholder="Nome completo do cliente"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Telefone</label>
              <input
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(00) 0000-0000"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Celular / WhatsApp</label>
              <input
                value={celular}
                onChange={e => setCelular(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">CPF / CNPJ <span className="text-muted-foreground">(opcional)</span></label>
            <input
              value={cpf}
              onChange={e => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30">{erro}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Dados adicionais (endereço, e-mail etc.) podem ser completados no cadastro de clientes.
          </p>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={pending || !nome.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {pending ? 'Cadastrando...' : 'Cadastrar e Selecionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
