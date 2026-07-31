'use client';

import NavSobre from './NavSobre';
import HeroSobre from './HeroSobre';
import SobreEmpresaTimeline from './SobreEmpresaTimeline';
import SolucoesGrid from './SolucoesGrid';
import DiferenciaisGrid from './DiferenciaisGrid';
import EstatisticasCounters from './EstatisticasCounters';
import DepoimentosCarousel from './DepoimentosCarousel';
import CTAFinal from './CTAFinal';

export default function SobreClient() {
  return (
    <div className="bg-black">
      <NavSobre />
      <HeroSobre />
      <SobreEmpresaTimeline />
      <SolucoesGrid />
      <DiferenciaisGrid />
      <EstatisticasCounters />
      <DepoimentosCarousel />
      <CTAFinal />

      <footer className="border-t border-white/10 bg-black py-8">
        <p className="text-center text-xs text-white/30">
          © {new Date().getFullYear()} Logicbox. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
