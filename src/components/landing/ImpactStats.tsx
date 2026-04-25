import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

function CountUp({
  end,
  duration = 2.35,
  className,
  suffix = '',
  prefix = '',
}: {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%', amount: 0.22 });
  const [n, setN] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setN(end);
      return;
    }
    const controls = animate(0, end, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setN(Math.round(Number(latest))),
    });
    return () => controls.stop();
  }, [inView, end, duration, reduceMotion]);

  return (
    <span ref={ref} className={cn('inline-block tabular-nums tracking-tight', className)}>
      {prefix}
      {n}
      {suffix}
    </span>
  );
}

const numClass =
  'font-dm-mono font-semibold text-[clamp(2.75rem,11vw,6.5rem)] leading-[0.95] text-[#5BAF8A] [text-shadow:0_2px_40px_rgba(91,175,138,0.22)]';

export function ImpactStats() {
  return (
    <section
      id="impacto"
      className="relative overflow-hidden border-y border-oma-line/40 bg-gradient-to-b from-oma-elevated via-oma-canvas to-oma-elevated py-20 sm:py-28"
      aria-labelledby="impacto-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(217,104,69,0.1),transparent)] opacity-[0.5]"
      />

      <div className="relative z-[1] mx-auto max-w-5xl px-5 sm:px-8 lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="landing-tagline text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-oma-muted"
        >
          Dados Omafit
        </motion.p>
        <motion.h2
          id="impacto-heading"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-3 max-w-2xl text-center text-2xl font-semibold tracking-tight text-oma-cream sm:text-3xl"
          style={{ letterSpacing: '-0.035em' }}
        >
          Resultados que marcas como a sua já sentem no dia a dia.
        </motion.h2>

        <div className="mt-16 flex flex-col gap-16 sm:mt-20 sm:gap-20 md:gap-24">
          <motion.article
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12%', amount: 0.15 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center md:text-left"
          >
            <p className="mx-auto max-w-4xl text-balance text-lg leading-snug text-oma-cream/90 sm:text-xl md:text-2xl md:leading-snug">
              <span className="text-oma-muted">Redução de </span>
              <CountUp end={63} suffix="%" className={cn(numClass, 'mx-1 align-baseline md:mx-1.5')} />
              <span className="text-oma-muted"> das devoluções</span>
              <span className="mt-4 block text-base font-normal leading-relaxed text-oma-muted sm:text-lg">
                Menos frete reverso, mais margem e clientes que voltam a comprar com confiança.
              </span>
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12%', amount: 0.15 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <p className="mx-auto max-w-4xl text-balance text-lg leading-snug text-oma-cream/90 sm:text-xl md:text-2xl md:leading-snug">
              <span className="text-oma-muted">O usuário que passa pelo Omafit tem </span>
              <CountUp end={3} suffix="×" className={cn(numClass, 'mx-1 align-baseline')} duration={1.9} />
              <span className="text-oma-muted"> mais hipóteses de comprar</span>
              <span className="mt-4 block text-base font-normal leading-relaxed text-oma-muted sm:text-lg">
                Experiência guiada de tamanho e visualização que desbloqueia o checkout.
              </span>
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12%', amount: 0.15 }}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-center md:text-right"
          >
            <p className="mx-auto max-w-4xl text-balance text-lg leading-snug text-oma-cream/90 sm:text-xl md:text-2xl md:leading-snug">
              <span className="text-oma-muted">Taxa de abandono de carrinho </span>
              <CountUp end={46} suffix="%" className={cn(numClass, 'mx-1 align-baseline md:mx-1.5')} />
              <span className="text-oma-muted"> menor</span>
              <span className="mt-4 block text-base font-normal leading-relaxed text-oma-muted sm:text-lg">
                Menos dúvida no tamanho e no visual — mais carrinhos concluídos.
              </span>
            </p>
          </motion.article>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-14 max-w-2xl text-center text-xs leading-relaxed text-oma-muted sm:mt-16 sm:text-sm"
        >
          Indicadores agregados de lojas acompanhadas pelo Omafit; o impacto na sua operação pode variar
          consoante catálogo, tráfego e categoria.
        </motion.p>
      </div>
    </section>
  );
}
