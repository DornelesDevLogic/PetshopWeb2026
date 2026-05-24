'use client';

import Link from 'next/link';
import { Cliente, Animal } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CalendarDays,
  Phone,
  Mail,
  MapPin,
  PawPrint,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  cliente: Cliente;
  animais: Animal[];
}

function Info({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function AnimalCard({ a }: { a: Animal }) {
  const sexo = a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : a.sexo;
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PawPrint className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium leading-tight">
          {a.nome}
          {a.apelido && a.apelido !== a.nome && (
            <span className="ml-1 text-xs text-muted-foreground">({a.apelido})</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {[a.especie, a.raca, sexo, a.castrado === 1 ? 'Castrado' : '']
            .filter(Boolean)
            .join(' · ')}
        </div>
        {a.obito === 1 && (
          <span className="text-xs text-red-500 mt-0.5">† Falecido</span>
        )}
      </div>
      {a.ativo === 0 && (
        <span className="text-xs text-muted-foreground">Inativo</span>
      )}
    </div>
  );
}

export default function ClienteDetalhe({ cliente: c, animais }: Props) {
  const endereco = [c.endereco, c.numero, c.complemento, c.bairro]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/clientes">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Clientes
          </Button>
        </Link>
        <Link href={`/agenda?cliente_id=${c.id}`}>
          <Button size="sm" variant="outline">
            <CalendarDays className="h-4 w-4 mr-2" />
            Ver na Agenda
          </Button>
        </Link>
      </div>

      {/* Header do cliente */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{c.nome}</h1>
            {c.nome_fantasia && (
              <p className="text-sm text-muted-foreground">{c.nome_fantasia}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  c.situacao === 'A'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {c.situacao === 'A' ? 'Ativo' : 'Inativo'}
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

        {/* Grid de informações */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Contato */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Contato
            </h3>
            <dl className="space-y-2">
              <Info label="Celular" value={c.celular} />
              <Info label="Telefone" value={c.telefone} />
              <Info label="Telefone 2" value={c.telefone2} />
              <Info label="Contato" value={c.contato} />
            </dl>
          </div>

          {/* E-mail */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              E-mail e fiscal
            </h3>
            <dl className="space-y-2">
              <Info label="E-mail" value={c.email} />
              <Info label="IE" value={c.ie} />
              {c.mei === 1 && <Info label="MEI" value="Sim" />}
              {c.atacadista === 1 && <Info label="Atacadista" value="Sim" />}
            </dl>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Endereço
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

        {/* Financeiro e datas */}
        {(c.saldo_disponivel !== 0 || c.data_ult_compra || c.data_nascimento) && (
          <>
            <Separator className="my-5" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {c.saldo_disponivel !== 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-muted-foreground">Saldo disponível</div>
                  <div className={cn('text-lg font-bold mt-0.5', c.saldo_disponivel < 0 ? 'text-red-600' : 'text-green-600')}>
                    R$ {c.saldo_disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              <Info label="Última compra" value={c.data_ult_compra} />
              <Info label="Data nascimento" value={c.data_nascimento} />
              <Info label="Cliente desde" value={c.data_cadastro} />
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

      {/* Animais */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <PawPrint className="h-4 w-4 text-primary" />
          Animais
          <span className="ml-1 text-xs text-muted-foreground font-normal">({animais.length})</span>
        </h2>

        {animais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum animal cadastrado.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {animais.map((a) => (
              <AnimalCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
