'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

interface Stat {
  valor:    number;
  prefixo?: string;
  sufixo:   string;
  label:    string;
  casas?:   number; // decimais
}

const STATS: Stat[] = [
  { valor: 30,      prefixo: '+', sufixo: ' anos',                label: 'de experiência no mercado' },
  { valor: 10000,   prefixo: '+', sufixo: '',                     label: 'clientes atendidos' },
  { valor: 1,       prefixo: '+', sufixo: ' milhão',               label: 'de documentos emitidos' },
  { valor: 99.9,    sufixo: '%',                                  label: 'de disponibilidade', casas: 1 },
];

function Contador({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLSpanElement>(null);
  const emVista = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!emVista) return;
    const controls = animate(0, stat.valor, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        const casas = stat.casas ?? 0;
        setDisplay(
          v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }),
        );
      },
    });
    return () => controls.stop();
  }, [emVista, stat]);

  return (
    <span ref={ref} className="tabular-nums">
      {stat.prefixo}{display}{stat.sufixo}
    </span>
  );
}

export default function EstatisticasCounters() {
  return (
    <section className="relative overflow-hidden bg-black py-28 sm:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.12),_transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Números que confirmam</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center"
            >
              <span className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-4xl font-bold text-transparent sm:text-6xl">
                <Contador stat={stat} />
              </span>
              <span className="mt-2 text-sm text-white/50">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
