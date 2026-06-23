import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PetShop — Sistema de Gestão',
    short_name: 'PetShop',
    description: 'Sistema interno de gestão para PetShop: agenda, tele-entregas, clientes e mais.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0d0f1a',
    theme_color: '#2997ff',
    categories: ['business', 'productivity'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/api/pwa-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/pwa-icon?size=512&maskable=1',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Agenda',
        short_name: 'Agenda',
        description: 'Agendar serviço',
        url: '/agenda',
        icons: [{ src: '/api/pwa-icon?size=96', sizes: '96x96' }],
      },
      {
        name: 'Tele-entregas',
        short_name: 'Entregas',
        description: 'Gerenciar tele-entregas',
        url: '/tele-entregas',
        icons: [{ src: '/api/pwa-icon?size=96', sizes: '96x96' }],
      },
      {
        name: 'Clientes',
        short_name: 'Clientes',
        description: 'Consultar clientes',
        url: '/clientes',
        icons: [{ src: '/api/pwa-icon?size=96', sizes: '96x96' }],
      },
    ],
  };
}
