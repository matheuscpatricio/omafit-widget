import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

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
  const { t } = useLandingLocale();
  const f = t.faq;
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
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            {f.title}
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg text-oma-muted">
            {f.sub}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-12 flex flex-col gap-3"
        >
          {f.items.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div key={faq.q} variants={itemVariants} className="landing-glass px-6">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="relative flex w-full items-start justify-between gap-4 py-5 text-left transition-colors hover:text-oma-cream"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-oma-cream sm:text-lg">{faq.q}</span>
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-oma-line/50 text-oma-muted">
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="relative pb-5 text-sm leading-relaxed text-oma-muted sm:text-base">{faq.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}