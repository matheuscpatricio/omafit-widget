import { motion, type Variants } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button, ButtonLink } from '../ui/button';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import type { LandingCopy, LandingLocale } from '../../locales/landing';

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

function formatSessionAllowance(
  plan: BillingPlan,
  locale: LandingLocale,
  sessionUnlimited: string,
  sessionPerMonth: (n: string) => string,
): string {
  if (plan.images_included >= UNLIMITED_THRESHOLD) {
    return sessionUnlimited;
  }
  const numberLocale = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
  return sessionPerMonth(plan.images_included.toLocaleString(numberLocale));
}

function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US');
}

export function Pricing({ onSelectPaidPlan }: PricingProps) {
  const { locale, t } = useLandingLocale();
  const p = t.pricing;
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

  const ordered = useMemo(() => {
    const list = PLAN_ORDER.map((name) => plans.find((plan) => plan.name === name)).filter(
      Boolean,
    ) as BillingPlan[];
    return list.map((plan) => ({
      ...plan,
      tagline: p.plans[plan.name].tagline,
      features: p.plans[plan.name].features,
    }));
  }, [plans, p]);

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
            {p.tag}
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            {p.title}
            <span className="text-oma-accent">{p.titleAccent}</span>
            {p.titleEnd}
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            {p.subBefore}
            <span className="font-semibold text-oma-cream">{p.trialDays}</span>
            {p.subAfter}
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
              pricingCopy={p}
              locale={locale}
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
            {p.billingQuestion}{' '}
            <ButtonLink
              variant="link"
              size="sm"
              href="https://wa.me/5573991391471"
              target="_blank"
              rel="noopener noreferrer"
            >
              {p.whatsapp}
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
  pricingCopy,
  locale,
}: {
  plan: BillingPlan;
  variants: Variants;
  isPopular: boolean;
  onSelectPaidPlan?: (planName: PlanName) => void;
  pricingCopy: LandingCopy['pricing'];
  locale: LandingLocale;
}) {
  const isDark = isPopular;
  const sessionsLine = formatSessionAllowance(
    plan,
    locale,
    pricingCopy.sessionUnlimited,
    pricingCopy.sessionPerMonth,
  );

  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={`landing-glass relative flex min-h-[540px] flex-col p-7 text-oma-cream sm:p-8 ${
        isDark ? 'border-white/25 bg-white/[0.08]' : ''
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
              {pricingCopy.popular}
            </span>
          </div>
        </>
      )}

      <div className={isPopular ? 'relative' : ''}>
        <div
          className="text-[11px] font-semibold uppercase tracking-wider text-oma-cream/50"
        >
          {plan.trial_days
            ? pricingCopy.trialFree(plan.trial_days)
            : pricingCopy.customContract}
        </div>
        <h3
          className="mt-2 text-xl font-semibold tracking-tight text-oma-cream"
        >
          {plan.display_name}
        </h3>
        <p className="mt-1 text-sm leading-snug text-oma-cream/60">
          {plan.tagline}
        </p>

        <div className="mt-6 flex flex-col gap-1">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-dm-mono text-4xl font-semibold tracking-tight text-[#5BAF8A]">
              US$ {formatUsd(plan.monthly_price)}
            </span>
            <span className="font-dm-mono text-sm text-[#5BAF8A]/90">{pricingCopy.perMo}</span>
          </div>
          <span className="text-sm leading-snug text-oma-cream/65">
            or US$ {formatUsd(plan.yearly_price)}
            {pricingCopy.perYr}
          </span>
        </div>

        <div
          className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-dm-mono text-[12px] font-medium text-[#5BAF8A]"
        >
          <Check className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{sessionsLine}</span>
        </div>

        <ul className="mt-6 space-y-2.5 flex-1">
          {plan.features.map((feature) => (
            <PricingBullet key={feature} inverted>
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
            {plan.trial_days
              ? pricingCopy.startTrial(plan.trial_days)
              : pricingCopy.talkSales}
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
