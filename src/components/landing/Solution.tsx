import { motion, type Variants } from 'framer-motion';
import { Ruler, Shirt, Glasses, MessageSquare, Palette, Sparkles, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

  const inner = (
    <>
      {feature.accent && (
        <div
          className="absolute -top-32 -right-32 h-64 w-64 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent)' }}
        />
      )}
      <div className="relative">
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-xl grid place-items-center ${
              feature.accent
                ? 'bg-white/15 text-white backdrop-blur'
                : 'bg-[#810707]/5 text-[#810707]'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-medium uppercase tracking-wider ${
              feature.accent ? 'text-white/70' : 'text-ink-400'
            }`}
          >
            Recurso · {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <h3
          className={`mt-5 text-xl sm:text-2xl font-semibold tracking-tight ${
            feature.accent ? 'text-white' : 'text-ink-800'
          }`}
          style={{ letterSpacing: '-0.02em' }}
        >
          {feature.title}
        </h3>
        <p
          className={`mt-2 text-[15px] leading-relaxed ${
            feature.accent ? 'text-white/80' : 'text-ink-500'
          }`}
        >
          {feature.description}
        </p>

        <ul className="mt-5 space-y-2">
          {feature.bullets.map((b) => (
            <li
              key={b}
              className={`flex items-center gap-2 text-[13px] ${
                feature.accent ? 'text-white/90' : 'text-ink-600'
              }`}
            >
              <Check
                className={`w-4 h-4 flex-shrink-0 ${
                  feature.accent ? 'text-white' : 'text-emerald-600'
                }`}
              />
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
        className={`${spanClass}`}
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
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`group relative rounded-2xl border border-black/5 bg-white p-6 sm:p-8 shadow-elegant hover:shadow-elegant-lg transition-shadow overflow-hidden ${spanClass}`}
    >
      {inner}
    </motion.div>
  );
}
