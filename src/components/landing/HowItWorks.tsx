import { motion, type Variants } from 'framer-motion';
import { Card } from '../ui/card';
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
          className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center rounded-full border border-oma-cream/15 bg-oma-cream/5 px-3 py-1 text-[12px] font-medium text-oma-cream/80 backdrop-blur-md"
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

        <ol className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2">
          {h.steps.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
            >
              <Card className="landing-glass h-full p-7 transition-colors duration-500 hover:border-white/20 hover:bg-white/[0.07]">
                <div className="relative flex flex-col gap-4">
                  <span className="text-[13px] font-medium tracking-[0.18em] text-oma-cream/45">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[1.35rem] font-semibold tracking-tight text-oma-cream">
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-oma-cream/65">{step.body}</p>
                </div>
              </Card>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
