import { useRef } from 'react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import { Marquee } from './magic/Marquee';
import { useIsMdUp } from '../../hooks/useMediaQuery';
import { HeroMobileSlides } from './HeroMobileSlides';
import { HeroDesktopSlides } from './HeroDesktopSlides';

interface HeroProps {
  onOpenInstallModal?: () => void;
  onRequestDemo?: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const marqueeItems = [
  'Shopify',
  'Try-on IA',
  'MediaPipe',
  'WebAR',
  'Menos devoluções',
  'Mais conversão',
  'Widget white-label',
  'ChatGPT',
  'Calçados & roupas',
  'Acessórios AR',
];

export function Hero({ onOpenInstallModal, onRequestDemo }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isMdUp = useIsMdUp();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.45]);
  const footerBlendOpacity = useTransform(scrollYProgress, [0.45, 0.92], [0.55, 1]);

  const contentStyle = isMdUp ? { opacity: contentOpacity } : undefined;

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative scroll-mt-16 overflow-x-hidden overflow-y-visible bg-oma-canvas pb-8 max-md:min-h-[100svh] max-md:min-h-[100dvh] max-md:pt-0 sm:pb-10 md:min-h-0 md:overflow-hidden md:pt-0 md:pb-16"
    >
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mb-4 w-full min-w-0 md:hidden"
      >
        <HeroMobileSlides onOpenInstallModal={onOpenInstallModal} onRequestDemo={onRequestDemo} />
      </motion.div>

      <motion.div
        style={contentStyle}
        className="relative z-10 w-full min-w-0 max-md:!opacity-100"
      >
        <div className="hidden md:block">
          <HeroDesktopSlides onOpenInstallModal={onOpenInstallModal} onRequestDemo={onRequestDemo} />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-10 sm:px-6 md:mt-10 md:px-8 lg:px-10"
        >
          <motion.div variants={itemVariants} className="w-full max-w-4xl md:mx-auto">
            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 py-2 shadow-inner backdrop-blur-sm">
              <Marquee speed="slow" className="text-oma-cream">
                {marqueeItems.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium tracking-tight sm:text-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" />
                    {label}
                  </span>
                ))}
              </Marquee>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        style={{ opacity: footerBlendOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-b from-transparent via-oma-canvas/70 to-oma-elevated sm:h-36 md:h-44"
      />
    </section>
  );
}
