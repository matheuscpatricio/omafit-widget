import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import type { LandingFeature } from '../../locales/landing';

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

function FeatureInfoCard({
  feature,
  compact,
  highlightLabel,
  featureLabel,
}: {
  feature: LandingFeature;
  compact?: boolean;
  highlightLabel: string;
  featureLabel: string;
}) {
  const highlight = Boolean(feature.accent);

  return (
    <div
      className={cn(
        'landing-glass flex h-full min-h-0 flex-col',
        highlight && 'border-white/20',
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
        {highlight ? highlightLabel : featureLabel}
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
  highlightLabel,
  featureLabel,
}: {
  features: LandingFeature[];
  cardWidth: number;
  scrollSnap?: boolean;
  highlightLabel: string;
  featureLabel: string;
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
          <FeatureInfoCard
            feature={feature}
            compact
            highlightLabel={highlightLabel}
            featureLabel={featureLabel}
          />
        </div>
      ))}
      {/** Mesma distância entre o último cartão e o primeiro da cópia do marquee (Widget ↔ MediaPipe). */}
      <div className="shrink-0 select-none w-2 md:w-4" aria-hidden />
    </div>
  );
}

/** Uma fileira horizontal; ~2 / ~3 / ~4 cartões visíveis (<768 / md / lg+). Desktop: marquee duplicado. Mobile: arrastar com o dedo. */
function SolutionAutoMarqueeGrid({
  features,
  highlightLabel,
  featureLabel,
}: {
  features: LandingFeature[];
  highlightLabel: string;
  featureLabel: string;
}) {
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
        <FeatureMarqueeStrip
          features={features}
          cardWidth={cardWidth}
          scrollSnap
          highlightLabel={highlightLabel}
          featureLabel={featureLabel}
        />
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
          <FeatureMarqueeStrip
            features={features}
            cardWidth={cardWidth}
            highlightLabel={highlightLabel}
            featureLabel={featureLabel}
          />
        </div>
        <div className="shrink-0">
          <FeatureMarqueeStrip
            features={features}
            cardWidth={cardWidth}
            highlightLabel={highlightLabel}
            featureLabel={featureLabel}
          />
        </div>
      </div>
    </div>
  );
}

export function Solution() {
  const { t } = useLandingLocale();
  const s = t.solution;

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
          <motion.h2
            variants={itemVariants}
            className="text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl lg:text-5xl"
            style={{ letterSpacing: '-0.035em' }}
          >
            {s.title}
            <span className="text-oma-accent">{s.titleAccent}</span>
            {s.titleEnd}
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-5 text-lg leading-relaxed text-oma-muted">
            {s.sub}
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
              <div className="landing-glass py-6 sm:py-8 md:py-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_30%,rgba(217,104,69,0.08),transparent)] sm:rounded-2xl md:rounded-3xl" />
                <div className="relative z-[1]">
                  <SolutionAutoMarqueeGrid
                    features={s.features}
                    highlightLabel={s.highlight}
                    featureLabel={s.featureBadge}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
