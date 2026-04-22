import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button, ButtonLink } from '../ui/button';
import { CtaBlockSurface } from './CtaBlockSurface';
interface FinalCTAProps {
  onInstallShopify?: () => void;
  onScheduleDemo?: () => void;
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

export function FinalCTA({ onInstallShopify, onScheduleDemo }: FinalCTAProps) {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
        >
          <CtaBlockSurface
            className="rounded-3xl"
            contentClassName="px-6 py-16 sm:px-12 sm:py-20 lg:px-20 lg:py-24"
          >
            <div className="relative mx-auto max-w-3xl text-center">
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-3 py-1 text-[12px] font-medium text-white/80"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#810707]" />
              Comece hoje mesmo
            </motion.span>

            <motion.h2
              variants={itemVariants}
              className="mt-6 text-3xl sm:text-4xl lg:text-[56px] font-semibold leading-[1.05] tracking-tight"
              style={{ letterSpacing: '-0.035em' }}
            >
              Não Deixe Mais Vendas Escaparem. <br className="hidden sm:block" />
              <span className="text-white/60">Transforme Sua Loja</span>{' '}
              <span className="text-[#ff9696] bg-clip-text">Hoje.</span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg text-white/70 leading-relaxed"
            >
              Instale em 5 minutos — a instalação na Shopify é gratuita. No On-Demand você começa com 50
              sessões de try-on incluídas e 5 acessórios AR; depois, paga só pelo volume extra que precisar.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
            >
              <ButtonLink
                variant="primary"
                size="xl"
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
                <span className="text-xs font-normal text-white/75">(instalação grátis)</span>
                <ArrowRight className="w-4 h-4" />
              </ButtonLink>

              <Button
                variant="secondary"
                size="xl"
                onClick={onScheduleDemo}
                type="button"
                className="bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/30 backdrop-blur"
              >
                <Calendar className="w-4 h-4" />
                Agendar Demonstração Personalizada
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-white/50"
            >
              <span>✓ 5 minutos de setup</span>
              <span>✓ 50 sessões de try-on incluídas no On-Demand</span>
              <span>✓ Suporte em português</span>
            </motion.div>
            </div>
          </CtaBlockSurface>
        </motion.div>
      </div>
    </section>
  );
}
