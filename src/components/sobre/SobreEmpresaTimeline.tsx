'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CalendarClock, Users2, GraduationCap, HeadphonesIcon, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const ITENS = [
  { icon: CalendarClock,    titulo: 'Mais de 30 anos de mercado',      texto: 'Três décadas evoluindo junto com a tecnologia e com nossos clientes.' },
  { icon: Users2,           titulo: 'Milhares de clientes atendidos',  texto: 'De pequenos negócios a redes com múltiplas filiais, em todo o Brasil.' },
  { icon: GraduationCap,    titulo: 'Equipe especializada',            texto: 'Times dedicados por área: desenvolvimento, suporte, fiscal e implantação.' },
  { icon: HeadphonesIcon,   titulo: 'Suporte técnico',                 texto: 'Atendimento próximo, pensado para resolver o problema real do seu negócio.' },
  { icon: RefreshCcw,       titulo: 'Atualizações constantes',         texto: 'Evolução contínua do produto, acompanhando legislação e mercado.' },
];

export default function SobreEmpresaTimeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          transformOrigin: 'top',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: true,
          },
        },
      );

      gsap.utils.toArray<HTMLElement>('.timeline-item').forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-black py-28 sm:py-36">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Uma trajetória sólida</h2>
          <p className="mt-4 text-white/50">Construída ao lado de quem confia na Logicbox todos os dias.</p>
        </div>

        <div className="relative">
          <div className="absolute left-[27px] top-0 h-full w-px bg-white/10 sm:left-1/2" />
          <div
            ref={lineRef}
            className="absolute left-[27px] top-0 h-full w-px bg-gradient-to-b from-blue-400 to-purple-500 sm:left-1/2"
          />

          <ul className="space-y-14">
            {ITENS.map(({ icon: Icon, titulo, texto }, i) => (
              <li
                key={titulo}
                className={cn(
                  'timeline-item relative flex items-start gap-6 sm:w-1/2',
                  i % 2 === 0 ? 'sm:pr-12' : 'sm:ml-auto sm:pl-12 sm:text-right sm:flex-row-reverse',
                )}
              >
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-400 backdrop-blur-md">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{titulo}</h3>
                  <p className="mt-1.5 text-sm text-white/50">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
