import type { BlogCopy } from './blog-copy';
import type { ContactCopy } from './contact-copy';
import type { PartnersCopy } from './partners-copy';

export type LandingLocale = 'pt' | 'en' | 'es';

export type LandingFeature = {
  title: string;
  description: string;
  bullets: string[];
  accent?: boolean;
};

export type LandingFaq = { q: string; a: string };

export type LandingHeroSlide = {
  id: string;
  badge: string;
  titleKind: 'intro' | 'mediapipe' | 'aov';
  titleBefore: string;
  titleHighlight: string;
  titleAfter: string;
  body: string;
  hideBadge?: boolean;
  topScrim?: boolean;
  compact?: boolean;
  showCtas?: boolean;
  subtleOverlay?: boolean;
  imageObjectPosition?: 'center' | 'top';
};

export type PlanName = 'growth' | 'pro' | 'scale' | 'enterprise';

export type LandingPlanCopy = {
  tagline: string;
  features: string[];
};

export type LandingCopy = {
  htmlLang: string;
  ogLocale: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  nav: {
    solution: string;
    features: string;
    pricing: string;
    faq: string;
    blog: string;
    partners: string;
    install: string;
  };
  lang: {
    label: string;
    pt: string;
    en: string;
    es: string;
  };
  hero: {
    slides: LandingHeroSlide[];
    install: string;
    demo: string;
    slideAria: (n: number) => string;
    marquee: string[];
  };
  pain: {
    tag: string;
    title: string;
    titleMuted: string;
    body: string;
    close: string;
  };
  how: {
    tag: string;
    title: string;
    lead: string;
    steps: { title: string; body: string }[];
  };
  solution: {
    tag: string;
    title: string;
    titleAccent: string;
    titleEnd: string;
    sub: string;
    highlight: string;
    featureBadge: string;
    features: LandingFeature[];
  };
  impact: {
    tag: string;
    title: string;
    stat1Prefix: string;
    stat1Suffix: string;
    stat1Sub: string;
    stat2Prefix: string;
    stat2Suffix: string;
    stat2Sub: string;
    stat3Prefix: string;
    stat3Suffix: string;
    stat3Sub: string;
    disclaimer: string;
  };
  insights: {
    title: string;
    lead: string;
    exampleNote: string;
    averagesTitle: string;
    averages: { label: string; value: string }[];
    sizeChartTitle: string;
    sizeChartName: string;
    sizes: { label: string; share: number }[];
    tableTitle: string;
    colGarment: string;
    colTries: string;
    colSize: string;
    rows: { garment: string; tries: string; size: string }[];
    cta: string;
  };
  pricing: {
    tag: string;
    title: string;
    titleAccent: string;
    titleEnd: string;
    subBefore: string;
    trialDays: string;
    subAfter: string;
    popular: string;
    trialFree: (days: number) => string;
    customContract: string;
    perMo: string;
    perYr: string;
    sessionUnlimited: string;
    sessionPerMonth: (n: string) => string;
    startTrial: (days: number) => string;
    talkSales: string;
    billingQuestion: string;
    whatsapp: string;
    plans: Record<PlanName, LandingPlanCopy>;
  };
  faq: {
    tag: string;
    title: string;
    sub: string;
    items: LandingFaq[];
  };
  footer: {
    blurb: string;
    product: string;
    support: string;
    company: string;
    solution: string;
    features: string;
    pricing: string;
    shopifyApp: string;
    faq: string;
    contact: string;
    blog: string;
    partners: string;
    privacy: string;
    terms: string;
    rights: string;
    madeIn: string;
    homeAria: string;
    instagramAria: string;
  };
  installModal: {
    title: string;
    subtitle: string;
    close: string;
    shopify: string;
    shopifyHint: string;
    nuvemSoon: string;
  };
  demoEmail: {
    subject: string;
    body: string;
  };
  contact: ContactCopy;
  blog: BlogCopy;
  partners: PartnersCopy;
};