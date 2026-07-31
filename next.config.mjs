/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  // Lint é gate de qualidade em dev (`npm run lint`), não deve bloquear o build de
  // produção. Erros de runtime continuam sendo pegos pelo TypeScript no build.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Headers de segurança (aplicados a toda rota) + os headers específicos
  // do Service Worker/PWA que já existiam.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Clickjacking — impede embutir o site num <iframe> de outra origem
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Impede o navegador de "adivinhar" o tipo de conteúdo (MIME sniffing)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Não vaza a URL completa (com IDs/tokens em query string) pra sites de terceiros
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Força HTTPS em visitas futuras (1 ano, inclui subdomínios)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Desliga APIs sensíveis do navegador que a aplicação não usa
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP: mesmo efeito de X-Frame-Options via frame-ancestors, mais
          // restrição de origens de script/estilo/conexão. 'unsafe-inline' e
          // 'unsafe-eval' em script-src são necessários pro próprio Next.js
          // (hidratação/dev tools); sem eles a aplicação quebra.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api-giro.logidoc.pro",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            // Permite que o SW controle todas as rotas do site
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      {
        source: '/offline',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
