import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { LANDING_IMAGES } from '../../lib/site';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { useIsMdUp } from '../../hooks/useMediaQuery';

/** Faixa visual com imagem de IA; parallax só a partir de `md` (mobile-first, sem “travamento”). */
export function ParallaxStoryBanner() {
  const ref = useRef<HTMLElement>(null);
  const isMdUp = useIsMdUp();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1, 1.06]);

  const motionStyle = isMdUp ? { y, scale } : undefined;

  return (
    <section
      ref={ref}
      className="relative mx-3 my-6 max-w-7xl overflow-hidden rounded-2xl border border-black/10 bg-ink-900 shadow-elegant-lg sm:mx-4 sm:my-8 sm:rounded-3xl md:mx-6 lg:mx-auto lg:my-10"
    >
      {/* Mobile-first: altura confortável em telas estreitas; banda larga no desktop */}
      <div className="relative aspect-[4/5] w-full min-h-[220px] overflow-hidden rounded-2xl sm:aspect-[5/4] sm:min-h-[260px] md:aspect-[21/9] md:min-h-[280px] md:rounded-3xl lg:min-h-[300px]">
        <motion.div
          style={motionStyle}
          className="absolute inset-0 md:inset-[-6%] md:will-change-transform"
        >
          <picture>
            <source type="image/webp" srcSet={LANDING_IMAGES.midBannerWebp} />
            <img
              src={LANDING_IMAGES.midBanner}
              alt="Experiência de provador virtual e realidade aumentada na moda online"
              className="h-full w-full object-cover object-[center_20%] max-md:brightness-110 sm:object-center"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              sizes="(max-width: 768px) 100vw, min(1280px, 100vw)"
              width={1920}
              height={640}
            />
          </picture>
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-[#810707]/35 max-md:from-black/55 max-md:via-black/35 md:from-black/85 md:via-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(129,7,7,0.28),transparent_55%)] max-md:opacity-80" />

        <div className="relative z-10 flex h-full min-h-[inherit] flex-col items-start justify-end px-5 pb-8 pt-10 sm:justify-center sm:px-8 sm:py-10 md:px-12 md:py-12 lg:px-16">
          <motion.p
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="max-w-xl text-xs font-semibold uppercase tracking-[0.18em] text-white/90 sm:text-sm md:tracking-[0.2em]"
          >
            Experiência imersiva
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.06 }}
            className="mt-2 max-w-xl text-2xl font-semibold leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.5)] sm:max-w-2xl sm:text-3xl md:mt-3 md:text-4xl lg:text-5xl"
          >
            <ShimmerHeading variant="light">Do clique à confiança — em segundos.</ShimmerHeading>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-white/95 sm:text-base md:text-lg"
          >
            Try-on fotorrealista, medidas precisas e AR no mesmo fluxo fluido que seus clientes já
            conhecem no celular.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
