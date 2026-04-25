import { motion, type Variants } from 'framer-motion';
import { TrendingDown, PackageX, HeadphonesIcon, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PainPoint {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

const painPoints: PainPoint[] = [
  {
    icon: PackageX,
    title: 'Altas taxas de devolução',
    description:
      'Roupas que não servem viram frete reverso, reestoque, reembolso e prejuízo. O cliente desiste, você paga a conta.',
    stat: '30-40%',
    statLabel: 'de devoluções em moda online',
  },
  {
    icon: TrendingDown,
    title: 'Baixa conversão no checkout',
    description:
      'Dúvida sobre tamanho é o motivo #1 de carrinho abandonado. Sem certeza do caimento, o cliente fecha a aba.',
    stat: '67%',
    statLabel: 'abandonam por insegurança',
  },
  {
    icon: HeadphonesIcon,
    title: 'Atendimento exaustivo',
    description:
      'Sua equipe repete "qual tamanho você usa?" o dia todo. Tempo caro gasto em perguntas que deveriam ser resolvidas antes.',
    stat: '4h+',
    statLabel: 'por dia em dúvidas de tamanho',
  },
  {
    icon: Swords,
    title: 'Concorrência acirrada',
    description:
      'Marcas sem experiência personalizada viram commodity. Quem entrega confiança na compra sai na frente.',
    stat: '2,7x',
    statLabel: 'mais fidelidade com try-on',
  },
];

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
      <div className="relative z-[1] max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="max-w-3xl mx-auto text-center"
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
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Você Conhece Essas Dores? <br className="hidden sm:block" />
            <span className="text-oma-muted">Seus Clientes Também.</span>
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg leading-relaxed text-oma-muted"
          >
            Toda loja de moda online enfrenta os mesmos quatro inimigos silenciosos que corroem
            margem, reputação e confiança.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
        >
          {painPoints.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="group relative overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-parchment/95 p-6 shadow-elegant backdrop-blur-sm transition-shadow duration-300 hover:border-oma-accent/35 hover:shadow-[0_20px_50px_-12px_rgba(217,104,69,0.2)] sm:p-7"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-oma-accent/[0.07] via-transparent to-oma-tech/[0.08] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-oma-light">
                      <Icon className="h-5 w-5 text-oma-accentDark" />
                    </div>
                    <span className="font-dm-mono text-[11px] font-medium uppercase tracking-wider text-oma-muted">
                      Dor #{i + 1}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-dm-mono text-2xl font-semibold tracking-tight text-[#5BAF8A]">
                      {p.stat}
                    </div>
                    <div className="mt-0.5 max-w-[130px] text-[11px] leading-tight text-oma-muted">
                      {p.statLabel}
                    </div>
                  </div>
                </div>
                <h3 className="relative mt-5 text-xl font-semibold tracking-tight text-oma-ink">
                  {p.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-oma-muted">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
