import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
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
    a: 'We are LGPD and GDPR aligned. MediaPipe capture runs 100% on the shopper’s device—no raw images leave their browser without explicit consent. We store only anonymized metrics and data required to operate.',
  },
  {
    q: 'Does the AI work for all apparel and product types?',
    a: 'Yes. Our try-on model covers women’s and men’s apparel (dresses, tees, pants, jackets, etc.), footwear, and AR accessories (glasses, caps, watches). For very specific categories, we can train a dedicated fine-tune for your brand.',
  },
  {
    q: 'How does per-image billing work? Do I need a monthly commitment?',
    a: 'Shopify app install is free. Growth: US$ 99/mo or US$ 999/yr — 1,000 sessions/mo, extras US$ 0.12. Pro: US$ 399/mo or US$ 3,990/yr — 5,000 sessions, extras US$ 0.08. Scale: US$ 999/mo or US$ 9,990/yr — 15,000 sessions, extras US$ 0.04. Enterprise: US$ 2,499/mo or US$ 24,900/yr — unlimited sessions. Growth, Pro, and Scale include a 14-day trial.',
  },
  {
    q: 'Will Omafit slow down my store?',
    a: 'The widget is lazy-loaded and the initial bundle is under 50KB. Capture and processing start only when the shopper clicks “Try on”. Store performance stays intact—we validate with Lighthouse and Core Web Vitals.',
  },
  {
    q: 'What support do I get after install?',
    a: 'All plans include docs, tutorials, and email support. Pro and Scale add guided onboarding. Enterprise includes dedicated support and a custom SLA.',
  },
  {
    q: 'Can I customize the widget to match my brand?',
    a: 'Fully. Colors, fonts, layout, copy, button text, icons, and on-page placement are configurable. The goal is a native feel—not a third-party tool. No visible “Powered by Omafit” for end customers.',
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-oma-canvas py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-line/40 bg-oma-elevated/80 px-3 py-1 text-[12px] font-medium text-oma-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" />
            Questions answered
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Frequently asked questions.
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg text-oma-muted"
          >
            Everything you need to know about install, security, integration, and support.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-12 divide-y divide-oma-line/40 border-y border-oma-line/40"
        >
          {faqs.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div key={item.q} variants={itemVariants}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 sm:py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-base sm:text-lg font-medium transition-colors ${
                      isOpen ? 'text-oma-cream' : 'text-oma-cream/85 group-hover:text-oma-cream'
                    }`}
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {item.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex-shrink-0 h-8 w-8 grid place-items-center rounded-full transition-colors ${
                      isOpen
                        ? 'bg-oma-accent text-oma-cream'
                        : 'bg-oma-elevated text-oma-muted group-hover:bg-oma-line/30'
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-10 text-[15px] leading-relaxed text-oma-muted">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-oma-muted">
            Still have questions?{' '}
            <a
              href="mailto:contato@omafit.co"
              className="font-medium text-oma-accent hover:underline underline-offset-4"
            >
              Talk to our team →
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
