import type { Metadata } from 'next';
import SobreClient from '@/components/sobre/SobreClient';

export const metadata: Metadata = {
  title: 'Sobre a Logicbox',
  description: 'Mais de 30 anos desenvolvendo soluções completas para empresas de todos os portes.',
};

export default function SobrePage() {
  return <SobreClient />;
}
