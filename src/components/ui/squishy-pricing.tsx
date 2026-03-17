import { motion } from 'framer-motion';
import React from 'react';

const WHATSAPP_LINK = 'https://wa.me/5573991391471';

interface PricingCardProps {
  label: string;
  monthlyPrice: string;
  priceSuffix: string;
  description: string;
  cta: string;
  background: string;
  BGComponent: React.ComponentType;
  onClick?: () => void;
  href?: string;
}

const PricingCard = ({
  label,
  monthlyPrice,
  priceSuffix,
  description,
  cta,
  background,
  BGComponent,
  onClick,
  href,
}: PricingCardProps) => {
  const isLink = !!href;
  const content = (
    <>
      <div className="relative z-10 text-white">
        <span className="mb-3 block w-fit rounded-full bg-white/20 backdrop-blur-sm px-3 py-0.5 text-sm font-medium text-white border border-white/20">
          {label}
        </span>
        <motion.span
          initial={{ scale: 0.85 }}
          variants={{ hover: { scale: 1 } }}
          transition={{ duration: 1, ease: 'backInOut' }}
          className="my-2 block origin-top-left font-mono text-4xl sm:text-6xl font-black leading-[1.2]"
        >
          {monthlyPrice}
          <br />
          {priceSuffix}
        </motion.span>
        <p className="text-sm sm:text-lg text-white/90">{description}</p>
      </div>
      {isLink ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border-2 border-white bg-white py-2 text-center font-mono font-black uppercase text-neutral-800 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/80 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          {cta}
        </a>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border-2 border-white bg-white py-2 text-center font-mono font-black uppercase text-neutral-800 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/80 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
        >
          {cta}
        </button>
      )}
      <BGComponent />
    </>
  );

  return (
    <motion.div
      whileHover="hover"
      transition={{ duration: 1, ease: 'backInOut' }}
      variants={{ hover: { scale: 1.05 } }}
      className={`relative min-h-[384px] h-96 w-full min-w-0 max-w-[320px] sm:w-80 shrink-0 overflow-hidden rounded-xl p-6 sm:p-8 ${background} shadow-lg hover:shadow-xl transition-shadow self-center`}
    >
      {content}
    </motion.div>
  );
};

const BGComponent1 = () => (
  <motion.svg
    width="320"
    height="384"
    viewBox="0 0 320 384"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={{ hover: { scale: 1.5 } }}
    transition={{ duration: 1, ease: 'backInOut' }}
    className="absolute inset-0 z-0"
  >
    <motion.circle
      variants={{ hover: { scaleY: 0.5, y: -25 } }}
      transition={{ duration: 1, ease: 'backInOut', delay: 0.2 }}
      cx="160.5"
      cy="114.5"
      r="101.5"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
    />
    <motion.ellipse
      variants={{ hover: { scaleY: 2.25, y: -25 } }}
      transition={{ duration: 1, ease: 'backInOut', delay: 0.2 }}
      cx="160.5"
      cy="265.5"
      rx="101.5"
      ry="43.5"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
    />
  </motion.svg>
);

const BGComponent2 = () => (
  <motion.svg
    width="320"
    height="384"
    viewBox="0 0 320 384"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={{ hover: { scale: 1.05 } }}
    transition={{ duration: 1, ease: 'backInOut' }}
    className="absolute inset-0 z-0"
  >
    <motion.rect
      x="14"
      width="153"
      height="153"
      rx="15"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
      variants={{ hover: { y: 219, rotate: '90deg', scaleX: 2 } }}
      style={{ y: 12 }}
      transition={{ delay: 0.2, duration: 1, ease: 'backInOut' }}
    />
    <motion.rect
      x="155"
      width="153"
      height="153"
      rx="15"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
      variants={{ hover: { y: 12, rotate: '90deg', scaleX: 2 } }}
      style={{ y: 219 }}
      transition={{ delay: 0.2, duration: 1, ease: 'backInOut' }}
    />
  </motion.svg>
);

const BGComponent3 = () => (
  <motion.svg
    width="320"
    height="384"
    viewBox="0 0 320 384"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    variants={{ hover: { scale: 1.25 } }}
    transition={{ duration: 1, ease: 'backInOut' }}
    className="absolute inset-0 z-0"
  >
    <motion.path
      variants={{ hover: { y: -50 } }}
      transition={{ delay: 0.3, duration: 1, ease: 'backInOut' }}
      d="M148.893 157.531C154.751 151.673 164.249 151.673 170.107 157.531L267.393 254.818C273.251 260.676 273.251 270.173 267.393 276.031L218.75 324.674C186.027 357.397 132.973 357.397 100.25 324.674L51.6068 276.031C45.7489 270.173 45.7489 260.676 51.6068 254.818L148.893 157.531Z"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
    />
    <motion.path
      variants={{ hover: { y: -50 } }}
      transition={{ delay: 0.2, duration: 1, ease: 'backInOut' }}
      d="M148.893 99.069C154.751 93.2111 164.249 93.2111 170.107 99.069L267.393 196.356C273.251 202.213 273.251 211.711 267.393 217.569L218.75 266.212C186.027 298.935 132.973 298.935 100.25 266.212L51.6068 217.569C45.7489 211.711 45.7489 202.213 51.6068 196.356L148.893 99.069Z"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
    />
    <motion.path
      variants={{ hover: { y: -50 } }}
      transition={{ delay: 0.1, duration: 1, ease: 'backInOut' }}
      d="M148.893 40.6066C154.751 34.7487 164.249 34.7487 170.107 40.6066L267.393 137.893C273.251 143.751 273.251 153.249 267.393 159.106L218.75 207.75C186.027 240.473 132.973 240.473 100.25 207.75L51.6068 159.106C45.7489 153.249 45.7489 143.751 51.6068 137.893L148.893 40.6066Z"
      fill="rgba(0, 0, 0, 0.2)"
      className="dark:fill-white/10"
    />
  </motion.svg>
);

export type LandingLocale = 'pt' | 'en' | 'es';

interface SquishyPricingProps {
  locale?: LandingLocale;
  onSelectPlan?: (planId: string) => void;
}

const pricingByLocale: Record<
  LandingLocale,
  Array<{
    label: string;
    monthlyPrice: string;
    priceSuffix: string;
    description: string;
    cta: string;
    planId: string;
    isExternal: boolean;
  }>
> = {
  pt: [
    {
      label: 'On-demand',
      monthlyPrice: 'R$ 0',
      priceSuffix: '/mês',
      description: 'Grátis para instalar. 50 imagens gratuitas (uma vez) + US$ 0,18 por imagem adicional.',
      cta: 'Começar grátis',
      planId: 'free',
      isExternal: false,
    },
    {
      label: 'Pro',
      monthlyPrice: 'US$ 300',
      priceSuffix: '/mês',
      description: 'US$ 300/mês com 3.000 imagens incluídas. Imagens adicionais a US$ 0,08.',
      cta: 'Assinar',
      planId: 'pro',
      isExternal: false,
    },
    {
      label: 'Enterprise',
      monthlyPrice: 'Custom',
      priceSuffix: '',
      description: 'Para grandes volumes e necessidades específicas. Fale com nosso time.',
      cta: 'Falar com Especialista',
      planId: 'enterprise',
      isExternal: true,
    },
  ],
  en: [
    {
      label: 'On-demand',
      monthlyPrice: '$0',
      priceSuffix: '/month',
      description: 'Free to install. 50 free images (one-time) + $0.18 per additional image.',
      cta: 'Get started',
      planId: 'free',
      isExternal: false,
    },
    {
      label: 'Pro',
      monthlyPrice: '$300',
      priceSuffix: '/month',
      description: '$300/month with 3,000 images included. Additional images at $0.08 each.',
      cta: 'Subscribe',
      planId: 'pro',
      isExternal: false,
    },
    {
      label: 'Enterprise',
      monthlyPrice: 'Custom',
      priceSuffix: '',
      description: 'For high volume and specific needs. Talk to our team.',
      cta: 'Talk to Specialist',
      planId: 'enterprise',
      isExternal: true,
    },
  ],
  es: [
    {
      label: 'On-demand',
      monthlyPrice: 'US$ 0',
      priceSuffix: '/mes',
      description: 'Gratis para instalar. 50 imagenes gratuitas (una vez) + US$ 0,18 por imagen adicional.',
      cta: 'Comenzar gratis',
      planId: 'free',
      isExternal: false,
    },
    {
      label: 'Pro',
      monthlyPrice: 'US$ 300',
      priceSuffix: '/mes',
      description: 'US$ 300/mes con 3.000 imagenes incluidas. Imagenes adicionales a US$ 0,08.',
      cta: 'Suscribirse',
      planId: 'pro',
      isExternal: false,
    },
    {
      label: 'Enterprise',
      monthlyPrice: 'Custom',
      priceSuffix: '',
      description: 'Para grandes volúmenes y necesidades específicas. Habla con nuestro equipo.',
      cta: 'Hablar con Especialista',
      planId: 'enterprise',
      isExternal: true,
    },
  ],
};

const backgrounds = [
  'bg-[#810707]',
  'bg-[#a00909]',
  'bg-[#6b0505]',
];

const bgComponents = [BGComponent1, BGComponent2, BGComponent3];

export function SquishyPricing({ locale = 'pt', onSelectPlan }: SquishyPricingProps) {
  const plans = pricingByLocale[locale] || pricingByLocale.pt;

  return (
    <section className="bg-white px-4 py-12 min-h-[500px] transition-colors">
      <div className="mx-auto flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:w-fit">
        {plans.map((plan, index) => (
          <PricingCard
            key={plan.planId}
            label={plan.label}
            monthlyPrice={plan.monthlyPrice}
            priceSuffix={plan.priceSuffix}
            description={plan.description}
            cta={plan.cta}
            background={backgrounds[index]}
            BGComponent={bgComponents[index]}
            onClick={plan.isExternal ? undefined : () => onSelectPlan?.(plan.planId)}
            href={plan.isExternal ? WHATSAPP_LINK : undefined}
          />
        ))}
      </div>
    </section>
  );
}
