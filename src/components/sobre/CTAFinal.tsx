'use client';

import { motion } from 'framer-motion';

export default function CTAFinal() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-black py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(147,51,234,0.15),_transparent_65%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center"
      >
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          Pronto para transformar sua empresa?
        </h2>
        <p className="mt-5 text-white/60 sm:text-lg">
          Fale com a gente e veja como a Logicbox pode simplificar sua gestão.
        </p>
        <a
          href="mailto:contato@logicbox.com.br"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-black transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          Solicite uma demonstração
        </a>
      </motion.div>
    </section>
  );
}
