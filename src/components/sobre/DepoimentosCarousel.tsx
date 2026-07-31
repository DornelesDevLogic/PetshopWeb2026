'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Depoimentos ilustrativos — substituir por avaliações reais de clientes antes de publicar.
const DEPOIMENTOS = [
  {
    texto: 'Migramos toda a operação da nossa rede para a Logicbox e o suporte fez toda a diferença na transição.',
    autor: 'Diretor de Operações',
    empresa: 'Rede de Supermercados',
  },
  {
    texto: 'O módulo fiscal nos deixa tranquilos: nunca mais perdemos tempo com atualização de legislação.',
    autor: 'Gerente Financeiro',
    empresa: 'Distribuidora de Alimentos',
  },
  {
    texto: 'A agenda integrada mudou o dia a dia do petshop. Os clientes notam a agilidade no atendimento.',
    autor: 'Proprietária',
    empresa: 'Pet Shop',
  },
  {
    texto: 'Sistema estável, rápido, e uma equipe que realmente entende do nosso negócio.',
    autor: 'Sócio-fundador',
    empresa: 'Rede de Restaurantes',
  },
];

export default function DepoimentosCarousel() {
  const [indice, setIndice] = useState(0);
  const [direcao, setDirecao] = useState(1);

  useEffect(() => {
    const t = setInterval(() => avancar(1), 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  function avancar(d: number) {
    setDirecao(d);
    setIndice((i) => (i + d + DEPOIMENTOS.length) % DEPOIMENTOS.length);
  }

  const atual = DEPOIMENTOS[indice];

  return (
    <section className="relative overflow-hidden bg-black py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">O que dizem nossos clientes</h2>
        </div>

        <div className="relative min-h-[220px] rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-10 backdrop-blur-md sm:px-14 sm:py-14">
          <Quote className="absolute left-6 top-6 h-8 w-8 text-blue-400/40 sm:left-8 sm:top-8" />

          <AnimatePresence mode="wait" custom={direcao}>
            <motion.div
              key={indice}
              custom={direcao}
              initial={{ opacity: 0, x: 40 * direcao }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * direcao }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p className="text-balance text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
                “{atual.texto}”
              </p>
              <p className="mt-6 text-sm text-white/50">
                <span className="font-semibold text-white/80">{atual.autor}</span> · {atual.empresa}
              </p>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            aria-label="Depoimento anterior"
            onClick={() => avancar(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo depoimento"
            onClick={() => avancar(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {DEPOIMENTOS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para depoimento ${i + 1}`}
              onClick={() => { setDirecao(i > indice ? 1 : -1); setIndice(i); }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === indice ? 'w-6 bg-blue-400' : 'w-1.5 bg-white/20',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
