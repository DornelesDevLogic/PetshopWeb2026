'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ShoppingCart, PawPrint, UtensilsCrossed, Store, Truck,
  Wallet, FileText, Receipt, FileCheck2, BarChart3, Network,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const SOLUCOES = [
  { icon: ShoppingCart,   titulo: 'ERP para Supermercados', texto: 'Gestão completa de frente e retaguarda de loja.' },
  { icon: PawPrint,       titulo: 'Pet Shop',               texto: 'Agenda, banho & tosa, vendas e clientes num só lugar.' },
  { icon: UtensilsCrossed,titulo: 'Restaurantes',           texto: 'Comandas, cozinha e delivery integrados.' },
  { icon: Store,          titulo: 'Lojas',                  texto: 'PDV ágil e controle de estoque em tempo real.' },
  { icon: Truck,          titulo: 'Distribuidoras',         texto: 'Logística, pedidos e faturamento em escala.' },
  { icon: Wallet,         titulo: 'Financeiro',             texto: 'Contas a pagar, receber e fluxo de caixa.' },
  { icon: FileText,       titulo: 'Fiscal',                 texto: 'Conformidade fiscal sempre atualizada.' },
  { icon: Receipt,        titulo: 'NFC-e',                  texto: 'Emissão de cupom fiscal eletrônico integrada.' },
  { icon: FileCheck2,     titulo: 'NF-e',                   texto: 'Nota fiscal eletrônica de forma simples e segura.' },
  { icon: BarChart3,      titulo: 'BI',                     texto: 'Inteligência de dados para decisões melhores.' },
  { icon: Network,        titulo: 'Integrações',            texto: 'Conecte seu ecossistema por API.' },
];

export default function SolucoesGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.solucao-card').forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.85, y: 24 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            delay: (i % 3) * 0.05,
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          },
        );
      });
    }, gridRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="solucoes" className="relative bg-black py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Soluções para o seu segmento</h2>
          <p className="mt-4 text-white/50">Um ecossistema completo, para cada tipo de negócio.</p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUCOES.map(({ icon: Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="solucao-card group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-300 transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-white">{titulo}</h3>
              <p className="mt-1.5 text-sm text-white/50">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
