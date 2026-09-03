'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cliente, Animal, Especie, Raca, TipoPelo } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import NovoAnimalDialog from '@/components/petshop/animais/NovoAnimalDialog';
import EditarClienteDialog from './EditarClienteDialog';
import EditarAnimalDialog from '@/components/petshop/animais/EditarAnimalDialog';
import ClienteHistoricoTab from './ClienteHistoricoTab';
import {
  ArrowLeft, CalendarDays, Phone, Mail, MapPin, PawPrint, User, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MicrochipBadge from '@/components/petshop/animais/MicrochipBadge';

interface Props {
  cliente:  Cliente;
  animais:  Animal[];
  especies: Especie[];
  racas:    Raca[];
  pelos:    TipoPelo[];
}

type Tab = 'dados' | 'historico';

function Info({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function AnimalCard({
  a, especies, racas, pelos,
}: {
  a: Animal; especies: Especie[]; racas: Raca[]; pelos: TipoPelo[];
}) {
  const sexo = a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : a.sexo;
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors group">
      <Link
        href={`/animais/${a.id}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <PawPrint className="h-4 w-4" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Link href={`/animais/${a.id}`} className="font-medium leading-tight hover:underline hover:text-primary">
            {a.nome}
          </Link>
          <MicrochipBadge value={a.apelido} className="text-[11px]" />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {[a.especie, a.raca, sexo, a.castrado === 1 ? 'Castrado' : ''].filter(Boolean).join(' · ')}
        </div>
        {a.obito === 1 && <span className="text-xs text-red-500 mt-0.5">† Falecido</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Convenção do legado: ATIVO=1 significa INATIVO (invertido) */}
        {a.ativo === 1 && <span className="text-xs text-muted-foreground">Inativo</span>}
        <Link href={`/animais/${a.id}/historico`}>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-primary">
            <History className="h-3.5 w-3.5 mr-1" />
            Histórico
          </Button>
        </Link>
        <EditarAnimalDialog animal={a} especies={especies} racas={racas} pelos={pelos} />
      </div>
    </div>
  );
}

export default function ClienteDetalhe({ cliente: c, animais, especies, racas, pelos }: Props) {
  const [tab, setTab] = useState<Tab>('dados');

  const endereco = [c.endereco, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Clientes
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <EditarClienteDialog cliente={c} />
          <Link href={`/agenda?cliente_id=${c.id}`}>
            <Button size="sm" variant="outline">
              <CalendarDays className="h-4 w-4 mr-2" />
              Ver na Agenda
            </Button>
          </Link>
        </div>
      </div>

      {/* Header do cliente */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-xl font-bold">{c.nome}</h1>
              <span className="text-sm font-mono text-muted-foreground shrink-0">Cód. {c.id}</span>
            </div>
            {c.nome_fantasia && <p className="text-sm text-muted-foreground">{c.nome_fantasia}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                c.status_ativo === 0 ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
              )}>
                {c.status_ativo === 0 ? 'Ativo' : 'Inativo'}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.pessoa === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </span>
              {c.cpf_cnpj && (
                <span className="text-xs font-mono text-muted-foreground">
                  {c.pessoa === 'J' ? 'CNPJ' : 'CPF'}: {c.cpf_cnpj}
                </span>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />Contato
            </h3>
            <dl className="space-y-2">
              <Info label="Celular"    value={c.celular} />
              <Info label="Telefone"   value={c.telefone} />
              <Info label="Telefone 2" value={c.telefone2} />
              <Info label="Contato"    value={c.contato} />
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />E-mail e fiscal
            </h3>
            <dl className="space-y-2">
              <Info label="E-mail" value={c.email} />
              <Info label="IE"     value={c.ie} />
              {c.mei       === 1 && <Info label="MEI"        value="Sim" />}
              {c.atacadista=== 1 && <Info label="Atacadista" value="Sim" />}
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />Endereço
            </h3>
            <dl className="space-y-2">
              {endereco && <Info label="Logradouro" value={endereco} />}
              <Info label="CEP" value={c.cep} />
              {(c.cidade || c.uf) && (
                <Info label="Cidade" value={[c.cidade, c.uf].filter(Boolean).join(' / ')} />
              )}
            </dl>
          </div>
        </div>

        {(c.saldo_disponivel !== 0 || c.data_ult_compra || c.data_nascimento) && (
          <>
            <Separator className="my-5" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {c.saldo_disponivel !== 0 && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Saldo disponível</div>
                  <div className={cn('text-lg font-bold mt-0.5', c.saldo_disponivel < 0 ? 'text-red-600' : 'text-green-600')}>
                    R$ {c.saldo_disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              <Info label="Última compra"   value={c.data_ult_compra} />
              <Info label="Data nascimento"  value={c.data_nascimento} />
              <Info label="Cliente desde"    value={c.data_cadastro} />
            </div>
          </>
        )}

        {c.comentario && (
          <>
            <Separator className="my-5" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações</p>
              <p className="text-sm">{c.comentario}</p>
            </div>
          </>
        )}
      </div>

      {/* ── Abas: Animais | Histórico ─────────────────────────────────── */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('dados')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'dados'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <PawPrint className="h-4 w-4" />
          Animais
          <span className="ml-1 text-xs bg-muted rounded-full px-1.5">{animais.length}</span>
        </button>
        <button
          onClick={() => setTab('historico')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            tab === 'historico'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <History className="h-4 w-4" />
          Histórico
        </button>
      </div>

      {/* ── Conteúdo da aba ───────────────────────────────────────────── */}
      {tab === 'dados' && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" />
              Animais
              <span className="ml-1 text-xs text-muted-foreground font-normal">({animais.length})</span>
            </h2>
            <NovoAnimalDialog
              clienteId={c.id}
              filialCliente={c.filial}
              especies={especies}
              racas={racas}
              pelos={pelos}
            />
          </div>
          {animais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum animal cadastrado.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {animais.map((a) => (
                <AnimalCard key={a.id} a={a} especies={especies} racas={racas} pelos={pelos} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'historico' && (
        <ClienteHistoricoTab clienteId={c.id} filial={c.filial} />
      )}
    </div>
  );
}
