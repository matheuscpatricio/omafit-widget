import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Ruler, Shirt, Glasses, MessageSquare, Palette, Sparkles, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BorderBeamCard } from './magic/BorderBeam';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  accent?: boolean;
}

const features: Feature[] = [
  {
    icon: Ruler,
    title: 'Medição Precisa com MediaPipe',
    description:
      'Análise de mais de 50 pontos corporais em tempo real pelo celular do cliente. Sem fita métrica, sem erro humano.',
    bullets: ['98% de acurácia na recomendação', '<10s de captura', 'Roda 100% no dispositivo'],
    accent: true,
  },
  {
    icon: Shirt,
    title: 'Try-On Fotorrealista (Roupas e Calçados)',
    description:
      'IA generativa renderiza a peça no corpo do cliente com sombreamento, tecido e caimento realistas. Ele vê antes de comprar.',
    bullets: ['Roupas femininas e masculinas', 'Calçados com visualização 360°', 'Qualidade fotográfica'],
  },
  {
    icon: Glasses,
    title: 'Visualização AR (Óculos e Acessórios)',
    description:
      'Realidade aumentada direta do navegador para óculos, bonés, relógios e mais. Zero app, zero fricção.',
    bullets: ['WebAR sem instalação', 'Tracking facial em tempo real', 'Compatível com iOS e Android'],
  },
  {
    icon: MessageSquare,
    title: 'Assistente ChatGPT Integrado',
    description:
      'Um consultor de moda inteligente 24/7 que conhece seu catálogo, responde dúvidas e sugere combinações.',
    bullets: ['Conhece seu catálogo', 'Sugere looks completos', 'Fala a língua da sua marca'],
  },
  {
    icon: Palette,
    title: 'Widget Personalizável',
    description:
      'Cores, fontes, layout e copy adaptados à identidade da sua marca. Parece nativo da sua loja, não uma terceirização.',
    bullets: ['100% white-label', 'Integração em minutos', 'Mobile-first'],
  },
];

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

export function Solution() {
  return (
    <section id="solucao" className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-white via-rose-50/30 to-white">
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
            className="inline-flex items-center gap-2 rounded-full border border-[#810707]/20 bg-[#810707]/5 px-3 py-1 text-[12px] font-medium text-[#810707]"
          >
            <Sparkles className="h-3 w-3" />
            A solução
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink-800"
            style={{ letterSpacing: '-0.035em' }}
          >
            Omafit: A Inteligência que Transforma{' '}
            <span className="text-[#810707]">Dúvida em Confiança</span> e Vendas.
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mt-5 text-lg text-ink-500 leading-relaxed"
          >
            Uma suíte completa de IA visual para moda, acessórios e calçados. Plug-and-play na sua
            Shopify, invisível para o cliente, inesquecível no resultado.
          </motion.p>
        </motion.div>

        <motion.div
          id="recursos"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="mt-16 grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-5"
        >
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} variants={itemVariants} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
  variants,
}: {
  feature: Feature;
  index: number;
  variants: Variants;
}) {
  const Icon = feature.icon;
  const reduceMotion = useReducedMotion();

  // Grid asymmetric layout: primeiro full-wide na primeira linha,
  // depois 3 colunas, depois 2 colunas
  const spanClass =
    index === 0
      ? 'lg:col-span-3 lg:row-span-2'
      : index === 1
        ? 'lg:col-span-3'
        : index === 2
          ? 'lg:col-span-3'
          : 'lg:col-span-3';

  const breathe = {
    opacity: reduceMotion ? 0.5 : ([0.42, 0.72, 0.42] as const),
    scale: reduceMotion ? 1 : ([1, 1.07, 1] as const),
  };

  const inner = (
    <>
      {feature.accent && (
        <>
          <div
            className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)' }}
          />
          {!reduceMotion && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -left-24 bottom-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_68%)]"
              animate={{ opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </>
      )}
      <div className="relative">
        <div className={cn('flex flex-wrap items-center gap-3', !feature.accent && 'pr-14')}>
          {feature.accent ? (
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white backdrop-blur">
              <Icon className="h-5 w-5" />
            </div>
          ) : (
            <motion.div
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#810707] via-[#a01010] to-rose-400 p-[2.5px] shadow-[0_6px_20px_-6px_rgba(129,7,7,0.45)]"
              whileHover={{ scale: 1.06, rotate: -2 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <div className="grid h-full w-full place-items-center rounded-[13px] bg-white">
                <Icon className="h-5 w-5 text-[#810707]" />
              </div>
            </motion.div>
          )}
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest',
              feature.accent ? 'bg-white/10 text-white/90 ring-1 ring-white/20' : 'bg-[#810707]/10 text-[#810707]',
            )}
          >
            {feature.accent ? 'Destaque' : 'Recurso'}
          </span>
        </div>

        {!feature.accent && (
          <div
            className="pointer-events-none absolute right-4 top-4 flex h-10 w-10 select-none items-center justify-center rounded-xl bg-gradient-to-br from-[#810707] to-[#4a0303] text-sm font-bold text-white shadow-lg ring-2 ring-white/70"
            aria-hidden
          >
            {String(index + 1).padStart(2, '0')}
          </div>
        )}

        <h3
          className={cn(
            'mt-5 text-xl font-semibold tracking-tight sm:text-2xl',
            feature.accent ? 'text-white' : 'text-ink-800',
          )}
          style={{ letterSpacing: '-0.02em' }}
        >
          {feature.title}
        </h3>
        <p
          className={cn(
            'mt-2 text-[15px] leading-relaxed',
            feature.accent ? 'text-white/80' : 'text-ink-500',
          )}
        >
          {feature.description}
        </p>

        <ul className="mt-5 space-y-2.5">
          {feature.bullets.map((b) => (
            <li
              key={b}
              className={cn(
                'flex items-start gap-2.5 text-[13px] transition-transform duration-300 group-hover:translate-x-0.5',
                feature.accent ? 'text-white/90' : 'text-ink-600',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                  feature.accent ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/15',
                )}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  if (feature.accent) {
    return (
      <motion.div
        variants={variants}
        whileHover={{ y: -6, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className={spanClass}
      >
        <BorderBeamCard
          duration={8}
          className="shadow-brand-glow h-full"
          innerClassName="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#810707] to-[#4a0303] text-white p-6 sm:p-8 h-full min-h-[280px]"
        >
          {inner}
        </BorderBeamCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[#810707]/12',
        'bg-gradient-to-br from-white via-white to-rose-50/40',
        'p-6 shadow-[0_4px_28px_-10px_rgba(129,7,7,0.14)] sm:p-8',
        'transition-[border-color,box-shadow] duration-300',
        'hover:border-[#810707]/28 hover:shadow-[0_22px_55px_-14px_rgba(129,7,7,0.22)]',
        spanClass,
      )}
    >
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(129,7,7,0.16),transparent_68%)]"
            animate={breathe}
            transition={{ duration: 5 + index * 0.65, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -left-24 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.14),transparent_65%)]"
            animate={{ opacity: reduceMotion ? 0.35 : ([0.28, 0.52, 0.28] as const) }}
            transition={{
              duration: 4.2 + index * 0.35,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.6,
            }}
          />
        </>
      )}
      {inner}
    </motion.div>
  );
}
