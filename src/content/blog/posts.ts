import type { BlogPost } from './types';

export const blogPosts: BlogPost[] = [
  {
    slug: 'virtual-try-on-shopify-reduce-returns',
    title: 'Virtual try-on on Shopify: how to cut size-related returns',
    description:
      'A practical guide for Shopify brands: why fit returns happen, how AI virtual try-on builds PDP confidence, and what to measure before and after installing a try-on widget.',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-10',
    keywords: [
      'virtual try-on Shopify',
      'reduce e-commerce returns',
      'virtual fitting room',
      'apparel sizing online',
      'PDP conversion',
      'Omafit',
    ],
    readingTimeMinutes: 8,
    blocks: [
      {
        type: 'p',
        text: 'Size-related returns are one of the hidden costs of online fashion. Shoppers buy unsure, try at home, and send items back. Every cycle burns logistics, inventory, and margin—and hurts the next visit.',
      },
      {
        type: 'h2',
        text: 'Why the PDP alone does not fix sizing doubt',
      },
      {
        type: 'p',
        text: 'Size charts, model photos, and reviews help, but they do not answer the emotional question: “How will this look on me?” Without a visual answer, buyers pick the “safe” size (often larger), return more, or abandon checkout.',
      },
      {
        type: 'ul',
        items: [
          'Visual uncertainty: the garment on a model is not the customer’s body.',
          'Sizing friction: long forms on every visit push shoppers away.',
          'Low instant trust: without try-on, decisions slip to later—or to another store.',
        ],
      },
      {
        type: 'h2',
        text: 'What virtual try-on means for fashion e-commerce',
      },
      {
        type: 'p',
        text: 'Virtual try-on blends the shopper’s photo (or estimated silhouette) with your product image to generate a photorealistic preview on the product page. On Shopify, that happens in the purchase context—no extra consumer app.',
      },
      {
        type: 'p',
        text: 'Mature stacks also pair try-on with size recommendation (body measurement or shopper history) so fit and appearance land in one session.',
      },
      {
        type: 'h2',
        text: 'Metrics that matter before you pick a fitting-room vendor',
      },
      {
        type: 'ul',
        items: [
          'Return rate with reason “size” or “did not fit”.',
          'PDP conversion with vs without a try-on session.',
          'Time on page and add-to-cart rate after the widget.',
          'Cost per return (reverse logistics + reprocessing).',
        ],
      },
      {
        type: 'h2',
        text: 'How to implement on Shopify without rebuilding your theme',
      },
      {
        type: 'p',
        text: 'The fastest path is a white-label app/widget: install on the store, button on the PDP, cloud image processing with a clear privacy policy. Omafit follows that model—free entry on the Shopify App Store and paid tiers by image volume.',
      },
      {
        type: 'cta',
        title: 'Try Omafit on your store',
        text: 'Free Shopify install. Photorealistic try-on, sizing, and a configurable PDP widget.',
        href: 'https://apps.shopify.com/omafit',
        label: 'Open on Shopify App Store',
        external: true,
      },
    ],
    faqs: [
      {
        question: 'Does virtual try-on actually reduce returns?',
        answer:
          'In apparel, many returns come from wrong fit expectations. Photorealistic try-on plus size recommendation tends to align expectations before payment. Exact impact depends on category and vendor quality—measure size-related returns before and after.',
      },
      {
        question: 'Do I need a developer to install on Shopify?',
        answer:
          'Not necessarily. Apps like Omafit offer guided install and theme blocks. Advanced layout tweaks may need your theme team, but the basic PDP flow is plug-and-play.',
      },
      {
        question: 'Does the customer need an account?',
        answer:
          'That’s up to your store. Ideal: try-on as a guest, optional saved measurements for repeat visits—less friction on the next purchase.',
      },
    ],
  },
  {
    slug: 'body-measurement-mediapipe-ecommerce',
    title: 'Body measurement in e-commerce: MediaPipe, privacy, and the right size',
    description:
      'How in-browser computer vision (MediaPipe) estimates measurements, what that changes for size choice, and privacy best practices for Shopify stores.',
    publishedAt: '2026-03-05',
    updatedAt: '2026-03-05',
    keywords: [
      'MediaPipe e-commerce',
      'online body measurement',
      'apparel size recommendation',
      'AI sizing',
      'try-on privacy',
    ],
    readingTimeMinutes: 7,
    blocks: [
      {
        type: 'p',
        text: 'Asking for height, weight, and three measurements in a cold PDP form converts poorly. Flows that use the device camera—with on-device processing—deliver useful estimates in seconds with less drop-off.',
      },
      {
        type: 'h2',
        text: 'What MediaPipe does in a fashion context',
      },
      {
        type: 'p',
        text: 'MediaPipe Pose detects body landmarks in real time in the browser. With calibration, those points become proportion estimates that feed size engines and try-on alignment. Processing can stay on-device without sending raw video to servers.',
      },
      {
        type: 'h2',
        text: 'Privacy: what to tell shoppers',
      },
      {
        type: 'ul',
        items: [
          'Clarify whether images are session-only or stored.',
          'Offer deletion and link to your privacy policy.',
          'Avoid collecting more data than the category needs.',
        ],
      },
      {
        type: 'h2',
        text: 'Combine measurement + visual try-on',
      },
      {
        type: 'p',
        text: 'A mannequin size alone rarely closes premium fashion sales. “Suggested size + how it looks on you” answers rational and emotional needs on one screen—that’s Omafit’s core PDP story.',
      },
      {
        type: 'cta',
        title: 'Sizing + try-on in one widget',
        text: 'On-device MediaPipe, per-store shopper profiles, and photorealistic try-on for Shopify.',
        href: '/',
        label: 'Explore Omafit',
      },
    ],
    faqs: [
      {
        question: 'Does camera measurement work on every phone?',
        answer:
          'Most modern smartphones with an up-to-date browser support it. Stores should offer fallbacks (size chart or manual size) when camera access is denied.',
      },
      {
        question: 'Does this replace the brand size chart?',
        answer:
          'No—it complements it. AI maps estimated measurements to your grading to suggest a SKU; the chart remains for shoppers who prefer a tape measure.',
      },
    ],
  },
  {
    slug: 'ar-accessories-ecommerce-glasses-jewelry',
    title: 'AR for accessories in e-commerce: glasses, jewelry, and watches on the web',
    description:
      'Why categories without “apparel sizes” still need a fitting experience: in-browser augmented reality, use cases for eyewear and jewelry, and Shopify integration.',
    publishedAt: '2026-02-28',
    updatedAt: '2026-02-28',
    keywords: [
      'AR e-commerce',
      'online glasses try-on',
      'virtual try-on jewelry',
      'WebAR Shopify',
      'fashion accessories',
    ],
    readingTimeMinutes: 6,
    blocks: [
      {
        type: 'p',
        text: 'Apparel owns the returns conversation, but eyewear, jewelry, and watches have a different problem: shoppers cannot judge scale, placement, and style on face or wrist from product photos alone.',
      },
      {
        type: 'h2',
        text: 'WebAR vs native apps',
      },
      {
        type: 'p',
        text: 'WebAR removes app downloads: the shopper enables the camera on the PDP and sees the accessory anchored on face or body. On Shopify, that means less friction than sending people to another property.',
      },
      {
        type: 'h2',
        text: 'Where AR drives the most value',
      },
      {
        type: 'ul',
        items: [
          'Glasses and sunglasses: frame width vs pupillary distance.',
          'Necklaces and earrings: length and anchor point.',
          'Watches: case diameter on a real wrist.',
        ],
      },
      {
        type: 'p',
        text: 'Omafit includes an AR track for accessories beyond apparel try-on—useful for multi-category or adjacent verticals.',
      },
      {
        type: 'cta',
        title: 'See AR + try-on in action',
        text: 'One widget for apparel, footwear, and accessories on your Shopify store.',
        href: 'https://apps.shopify.com/omafit',
        label: 'Install on Shopify',
        external: true,
      },
    ],
    faqs: [
      {
        question: 'Is in-browser AR stable enough to sell?',
        answer:
          'For purchase preview, yes—when calibrated per category and tested on your audience’s devices. It does not replace in-person try-on in ultra-luxury, but it reduces doubt for most tickets.',
      },
    ],
  },
  {
    slug: 'ai-virtual-fitting-room-guide',
    title: 'AI virtual fitting room: what it is, how it works, and when it pays off',
    description:
      'A clear definition of AI virtual try-on, how it differs from social filters, technical requirements, and a checklist for Shopify merchants.',
    publishedAt: '2026-02-20',
    updatedAt: '2026-02-20',
    keywords: [
      'AI virtual fitting room',
      'virtual try-on artificial intelligence',
      'fashion e-commerce',
      'Shopify fashion',
      'generative AI fashion',
    ],
    readingTimeMinutes: 9,
    blocks: [
      {
        type: 'h2',
        text: 'Definition in one sentence',
      },
      {
        type: 'p',
        text: 'An AI virtual fitting room generates or composites the shopper wearing your real SKU using vision and generative models tuned for fabric, color, and drape fidelity—not a generic game avatar.',
      },
      {
        type: 'h2',
        text: 'Typical flow',
      },
      {
        type: 'ul',
        items: [
          'Shopper uploads a photo or uses the camera on the PDP.',
          'The system normalizes pose, lighting, and crop.',
          'AI composites the catalog SKU onto the body.',
          'Optional: size engine suggests a variant.',
          'Shopper adds to cart with more confidence.',
        ],
      },
      {
        type: 'h2',
        text: 'Checklist for evaluating vendors',
      },
      {
        type: 'ul',
        items: [
          'Native or simple Shopify integration.',
          'Image retention policy and GDPR compliance.',
          'Quality on real catalog photos—not only mockups.',
          'Usage metrics and conversion attribution.',
          'Predictable cost per image volume.',
        ],
      },
      {
        type: 'h2',
        text: 'GEO and SEO: why clear content matters',
      },
      {
        type: 'p',
        text: 'Traditional search and AI assistants cite brands that explain terms precisely, with dates and structured FAQs. A content hub on your domain (like this blog) reinforces authority on “virtual fitting room”, “Shopify”, and “reduce returns”—when each article matches real merchant intent.',
      },
      {
        type: 'cta',
        title: 'Next step',
        text: 'If you run fashion on Shopify, start with the free app and measure PDP conversion for four weeks.',
        href: '/',
        label: 'Go to Omafit landing',
      },
    ],
    faqs: [
      {
        question: 'Is AI virtual try-on the same as an Instagram filter?',
        answer:
          'No. Social filters prioritize entertainment; retail try-on must represent your store’s real SKU and tie into inventory and variants.',
      },
      {
        question: 'How long until we see results?',
        answer:
          'Stores often see early PDP engagement signals within weeks; return impact needs a full delivery and return cycle—typically one to two quarters of data.',
      },
      {
        question: 'Is Omafit apparel-only?',
        answer:
          'No. There is support for footwear, photorealistic apparel try-on, and AR for accessories—with a Shopify-first focus.',
      },
    ],
  },
  {
    slug: 'footwear-virtual-try-on-shopify',
    title: 'Footwear virtual try-on on Shopify: fit doubt without a fitting room',
    description:
      'Why shoe returns hurt margin, how photorealistic foot and outfit try-on changes PDP behavior, and what footwear brands should measure on Shopify.',
    publishedAt: '2026-11-01',
    updatedAt: '2026-11-01',
    keywords: [
      'footwear virtual try-on',
      'shoe try-on Shopify',
      'online shoe fit',
      'fashion returns footwear',
      'Omafit shoes',
    ],
    readingTimeMinutes: 7,
    blocks: [
      {
        type: 'p',
        text: 'Footwear shoppers worry about silhouette, color in daylight, and whether the size chart matches how they lace up at home. One product photo rarely settles that—so brands absorb returns for “too narrow”, “color off”, or “looks different in person”.',
      },
      {
        type: 'h2',
        text: 'Shoes are not “just another SKU”',
      },
      {
        type: 'ul',
        items: [
          'Wrong fit is costly: boxing, shipping, and restocking hurt more on mid-ticket shoes.',
          'Style risk: buyers hesitate when they cannot see the sneaker or boot on their own legs.',
          'Cross-category carts: outfit shoppers abandon when they cannot preview shoe + apparel together.',
        ],
      },
      {
        type: 'h2',
        text: 'What footwear try-on should do on the PDP',
      },
      {
        type: 'p',
        text: 'Retail-grade try-on composites your catalog asset onto the shopper’s photo with realistic scale and lighting. Paired with size guidance (history, chart, or body context), it narrows variant choice before checkout.',
      },
      {
        type: 'cta',
        title: 'Footwear + apparel in one flow',
        text: 'Omafit supports photorealistic try-on for footwear and apparel from the same Shopify widget.',
        href: 'https://apps.shopify.com/omafit',
        label: 'Install on Shopify',
        external: true,
      },
    ],
    faqs: [
      {
        question: 'Does virtual try-on replace width/length guidance?',
        answer:
          'No—it complements sizing. Try-on answers “how it looks”; your chart and AI sizing answer “which variant”.',
      },
      {
        question: 'Do I need a separate app for shoes?',
        answer:
          'With Omafit, footwear sits in the same widget as apparel and accessories—one install, one analytics view.',
      },
    ],
  },
  {
    slug: 'fashion-cart-abandonment-size-anxiety',
    title: 'Fashion cart abandonment and size anxiety: what the data story misses',
    description:
      'How fit uncertainty shows up before checkout, why generic CRO tips fail apparel, and PDP tactics that recover intent without heavy discounts.',
    publishedAt: '2026-11-02',
    updatedAt: '2026-11-02',
    keywords: [
      'fashion cart abandonment',
      'size anxiety ecommerce',
      'PDP conversion apparel',
      'virtual try-on conversion',
    ],
    readingTimeMinutes: 8,
    blocks: [
      {
        type: 'p',
        text: 'Cart abandonment dashboards blame shipping or surprise fees—and those matter—but fashion brands often undercount abandonment driven by “I am not sure this will fit or look right on me.” That hesitation never reaches checkout.',
      },
      {
        type: 'h2',
        text: 'Size anxiety is pre-cart',
      },
      {
        type: 'p',
        text: 'Shoppers scroll reviews, open the size chart twice, then leave. They did not reject price; they rejected uncertainty. Fixing that belongs on the PDP, not only in abandoned-cart email.',
      },
      {
        type: 'h2',
        text: 'Tactics that address doubt, not only urgency',
      },
      {
        type: 'ul',
        items: [
          'Photorealistic try-on on the product page.',
          'Clear size recommendation tied to your brand grading.',
          'FAQs structured for search and AI assistants (fit, returns, privacy).',
          'Social proof that mentions fit outcomes, not only delivery speed.',
        ],
      },
      {
        type: 'cta',
        title: 'Reduce doubt before add-to-cart',
        text: 'Try-on + sizing in a white-label widget designed for Shopify fashion stores.',
        href: '/',
        label: 'Explore Omafit',
      },
    ],
    faqs: [
      {
        question: 'Will try-on slow down my PDP?',
        answer:
          'Load the widget asynchronously and measure Core Web Vitals. Modern try-on apps defer heavy work until the shopper taps “Try on”.',
      },
    ],
  },
  {
    slug: 'shopify-plus-fashion-conversion-playbook',
    title: 'Shopify Plus fashion: a conversion playbook for high-SKU catalogs',
    description:
      'How large apparel merchants structure PDP experiments, try-on rollouts, and return analytics without freezing the theme every quarter.',
    publishedAt: '2026-11-03',
    updatedAt: '2026-11-03',
    keywords: [
      'Shopify Plus fashion',
      'enterprise apparel ecommerce',
      'virtual try-on rollout',
      'fashion conversion rate',
    ],
    readingTimeMinutes: 9,
    blocks: [
      {
        type: 'p',
        text: 'Shopify Plus fashion teams juggle seasonal drops, hundreds of PDPs, and aggressive return targets. A fitting-room initiative fails when it is “install app on everything day one” instead of a phased proof on categories with the worst size-return reasons.',
      },
      {
        type: 'h2',
        text: 'Phase the rollout',
      },
      {
        type: 'ul',
        items: [
          'Start with a hero category (e.g. denim or dresses) and a control holdout.',
          'Tag sessions with try-on vs without in analytics.',
          'Compare size-related return reasons after one full return cycle.',
          'Expand to footwear and accessories when PDP engagement holds.',
        ],
      },
      {
        type: 'h2',
        text: 'Align ops, not only marketing',
      },
      {
        type: 'p',
        text: 'Merchandising picks categories; CX owns return reasons; growth owns PDP tests. One shared dashboard for try-on sessions and return tags keeps the story honest.',
      },
      {
        type: 'cta',
        title: 'Built for growing session volume',
        text: 'Omafit tiers from Growth to Enterprise scale try-on volume with analytics for merchant teams.',
        href: '/partners',
        label: 'See plans & partners',
      },
    ],
    faqs: [
      {
        question: 'Can agencies run the rollout for us?',
        answer:
          'Yes—Omafit works with Shopify agencies on revenue share. See the Partners page to co-sell with your portfolio.',
      },
    ],
  },
  {
    slug: 'white-label-virtual-try-on-widget',
    title: 'White-label virtual try-on: brand control on the product page',
    description:
      'Why fashion brands reject generic fitting-room UX, what white-label means for fonts and colors, and checklist items for Shopify theme fit.',
    publishedAt: '2026-11-04',
    updatedAt: '2026-11-04',
    keywords: [
      'white-label try-on widget',
      'branded virtual fitting room',
      'Shopify widget customization',
      'fashion UX',
    ],
    readingTimeMinutes: 6,
    blocks: [
      {
        type: 'p',
        text: 'Shoppers trust brands they already follow. A bright third-party modal with someone else’s logo interrupts that trust. White-label try-on keeps typography, palette, and copy on your design system.',
      },
      {
        type: 'h2',
        text: 'What to customize',
      },
      {
        type: 'ul',
        items: [
          'Primary actions and corner radius to match your theme.',
          'Localized strings for markets you ship to.',
          'Mobile-first layout—most try-on starts on phone.',
          'Optional shopper profile save for repeat visits.',
        ],
      },
      {
        type: 'p',
        text: 'Omafit’s widget customizer targets merchants who treat the PDP as brand real estate, not a plugin afterthought.',
      },
      {
        type: 'cta',
        title: 'Your brand, your PDP',
        text: 'Configure colors, layout, and assistant copy without forking a custom build.',
        href: 'https://apps.shopify.com/omafit',
        label: 'Install on Shopify',
        external: true,
      },
    ],
    faqs: [
      {
        question: 'Do white-label widgets hurt SEO?',
        answer:
          'No—content and product schema still live on your domain. Supplement with a blog hub (like this one) for topical authority.',
      },
    ],
  },
  {
    slug: 'ai-stylist-increase-aov-fashion',
    title: 'AI stylist on the PDP: turning try-on into higher AOV',
    description:
      'How outfit recommendations after try-on lift basket size, guardrails for on-brand suggestions, and metrics beyond single-SKU conversion.',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-05',
    keywords: [
      'AI stylist ecommerce',
      'increase AOV fashion',
      'outfit recommendations Shopify',
      'ChatGPT shopping assistant',
    ],
    readingTimeMinutes: 8,
    blocks: [
      {
        type: 'p',
        text: 'Try-on solves “will this work on me?” The next question is “what goes with it?” An AI stylist that knows your catalog can suggest complementary SKUs while the shopper is still in intent—before they bounce to Pinterest.',
      },
      {
        type: 'h2',
        text: 'Design rules that protect brand tone',
      },
      {
        type: 'ul',
        items: [
          'Recommend only in-stock variants with real images.',
          'Respect collection merchandising (do not push clearance randomly).',
          'Expose why a piece pairs (fabric, occasion, silhouette).',
        ],
      },
      {
        type: 'h2',
        text: 'Measure AOV, not only CTR',
      },
      {
        type: 'p',
        text: 'Track attach rate from stylist sessions, incremental revenue per try-on, and return rate on complete looks vs single items. Omafit combines try-on with assistant flows aimed at basket growth.',
      },
      {
        type: 'cta',
        title: 'Stylist + try-on together',
        text: 'Built-in assistant that understands your catalog and pairs with virtual try-on.',
        href: '/',
        label: 'See Omafit features',
      },
    ],
    faqs: [
      {
        question: 'Is this the same as a generic ChatGPT plugin?',
        answer:
          'Retail assistants should be grounded in your products and policies. Omafit’s assistant is store-aware—not a generic chatbot on the side.',
      },
    ],
  },
  {
    slug: 'pdp-optimization-fashion-ecommerce',
    title: 'Fashion PDP optimization: beyond bigger photos and size charts',
    description:
      'A practical hierarchy for product page improvements—trust, fit, and visual proof—and where virtual try-on sits in the stack.',
    publishedAt: '2026-11-06',
    updatedAt: '2026-11-06',
    keywords: [
      'fashion PDP optimization',
      'product page conversion',
      'ecommerce product detail page',
      'virtual try-on PDP',
    ],
    readingTimeMinutes: 7,
    blocks: [
      {
        type: 'p',
        text: 'Teams often A/B test gallery order or add a sticky add-to-cart bar—useful, but insufficient when the blocker is fit. Fashion PDP optimization should sequence trust, clarity, and personal proof.',
      },
      {
        type: 'h2',
        text: 'A simple priority stack',
      },
      {
        type: 'ul',
        items: [
          'Accurate inventory and variant clarity.',
          'Return policy visible where doubt peaks.',
          'Size recommendation tied to your chart.',
          'Try-on or AR preview for categories with high visual risk.',
          'Structured FAQs for sizing and care.',
        ],
      },
      {
        type: 'p',
        text: 'Skipping personal proof while over-investing in urgency timers usually flatlines conversion on apparel.',
      },
      {
        type: 'cta',
        title: 'Upgrade the PDP proof layer',
        text: 'Add try-on and sizing without rebuilding your Shopify theme.',
        href: 'https://apps.shopify.com/omafit',
        label: 'Get the app',
        external: true,
      },
    ],
    faqs: [
      {
        question: 'Should try-on be above the fold on mobile?',
        answer:
          'Test it—many brands use a primary “Try on” CTA near gallery with lazy-loaded module to protect performance.',
      },
    ],
  },
  {
    slug: 'try-on-image-privacy-gdpr-shopify',
    title: 'Try-on image privacy for Shopify: GDPR, retention, and shopper trust',
    description:
      'What EU and UK shoppers expect, how to write clear policies, and technical choices that limit unnecessary image storage.',
    publishedAt: '2026-11-07',
    updatedAt: '2026-11-07',
    keywords: [
      'try-on GDPR',
      'fashion ecommerce privacy',
      'shopper image retention',
      'Shopify privacy policy',
    ],
    readingTimeMinutes: 8,
    blocks: [
      {
        type: 'p',
        text: 'Camera-based try-on triggers privacy questions immediately—especially in the EU. Merchants who explain processing, retention, and deletion in plain language convert better than those who hide details in legal footnotes.',
      },
      {
        type: 'h2',
        text: 'Policy building blocks',
      },
      {
        type: 'ul',
        items: [
          'Purpose: sizing and visualization only—not unrelated profiling.',
          'Retention: session-only vs saved profile, with expiry.',
          'Processors: who generates the composite and where data is hosted.',
          'Rights: how to request deletion from your support path.',
        ],
      },
      {
        type: 'h2',
        text: 'Engineering hygiene',
      },
      {
        type: 'p',
        text: 'Prefer on-device pose estimation when possible, minimize raw uploads, and separate try-on images from marketing lists unless the shopper opts in. Document this in your privacy policy and in-widget copy.',
      },
      {
        type: 'cta',
        title: 'Privacy-aware try-on',
        text: 'Omafit supports shopper profiles with merchant-controlled flows—pair with your store’s legal review.',
        href: '/privacidade',
        label: 'Read Omafit privacy',
      },
    ],
    faqs: [
      {
        question: 'Do we need a DPIA for try-on?',
        answer:
          'Depends on volume, data types, and jurisdictions. Consult your DPO or counsel; technical vendors should provide a processing overview.',
      },
      {
        question: 'Can shoppers use try-on without an account?',
        answer:
          'Yes—that is a common pattern. Saved measurements can be optional for guests.',
      },
    ],
  },
  {
    slug: 'shopify-agency-revenue-share-try-on',
    title: 'Shopify agencies and try-on: revenue share without reselling licenses',
    description:
      'How agency partners introduce virtual try-on to merchant portfolios, align incentives with Miko Apps–style ecosystems, and structure referrals.',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-08',
    keywords: [
      'Shopify agency partnership',
      'revenue share SaaS',
      'virtual try-on partner program',
      'Miko Apps Shopify',
      'Omafit partners',
    ],
    readingTimeMinutes: 6,
    blocks: [
      {
        type: 'p',
        text: 'Agencies win when client stores grow profitably—not when they resell one-off widgets. Virtual try-on fits retainer models: better PDP conversion, fewer size returns, and measurable ROI stories for quarterly reviews.',
      },
      {
        type: 'h2',
        text: 'Revenue share vs one-time project fee',
      },
      {
        type: 'p',
        text: 'Omafit’s partner program shares recurring subscription revenue from merchants you refer or onboard. That aligns long-term incentives: you keep optimizing the PDP because both sides benefit from retention.',
      },
      {
        type: 'h2',
        text: 'Ecosystem players like Miko Apps',
      },
      {
        type: 'p',
        text: 'Agencies already deploy Miko Apps and other native Shopify tools for wholesale, loyalty, and ops. Adding Omafit try-on + sizing is a natural upsell in fashion accounts without competing with those stacks.',
      },
      {
        type: 'cta',
        title: 'Join the partner program',
        text: 'Revenue share, enablement, and co-selling for Shopify agencies.',
        href: '/partners',
        label: 'Apply as a partner',
      },
    ],
    faqs: [
      {
        question: 'Who handles merchant support?',
        answer:
          'Agencies typically lead implementation; Omafit supports product issues and billing. Boundaries are agreed in the partner onboarding.',
      },
      {
        question: 'Can we white-label for clients?',
        answer:
          'Merchants run under their brand on their storefront; agencies appear as the implementation partner in your commercial agreement.',
      },
    ],
  },
];
