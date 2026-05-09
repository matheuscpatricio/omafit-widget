import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Pain() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-oma-elevated via-oma-canvas to-oma-elevated py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(217,104,69,0.14),transparent)] opacity-[0.45]"
      />
      <div className="relative z-[1] mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.span
            variants={itemVariants}
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-line/40 bg-oma-parchment/90 px-3 py-1 text-[12px] font-medium text-oma-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" />
            O problema
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-2xl font-semibold tracking-tight text-oma-cream sm:text-3xl lg:text-[2.125rem]"
            style={{ letterSpacing: '-0.035em' }}
          >
            Sua loja está ótima.{' '}
            <span className="text-oma-muted">Mas você sofre por esses motivos.</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mx-auto mt-10 max-w-2xl text-center sm:mt-12"
        >
          <motion.div
            variants={itemVariants}
            className="space-y-4 text-[15px] leading-relaxed text-oma-muted sm:text-base sm:leading-relaxed"
          >
            <p className="text-oma-cream/95">
              Devoluções por tamanho ou caimento não combinados continuam a corroer margem: frete reverso,
              reembolso e peça de volta ao estoque repetem o custo enquanto o cliente já foi embora.
            </p>
            <p>
              No checkout, a dúvida sobre o ajuste é um dos maiores motivos de abandono — sem confiança na
              compra, o carrinho fecha antes da venda, e o tráfego que você conquistou não vira receita de forma
              estável.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
