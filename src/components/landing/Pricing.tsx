import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

/** Imagens de try-on incluídas por mês (coluna `images_included` no Supabase). */
const UNLIMITED_THRESHOLD = 500_000;

const AR_ACCESSORIES: Record<string, number | 'unlimited'> = {
  free: 5,
  growth: 20,
  pro: 100,
  enterprise: 'unlimited',
};

const PLAN_ORDER = ['free', 'growth', 'pro', 'enterprise'] as const;

const fallbackPlans: BillingPlan[] = [
  {
    name: 'free',
    display_name: 'On-Demand',
    monthly_price: 0,
    images_included: 0,
    price_per_extra_image: 0.18,
    currency: 'USD',
    active: true,
  },
  {
    name: 'growth',
    display_name: 'Growth',
    monthly_price: 89,
    images_included: 700,
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
  {
    name: 'enterprise',
    display_name: 'Enterprise',
    monthly_price: 600,
    images_included: 999_999,
    price_per_extra_image: 0,
    currency: 'USD',
    active: true,
  },
];

interface PricingProps {
  onSelectFree?: () => void;
  onSelectPaidPlan?: (planName: 'growth' | 'pro' | 'enterprise') => void;
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Mescla linhas do Supabase com os defaults locais.
 * Preços e volumes (`monthly_price`, `images_included`, `price_per_extra_image`) vêm sempre do fallback,
 * alinhados ao Stripe e à copy da landing — evita mostrar valores desatualizados se o `billing_plans` no
 * projeto ainda não foi migrado. Do DB usamos só metadados seguros (nome de exibição, moeda, ativo).
 */
function mergePlansFromDb(rows: BillingPlan[]): BillingPlan[] {
  const byName = new Map(rows.map((p) => [p.name, p]));
  return PLAN_ORDER.map((name) => {
    const fromDb = byName.get(name);
    const fallback = fallbackPlans.find((p) => p.name === name)!;
    if (!fromDb) return fallback;
    return {
      ...fallback,
      display_name: fromDb.display_name?.trim() || fallback.display_name,
      currency: fromDb.currency || fallback.currency,
      active: fromDb.active,
    };
  });
}

function formatArCount(name: string): string {
  const n = AR_ACCESSORIES[name];
  if (n === 'unlimited') return 'Ilimitados';
  return String(n);
}

function formatTryOnImages(plan: BillingPlan): string {
  if (plan.images_included >= UNLIMITED_THRESHOLD) {
    return 'Imagens de try-on ilimitadas';
  }
  if (plan.name === 'free' || plan.images_included === 0) {
    return 'Imagens de try-on sob demanda';
  }
  return `${plan.images_included.toLocaleString('pt-BR')} imagens de try-on / mês`;
}

export function Pricing({ onSelectFree, onSelectPaidPlan }: PricingProps) {
  const [plans, setPlans] = useState<BillingPlan[]>(() => mergePlansFromDb([]));

  useEffect(() => {
    let cancelled = false;
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('billing_plans')
          .select(
            'name, display_name, monthly_price, images_included, price_per_extra_image, currency, active',
          )
          .eq('active', true)
          .in('name', [...PLAN_ORDER]);
        if (!cancelled && !error && data && data.length > 0) {
          setPlans(mergePlansFromDb(data as BillingPlan[]));
        }
      } catch {
        /* fallback já aplicado */
      }
    }
    fetchPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(
    () => PLAN_ORDER.map((name) => plans.find((p) => p.name === name)).filter(Boolean) as BillingPlan[],
    [plans],
  );

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
            Escolha o Plano que <span className="text-[#810707]">Impulsiona</span> o Seu Crescimento.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg text-ink-500 leading-relaxed">
            Do On-Demand ao Enterprise: pacotes claros de{' '}
            <span className="font-semibold text-ink-800">imagens de try-on</span> (ex.: Pro com{' '}
            <span className="font-semibold text-[#810707]">3.000 imagens</span> por US$ 300) e limites de{' '}
            <span className="font-semibold text-ink-800">acessórios AR</span> (5 → 20 → 100 → ilimitado).
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-14 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5"
        >
          {ordered.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              variants={itemVariants}
              isPopular={plan.name === 'pro'}
              onSelectFree={onSelectFree}
              onSelectPaidPlan={onSelectPaidPlan}
            />
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-ink-500">
            Dúvidas sobre faturamento ou volume?{' '}
            <ButtonLink
              variant="link"
              size="sm"
              href="https://wa.me/5573991391471"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fale com o time no WhatsApp
            </ButtonLink>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  variants,
  isPopular,
  onSelectFree,
  onSelectPaidPlan,
}: {
  plan: BillingPlan;
  variants: Variants;
  isPopular: boolean;
  onSelectFree?: () => void;
  onSelectPaidPlan?: (planName: 'growth' | 'pro' | 'enterprise') => void;
}) {
  const isDark = isPopular;
  const isFree = plan.name === 'free';
  const arLabel = formatArCount(plan.name);
  const imagesLine = formatTryOnImages(plan);

  const cta = () => {
    if (plan.name === 'free') {
      onSelectFree?.();
      return;
    }
    onSelectPaidPlan?.(plan.name as 'growth' | 'pro' | 'enterprise');
  };

  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 min-h-[520px] ${
        isDark
          ? 'bg-ink-800 text-white border-transparent shadow-brand-glow overflow-hidden'
          : 'bg-white border-black/5 shadow-elegant hover:shadow-elegant-lg'
      }`}
    >
      {isPopular && (
        <>
          <div
            className="absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(129,7,7,0.85), transparent)' }}
          />
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#810707] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="w-3 h-3" />
              Popular
            </span>
          </div>
        </>
      )}

      <div className={isPopular ? 'relative' : ''}>
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-white/50' : 'text-ink-400'
          }`}
        >
          {isFree ? 'On-Demand' : 'Assinatura mensal'}
        </div>
        <h3
          className={`mt-2 text-xl font-semibold tracking-tight ${
            isDark ? 'text-white' : 'text-ink-800'
          }`}
        >
          {plan.display_name}
        </h3>
        <p className={`mt-1 text-sm leading-snug ${isDark ? 'text-white/60' : 'text-ink-500'}`}>
          {isFree
            ? 'Comece sem mensalidade e escale conforme o uso.'
            : plan.name === 'growth'
            ? 'Para marcas em aceleração com volume moderado.'
            : plan.name === 'pro'
            ? 'Escala e previsibilidade para operações maduras.'
            : 'Máximo de imagens de try-on e AR para grandes catálogos.'}
        </p>

        <div className="mt-6 flex items-baseline gap-1 flex-wrap">
          {plan.monthly_price === 0 ? (
            <span className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-ink-800'}`}>
              Grátis
            </span>
          ) : (
            <>
              <span className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-ink-800'}`}>
                US$ {plan.monthly_price}
              </span>
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-ink-400'}`}>/mês</span>
            </>
          )}
        </div>

        <div
          className={`mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
            isDark
              ? 'bg-white/10 border-white/10 text-white/90'
              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
          }`}
        >
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{imagesLine}</span>
        </div>

        <ul className="mt-6 space-y-2.5 flex-1">
          <PricingBullet inverted={isDark}>
            {plan.name === 'free' && `${arLabel} acessórios AR incluídos`}
            {plan.name === 'growth' && 'Até 20 acessórios AR incluídos / mês'}
            {plan.name === 'pro' && 'Até 100 acessórios AR incluídos / mês'}
            {plan.name === 'enterprise' && 'Acessórios AR ilimitados'}
          </PricingBullet>
          {plan.name === 'pro' && (
            <PricingBullet inverted={isDark}>
              Faturamento fixo mensal — inclui 3.000 imagens de try-on
            </PricingBullet>
          )}
          {plan.name === 'enterprise' && (
            <PricingBullet inverted={isDark}>
              Faturamento fixo mensal — imagens de try-on e AR ilimitados
            </PricingBullet>
          )}
          {!isFree && plan.price_per_extra_image > 0 && (
            <PricingBullet inverted={isDark}>
              Imagens extras a US$ {plan.price_per_extra_image.toFixed(2)} cada
            </PricingBullet>
          )}
          {isFree && (
            <PricingBullet inverted={isDark}>
              US$ {plan.price_per_extra_image.toFixed(2)} por imagem de try-on adicional
            </PricingBullet>
          )}
          <PricingBullet inverted={isDark}>Medição precisa (MediaPipe)</PricingBullet>
          <PricingBullet inverted={isDark}>Try-on fotorrealista</PricingBullet>
          <PricingBullet inverted={isDark}>Widget personalizável</PricingBullet>
          {plan.name !== 'free' && (
            <PricingBullet inverted={isDark}>Assistente ChatGPT integrado</PricingBullet>
          )}
          {(plan.name === 'pro' || plan.name === 'enterprise') && (
            <PricingBullet inverted={isDark}>Suporte prioritário</PricingBullet>
          )}
        </ul>

        <div className="mt-8">
          {isFree ? (
            <Button variant="secondary" size="lg" className="w-full" onClick={cta} type="button">
              Começar grátis
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className={`w-full ${isDark ? 'bg-[#810707] hover:bg-[#a00909]' : ''}`}
              onClick={cta}
              type="button"
            >
              {plan.name === 'enterprise' ? 'Assinar Enterprise' : 'Assinar plano'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
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
      className={`flex items-start gap-2.5 text-[13px] leading-relaxed ${
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
