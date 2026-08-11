'use client';

import { useEffect, useRef, useState } from 'react';

const INTERVALO_MS = 5000;
const fila: Array<() => void> = [];
let processando = false;

function processarFila() {
  if (processando) return;
  const proximo = fila.shift();
  if (!proximo) return;
  processando = true;
  proximo();
  setTimeout(() => {
    processando = false;
    processarFila();
  }, INTERVALO_MS);
}

function entrarNaFila(cb: () => void) {
  fila.push(cb);
  processarFila();
}

interface Props {
  animalId: number;
  alt?: string;
  className?: string;
}

/**
 * <img> de foto de animal com carregamento sob demanda (só entra na fila
 * quando o elemento fica visível na tela) e uma fila global que libera no
 * máximo UMA foto nova a cada 5s, em todo o navegador — não tem pressa em
 * carregar foto de pet, e uma tela com dezenas de cards (ex: Agenda num dia
 * cheio) disparando tudo de uma vez sozinha já estourava o rate limit do
 * backend (60 req/min) antes de qualquer chamada de dado real ser feita.
 *
 * Uma vez carregada, o navegador guarda a foto por 1h (Cache-Control da rota
 * /api/petshop/animais/[id]/foto) — reabrir a mesma tela ou navegar entre
 * telas que mostram o mesmo animal não gera nova requisição nesse período.
 */
export default function AnimalFoto({ animalId, alt = '', className }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pronta, setPronta] = useState(false);
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        obs.disconnect();
        entrarNaFila(() => { if (!cancelado) setPronta(true); });
      }
    }, { rootMargin: '150px' });
    obs.observe(el);
    return () => { cancelado = true; obs.disconnect(); };
  }, []);

  if (oculta) return null;

  return (
    <div ref={wrapperRef} className={className}>
      {pronta && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/petshop/animais/${animalId}/foto`}
          alt={alt}
          className={className}
          onError={() => setOculta(true)}
        />
      )}
    </div>
  );
}
