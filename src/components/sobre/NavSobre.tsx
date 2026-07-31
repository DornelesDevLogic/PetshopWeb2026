'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NavSobre() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10 py-3'
          : 'bg-transparent py-5',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <span className="text-lg font-semibold tracking-tight text-white">
          logic<span className="text-blue-400">box</span>
        </span>
        <Link
          href="/home"
          className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Voltar ao sistema
        </Link>
      </div>
    </header>
  );
}
