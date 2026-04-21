import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, ButtonLink } from '../ui/button';

interface BillingPlan {
  name: string;
  display_name: string;
  monthly_price: number;
  images_included: number;
  price_per_extra_image: number;
  currency: string;
  active: boolean;
}

interface PricingProps {
  onSelectFree?: () => void;
  onSelectPro?: () => void;
}

const fallbackPlans: BillingPlan[] = [
  {
    name: 'free',
    display_name: 'Free',
    monthly_price: 0,
    images_included: 0,
    price_per_extra_image: 0.18,
    currency: 'USD',
    active: true,
  },
  {
    name: 'pro',
    display_name: 'Pro',
    monthly_price: 300,
    images_included: 3000,
    price_per_extra_image: 0.08,
    currency: 'USD',
    active: true,
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Pricing({ onSelectFree, onSelectPro }: PricingProps) {
  const [plans, setPlans] = useState<BillingPlan[]>(fallbackPlans);

  useEffect(() => {
    let cancelled = false;
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('billing_plans')
          .select('name, display_name, monthly_price, images_included, price_per_extra_image, currency, active')
          .eq('active', true)
          .in('name', ['free', 'pro']);
        if (!cancelled && !error && data && data.length > 0) {
          const sorted = [...data].sort((a, b) => a.monthly_price - b.monthly_price);
          setPlans(sorted as BillingPlan[]);
        }
      } catch {
        /* mantém fallback */
      }
    }
    fetchPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const freePlan = plans.find((p) => p.name === 'free') ?? fallbackPlans[0];
  const proPlan = plans.find((p) => p.name === 'pro') ?? fallbackPlans[1];

  return (
    <section id="planos" className="relative py-20 sm:py-28 bg-ink-50/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.span
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-medium text-ink-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#810707]" />
            Planos transparentes
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-800"
            style={{ letterSpacing: '-0.035em' }}
          >
            Escolha o Plano que{' '}
            <span className="text-[#810707]">Impulsiona</span> o Seu Crescimento.
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg text-ink-500 leading-relaxed"
          >
            Comece grátis com{' '}
            <span className="font-semibold text-ink-800">50 imagens gratuitas</span>. Pague só pelo
            que usar ou escale com o plano Pro. Sem taxas ocultas, sem surpresas.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl mx-auto"
        >
          {/* On-Demand / Free */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative bg-white rounded-3xl border border-black/5 p-8 sm:p-10 shadow-elegant hover:shadow-elegant-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  On-Demand
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-ink-800 tracking-tight">
                  {freePlan.display_name}
                </h3>
                <p className="mt-1 text-sm text-ink-500">
                  Para começar sem compromisso e pagar apenas pelo uso.
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-ink-50 grid place-items-center">
                <Sparkles className="w-5 h-5 text-ink-700" />
              </div>
            </div>

            <div className="mt-8 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold text-ink-800 tracking-tight">Grátis</span>
              <span className="text-sm text-ink-400">para instalar</span>
            </div>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[12px] font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5" />
              50 imagens grátis para começar
            </div>

            <ul className="mt-8 space-y-3">
              <PricingBullet>Instalação gratuita na Shopify</PricingBullet>
              <PricingBullet>50 imagens de try-on gratuitas (uma vez)</PricingBullet>
              <PricingBullet>
                US$ {freePlan.price_per_extra_image.toFixed(2)} por imagem adicional
              </PricingBullet>
              <PricingBullet>Medição precisa com MediaPipe</PricingBullet>
              <PricingBullet>Widget personalizável</PricingBullet>
              <PricingBullet>Dashboard com métricas</PricingBullet>
            </ul>

            <Button
              variant="secondary"
              size="lg"
              className="mt-8 w-full"
              onClick={onSelectFree}
              type="button"
            >
              Começar grátis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="relative bg-ink-800 text-white rounded-3xl p-8 sm:p-10 shadow-brand-glow overflow-hidden"
          >
            <div
              className="absolute -top-40 -right-40 h-80 w-80 rounded-full blur-3xl opacity-40"
              style={{ background: 'radial-gradient(circle, rgba(129,7,7,0.8), transparent)' }}
            />
            <div className="absolute top-5 right-5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#810707] px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Mais popular
              </span>
            </div>

            <div className="relative">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                Assinatura mensal
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">{proPlan.display_name}</h3>
              <p className="mt-1 text-sm text-white/60">
                Para lojas em crescimento que querem previsibilidade e escala.
              </p>

              <div className="mt-8 flex items-baseline gap-1.5">
                <span className="text-5xl font-semibold tracking-tight">
                  US$ {proPlan.monthly_price}
                </span>
                <span className="text-sm text-white/60">/mês</span>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[12px] font-medium text-white/90 backdrop-blur">
                <Check className="w-3.5 h-3.5" />
                {proPlan.images_included.toLocaleString('pt-BR')} imagens incluídas por mês
              </div>

              <ul className="mt-8 space-y-3">
                <PricingBullet inverted>Tudo do plano Free</PricingBullet>
                <PricingBullet inverted>
                  {proPlan.images_included.toLocaleString('pt-BR')} imagens de try-on/mês inclusas
                </PricingBullet>
                <PricingBullet inverted>
                  US$ {proPlan.price_per_extra_image.toFixed(2)} por imagem adicional
                </PricingBullet>
                <PricingBullet inverted>Assistente ChatGPT integrado</PricingBullet>
                <PricingBullet inverted>Try-On fotorrealista + AR</PricingBullet>
                <PricingBullet inverted>Suporte prioritário</PricingBullet>
                <PricingBullet inverted>Analytics avançado</PricingBullet>
              </ul>

              <Button
                variant="primary"
                size="lg"
                className="mt-8 w-full bg-[#810707] hover:bg-[#a00909]"
                onClick={onSelectPro}
                type="button"
              >
                Assinar Pro
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-ink-500">
            Precisa de mais volume ou integração customizada?{' '}
            <ButtonLink
              variant="link"
              size="sm"
              href="https://wa.me/5573991391471"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fale com nosso time Enterprise
            </ButtonLink>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function PricingBullet({
  children,
  inverted,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-2.5 text-[14px] leading-relaxed ${
        inverted ? 'text-white/85' : 'text-ink-700'
      }`}
    >
      <span
        className={`mt-0.5 h-5 w-5 rounded-full flex-shrink-0 grid place-items-center ${
          inverted ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}
