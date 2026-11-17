import type { LandingCopy } from './types';

export const en: LandingCopy = {
  htmlLang: 'en',
  ogLocale: 'en_US',
  seo: {
    title: 'Omafit — AI fashion assistant for Shopify | Try-on, sizing & AR',
    description:
      'Cut returns and lift conversion with photorealistic try-on, MediaPipe sizing, AR for accessories, and a Shopify widget. Plans from US$ 99/mo.',
    keywords:
      'Omafit, Shopify, virtual try-on, AI try-on, fashion e-commerce, reduce returns, MediaPipe, AR eyewear, Shopify widget',
  },
  nav: {
    solution: 'Solution',
    features: 'Features',
    pricing: 'Pricing',
    faq: 'FAQ',
    blog: 'Blog',
    partners: 'Partners',
    install: 'Install',
  },
  lang: { label: 'Language', pt: 'Português', en: 'English', es: 'Español' },
  hero: {
    slides: [
      {
        id: 'intro',
        badge: 'Omafit',
        titleKind: 'intro',
        titleBefore: 'End size returns. Start real ',
        titleHighlight: 'confidence',
        titleAfter: ' in online fashion.',
        body:
          'Omafit is the intelligent assistant that uses photorealistic AI and precise measurement for the right fit in apparel, footwear, and accessories. Cut costs, grow sales, and delight shoppers.',
        hideBadge: true,
        compact: true,
        showCtas: true,
        subtleOverlay: true,
      },
      {
        id: 'fit',
        badge: 'Precise sizing',
        titleKind: 'mediapipe',
        titleBefore: 'The right fit with ',
        titleHighlight: 'MediaPipe',
        titleAfter: '.',
        body: 'Our body-detection technology analyzes your shopper and recommends the ideal size.',
        topScrim: true,
        imageObjectPosition: 'top',
      },
      {
        id: 'chat-aov',
        badge: 'Built-in chat',
        titleKind: 'aov',
        titleBefore: 'A style advisor that raises ',
        titleHighlight: 'average order value',
        titleAfter: '.',
        body:
          'When a shopper tries a product, Omafit acts as a consultant and suggests complementary pieces to grow your AOV.',
        topScrim: true,
      },
    ],
    install: 'Install',
    demo: 'Book a personalized demo',
    slideAria: (n) => `Go to slide ${n}`,
    marquee: [
      'Shopify',
      'AI try-on',
      'MediaPipe',
      'WebAR',
      'Fewer returns',
      'Higher conversion',
      'White-label widget',
      'ChatGPT',
      'Apparel & footwear',
      'AR accessories',
    ],
  },
  pain: {
    tag: 'The problem',
    title: 'Your store looks great.',
    titleMuted: 'But you still bleed margin for these reasons.',
    body:
      'Returns for wrong size or unwanted fit keep eating margin: reverse shipping, refunds, and stock back on the shelf raise cost—and the customer may never buy again. At checkout, fit doubt is a top reason for abandonment. Without purchase confidence, carts stall and the traffic you paid for never turns into steady revenue.',
  },
  solution: {
    tag: 'The solution',
    title: 'Omafit: intelligence that turns ',
    titleAccent: 'doubt into confidence',
    titleEnd: ' and sales.',
    sub: 'A full visual AI suite for apparel, accessories, and footwear. Fast, easy install on your store.',
    highlight: 'Highlight',
    featureBadge: 'Feature',
    features: [
      {
        title: 'Precise sizing with MediaPipe',
        description:
          'Real-time analysis of 50+ body landmarks on the shopper’s phone. No measuring tape, no guesswork.',
        bullets: ['98% recommendation accuracy', '<10s capture', 'Runs 100% on-device'],
        accent: true,
      },
      {
        title: 'Photorealistic try-on (apparel & footwear)',
        description:
          'Generative AI renders the garment on the shopper with realistic shading, fabric, and drape. They see it before they buy.',
        bullets: ["Women's and men's apparel", 'Footwear and accessories in one flow', 'Photographic quality'],
      },
      {
        title: 'AR preview (glasses & accessories)',
        description:
          'In-browser augmented reality for glasses, bracelets, watches, and more. Zero friction, all live.',
        bullets: ['WebAR—no app install', 'Real-time face tracking', 'iOS and Android compatible'],
      },
      {
        title: 'Built-in ChatGPT assistant',
        description:
          'A 24/7 style advisor that knows your catalog, answers questions, and suggests outfits.',
        bullets: ['Knows your catalog', 'Suggests full looks', 'Speaks in your brand voice'],
      },
      {
        title: 'Analytics & ROI',
        description:
          'Dashboards that tie widget usage to business outcomes: ROI models and aggregated shopper insights—always anonymized.',
        bullets: [
          'ROI models for conversion, AOV, and returns',
          'Average height, weight, and body-type insights',
          'Engagement funnel and try-on sessions',
        ],
      },
      {
        title: 'Customizable widget',
        description:
          'Colors, fonts, layout, and copy aligned with your brand. Feels native to your store—not bolted on.',
        bullets: ['100% white-label', 'Install in minutes', 'Mobile-first'],
      },
    ],
  },
  impact: {
    tag: 'Omafit data',
    title: 'Results brands like yours see in day-to-day operations.',
    stat1Prefix: 'Up to ',
    stat1Suffix: ' fewer returns',
    stat1Sub: 'Less reverse logistics, more margin, and customers who buy again with confidence.',
    stat2Prefix: 'Shoppers who use Omafit are ',
    stat2Suffix: ' more likely to buy',
    stat2Sub: 'Guided sizing and visualization that unlocks checkout.',
    stat3Prefix: 'Cart abandonment ',
    stat3Suffix: ' lower',
    stat3Sub: 'Less doubt on size and look—more completed checkouts.',
    disclaimer:
      'Aggregated metrics from Omafit-powered stores; your results may vary by catalog, traffic, and category.',
  },
  pricing: {
    tag: 'Transparent pricing',
    title: 'Choose the plan that ',
    titleAccent: 'fuels',
    titleEnd: ' your growth.',
    subBefore: 'Monthly or annual billing. Growth, Pro, and Scale include a ',
    trialDays: '14-day trial',
    subAfter: '. Session bundles include sizing, photorealistic try-on, and AI stylist tools.',
    popular: 'Popular',
    trialFree: (d) => `${d}-day free trial`,
    customContract: 'Custom contract',
    perMo: '/mo',
    perYr: '/yr',
    sessionUnlimited: 'Unlimited try-on sessions',
    sessionPerMonth: (n) => `${n} try-on sessions/month`,
    startTrial: (d) => `Start ${d}-day trial`,
    talkSales: 'Talk to sales',
    billingQuestion: 'Questions about billing or volume?',
    whatsapp: 'Chat with us on WhatsApp',
    plans: {
      growth: {
        tagline: 'For brands getting started with virtual try-on at steady volume.',
        features: [
          '1,000 try-on sessions/month',
          'Personalized size recommendations',
          'AI-powered shopping assistant',
          'Customizable widget design',
          'Extra try-ons at $0.12 each',
        ],
      },
      pro: {
        tagline: 'Predictable volume and full styling tools for growing stores.',
        features: [
          '5,000 try-on sessions/month',
          'Personalized size recommendations',
          'AI Stylist and outfit recommendations',
          'Customizable widget design',
          'Extra try-ons at $0.08 each',
        ],
      },
      scale: {
        tagline: 'High session caps, analytics, and styling for serious catalogs.',
        features: [
          '15,000 try-on sessions/month',
          'Fully customizable widget',
          'AI Stylist and outfit recommendations',
          'Analytics and shopper insights',
          'Extra try-ons at $0.04 each',
        ],
      },
      enterprise: {
        tagline: 'Unlimited try-on and white-glove support for large operations.',
        features: [
          'Unlimited try-on sessions',
          'Fully customizable widget',
          'AI Stylist and outfit recommendations',
          'Dedicated support',
          'Analytics and shopper insights',
        ],
      },
    },
  },
  faq: {
    tag: 'Questions answered',
    title: 'Frequently asked questions.',
    sub: 'Everything you need to know about install, security, integration, and support.',
    items: [
      {
        q: 'How long does it take to install Omafit on my Shopify store?',
        a: 'Installation takes a few clicks from the Shopify App Store—typically under 5 minutes. After install, the widget appears on configured product pages and you can adjust colors, fonts, and placement in the admin.',
      },
      {
        q: 'Which platforms does Omafit support?',
        a: 'We offer native Shopify integration today. Nuvemshop, WooCommerce, and Yampi are on the roadmap. For custom integrations (ERP, headless, mobile apps), our Enterprise team can help on request.',
      },
      {
        q: 'How do you handle customer privacy and data security?',
        a: 'We are LGPD and GDPR aligned. MediaPipe capture runs on the shopper’s device when possible—no raw images leave their browser without explicit consent. We store only anonymized metrics and data required to operate.',
      },
      {
        q: 'Does the AI work for all apparel and product types?',
        a: 'Yes. Our try-on model covers women’s and men’s apparel, footwear, and AR accessories (glasses, caps, watches). For very specific categories, we can train a dedicated fine-tune for your brand.',
      },
      {
        q: 'How does per-image billing work?',
        a: 'Shopify app install is free. Growth: US$ 99/mo — 1,000 sessions/mo. Pro: US$ 399/mo — 5,000 sessions. Scale: US$ 999/mo — 15,000 sessions. Enterprise: US$ 2,499/mo — unlimited. Growth, Pro, and Scale include a 14-day trial.',
      },
      {
        q: 'Will Omafit slow down my store?',
        a: 'The widget is lazy-loaded and the initial bundle is under 50KB. Capture and processing start only when the shopper clicks “Try on”. Store performance stays intact.',
      },
      {
        q: 'What support do I get after install?',
        a: 'All plans include docs, tutorials, and email support. Pro and Scale add guided onboarding. Enterprise includes dedicated support and a custom SLA.',
      },
      {
        q: 'Can I customize the widget to match my brand?',
        a: 'Fully. Colors, fonts, layout, copy, button text, icons, and placement are configurable. No visible “Powered by Omafit” for end customers.',
      },
    ],
  },
  footer: {
    blurb:
      'Photorealistic AI assistant for apparel, footwear, and accessories. Precise sizing, realistic try-on, fewer returns.',
    product: 'Product',
    support: 'Support',
    company: 'Company',
    solution: 'Solution',
    features: 'Features',
    pricing: 'Pricing',
    shopifyApp: 'Shopify App',
    faq: 'FAQ',
    contact: 'Contact',
    blog: 'Blog',
    partners: 'Partners',
    privacy: 'Privacy',
    terms: 'Terms',
    rights: 'All rights reserved.',
    madeIn: 'Built with care in São Paulo, Brazil',
    homeAria: 'Omafit — home',
    instagramAria: 'Omafit on Instagram',
  },
  installModal: {
    title: 'Install Omafit',
    subtitle: 'Choose your platform',
    close: 'Close',
    shopify: 'Shopify',
    shopifyHint: 'Install from the App Store',
    nuvemSoon: 'Nuvemshop — coming soon',
  },
  demoEmail: {
    subject: 'Personalized Omafit demo',
    body:
      'Hi, I would like to schedule a personalized Omafit demo for my store.\n\nStore name:\nCategory (apparel / footwear / accessories):\nEstimated monthly volume:\nBest time for a call:',
  },
};