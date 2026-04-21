import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Zap } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { WidgetMockup } from './WidgetMockup';

interface HeroProps {
  onInstallShopify?: () => void;
  onRequestDemo?: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function Hero({ onInstallShopify, onRequestDemo }: HeroProps) {
  return (
    <section id="top" className="relative pt-28 sm:pt-32 lg:pt-36 pb-16 sm:pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-hero-spotlight pointer-events-none" />
      <div className="absolute inset-0 bg-hero-grid pointer-events-none opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <motion.div variants={itemVariants}>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 backdrop-blur px-3 py-1 text-[12px] font-medium text-ink-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[#810707]" />
              Novo · IA fotorrealista para moda
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] font-semibold tracking-tight text-ink-800"
            style={{ letterSpacing: '-0.035em' }}
          >
            O Fim Definitivo das Devoluções e o Início da{' '}
            <span className="relative inline-block">
              <span className="text-[#810707]">Confiança</span>
              <svg
                aria-hidden
                className="absolute -bottom-1.5 left-0 w-full h-[10px]"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M2 8 Q 50 2, 100 5 T 198 4"
                  stroke="#810707"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: 1.2, ease: 'easeInOut' }}
                />
              </svg>
            </span>{' '}
            na Moda Online.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl text-[17px] sm:text-lg lg:text-xl text-ink-500 leading-[1.55]"
          >
            O Omafit é o Assistente Inteligente que usa{' '}
            <span className="text-ink-800 font-medium">IA fotorrealista</span> e{' '}
            <span className="text-ink-800 font-medium">medição precisa</span> para garantir o
            caimento perfeito em Roupas, Calçados e Acessórios. Reduza custos, aumente vendas e
            encante seus clientes.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto"
          >
            <ButtonLink
              variant="primary"
              size="lg"
              href="https://apps.shopify.com/omafit"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (onInstallShopify) {
                  e.preventDefault();
                  onInstallShopify();
                }
              }}
            >
              Instalar Omafit na Shopify
              <span className="ml-0.5 text-xs font-normal text-white/75">(Grátis)</span>
              <ArrowRight className="w-4 h-4" />
            </ButtonLink>

            <Button
              variant="secondary"
              size="lg"
              onClick={onRequestDemo}
              type="button"
            >
              <Play className="w-4 h-4" />
              Ver Demonstração Personalizada
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-ink-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Setup em 5 minutos
            </span>
            <span className="hidden sm:inline text-ink-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#810707]" />
              50 imagens grátis para começar
            </span>
            <span className="hidden sm:inline text-ink-300">·</span>
            <span>Sem cartão de crédito</span>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-14 sm:mt-16 w-full flex justify-center"
          >
            <WidgetMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
