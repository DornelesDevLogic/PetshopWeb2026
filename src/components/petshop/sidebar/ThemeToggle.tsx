'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

// Interpola entre o laranja (claro) e o azul (escuro) conforme a posição do arraste
function corBrilho(frac: number): string {
  const de = [251, 191, 36];   // amber-400 (Claro)
  const para = [59, 130, 246]; // blue-500 (Escuro)
  const r = Math.round(de[0] + (para[0] - de[0]) * frac);
  const g = Math.round(de[1] + (para[1] - de[1]) * frac);
  const b = Math.round(de[2] + (para[2] - de[2]) * frac);
  return `${r}, ${g}, ${b}`;
}

export default function ThemeToggle({ collapsed, compact }: { collapsed?: boolean; compact?: boolean }) {
  const KNOB = compact ? 18 : 28;      // diâmetro do botão redondo
  const PADDING = compact ? 2 : 3;     // respiro interno da trilha
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
    const novoFrac = fracDoPointer(e.clientX) >= 0.5 ? 1 : 0;
    setFrac(novoFrac);
    const novoTema = novoFrac === 1 ? 'dark' : 'light';
    if (novoTema !== theme) setTheme(novoTema);
  }
  function onClickTrack(e: React.MouseEvent) {
    if (dragging) return;
    const novoTema = fracDoPointer(e.clientX) >= 0.5 ? 'dark' : 'light';
    setFrac(novoTema === 'dark' ? 1 : 0);
    if (novoTema !== theme) setTheme(novoTema);
  }

  const glow = corBrilho(frac);

  // Enquanto arrasta, o app inteiro acompanha visualmente: um véu leve
  // (preto indo pra escuro, branco indo pra claro) na proporção da distância
  // entre a posição do dedo e o tema real — sem troca pesada de classe/CSS
  // a cada pixel, só uma opacidade que sobe e desce suave.
  const fracReal = theme === 'dark' ? 1 : 0;
  const diff = frac - fracReal;
  const veuAtivo = dragging && Math.abs(diff) > 0.02;

  return (
    <>
      {veuAtivo && (
        <div
          aria-hidden
          className="fixed inset-0 z-[999] pointer-events-none"
          style={{
            background: diff > 0 ? '#000' : '#fff',
            opacity: Math.abs(diff) * 0.45,
          }}
        />
      )}

      {collapsed ? (
        <div className="flex justify-center py-2">
          <button
            type="button"
            title="Alternar tema"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className={compact ? undefined : 'px-3 py-2'}>
          {!compact && <p className="text-xs text-muted-foreground mb-1.5 px-1">Tema</p>}
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onClickTrack}
            title="Alternar tema"
            className={cn(
              'relative rounded-full border border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 backdrop-blur-md shadow-inner cursor-pointer select-none touch-none overflow-hidden',
              compact ? 'h-6 w-[52px] shrink-0' : 'h-9 w-full max-w-[140px]',
            )}
          >
            {/* Brilho colorido que acompanha o arraste */}
            <div
              className="absolute inset-y-0 rounded-full pointer-events-none"
              style={{
                left: `calc(${frac * 100}% - ${KNOB}px)`,
                width: `${KNOB * 3}px`,
                background: `radial-gradient(circle, rgba(${glow},0.55) 0%, rgba(${glow},0) 70%)`,
                transition: dragging ? 'none' : 'left 200ms ease-out',
                filter: 'blur(2px)',
              }}
            />
            {/* Rótulos (só no modo normal — sem espaço no compacto) */}
            {!compact && (
              <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
                <span className={cn(frac < 0.5 && 'opacity-0')}>Claro</span>
                <span className={cn(frac >= 0.5 && 'opacity-0')}>Escuro</span>
              </div>
            )}
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
                transition: dragging ? 'none' : 'left 200ms ease-out',
              }}
            >
              {frac < 0.5
                ? <Sun className={compact ? 'h-2.5 w-2.5 text-amber-500' : 'h-3.5 w-3.5 text-amber-500'} />
                : <Moon className={compact ? 'h-2.5 w-2.5 text-blue-600' : 'h-3.5 w-3.5 text-blue-600'} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
