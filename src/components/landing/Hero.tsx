import { useRef } from 'react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { WidgetMockup } from './WidgetMockup';
import { LANDING_IMAGES } from '../../lib/site';
import { Marquee } from './magic/Marquee';
import { FloatingOrbs } from './magic/FloatingOrbs';
import { ShimmerHeading } from './magic/ShimmerHeading';

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
  hidden: { opacity: 0, y: 32 },
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
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0.35]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-[92vh] overflow-hidden pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16"
    >
      {/* Banner IA + parallax */}
      <motion.div
        style={{ y: bgY, scale: bgScale }}
        className="absolute inset-0 will-change-transform"
      >
        <div className="absolute inset-0 bg-ink-900" />
        <img
          src={LANDING_IMAGES.heroBanner}
          alt="Ambiente premium de moda digital e inteligência artificial para e-commerce"
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          width={1920}
          height={820}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-white" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(129,7,7,0.45),transparent)]" />
      </motion.div>

      <FloatingOrbs />

      <motion.div style={{ opacity: contentOpacity }} className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-[13px] font-medium text-white shadow-lg backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              IA fotorrealista · provador inteligente · AR
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-7 max-w-5xl text-4xl sm:text-5xl lg:text-[64px] xl:text-[72px] leading-[1.04] font-semibold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]"
            style={{ letterSpacing: '-0.04em' }}
          >
            O Fim Definitivo das Devoluções e o Início da{' '}
            <span className="relative inline-block">
              <ShimmerHeading variant="light">Confiança</ShimmerHeading>
              <svg
                aria-hidden
                className="absolute -bottom-2 left-0 w-full h-[12px] text-rose-200/90"
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M2 9 Q 55 2, 100 6 T 198 5"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, delay: 0.9, ease: 'easeInOut' }}
                />
              </svg>
            </span>{' '}
            na Moda Online.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-7 max-w-2xl text-[17px] sm:text-lg lg:text-xl text-white/88 leading-[1.6] drop-shadow-md"
          >
            O Omafit é o Assistente Inteligente que usa{' '}
            <span className="font-semibold text-white">IA fotorrealista</span> e{' '}
            <span className="font-semibold text-white">medição precisa</span> para garantir o
            caimento perfeito em Roupas, Calçados e Acessórios. Reduza custos, aumente vendas e
            encante seus clientes.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto"
          >
            <ButtonLink
              variant="primary"
              size="lg"
              href="https://apps.shopify.com/omafit"
              target="_blank"
              rel="noopener noreferrer"
              className="shadow-[0_8px_32px_-4px_rgba(129,7,7,0.65)] ring-2 ring-white/20"
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
              className="border-white/30 bg-white/95 text-ink-800 hover:bg-white"
            >
              <Play className="w-4 h-4" />
              Ver Demonstração Personalizada
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/80"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Setup em 5 minutos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              On-Demand com 5 acessórios AR
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm">Sem cartão no On-Demand</span>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-10 w-full max-w-4xl">
            <div className="rounded-2xl border border-white/15 bg-black/25 py-2 shadow-inner backdrop-blur-md">
              <Marquee speed="slow" className="text-white/90">
                {marqueeItems.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium tracking-tight"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b6b]" />
                    {label}
                  </span>
                ))}
              </Marquee>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-14 sm:mt-16 w-full flex justify-center"
          >
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-tr from-[#810707]/30 via-transparent to-rose-400/20 blur-2xl" />
              <WidgetMockup />
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
