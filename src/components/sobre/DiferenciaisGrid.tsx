'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Zap, LayoutGrid, ShieldCheck, DatabaseBackup,
  Plug, Code2, RefreshCw, Headset,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DIFERENCIAIS = [
  { icon: Zap,            titulo: 'Sistema rápido' },
  { icon: LayoutGrid,     titulo: 'Interface moderna' },
  { icon: ShieldCheck,    titulo: 'Segurança' },
  { icon: DatabaseBackup, titulo: 'Backup' },
  { icon: Plug,           titulo: 'Integrações' },
  { icon: Code2,          titulo: 'API completa' },
  { icon: RefreshCw,      titulo: 'Atualizações constantes' },
  { icon: Headset,        titulo: 'Suporte especializado' },
];

export default function DiferenciaisGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.diferencial-item',
        { opacity: 0, y: 20, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          stagger: 0.08,
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        },
      );

      gsap.utils.toArray<HTMLElement>('.diferencial-icon').forEach((el) => {
        const tl = gsap.timeline({ paused: true });
        tl.to(el, { rotate: 12, scale: 1.15, duration: 0.25, ease: 'power2.out' })
          .to(el, { rotate: 0, scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' });
        const onEnter = () => tl.restart();
        el.addEventListener('mouseenter', onEnter);
        cleanups.push(() => el.removeEventListener('mouseenter', onEnter));
      });
    }, gridRef);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <section className="relative bg-black py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Por que Logicbox</h2>
          <p className="mt-4 text-white/50">Tecnologia de ponta, pensada pra ficar no seu dia a dia.</p>
        </div>

        <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {DIFERENCIAIS.map(({ icon: Icon, titulo }) => (
            <div
              key={titulo}
              className="diferencial-item flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center backdrop-blur-md"
            >
              <span className="diferencial-icon flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-300">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-white/85">{titulo}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
