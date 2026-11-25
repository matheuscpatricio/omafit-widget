import { ArrowRight, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLandingLocale } from '../../contexts/LandingLocaleContext';
import { Button } from '../ui/button';

interface ShopperInsightsProps {
  onOpenInstallModal?: () => void;
  onRequestDemo?: () => void;
}

export function ShopperInsights({ onOpenInstallModal, onRequestDemo }: ShopperInsightsProps) {
  const { t } = useLandingLocale();
  const copy = t.insights;
  const reduce = useReducedMotion();
  const maxShare = Math.max(...copy.sizes.map((size) => size.share));

  return (
    <section id="clientes" className="scroll-mt-24 bg-oma-canvas px-6 py-24 md:py-32">
      <div className="mx-auto flex max-w-5xl flex-col gap-14">
        <div className="flex max-w-3xl flex-col gap-5">
          <h2 className="landing-title text-4xl font-semibold tracking-tight text-oma-cream md:text-5xl">
            {copy.title}
          </h2>
          <p className="text-lg leading-relaxed text-oma-cream/75 md:text-xl">{copy.lead}</p>
          <p className="text-sm text-oma-cream/45">{copy.exampleNote}</p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium uppercase tracking-[0.16em] text-oma-cream/50">
            {copy.averagesTitle}
          </h3>
          <dl className="grid gap-8 border-y border-white/10 py-8 sm:grid-cols-3">
            {copy.averages.map((item) => (
              <div key={item.label} className="flex flex-col gap-2">
                <dt className="text-sm text-oma-cream/55">{item.label}</dt>
                <dd className="text-3xl font-semibold tracking-tight text-oma-cream">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-oma-cream">{copy.sizeChartTitle}</h3>
            <p className="text-sm text-oma-cream/50">{copy.sizeChartName}</p>
          </div>
          <div className="flex flex-col gap-3" role="img" aria-label={copy.sizeChartTitle}>
            {copy.sizes.map((size, index) => (
              <div key={size.label} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3">
                <span className="text-sm text-oma-cream/70">{size.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-oma-cream"
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{ width: `${(size.share / maxShare) * 100}%` }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.7, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="text-right text-sm tabular-nums text-oma-cream/80">{size.share}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-oma-cream">{copy.tableTitle}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 text-oma-cream/50">
                  <th className="py-3 pr-4 font-medium">{copy.colGarment}</th>
                  <th className="py-3 pr-4 font-medium">{copy.colTries}</th>
                  <th className="py-3 font-medium">{copy.colSize}</th>
                </tr>
              </thead>
              <tbody>
                {copy.rows.map((row) => (
                  <tr key={row.garment} className="border-b border-white/8 text-oma-cream">
                    <td className="py-4 pr-4">{row.garment}</td>
                    <td className="py-4 pr-4 tabular-nums text-oma-cream/80">{row.tries}</td>
                    <td className="py-4">{row.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t border-white/10 pt-12">
          <p className="text-2xl font-semibold tracking-tight text-oma-cream md:text-3xl">{copy.cta}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full justify-center sm:w-auto"
              onClick={() => onOpenInstallModal?.()}
            >
              {t.hero.install}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full justify-center border-oma-cream/25 bg-oma-parchment/95 text-white hover:bg-oma-light hover:text-white sm:w-auto [&_svg]:text-white"
              onClick={onRequestDemo}
            >
              <Play className="h-4 w-4" />
              {t.hero.demo}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
