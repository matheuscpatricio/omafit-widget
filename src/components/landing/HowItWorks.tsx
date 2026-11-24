import { motion, type Variants } from 'framer-motion';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
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

function Pin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn('size-7 text-oma-accent', className)}
    >
      <path d="M16 3a1 1 0 0 1 .117 1.993l-.117.007v4.764l1.894 3.789a1 1 0 0 1 .1.331l.006.116v2a1 1 0 0 1-.883.993l-.117.007h-4v4a1 1 0 0 1-1.993.117L11 17v-4H7a1 1 0 0 1-.993-.883L6 12v-2a1 1 0 0 1 .06-.34l.046-.107 1.894-3.791V5a1 1 0 0 1-.117-1.993L8 3h8z" />
    </svg>
  );
}

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
          className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center rounded-full border border-oma-accent/35 bg-oma-accent/10 px-3 py-1 text-[12px] font-medium text-oma-accent"
          >
            {h.tag}
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            {h.title}
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg leading-relaxed text-oma-muted">
            {h.lead}
          </motion.p>
        </motion.div>

        <ol className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2">
          {h.steps.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
            >
              <Card className="h-full rounded-[1.4rem] border-oma-line/40 bg-oma-canvas/80 p-2 text-oma-cream shadow-elegant">
                <Pin className="mx-auto mb-3" />
                <div className="flex h-full flex-col gap-2 rounded-2xl border border-oma-accent/25 bg-oma-accent/10 p-5">
                  <span className="text-3xl font-semibold tracking-tight text-oma-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-xl font-semibold leading-tight text-oma-cream">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-oma-muted">{step.body}</p>
                </div>
              </Card>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
