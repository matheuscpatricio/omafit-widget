import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Feature {
  title: string;
  description: string;
  bullets: string[];
  accent?: boolean;
}

const features: Feature[] = [
  {
    title: 'Precise sizing with MediaPipe',
    description:
      'Real-time analysis of 50+ body landmarks on the shopper’s phone. No measuring tape, no guesswork.',
    bullets: ['98% recommendation accuracy', '<10s capture', 'Runs 100% on-device'],
    accent: true,
  },
  {
    title: 'Photorealistic try-on (apparel & footwear)',
    description:
      'Generative AI renders the garment on the shopper with realistic shading, fabric, and drape. They see it before they buy.',
    bullets: ["Women's and men's apparel", 'Footwear and accessories in one flow', 'Photographic quality'],
  },
  {
    title: 'AR preview (glasses & accessories)',
    description:
      'In-browser augmented reality for glasses, bracelets, watches, and more. Zero friction, all live.',
    bullets: ['WebAR—no app install', 'Real-time face tracking', 'iOS and Android compatible'],
  },
  {
    title: 'Built-in ChatGPT assistant',
    description:
      'A 24/7 style advisor that knows your catalog, answers questions, and suggests outfits.',
    bullets: ['Knows your catalog', 'Suggests full looks', 'Speaks in your brand voice'],
  },
  {
    title: 'Analytics & ROI',
    description:
      'Dashboards that tie widget usage to business outcomes: estimate ROI and follow aggregated shopper profiles—height, weight, and body-type averages, always anonymized.',
    bullets: [
      'ROI models for conversion, AOV, and returns',
      'Average height, weight, and body-type insights',
      'Engagement funnel and try-on sessions',
    ],
  },
  {
    title: 'Customizable widget',
    description:
      'Colors, fonts, layout, and copy aligned with your brand. Feels native to your store—not bolted on.',
    bullets: ['100% white-label', 'Install in minutes', 'Mobile-first'],
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

function FeatureInfoCard({ feature, compact }: { feature: Feature; compact?: boolean }) {
  const highlight = Boolean(feature.accent);

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded-xl border border-oma-line/45 bg-gradient-to-br from-oma-elevated/98 to-oma-canvas/90 shadow-elegant sm:rounded-2xl',
        highlight && 'ring-1 ring-oma-accent/30',
        compact ? 'p-3.5 sm:p-4' : 'p-6 sm:p-8',
      )}
    >
      <span
        className={cn(
          'inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest sm:text-[11px]',
          highlight
            ? 'border-oma-accent/45 bg-oma-accent/15 text-oma-cream'
            : 'border-oma-cream/15 bg-oma-cream/5 text-oma-cream/85',
        )}
      >
        {highlight ? 'Highlight' : 'Feature'}
      </span>
      <h3
        className={cn(
          'mt-2 font-semibold leading-snug tracking-tight text-oma-cream sm:mt-2.5',
          compact ? 'text-sm sm:text-base md:text-[1.05rem]' : 'text-xl sm:text-2xl',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {feature.title}
      </h3>
      <p
        className={cn(
          'mt-2 flex-1 leading-relaxed text-oma-cream/80',
          compact ? 'line-clamp-5 text-[11px] sm:line-clamp-6 sm:text-xs md:text-[13px]' : 'text-sm sm:text-base',
        )}
      >
        {feature.description}
      </p>
      <ul
        className={cn(
          'mt-2.5 text-oma-cream/90 sm:mt-3',
          compact ? 'space-y-1.5 text-[10px] sm:text-[11px] md:text-[12px]' : 'space-y-1.5 text-sm sm:text-[15px]',
        )}
      >
        {feature.bullets.map((b) => (
          <li key={b} className="flex gap-1.5 leading-snug">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-oma-accent" aria-hidden />
            <span className={compact ? 'line-clamp-3 md:line-clamp-none' : ''}>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Largura de cada cartão: 2 por vista (< md), 3 (md–lg), 4 (lg+); uma única linha + marquee. */
function useMarqueeViewportCardWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(300);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const cw = el.getBoundingClientRect().width;
      if (cw <= 0) return;
      const lg = window.matchMedia('(min-width: 1024px)').matches;
      const md = window.matchMedia('(min-width: 768px)').matches;
      let cols = 2;
      let gapPx = 8;
      if (lg) {
        cols = 4;
        gapPx = 16;
      } else if (md) {
        cols = 3;
        gapPx = 16;
      }
      const gapsTotal = (cols - 1) * gapPx;
      setCardWidth(Math.max(168, (cw - gapsTotal) / cols));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    const mqMd = window.matchMedia('(min-width: 768px)');
    const mqLg = window.matchMedia('(min-width: 1024px)');
    mqMd.addEventListener('change', compute);
    mqLg.addEventListener('change', compute);
    return () => {
      ro.disconnect();
      mqMd.removeEventListener('change', compute);
      mqLg.removeEventListener('change', compute);
    };
  }, []);

  return [ref, cardWidth] as const;
}

function FeatureMarqueeStrip({
  features: list,
  cardWidth,
  scrollSnap,
}: {
  features: Feature[];
  cardWidth: number;
  scrollSnap?: boolean;
}) {
  return (
    <div className="flex w-max max-w-none flex-nowrap gap-2 md:gap-4">
      {list.map((feature) => (
        <div
          key={feature.title}
          className={cn(
            'min-h-[min(52vh,380px)] min-w-0 shrink-0 md:min-h-[min(48vh,420px)]',
            scrollSnap && 'snap-start snap-always',
          )}
          style={{ width: cardWidth, flexBasis: cardWidth }}
        >
          <FeatureInfoCard feature={feature} compact />
        </div>
      ))}
      {/** Mesma distância entre o último cartão e o primeiro da cópia do marquee (Widget ↔ MediaPipe). */}
      <div className="shrink-0 select-none w-2 md:w-4" aria-hidden />
    </div>
  );
}

/** Uma fileira horizontal; ~2 / ~3 / ~4 cartões visíveis (<768 / md / lg+). Desktop: marquee duplicado. Mobile: arrastar com o dedo. */
function SolutionAutoMarqueeGrid() {
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const [viewportRef, cardWidth] = useMarqueeViewportCardWidth();
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const scrollStripClass =
    'mx-auto w-full overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x snap-x snap-mandatory px-1';

  if (reduceMotion || isMobile) {
    return (
      <div ref={viewportRef} className={scrollStripClass}>
        <FeatureMarqueeStrip features={features} cardWidth={cardWidth} scrollSnap />
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="w-full overflow-hidden py-1">
      <div
        className="flex w-max max-w-none animate-solution-marquee will-change-transform"
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="shrink-0">
          <FeatureMarqueeStrip features={features} cardWidth={cardWidth} />
        </div>
        <div className="shrink-0">
          <FeatureMarqueeStrip features={features} cardWidth={cardWidth} />
        </div>
      </div>
    </div>
  );
}

export function Solution() {
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
            The solution
          </motion.span>
          <motion.h2
            variants={itemVariants}
            className="mt-5 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            Omafit: intelligence that turns{' '}
            <span className="text-oma-accent">doubt into confidence</span> and sales.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            A full visual AI suite for apparel, accessories, and footwear. Fast, easy install on your store.
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
          <motion.div variants={itemVariants} className="sm:mx-auto sm:max-w-7xl">
            <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 sm:left-auto sm:mx-auto sm:w-full sm:max-w-7xl sm:translate-x-0">
              <div className="border-y border-oma-line/35 bg-oma-elevated/20 py-6 sm:rounded-2xl sm:border sm:shadow-elegant-lg sm:py-8 md:rounded-3xl md:py-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,rgba(217,104,69,0.08),transparent)] sm:rounded-2xl md:rounded-3xl" />
                <div className="relative z-[1]">
                  <SolutionAutoMarqueeGrid />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
