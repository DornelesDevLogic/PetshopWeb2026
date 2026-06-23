'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hidration mismatch — só renderiza no client
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const options = [
    { value: 'light',  label: 'Claro',   icon: Sun     },
    { value: 'dark',   label: 'Escuro',  icon: Moon    },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

  if (collapsed) {
    const active = options.find(o => o.value === theme) ?? options[2];
    return (
      <div className="flex justify-center py-2">
        <button
          type="button"
          title="Alternar tema"
          onClick={() => {
            const idx = options.findIndex(o => o.value === theme);
            setTheme(options[(idx + 1) % options.length].value);
          }}
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <active.icon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1.5 px-1">Tema</p>
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
              (theme === value || (value === 'system' && theme === 'system'))
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
