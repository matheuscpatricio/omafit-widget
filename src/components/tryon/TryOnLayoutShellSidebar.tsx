import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { TryOnProgressShimmer } from '@/components/magic/TryOnProgressShimmer';
import { contrastTextOnHex } from '@/utils/contrastText';
import {
  getTryonSidebarSteps,
  tryonSidebarLabelForStep,
  tryonSidebarProgressForStep,
  type TryOnFlowStep,
} from './tryonSidebarStepMeta';

type Props = {
  primaryColor: string;
  storeName: string;
  logoUrl: string;
  language: 'pt' | 'es' | 'en';
  step: TryOnFlowStep;
};

/**
 * Painel esquerdo do layout `tryon_layout=sidebar` (logo, passos, progresso).
 * O conteúdo do fluxo fica à direita no TryOnWidget — ver `display:contents` no wrapper.
 */
export function TryOnLayoutShellSidebar({
  primaryColor,
  storeName,
  logoUrl,
  language,
  step,
}: Props) {
  const fg = contrastTextOnHex(primaryColor);
  const steps = getTryonSidebarSteps();
  const progressVal = tryonSidebarProgressForStep(step);
  const currentLabel = tryonSidebarLabelForStep(step, language);

  return (
    <motion.aside
      className="flex w-full shrink-0 flex-col border-b border-white/15 px-4 py-4 md:w-[min(288px,30vw)] md:border-b-0 md:border-r md:py-6"
      style={{ backgroundColor: primaryColor, color: fg }}
      initial={{ opacity: 0.94, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-5 flex flex-col items-center gap-2">
        {logoUrl ? (
          <div className="flex max-h-14 w-full items-center justify-center rounded-xl bg-white/10 px-3 py-2">
            <img src={logoUrl} alt={storeName} className="max-h-12 w-auto max-w-full object-contain" />
          </div>
        ) : (
          <div className="text-center text-sm font-semibold tracking-tight opacity-90">{storeName}</div>
        )}
      </div>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
        {language === 'es' ? 'Progreso' : language === 'en' ? 'Progress' : 'Progresso'}
      </p>
      <div className="relative mb-5">
        {progressVal != null ? (
          <>
            <Progress value={progressVal} className="h-2.5 bg-white/20" />
            <TryOnProgressShimmer className="rounded-full" durationSec={2.2} />
          </>
        ) : (
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-white/70"
              animate={{ left: ['0%', '60%', '0%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <TryOnProgressShimmer className="rounded-full" durationSec={1.6} />
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto text-sm" aria-label="Steps">
        {steps.map((s) => {
          const idx = steps.findIndex((x) => x.key === s.key);
          const cur = steps.findIndex((x) => x.key === step);
          const done = idx < cur;
          const active = idx === cur;
          const label = language === 'es' ? s.labelEs : language === 'en' ? s.labelEn : s.labelPt;
          return (
            <div
              key={s.key}
              className={`rounded-lg px-3 py-2 transition-colors ${
                active ? 'bg-white/20 font-semibold' : done ? 'opacity-80' : 'opacity-55'
              }`}
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {done ? '✓' : idx + 1}
              </span>
              {label}
            </div>
          );
        })}
      </nav>

      <p className="mt-4 hidden text-xs leading-snug opacity-75 md:block">{currentLabel}</p>
    </motion.aside>
  );
}
