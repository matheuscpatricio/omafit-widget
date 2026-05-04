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
      className="flex h-full min-h-0 min-w-[4.75rem] w-[min(32vw,7.25rem)] shrink-0 flex-col border-r border-white/15 px-2 py-3 sm:min-w-[5.25rem] sm:w-[min(34vw,9rem)] sm:px-3 md:min-w-0 md:w-[min(288px,30vw)] md:px-4 md:py-6"
      style={{ backgroundColor: primaryColor, color: fg }}
      initial={{ opacity: 0.94, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-3 flex flex-col items-start gap-1 md:mb-5 md:gap-2">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={storeName}
            className="max-h-9 w-auto max-w-full object-contain object-left sm:max-h-11 md:max-h-12"
          />
        ) : (
          <div className="text-left text-[11px] font-semibold leading-snug tracking-tight opacity-90 sm:text-xs md:text-sm">
            {storeName}
          </div>
        )}
      </div>

      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] opacity-80 sm:mb-2 sm:text-[10px] sm:tracking-[0.14em]">
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

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden text-[10px] leading-snug sm:gap-1.5 sm:text-xs md:gap-1.5 md:text-sm"
        aria-label="Steps"
      >
        {steps.map((s) => {
          const idx = steps.findIndex((x) => x.key === s.key);
          const cur = steps.findIndex((x) => x.key === step);
          const done = idx < cur;
          const active = idx === cur;
          const label = language === 'es' ? s.labelEs : language === 'en' ? s.labelEn : s.labelPt;
          return (
            <div
              key={s.key}
              className={`flex items-start gap-1 rounded-md px-1.5 py-1 transition-colors sm:gap-2 sm:rounded-lg sm:px-2 sm:py-1.5 md:px-3 md:py-2 ${
                active ? 'bg-white/20 font-semibold' : done ? 'opacity-80' : 'opacity-55'
              }`}
            >
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[8px] sm:h-5 sm:w-5 sm:text-[10px]">
                {done ? '✓' : idx + 1}
              </span>
              <span className="min-w-0 flex-1 break-words">{label}</span>
            </div>
          );
        })}
      </nav>

      <p className="mt-2 line-clamp-3 text-[9px] leading-snug opacity-75 sm:mt-3 sm:text-[10px] md:mt-4 md:text-xs">{currentLabel}</p>
    </motion.aside>
  );
}
