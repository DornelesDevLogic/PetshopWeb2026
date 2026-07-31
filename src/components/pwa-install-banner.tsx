'use client';

/**
 * Banner de instalação PWA.
 *
 * Android Chrome: captura beforeinstallprompt e exibe um banner na base da tela.
 * iOS Safari:     exibe instrução manual (iOS não suporta beforeinstallprompt).
 *
 * Some automaticamente após instalação ou dispensa. Não aparece se já estiver
 * rodando em modo standalone (já instalado).
 */

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | null;

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return null;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const DISMISS_KEY = 'pwa-install-dismissed';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform,       setPlatform]       = useState<Platform>(null);
  const [visible,        setVisible]        = useState(false);
  const [installing,     setInstalling]     = useState(false);

  useEffect(() => {
    // Já instalado ou usuário já dispensou → não mostrar
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const plat = detectPlatform();
    setPlatform(plat);

    if (plat === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    if (plat === 'ios') {
      // iOS Safari não dispara beforeinstallprompt — mostra instrução manual
      // Aguarda 3s para não aparecer imediatamente no carregamento
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-0 inset-x-0 z-[9999] px-4 pb-safe-bottom"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {/* Ícone do app */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/pwa-icon?size=48"
              alt="PetShop"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <div>
              <p className="text-sm font-semibold leading-tight">PetShop</p>
              <p className="text-xs text-muted-foreground">Instalar como aplicativo</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo por plataforma */}
        {platform === 'android' && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Instale o app para acesso rápido sem a barra do navegador.
            </p>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2.5 transition-opacity active:opacity-80 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {installing ? 'Instalando…' : 'Instalar agora'}
            </button>
          </div>
        )}

        {platform === 'ios' && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Para instalar no iPhone sem a barra do Safari:
            </p>
            <ol className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs">
                <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
                <span>
                  Toque no botão{' '}
                  <Share className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" />
                  <strong>Compartilhar</strong> na barra inferior do Safari
                </span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                <span>Role para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong></span>
              </li>
              <li className="flex items-start gap-2 text-xs">
                <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="w-full mt-1 rounded-xl border border-input text-sm py-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              Entendi
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
