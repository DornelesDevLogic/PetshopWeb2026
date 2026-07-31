'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HeroSobre() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const blobARef   = useRef<HTMLDivElement>(null);
  const blobBRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Conforme o usuário rola, o conteúdo encolhe/esmaece suavemente
      gsap.to(contentRef.current, {
        scale: 0.85,
        opacity: 0,
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // Blobs de fundo à deriva, contínuos, independentes do scroll
      gsap.to(blobARef.current, {
        x: 60, y: -40, duration: 9, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });
      gsap.to(blobBRef.current, {
        x: -50, y: 50, duration: 11, repeat: -1, yoyo: true, ease: 'sine.inOut',
      });

      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.15 },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-[100svh] min-h-[640px] w-full items-center justify-center overflow-hidden bg-black"
    >
      {/* Fundo gradiente + blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),_transparent_60%)]" />
        <div
          ref={blobARef}
          className="absolute -left-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-blue-600/20 blur-[110px]"
        />
        <div
          ref={blobBRef}
          className="absolute -right-32 bottom-1/4 h-[26rem] w-[26rem] rounded-full bg-purple-600/20 blur-[110px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.6))]" />
      </div>

      <div ref={contentRef} className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
        <span className="mb-8 text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">
          logic<span className="text-blue-400">box</span>
        </span>

        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl">
          A tecnologia que impulsiona
          <br className="hidden sm:block" /> o seu negócio.
        </h1>

        <p className="mt-6 max-w-xl text-balance text-base text-white/60 sm:text-lg">
          Mais de 30 anos desenvolvendo soluções completas para empresas de todos os portes.
        </p>

        <Link
          href="#solucoes"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          Conheça nossas soluções
        </Link>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/40">
        <ChevronDown className="h-5 w-5" />
      </div>
    </section>
  );
}
