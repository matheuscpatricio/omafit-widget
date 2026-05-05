import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';
import { LANDING_IMAGES } from '../../lib/site';
import { useIsMdUp } from '../../hooks/useMediaQuery';
import { CircularGallery, type CircularGalleryItem } from '../ui/circular-gallery';

interface Feature {
  title: string;
  description: string;
  bullets: string[];
  accent?: boolean;
}

const features: Feature[] = [
  {
    title: 'Medição Precisa com MediaPipe',
    description:
      'Análise de mais de 50 pontos corporais em tempo real pelo celular do cliente. Sem fita métrica, sem erro humano.',
    bullets: ['98% de acurácia na recomendação', '<10s de captura', 'Roda 100% no dispositivo'],
    accent: true,
  },
  {
    title: 'Try-On Fotorrealista (Roupas e Calçados)',
    description:
      'IA generativa renderiza a peça no corpo do cliente com sombreamento, tecido e caimento realistas. Ele vê antes de comprar.',
    bullets: ['Roupas femininas e masculinas', 'Calçados e acessórios no mesmo fluxo', 'Qualidade fotográfica'],
  },
  {
    title: 'Visualização AR (Óculos e Acessórios)',
    description:
      'Realidade aumentada direta do navegador para óculos, bonés, relógios e mais. Zero app, zero fricção.',
    bullets: ['WebAR sem instalação', 'Tracking facial em tempo real', 'Compatível com iOS e Android'],
  },
  {
    title: 'Assistente ChatGPT Integrado',
    description:
      'Um consultor de moda inteligente 24/7 que conhece seu catálogo, responde dúvidas e sugere combinações.',
    bullets: ['Conhece seu catálogo', 'Sugere looks completos', 'Fala a língua da sua marca'],
  },
  {
    title: 'Analytics e ROI',
    description:
      'Painéis que ligam o uso do widget a resultados de negócio: estime o retorno sobre o investimento e acompanhe o perfil agregado de quem usa o provador — dados como altura, peso e biotipo médios da sua audiência, sempre anonimizados.',
    bullets: [
        'Modelos de ROI com conversão, ticket e devoluções',
        'Médias de altura, peso e biotipo dos usuários',
        'Funil de engajamento e sessões de try-on',
      ],
  },
  {
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

const galleryImageCycle = [
  LANDING_IMAGES.heroLifestyleRiver,
  LANDING_IMAGES.heroLifestyleBeach,
  LANDING_IMAGES.heroLifestyleBoardwalk,
  LANDING_IMAGES.midBanner,
] as const;

const objectPositions = ['48% 32%', '52% 42%', '45% 28%', '50% 35%'] as const;

function buildGalleryItems(): CircularGalleryItem[] {
  return features.map((f, i) => ({
    title: f.title,
    subtitle: f.bullets[0] ?? f.description.slice(0, 96).trim(),
    imageUrl: galleryImageCycle[i % galleryImageCycle.length],
    imageAlt: f.title,
    objectPosition: objectPositions[i % objectPositions.length],
  }));
}

export function Solution() {
  const isMdUp = useIsMdUp();
  const reduceMotion = useReducedMotion();
  const galleryItems = useMemo(() => buildGalleryItems(), []);

  return (
    <section id="solucao" className="relative overflow-hidden bg-oma-canvas py-20 sm:py-28">
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
            className="landing-tagline inline-flex items-center gap-2 rounded-full border border-oma-accent/35 bg-oma-accent/10 px-3 py-1 text-[12px] font-medium text-oma-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-oma-accent" aria-hidden />
            A solução
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Omafit: A Inteligência que Transforma{' '}
            <span className="text-oma-accent">Dúvida em Confiança</span> e Vendas.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            Uma suíte completa de IA visual para moda, acessórios e calçados. Plug-and-play na sua Shopify,
            invisível para o cliente, inesquecível no resultado.
          </motion.p>
        </motion.div>

        <motion.div
          id="recursos"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={containerVariants}
          className="mt-14 sm:mt-16"
        >
          <motion.div variants={itemVariants} className="mx-auto max-w-6xl">
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated/40 shadow-elegant-lg sm:rounded-3xl',
                'min-h-[min(68vh,520px)] sm:min-h-[min(72vh,580px)] md:min-h-[min(76vh,620px)]',
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_80%,rgba(217,104,69,0.12),transparent)] pointer-events-none" />
              <CircularGallery
                items={galleryItems}
                radius={isMdUp ? 400 : 228}
                autoRotateSpeed={reduceMotion ? 0 : 0.011}
                className="relative z-[1] h-[min(68vh,520px)] sm:h-[min(72vh,580px)] md:h-[min(76vh,620px)]"
              />
            </div>
            <p className="mt-4 text-center text-xs text-oma-muted sm:text-sm">
              {reduceMotion
                ? 'Deslize para ver cada recurso.'
                : 'Galeria em rotação suave — aproxime-se do centro para ler o destaque.'}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
