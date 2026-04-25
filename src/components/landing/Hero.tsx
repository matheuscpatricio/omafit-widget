import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { LANDING_IMAGES } from '../../lib/site';
import { Marquee } from './magic/Marquee';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { useIsMdUp } from '../../hooks/useMediaQuery';
import { HeroMobileSlides } from './HeroMobileSlides';

interface HeroProps {
  onInstallShopify?: () => void;
  onRequestDemo?: () => void;
}

const HERO_SLIDES = [
  LANDING_IMAGES.heroLifestyleBoardwalk,
  LANDING_IMAGES.heroLifestyleRiver,
  LANDING_IMAGES.heroLifestyleBeach,
] as const;

const SLIDE_MS = 5200;

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

function HeroDesktopRotator() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const active = reduceMotion ? 0 : index;

  return (
    <div className="relative w-full">
      <div className="relative aspect-[3/4] min-h-[280px] w-full max-h-[min(78vh,720px)] overflow-hidden rounded-3xl border border-oma-line/40 bg-oma-elevated shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)]">
        <AnimatePresence initial={false} mode="sync">
          <motion.img
            key={active}
            src={HERO_SLIDES[active]}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover object-center"
            decoding="async"
          />
        </AnimatePresence>
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-hidden>
        {HERO_SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? 'w-6 bg-oma-accent' : 'w-1.5 bg-oma-muted/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function Hero({ onInstallShopify, onRequestDemo }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isMdUp = useIsMdUp();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.45]);

  const contentStyle = isMdUp ? { opacity: contentOpacity } : undefined;

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-[100svh] min-h-[100dvh] scroll-mt-16 overflow-x-hidden overflow-y-visible bg-oma-canvas max-md:pt-0 pb-8 sm:pb-10 md:min-h-[92vh] md:overflow-hidden md:pt-28 md:pb-16"
    >
      {/* Fora do contentor com padding: evita desvio (w-screen + translate) e faixa branca à esquerda */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mb-4 w-full min-w-0 md:hidden"
      >
        <HeroMobileSlides onInstallShopify={onInstallShopify} onRequestDemo={onRequestDemo} />
      </motion.div>

      <motion.div
        style={contentStyle}
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10 max-md:!opacity-100"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center md:items-stretch md:text-left"
        >
          <div className="hidden w-full items-start gap-10 md:grid md:grid-cols-2 md:gap-8 lg:gap-12 lg:items-center">
            <div className="flex w-full max-w-2xl flex-col items-center justify-self-start md:max-w-none md:pr-2 lg:pr-6">
              <motion.div variants={itemVariants} className="flex w-full justify-center md:justify-start">
                <span className="landing-tagline inline-flex max-w-full items-center gap-2 rounded-full border border-oma-accent/35 bg-oma-elevated px-3 py-1.5 text-[11px] font-semibold text-oma-cream shadow-sm sm:px-3.5 sm:text-[12px]">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-oma-tech" />
                  <span className="text-left leading-snug md:text-left">
                    IA fotorrealista · provador inteligente · AR
                  </span>
                </span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="mt-5 max-w-[20rem] text-[1.6rem] font-semibold leading-[1.14] tracking-tight text-oma-cream sm:max-w-none sm:text-4xl sm:leading-[1.08] md:mt-6 md:max-w-none md:text-[2.35rem] md:leading-[1.1] lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08]"
                style={{ letterSpacing: '-0.035em' }}
              >
                O Fim Definitivo das Devoluções e o Início da{' '}
                <span className="relative inline-block">
                  <ShimmerHeading variant="dark" className="italic">
                    Confiança
                  </ShimmerHeading>
                  <svg
                    aria-hidden
                    className="absolute -bottom-1.5 left-0 w-full text-oma-accent/85 md:-bottom-2"
                    viewBox="0 0 200 12"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M2 9 Q 55 2, 100 6 T 198 5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      className="md:stroke-[3]"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, delay: 0.9, ease: 'easeInOut' }}
                    />
                  </svg>
                </span>{' '}
                na Moda Online.
              </motion.h1>

              <motion.div variants={itemVariants} className="mt-5 w-full sm:mt-6 md:mt-5">
                <p className="text-left text-[15px] font-semibold leading-[1.68] text-oma-muted sm:text-[17px] lg:text-lg">
                  O Omafit é o assistente inteligente que usa{' '}
                  <span className="font-bold text-oma-accent">IA fotorrealista</span> e{' '}
                  <span className="font-bold text-oma-tech">medição precisa</span> para garantir o
                  caimento perfeito em roupas, calçados e acessórios. Reduza custos, aumente vendas e
                  encante seus clientes.
                </p>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center md:mt-8"
              >
                <ButtonLink
                  variant="primary"
                  size="lg"
                  href="https://apps.shopify.com/omafit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full shadow-[0_8px_28px_-4px_rgba(217,104,69,0.45)] sm:w-auto"
                  onClick={(e) => {
                    if (onInstallShopify) {
                      e.preventDefault();
                      onInstallShopify();
                    }
                  }}
                >
                  Instalar Omafit na Shopify
                  <span className="ml-0.5 text-xs font-normal text-oma-cream/85">(instalação grátis)</span>
                  <ArrowRight className="w-4 h-4" />
                </ButtonLink>

                <Button
                  variant="secondary"
                  size="lg"
                  onClick={onRequestDemo}
                  type="button"
                  className="w-full sm:w-auto"
                >
                  <Play className="w-4 h-4" />
                  Ver Demonstração Personalizada
                </Button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-oma-cream sm:gap-x-4 sm:text-[13px] md:mt-6 md:justify-start"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-line/40 bg-oma-elevated px-2.5 py-1 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-oma-tech" />
                  Setup em 5 minutos
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-oma-line/40 bg-oma-elevated px-2.5 py-1 shadow-sm">
                  <Zap className="h-3.5 w-3.5 text-oma-accent" />
                  On-Demand: 50 sessões try-on incluídas
                </span>
                <span className="rounded-full border border-oma-line/40 bg-oma-elevated px-2.5 py-1 shadow-sm">
                  5 acessórios AR no On-Demand
                </span>
              </motion.div>
            </div>

            <motion.div
              variants={itemVariants}
              className="hidden w-full justify-self-end md:block md:max-w-lg lg:max-w-none"
            >
              <HeroDesktopRotator />
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="mt-8 w-full max-w-4xl sm:mt-10 md:mt-12 md:mx-auto">
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
    </section>
  );
}
