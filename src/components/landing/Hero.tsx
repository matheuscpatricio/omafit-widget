import { useRef } from 'react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { WidgetMockup } from './WidgetMockup';
import { LANDING_IMAGES, LANDING_MEDIA } from '../../lib/site';
import { Marquee } from './magic/Marquee';
import { ShimmerHeading } from './magic/ShimmerHeading';
import { useIsMdUp } from '../../hooks/useMediaQuery';

interface HeroProps {
  onInstallShopify?: () => void;
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
      {/* Vídeo de fundo + véu branco (vídeo já é claro) — parallax só em md+ */}
      <motion.div
        style={parallaxStyle}
        className="absolute inset-0 will-change-transform md:will-change-transform"
      >
        <div className="absolute inset-0 bg-white" />

        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={LANDING_IMAGES.heroBanner}
          aria-label="Vídeo de apresentação do Omafit para e-commerce de moda"
        >
          <source src={LANDING_MEDIA.heroVideo} type="video/mp4" />
        </video>

        {/* Encobrimento branco suave sobre o vídeo claro */}
        <div className="absolute inset-0 bg-white/50 sm:bg-white/45 md:bg-white/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
      </motion.div>

      <motion.div
        style={contentStyle}
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10 max-md:!opacity-100"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <motion.div variants={itemVariants}>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#810707]/20 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-800 shadow-sm backdrop-blur-sm sm:px-3.5 sm:text-[12px]">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#810707]" />
              <span className="text-left leading-snug sm:text-center">
                IA fotorrealista · provador inteligente · AR
              </span>
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-5 max-w-[20rem] text-[1.6rem] font-semibold leading-[1.14] tracking-tight text-ink-900 sm:max-w-none sm:text-4xl sm:leading-[1.08] md:mt-7 md:max-w-5xl md:text-5xl lg:text-[64px] xl:text-[72px]"
            style={{ letterSpacing: '-0.035em' }}
          >
            O Fim Definitivo das Devoluções e o Início da{' '}
            <span className="relative inline-block">
              <ShimmerHeading variant="dark" className="!from-[#810707] !via-[#a01010] !to-[#810707]">
                Confiança
              </ShimmerHeading>
              <svg
                aria-hidden
                className="absolute -bottom-1.5 left-0 w-full text-[#810707]/70 md:-bottom-2"
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

          <motion.div
            variants={itemVariants}
            className="mt-5 w-full max-w-2xl rounded-2xl border border-ink-900/10 bg-white/80 px-4 py-4 text-left shadow-[0_8px_30px_-8px_rgba(26,26,26,0.12)] backdrop-blur-md sm:mt-6 sm:px-5 sm:py-5 sm:text-center md:mt-7"
          >
            <p className="text-[15px] font-medium leading-[1.68] text-ink-800 sm:text-[17px] lg:text-lg">
              O Omafit é o assistente inteligente que usa{' '}
              <span className="font-semibold text-[#810707]">IA fotorrealista</span> e{' '}
              <span className="font-semibold text-[#810707]">medição precisa</span> para garantir o
              caimento perfeito em roupas, calçados e acessórios. Reduza custos, aumente vendas e
              encante seus clientes.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center md:mt-10"
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
              className="w-full border-ink-900/15 bg-white text-ink-800 shadow-sm hover:bg-stone-50 sm:w-auto"
            >
              <Play className="w-4 h-4" />
              Ver Demonstração Personalizada
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-ink-700 sm:gap-x-4 sm:text-[13px] md:mt-7"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white/85 px-2.5 py-1 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Setup em 5 minutos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white/85 px-2.5 py-1 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5 text-[#810707]" />
              On-Demand com 5 acessórios AR
            </span>
            <span className="rounded-full border border-ink-900/10 bg-white/85 px-2.5 py-1 backdrop-blur-sm">
              Sem cartão no On-Demand
            </span>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8 w-full max-w-4xl sm:mt-10">
            <div className="rounded-2xl border border-ink-900/10 bg-white/80 py-2 shadow-inner backdrop-blur-md">
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
            className="mt-10 w-full max-w-[min(100%,520px)] sm:mt-14 md:mt-16 md:max-w-4xl"
          >
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-[#810707]/15 via-transparent to-rose-300/20 blur-2xl sm:-inset-6 sm:rounded-[40px]" />
              <WidgetMockup />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
