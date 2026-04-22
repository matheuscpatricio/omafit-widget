import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LANDING_IMAGES } from '../../lib/site';
import { ShimmerHeading } from './magic/ShimmerHeading';

/** Faixa visual com imagem de IA e parallax suave (scroll-linked). */
export function ParallaxStoryBanner() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.02, 1.1]);

  return (
    <section
      ref={ref}
      className="relative my-6 sm:my-10 overflow-hidden rounded-3xl border border-black/10 bg-ink-900 shadow-elegant-lg mx-4 sm:mx-6 lg:mx-auto max-w-7xl"
    >
      <div className="relative aspect-[21/9] min-h-[220px] sm:min-h-[280px] md:min-h-[320px] w-full overflow-hidden rounded-3xl">
        <motion.div style={{ y, scale }} className="absolute inset-[-8%] will-change-transform">
          <img
            src={LANDING_IMAGES.midBanner}
            alt="Experiência de provador virtual e realidade aumentada na moda online"
            className="h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
            width={1920}
            height={640}
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-[#810707]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(129,7,7,0.35),transparent_55%)]" />

        <div className="relative z-10 flex h-full min-h-[inherit] flex-col items-start justify-center px-6 py-10 sm:px-12 md:px-16">
          <motion.p
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="max-w-xl text-sm font-semibold uppercase tracking-[0.2em] text-white/80"
          >
            Experiência imersiva
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.08 }}
            className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl"
          >
            <ShimmerHeading variant="light">Do clique à confiança — em segundos.</ShimmerHeading>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 max-w-lg text-base text-white/85 sm:text-lg"
          >
            Try-on fotorrealista, medidas precisas e AR no mesmo fluxo fluido que seus clientes já
            conhecem no celular.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
