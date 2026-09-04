'use client';

import { useEffect, useState } from 'react';
import {
  buscarMensagensRapidas,
  criarMensagemRapida,
  renomearMensagemRapida,
  excluirMensagemRapida,
  adicionarVariante,
  editarVariante,
  excluirVariante,
  type MensagemRapida,
} from '@/app/(petshop)/configuracoes/mensagens-rapidas/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquareText, Plus, Trash2, Loader2, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MensagensRapidasPanel() {
  const [msgs, setMsgs] = useState<MensagemRapida[] | null>(null);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [salvandoTitulo, setSalvandoTitulo] = useState(false);
  const [ocupado, setOcupado] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState('');

  function carregar() {
    buscarMensagensRapidas().then(setMsgs);
  }

  useEffect(() => { carregar(); }, []);

  function marcarOcupado(chave: string, valor: boolean) {
    setOcupado((prev) => {
      const novo = new Set(prev);
      if (valor) novo.add(chave); else novo.delete(chave);
      return novo;
    });
  }

  async function criar() {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    setErro('');
    setSalvandoTitulo(true);
    try {
      const res = await criarMensagemRapida(titulo);
      if (res.CodStatus !== 1) { setErro(res.DescricaoStatus || 'Não foi possível criar a mensagem.'); return; }
      setNovoTitulo('');
      carregar();
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend foi atualizado/recompilado.');
    } finally {
      setSalvandoTitulo(false);
    }
  }

  async function renomear(id: number, titulo: string) {
    if (!titulo.trim()) return;
    setErro('');
    try {
      await renomearMensagemRapida(id, titulo.trim());
      carregar();
    } catch {
      setErro('Não foi possível salvar o título.');
    }
  }

  async function excluirTitulo(id: number) {
    if (!confirm('Excluir esta mensagem e todas as suas variações?')) return;
    setErro('');
    marcarOcupado(`t${id}`, true);
    try {
      await excluirMensagemRapida(id);
      carregar();
    } catch {
      setErro('Não foi possível excluir a mensagem.');
    } finally {
      marcarOcupado(`t${id}`, false);
    }
  }

  async function novaVariante(idMsg: number) {
    setErro('');
    marcarOcupado(`v${idMsg}`, true);
    try {
      const res = await adicionarVariante(idMsg, '');
      if (res.CodStatus !== 1) { setErro(res.DescricaoStatus || 'Não foi possível criar a variação.'); return; }
      carregar();
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend foi atualizado/recompilado.');
    } finally {
      marcarOcupado(`v${idMsg}`, false);
    }
  }

  async function salvarVariante(id: number, mensagem: string) {
    try {
      await editarVariante(id, mensagem);
    } catch {
      setErro('Não foi possível salvar a variação.');
    }
  }

  async function excluirVarianteItem(id: number) {
    setErro('');
    marcarOcupado(`vd${id}`, true);
    try {
      await excluirVariante(id);
      carregar();
    } catch {
      setErro('Não foi possível excluir a variação.');
    } finally {
      marcarOcupado(`vd${id}`, false);
    }
  }

  if (!msgs) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {erro && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{erro}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          Cada mensagem pode ter várias variações de texto — ao enviar, você escolhe qual usar
          (ou deixa rotacionar), pra não mandar sempre a mesma frase pronta. Use{' '}
          <code className="rounded bg-background px-1 py-0.5">{'{pet}'}</code> e{' '}
          <code className="rounded bg-background px-1 py-0.5">{'{cliente}'}</code> no texto —
          são substituídos automaticamente pelo nome do pet e do cliente na hora de enviar.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') criar(); }}
          placeholder="Nova mensagem (ex: Pet Pronto, Estimativa, Aniversário)"
          className="h-9 text-sm max-w-sm"
        />
        <Button size="sm" onClick={criar} disabled={salvandoTitulo || !novoTitulo.trim()}>
          {salvandoTitulo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Adicionar
        </Button>
      </div>

      {msgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground/60 rounded-xl border border-dashed">
          <MessageSquareText className="h-9 w-9 mb-2" />
          <p className="text-sm">Nenhuma mensagem rápida cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <CardMensagem
              key={m.id}
              msg={m}
              ocupado={ocupado}
              onRenomear={(titulo) => renomear(m.id, titulo)}
              onExcluir={() => excluirTitulo(m.id)}
              onNovaVariante={() => novaVariante(m.id)}
              onSalvarVariante={salvarVariante}
              onExcluirVariante={excluirVarianteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardMensagem({
  msg, ocupado, onRenomear, onExcluir, onNovaVariante, onSalvarVariante, onExcluirVariante,
}: {
  msg: MensagemRapida;
  ocupado: Set<string>;
  onRenomear: (titulo: string) => void;
  onExcluir: () => void;
  onNovaVariante: () => void;
  onSalvarVariante: (id: number, mensagem: string) => void;
  onExcluirVariante: (id: number) => void;
}) {
  const [titulo, setTitulo] = useState(msg.titulo);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => { if (titulo.trim() && titulo.trim() !== msg.titulo) onRenomear(titulo); }}
          className="h-8 text-sm font-medium max-w-xs"
        />
        <span className="text-xs text-muted-foreground">
          {msg.mensagens.length} variaç{msg.mensagens.length === 1 ? 'ão' : 'ões'}
        </span>
        <button
          type="button"
          onClick={onExcluir}
          disabled={ocupado.has(`t${msg.id}`)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
          title="Excluir mensagem"
        >
          {ocupado.has(`t${msg.id}`) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="space-y-2">
        {msg.mensagens.map((v) => (
          <VarianteTextarea
            key={v.id}
            mensagem={v.mensagem}
            ocupado={ocupado.has(`vd${v.id}`)}
            onSalvar={(texto) => onSalvarVariante(v.id, texto)}
            onExcluir={() => onExcluirVariante(v.id)}
          />
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onNovaVariante}
        disabled={ocupado.has(`v${msg.id}`)}
      >
        {ocupado.has(`v${msg.id}`) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        Nova variação
      </Button>
    </div>
  );
}

function VarianteTextarea({
  mensagem, ocupado, onSalvar, onExcluir,
}: {
  mensagem: string;
  ocupado: boolean;
  onSalvar: (texto: string) => void;
  onExcluir: () => void;
}) {
  const [texto, setTexto] = useState(mensagem);
  return (
    <div className="flex items-start gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => { if (texto !== mensagem) onSalvar(texto); }}
        rows={3}
        placeholder="Ex: Oi {cliente}! O(a) {pet} já está pronto(a) para retirada. 🐾"
        className={cn(
          'flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm resize-y',
        )}
      />
      <button
        type="button"
        onClick={onExcluir}
        disabled={ocupado}
        className="mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
        title="Excluir variação"
      >
        {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
