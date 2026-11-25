import type { LandingCopy } from './types';

export const en: LandingCopy = {
  htmlLang: 'en',
  ogLocale: 'en_US',
  seo: {
    title: 'Omafit — AI fashion assistant for e-commerce | Sizing & try-on',
    description:
      'Omafit is the AI assistant on your product pages: precise sizing, photorealistic try-on, and style guidance in one embeddable widget. We implement on any fashion store. From US$ 99/mo.',
    keywords:
      'Omafit, fashion e-commerce, virtual try-on, AI try-on, size recommendation, online store, reduce returns, MediaPipe, storefront widget, AI stylist',
  },
  nav: {
    solution: 'Solution',
    features: 'Features',
    pricing: 'Shoppers',
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
          'Omafit is the AI shopping assistant on your store’s product pages. It answers “What size am I?”, “How will this look on me?”, and “What goes with this?”—so people buy with confidence and return less. We can implement on any online store.',
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
      'Fashion e-commerce',
      'AI try-on',
      'MediaPipe sizing',
      'On your PDP',
      'Fewer returns',
      'Higher conversion',
      'White-label widget',
      'AI stylist',
      'Apparel & footwear',
      'Any fashion store',
    ],
  },
  pain: {
    tag: 'The problem',
    title: 'Your brand invests to sell.',
    titleMuted: 'Size doubt can undermine the result.',
    body:
      'When a shopper does not know which size to choose or how the piece will fit, the purchase may never happen. And when the item misses the expectation, the return eats margin through reverse logistics, refunds, and stock that cannot be sold again.',
    close:
      'Omafit helps your brand reduce uncertainty in the purchase journey — more confidence to choose, and more chances to convert.',
  },
  how: {
    tag: 'How it works',
    title: 'From size to checkout, in one place.',
    lead:
      'Omafit lives on your store’s product page. Shoppers do not download an app and do not leave your site. In the same flow they get a size, see the item on their body, and get pairings from your catalog — then they decide to buy.',
    steps: [
      {
        title: 'Starts on the product page',
        body: 'The Omafit try-on appears on the product page, styled with your brand. The shopper chooses when to try something on.',
      },
      {
        title: 'Finds the right size',
        body: 'With a quick phone capture, Omafit reads the shopper’s measurements and recommends the best size for that item — no tape measure and no trial and error.',
      },
      {
        title: 'Sees the look',
        body: 'AI creates a realistic preview of the garment on the shopper, so they feel more confident before they buy.',
      },
      {
        title: 'Discovers pairings',
        body: 'The assistant understands your catalog and suggests pieces that go with what the shopper chose — relevant recommendations that can complete the order.',
      },
    ],
  },
  solution: {
    tag: 'The solution',
    title: 'Omafit: intelligence that turns ',
    titleAccent: 'doubt into confidence',
    titleEnd: ' and sales.',
    sub:
      'One assistant for fashion e-commerce: size confidence, photorealistic try-on, and catalog-aware styling—on your product pages, fully on brand. We implement Omafit on any store, from ready-made platforms to custom stacks.',
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
        bullets: ["Women's and men's apparel", 'Footwear in the same flow', 'Photographic quality on mobile'],
      },
      {
        title: 'One flow on the product page',
        description:
          'Omafit sits where the decision is made—the PDP. Shoppers move from size to try-on to styling without extra apps or redirects; you keep them on your store.',
        bullets: ['Embeddable store widget', 'Mobile-first journey', 'White-label, on-brand UX'],
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
        bullets: ['100% white-label', 'Deploy on any store', 'Mobile-first'],
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
  insights: {
    title: 'Learn who shops your brand.',
    lead:
      'Every try-on becomes a signal. Omafit shows who uses the fitting room: body, garments, and sizes — so the brand can plan assortment, size runs, and stock with fewer guesses.',
    exampleNote: 'Sample figures, in the shape a brand sees in the dashboard.',
    averagesTitle: 'Average profile of people who try on',
    averages: [
      { label: 'Average height', value: '1.68 m' },
      { label: 'Average weight', value: '64 kg' },
      { label: 'Most common body type', value: 'Hourglass · 34%' },
    ],
    sizeChartTitle: 'Size chosen most often',
    sizeChartName: 'Share of accepted recommendations',
    sizes: [
      { label: 'XS', share: 8 },
      { label: 'S', share: 18 },
      { label: 'M', share: 41 },
      { label: 'L', share: 23 },
      { label: 'XL', share: 10 },
    ],
    tableTitle: 'Garments tried on most',
    colGarment: 'Garment',
    colTries: 'Try-ons',
    colSize: 'Size chosen most',
    rows: [
      { garment: 'Midi dress', tries: '1,280', size: 'M' },
      { garment: 'Straight trousers', tries: '980', size: '38' },
      { garment: 'Oversized shirt', tries: '860', size: 'L' },
      { garment: 'Casual sneaker', tries: '640', size: '37' },
    ],
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
        q: 'How long does it take to install Omafit on my store?',
        a: 'Usually under 5 minutes. Add Omafit to your e-commerce stack, enable it on product pages, and customize colors, fonts, and placement from your admin.',
      },
      {
        q: 'Which platforms does Omafit support?',
        a: 'We implement Omafit on any fashion store—SaaS, marketplace, or headless. Ready connectors cover the most common stacks; Nuvemshop, WooCommerce, Yampi, and others are on the roadmap. For ERP, native apps, or fully custom setups, Enterprise can scope your integration.',
      },
      {
        q: 'How do you handle customer privacy and data security?',
        a: 'We are LGPD and GDPR aligned. MediaPipe capture runs on the shopper’s device when possible—no raw images leave their browser without explicit consent. We store only anonymized metrics and data required to operate.',
      },
      {
        q: 'Does the AI work for all apparel and product types?',
        a: 'Yes. Omafit covers women’s and men’s apparel and footwear, with sizing and try-on tuned for fashion PDPs. For niche catalogs or private labels, our team can discuss custom fine-tuning.',
      },
      {
        q: 'How does per-image billing work?',
        a: 'Getting started is free on supported platforms. Growth: US$ 99/mo — 1,000 sessions/mo. Pro: US$ 399/mo — 5,000 sessions. Scale: US$ 999/mo — 15,000 sessions. Enterprise: custom pricing, unlimited sessions. Growth, Pro, and Scale include a 14-day trial.',
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
      'The AI assistant for fashion e-commerce: sizing, try-on, and style guidance on your product pages—fewer returns, more confident buyers.',
    product: 'Product',
    support: 'Support',
    company: 'Company',
    solution: 'Solution',
    features: 'Features',
    pricing: 'Shoppers',
    shopifyApp: 'Install the widget',
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
    subtitle: 'We implement on any store. Start here:',
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
