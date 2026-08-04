import type { ComponentType } from 'react';
import {
  Home, CalendarDays, Users, PawPrint, Stethoscope, BellRing, Truck,
  ClipboardList, Package, Wallet, BarChart3, LayoutDashboard, Settings, Sparkles,
} from 'lucide-react';

export interface SubmenuItem { href: string; label: string; }

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  submenu?: SubmenuItem[];
}

const RELATORIOS_SUBMENU: SubmenuItem[] = [
  { href: '/relatorios/comissoes',             label: 'Comissões' },
  { href: '/relatorios/comissao-profissional', label: 'Comissão por Profissional' },
  { href: '/relatorios/vendas-secao',          label: 'Vendas por Seção' },
  { href: '/relatorios/atendimentos',          label: 'Agendas / Atendimentos' },
  { href: '/relatorios/espelho-cupons',        label: 'Espelho de Cupons' },
  { href: '/relatorios/vales',                 label: 'Vales de Clientes' },
];

// Lista única dos itens de navegação — usada pelo menu lateral (desktop e
// mobile) e pelos cards de acesso rápido da tela Início, pra não duplicar
// (a duplicação já causou o item "Dashboards" ficar faltando no mobile).
export const NAV_ITEMS: NavItem[] = [
  { href: '/home',          label: 'Início',        icon: Home          },
  { href: '/agenda',        label: 'Agenda',        icon: CalendarDays  },
  { href: '/clientes',      label: 'Clientes',      icon: Users         },
  { href: '/animais',       label: 'Animais',       icon: PawPrint      },
  { href: '/consultas',     label: 'Consultas',     icon: Stethoscope   },
  { href: '/estimativas',   label: 'Estimativas',   icon: BellRing      },
  { href: '/tele-entregas', label: 'Tele-entregas', icon: Truck         },
  { href: '/prevendas',     label: 'Pré-vendas',    icon: ClipboardList },
  { href: '/produtos',      label: 'Produtos',      icon: Package       },
  { href: '/financeiro',    label: 'Financeiro',    icon: Wallet        },
  { href: '/relatorios',    label: 'Relatórios',    icon: BarChart3, submenu: RELATORIOS_SUBMENU },
  { href: '/dashboards',    label: 'Dashboards',    icon: LayoutDashboard },
  { href: '/cadastros',     label: 'Cadastros',     icon: Settings      },
  { href: '/sobre',         label: 'Sobre',         icon: Sparkles      },
];
