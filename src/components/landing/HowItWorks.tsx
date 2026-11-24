import { motion, type Variants } from 'framer-motion';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';

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

export function HowItWorks() {
  const { t } = useLandingLocale();
  const h = t.how;

  return (
    <section id="como-funciona" className="relative bg-oma-elevated py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-accent/35 bg-oma-accent/10 px-3 py-1 text-[12px] font-medium text-oma-accent"
          >
            {h.tag}
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            {h.title}
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            {h.lead}
          </motion.p>
        </motion.div>

        <ol className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2">
          {h.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-oma-line/40 bg-oma-canvas/70 p-6 text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-oma-cream">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-oma-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
