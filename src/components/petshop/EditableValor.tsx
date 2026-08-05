'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  valor:     number;
  onCommit:  (novoValor: number) => void;
  fmt:       (v: number) => string;
  className?: string;
}

/**
 * Valor exibido como texto; duplo clique vira um input editável — Enter ou
 * Tab confirma, Escape cancela, clicar fora (blur) também confirma.
 * Usado nas listas de produtos já lançados (Agenda/Pré-venda/Tele-entrega)
 * pra permitir corrigir o valor manualmente sem precisar remover e
 * relançar o item.
 */
export default function EditableValor({ valor, onCommit, fmt, className }: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto]       = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editando]);

  function iniciar() {
    setTexto(String(valor).replace('.', ','));
    setEditando(true);
  }

  function confirmar() {
    const novo = parseFloat(texto.replace(',', '.'));
    if (!isNaN(novo) && novo >= 0 && novo !== valor) onCommit(novo);
    setEditando(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); confirmar(); }
    else if (e.key === 'Escape') setEditando(false);
  }

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={confirmar}
        className={cn(
          'w-20 rounded border border-primary bg-background px-1.5 py-0.5 text-right text-sm outline-none',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onDoubleClick={iniciar}
      title="Duplo clique para editar o valor"
      className={cn('cursor-text hover:underline decoration-dotted underline-offset-2', className)}
    >
      {fmt(valor)}
    </button>
  );
}
