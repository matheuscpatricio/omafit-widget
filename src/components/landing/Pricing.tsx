import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, ButtonLink } from '../ui/button';

type PlanName = 'growth' | 'pro' | 'scale' | 'enterprise';

interface BillingPlan {
  name: PlanName;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  images_included: number;
  price_per_extra_image: number;
  currency: string;
  active: boolean;
  trial_days?: number;
  tagline: string;
  features: string[];
}

const UNLIMITED_THRESHOLD = 500_000;

const PLAN_ORDER: PlanName[] = ['growth', 'pro', 'scale', 'enterprise'];

const fallbackPlans: BillingPlan[] = [
  {
    name: 'growth',
    display_name: 'Growth',
    monthly_price: 99,
    yearly_price: 999,
    images_included: 1000,
    price_per_extra_image: 0.12,
    currency: 'USD',
    active: true,
    trial_days: 14,
    tagline: 'For brands getting started with virtual try-on at steady volume.',
    features: [
      '1,000 try-on sessions/month',
      'Personalized size recommendations',
      'AI-powered shopping assistant',
      'Customizable widget design',
      'Extra try-ons at $0.12 each',
    ],
  },
  {
    name: 'pro',
    display_name: 'Pro',
    monthly_price: 399,
    yearly_price: 3990,
    images_included: 5000,
    price_per_extra_image: 0.08,
    currency: 'USD',
    active: true,
    trial_days: 14,
    tagline: 'Predictable volume and full styling tools for growing stores.',
    features: [
      '5,000 try-on sessions/month',
      'Personalized size recommendations',
      'AI Stylist and outfit recommendations',
      'Customizable widget design',
      'Extra try-ons at $0.08 each',
    ],
  },
  {
    name: 'scale',
    display_name: 'Scale',
    monthly_price: 999,
    yearly_price: 9990,
    images_included: 15000,
    price_per_extra_image: 0.04,
    currency: 'USD',
    active: true,
    trial_days: 14,
    tagline: 'High session caps, analytics, and styling for serious catalogs.',
    features: [
      '15,000 try-on sessions/month',
      'Fully customizable widget',
      'AI Stylist and outfit recommendations',
      'Analytics and shopper insights',
      'Extra try-ons at $0.04 each',
    ],
  },
  {
    name: 'enterprise',
    display_name: 'Enterprise',
    monthly_price: 2499,
    yearly_price: 24900,
    images_included: 999_999,
    price_per_extra_image: 0,
    currency: 'USD',
    active: true,
    tagline: 'Unlimited try-on and white-glove support for large operations.',
    features: [
      'Unlimited try-on sessions',
      'Fully customizable widget',
      'AI Stylist and outfit recommendations',
      'Dedicated support',
      'Analytics and shopper insights',
    ],
  },
];

interface PricingProps {
  onSelectPaidPlan?: (planName: PlanName) => void;
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

function formatSessionAllowance(plan: BillingPlan): string {
  if (plan.images_included >= UNLIMITED_THRESHOLD) {
    return 'Unlimited try-on sessions';
  }
  return `${plan.images_included.toLocaleString('en-US')} try-on sessions/month`;
}

function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US');
}

export function Pricing({ onSelectPaidPlan }: PricingProps) {
  const [plans, setPlans] = useState<BillingPlan[]>(() => mergePlansFromDb([]));

  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | undefined;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function fetchPlans() {
      if (cancelled) return;
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

    function scheduleFetch() {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => void fetchPlans(), { timeout: 3500 });
      } else {
        timeoutId = window.setTimeout(() => void fetchPlans(), 1200);
      }
    }

    const planosEl = document.getElementById('planos');
    if (planosEl && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            io = undefined;
            scheduleFetch();
          }
        },
        { rootMargin: '320px', threshold: 0 },
      );
      io.observe(planosEl);
    } else {
      scheduleFetch();
    }

    return () => {
      cancelled = true;
      io?.disconnect();
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  const ordered = useMemo(
    () => PLAN_ORDER.map((name) => plans.find((p) => p.name === name)).filter(Boolean) as BillingPlan[],
    [plans],
  );

  return (
    <section id="planos" className="relative bg-oma-canvas py-20 sm:py-28">
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
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-line/40 bg-oma-elevated/80 px-3 py-1 text-[12px] font-medium text-oma-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" />
            Transparent pricing
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Choose the plan that <span className="text-oma-accent">fuels</span> your growth.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            Monthly or annual billing. Growth, Pro, and Scale include a{' '}
            <span className="font-semibold text-oma-cream">14-day trial</span>. Session bundles include
            sizing, photorealistic try-on, and AI stylist tools.
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
          <p className="text-sm text-oma-muted">
            Questions about billing or volume?{' '}
            <ButtonLink
              variant="link"
              size="sm"
              href="https://wa.me/5573991391471"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat with us on WhatsApp
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
  onSelectPaidPlan,
}: {
  plan: BillingPlan;
  variants: Variants;
  isPopular: boolean;
  onSelectPaidPlan?: (planName: PlanName) => void;
}) {
  const isDark = isPopular;
  const sessionsLine = formatSessionAllowance(plan);

  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`relative flex min-h-[540px] flex-col rounded-3xl border p-7 sm:p-8 ${
        isDark
          ? 'overflow-hidden border border-oma-line/40 bg-oma-elevated text-oma-cream shadow-brand-glow'
          : 'border border-oma-line/40 bg-oma-parchment shadow-elegant hover:shadow-elegant-lg'
      }`}
    >
      {isPopular && (
        <>
          <div
            className="absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(217,104,69,0.55), transparent)' }}
          />
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-oma-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-oma-cream">
              <Sparkles className="w-3 h-3" />
              Popular
            </span>
          </div>
        </>
      )}

      <div className={isPopular ? 'relative' : ''}>
        <div
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-oma-cream/50' : 'text-oma-muted'
          }`}
        >
          {plan.trial_days ? `${plan.trial_days}-day free trial` : 'Custom contract'}
        </div>
        <h3
          className={`mt-2 text-xl font-semibold tracking-tight ${
            isDark ? 'text-oma-cream' : 'text-oma-ink'
          }`}
        >
          {plan.display_name}
        </h3>
        <p className={`mt-1 text-sm leading-snug ${isDark ? 'text-oma-cream/60' : 'text-oma-muted'}`}>
          {plan.tagline}
        </p>

        <div className="mt-6 flex flex-col gap-1">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-dm-mono text-4xl font-semibold tracking-tight text-[#5BAF8A]">
              US$ {formatUsd(plan.monthly_price)}
            </span>
            <span className="font-dm-mono text-sm text-[#5BAF8A]/90">/mo</span>
          </div>
          <span className={`text-sm leading-snug ${isDark ? 'text-oma-cream/65' : 'text-oma-muted'}`}>
            or US$ {formatUsd(plan.yearly_price)}/yr
          </span>
        </div>

        <div
          className={`mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-oma-line/40 px-3 py-1.5 font-dm-mono text-[12px] font-medium text-[#5BAF8A] ${
            isDark ? 'bg-oma-cream/[0.08]' : 'bg-oma-light/80'
          }`}
        >
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{sessionsLine}</span>
        </div>

        <ul className="mt-6 space-y-2.5 flex-1">
          {plan.features.map((feature) => (
            <PricingBullet key={feature} inverted={isDark}>
              {feature}
            </PricingBullet>
          ))}
        </ul>

        <div className="mt-8">
          <Button
            variant={isPopular ? 'primary' : 'secondary'}
            size="lg"
            className="w-full"
            onClick={() => onSelectPaidPlan?.(plan.name)}
            type="button"
          >
            {plan.trial_days ? `Start ${plan.trial_days}-day trial` : 'Talk to sales'}
            <ArrowRight className="w-4 h-4" />
          </Button>
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
        inverted ? 'text-oma-cream/85' : 'text-oma-ink'
      }`}
    >
      <span
        className={`mt-0.5 h-5 w-5 rounded-full flex-shrink-0 grid place-items-center ${
          inverted ? 'bg-oma-cream/10 text-oma-cream' : 'bg-oma-tech/12 text-oma-tech'
        }`}
      >
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}
