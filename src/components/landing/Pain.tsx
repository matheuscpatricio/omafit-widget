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
    <section className="relative py-20 sm:py-28 bg-ink-50/40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.span
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-medium text-ink-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
            O problema
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-800"
            style={{ letterSpacing: '-0.035em' }}
          >
            Você Conhece Essas Dores? <br className="hidden sm:block" />
            <span className="text-ink-400">Seus Clientes Também.</span>
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg text-ink-500 leading-relaxed"
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
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="group relative bg-white rounded-2xl border border-black/5 p-6 sm:p-7 shadow-elegant hover:shadow-elegant-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-ink-50 grid place-items-center">
                      <Icon className="w-5 h-5 text-ink-700" />
                    </div>
                    <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">
                      Dor #{i + 1}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-[#810707] tracking-tight">
                      {p.stat}
                    </div>
                    <div className="text-[11px] text-ink-400 leading-tight mt-0.5 max-w-[130px]">
                      {p.statLabel}
                    </div>
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-ink-800 tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-2 text-[15px] text-ink-500 leading-relaxed">
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
