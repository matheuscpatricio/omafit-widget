import { useRef } from 'react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { WidgetMockup } from './WidgetMockup';
import { LANDING_IMAGES } from '../../lib/site';
import { Marquee } from './magic/Marquee';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { useIsMdUp } from '../../hooks/useMediaQuery';

interface HeroProps {
  onInstallShopify?: () => void;
  onRequestDemo?: () => void;
}

/** Leve halo claro no texto para contraste sobre água/céu claros (sem véu branco no fundo). */
const heroReadable =
  '[text-shadow:0_1px_1px_rgba(255,255,255,0.95),0_2px_24px_rgba(255,255,255,0.75),0_0_2px_rgba(255,255,255,0.5)]';

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

export function Hero({ onInstallShopify, onRequestDemo }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isMdUp = useIsMdUp();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.45]);

  const parallaxStyle = isMdUp ? { y: bgY, scale: bgScale } : undefined;
  const contentStyle = isMdUp ? { opacity: contentOpacity } : undefined;

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-[100svh] min-h-[100dvh] overflow-hidden pt-20 pb-10 sm:pt-24 sm:pb-12 md:min-h-[92vh] md:pt-28 md:pb-16"
    >
      {/* Fotografia lifestyle — sem vídeo e sem opacidade branca; rio (retrato/céu) no mobile, praia (água à esquerda) no desktop */}
      <motion.div
        style={parallaxStyle}
        className="absolute inset-0 will-change-transform md:will-change-transform"
      >
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(min-width: 768px)" srcSet={LANDING_IMAGES.heroLifestyleBeach} />
          <img
            src={LANDING_IMAGES.heroLifestyleRiver}
            alt=""
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-top md:object-left md:object-center"
            aria-hidden
          />
        </picture>
      </motion.div>

      <motion.div
        style={contentStyle}
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10 max-md:!opacity-100"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center md:items-start md:text-left"
        >
          <div
            className={`flex w-full max-w-2xl flex-col items-center md:max-w-[min(100%,28rem)] lg:max-w-xl ${heroReadable} md:pr-4`}
          >
            <motion.div variants={itemVariants} className="w-full flex justify-center md:justify-start">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#810707]/25 bg-white/92 px-3 py-1.5 text-[11px] font-semibold text-ink-900 shadow-sm backdrop-blur-sm sm:px-3.5 sm:text-[12px]">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#810707]" />
                <span className="text-left leading-snug sm:text-center md:text-left">
                  IA fotorrealista · provador inteligente · AR
                </span>
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-5 max-w-[20rem] text-[1.6rem] font-semibold leading-[1.14] tracking-tight text-ink-950 sm:max-w-none sm:text-4xl sm:leading-[1.08] md:mt-6 md:max-w-none md:text-[2.35rem] md:leading-[1.1] lg:text-5xl xl:text-[3.25rem] xl:leading-[1.08]"
              style={{ letterSpacing: '-0.035em' }}
            >
              O Fim Definitivo das Devoluções e o Início da{' '}
              <span className="relative inline-block">
                <ShimmerHeading variant="dark" className="!from-[#810707] !via-[#a01010] !to-[#810707]">
                  Confiança
                </ShimmerHeading>
                <svg
                  aria-hidden
                  className="absolute -bottom-1.5 left-0 w-full text-[#810707]/80 md:-bottom-2"
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

            <motion.div variants={itemVariants} className="mt-5 w-full sm:mt-6 md:mt-5 md:text-left">
              <p
                className="text-left text-[15px] font-semibold leading-[1.68] text-ink-950 sm:text-[17px] lg:text-lg"
                style={{
                  textShadow:
                    '0 1px 1px rgba(255,255,255,0.95), 0 2px 22px rgba(255,255,255,0.78), 0 0 1px rgba(255,255,255,0.6)',
                }}
              >
                O Omafit é o assistente inteligente que usa{' '}
                <span className="font-bold text-[#6d0505]">IA fotorrealista</span> e{' '}
                <span className="font-bold text-[#6d0505]">medição precisa</span> para garantir o
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
                className="w-full shadow-[0_8px_28px_-4px_rgba(129,7,7,0.4)] sm:w-auto"
                onClick={(e) => {
                  if (onInstallShopify) {
                    e.preventDefault();
                    onInstallShopify();
                  }
                }}
              >
                Instalar Omafit na Shopify
                <span className="ml-0.5 text-xs font-normal text-white/80">(Grátis)</span>
                <ArrowRight className="w-4 h-4" />
              </ButtonLink>

              <Button
                variant="secondary"
                size="lg"
                onClick={onRequestDemo}
                type="button"
                className="w-full border-ink-900/15 bg-white/95 text-ink-900 shadow-sm backdrop-blur-sm hover:bg-white sm:w-auto"
              >
                <Play className="w-4 h-4" />
                Ver Demonstração Personalizada
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-ink-800 sm:gap-x-4 sm:text-[13px] md:mt-6 md:justify-start"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Setup em 5 minutos
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-[#810707]" />
                On-Demand com 5 acessórios AR
              </span>
              <span className="rounded-full border border-ink-900/10 bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                Sem cartão no On-Demand
              </span>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="mt-8 w-full max-w-4xl sm:mt-10 md:mt-12">
            <div className="rounded-2xl border border-ink-900/10 bg-white/88 py-2 shadow-inner backdrop-blur-md">
              <Marquee speed="slow" className="text-ink-800">
                {marqueeItems.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium tracking-tight sm:text-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#810707]" />
                    {label}
                  </span>
                ))}
              </Marquee>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-10 w-full max-w-[min(100%,520px)] sm:mt-14 md:mt-16 md:max-w-4xl md:self-center"
          >
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-[#810707]/12 via-transparent to-rose-300/15 blur-2xl sm:-inset-6 sm:rounded-[40px]" />
              <WidgetMockup />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
