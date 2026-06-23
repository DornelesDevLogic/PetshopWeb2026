import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import PwaRegister from '@/components/pwa-register';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// ── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,         // permite zoom acessível mas evita zoom acidental
  viewportFit: 'cover',   // ocupa a notch/safe area no iPhone
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fa' },
    { media: '(prefers-color-scheme: dark)',  color: '#0d0f1a' },
  ],
};

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default:  'PetShop — Sistema de Gestão',
    template: '%s · PetShop',
  },
  description: 'Sistema interno de gestão para PetShop: agenda, tele-entregas, clientes e mais.',
  manifest: '/manifest.webmanifest',

  // iOS / Safari
  appleWebApp: {
    capable:         true,
    title:           'PetShop',
    statusBarStyle:  'black-translucent',
  },

  // Outros
  formatDetection: {
    telephone: false,   // evita que iOS detecte números de telefone como links
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Splash screen iOS — cor de fundo enquanto carrega */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Evitar zoom no double-tap em elementos iOS 16+ */}
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
