'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type DocWithViewTransition = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

/**
 * Troca de tema com uma revelação circular a partir do ponto informado
 * (estilo "liquid glass" da Apple), usando a View Transitions API.
 * Em navegadores sem suporte cai de volta para a troca instantânea normal.
 */
function trocarTemaComTransicao(origem: { x: number; y: number }, aplicar: () => void) {
  const doc = document as DocWithViewTransition;
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    aplicar();
    return;
  }
  const raioMax = Math.hypot(
    Math.max(origem.x, window.innerWidth - origem.x),
    Math.max(origem.y, window.innerHeight - origem.y),
  );
  const transicao = doc.startViewTransition(() => aplicar());
  transicao.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${origem.x}px ${origem.y}px)`,
          `circle(${raioMax}px at ${origem.x}px ${origem.y}px)`,
        ],
      },
      { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

// Interpola entre o laranja (claro) e o azul (escuro) conforme a posição do arraste
function corBrilho(frac: number): string {
  const de = [251, 191, 36];   // amber-400 (Claro)
  const para = [59, 130, 246]; // blue-500 (Escuro)
  const r = Math.round(de[0] + (para[0] - de[0]) * frac);
  const g = Math.round(de[1] + (para[1] - de[1]) * frac);
  const b = Math.round(de[2] + (para[2] - de[2]) * frac);
  return `${r}, ${g}, ${b}`;
}

const KNOB = 28;      // diâmetro do botão redondo
const PADDING = 3;    // respiro interno da trilha

export default function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [frac, setFrac] = useState(0); // 0 = claro (esquerda), 1 = escuro (direita)

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!dragging) setFrac(theme === 'dark' ? 1 : 0);
  }, [theme, dragging]);

  if (!mounted) return null;

  function fracDoPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return frac;
    const rect = track.getBoundingClientRect();
    const usable = rect.width - KNOB - PADDING * 2;
    const x = clientX - rect.left - PADDING - KNOB / 2;
    return Math.min(1, Math.max(0, x / usable));
  }

  function commitTema(novoFrac: number) {
    const novoTema = novoFrac >= 0.5 ? 'dark' : 'light';
    const track = trackRef.current;
    const rect = track?.getBoundingClientRect();
    const origem = rect
      ? { x: rect.left + PADDING + KNOB / 2 + novoFrac * (rect.width - KNOB - PADDING * 2), y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setFrac(novoFrac);
    if (novoTema !== theme) {
      trocarTemaComTransicao(origem, () => setTheme(novoTema));
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFrac(fracDoPointer(e.clientX));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setFrac(fracDoPointer(e.clientX));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragging) return;
    setDragging(false);
    commitTema(fracDoPointer(e.clientX) >= 0.5 ? 1 : 0);
  }
  function onClickTrack(e: React.MouseEvent) {
    if (dragging) return;
    commitTema(fracDoPointer(e.clientX) >= 0.5 ? 1 : 0);
  }

  const glow = corBrilho(frac);

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <button
          type="button"
          title="Alternar tema"
          onClick={(e) => trocarTemaComTransicao({ x: e.clientX, y: e.clientY }, () => setTheme(theme === 'dark' ? 'light' : 'dark'))}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1.5 px-1">Tema</p>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClickTrack}
        className="relative h-9 w-full max-w-[140px] rounded-full border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md shadow-inner cursor-pointer select-none touch-none overflow-hidden"
      >
        {/* Brilho colorido que acompanha o arraste */}
        <div
          className="absolute inset-y-0 rounded-full pointer-events-none"
          style={{
            left: `calc(${frac * 100}% - ${KNOB}px)`,
            width: `${KNOB * 3}px`,
            background: `radial-gradient(circle, rgba(${glow},0.55) 0%, rgba(${glow},0) 70%)`,
            transition: dragging ? 'none' : 'left 300ms cubic-bezier(.2,.9,.25,1)',
            filter: 'blur(2px)',
          }}
        />
        {/* Rótulos */}
        <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
          <span className={cn(frac < 0.5 && 'opacity-0')}>Claro</span>
          <span className={cn(frac >= 0.5 && 'opacity-0')}>Escuro</span>
        </div>
        {/* Botão redondo */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center',
            'bg-gradient-to-b from-white to-white/80 dark:from-neutral-200 dark:to-neutral-300',
            'shadow-[0_1px_4px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-black/5',
          )}
          style={{
            width: KNOB, height: KNOB,
            left: `calc(${PADDING}px + ${frac} * (100% - ${KNOB + PADDING * 2}px))`,
            transition: dragging ? 'none' : 'left 300ms cubic-bezier(.2,.9,.25,1)',
          }}
        >
          {frac < 0.5
            ? <Sun className="h-3.5 w-3.5 text-amber-500" />
            : <Moon className="h-3.5 w-3.5 text-blue-600" />}
        </div>
      </div>
    </div>
  );
}
