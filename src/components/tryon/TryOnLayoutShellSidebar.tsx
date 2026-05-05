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

function SidebarProgressBlock({
  progressVal,
  dense,
}: {
  progressVal: number | null;
  dense?: boolean;
}) {
  const h = dense ? 'h-2' : 'h-2.5';
  return (
    <div className={`relative ${dense ? 'w-full' : ''}`}>
      {progressVal != null ? (
        <>
          <Progress value={progressVal} className={`${h} bg-white/20`} />
          <TryOnProgressShimmer className="rounded-full" durationSec={2.2} />
        </>
      ) : (
        <div className={`relative ${h} w-full overflow-hidden rounded-full bg-white/20`}>
          <motion.div
            className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-white/70"
            animate={{ left: ['0%', '60%', '0%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <TryOnProgressShimmer className="rounded-full" durationSec={1.6} />
        </div>
      )}
    </div>
  );
}

/**
 * Layout sidebar: em mobile — barra superior (cor primária, logo centrado, progresso + passo atual).
 * Em md+ — painel esquerdo com lista de passos.
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
    <>
      {/* Mobile: barra superior = mesmo “painel” (cor primária), sem lista de passos */}
      <motion.header
        className="w-full shrink-0 md:hidden"
        style={{ backgroundColor: primaryColor, color: fg }}
        initial={{ opacity: 0.94, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex justify-center px-3 pb-2 pt-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="max-h-10 w-auto max-w-[min(220px,72vw)] object-contain object-center"
            />
          ) : (
            <div className="text-center text-sm font-semibold tracking-tight opacity-95">{storeName}</div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-white/15 px-3 py-2">
          <div className="min-w-0 flex-1">
            <SidebarProgressBlock progressVal={progressVal} dense />
          </div>
          <span
            className="max-w-[46%] shrink-0 text-right text-[11px] font-semibold leading-tight tracking-tight sm:text-xs"
            title={currentLabel}
          >
            {currentLabel}
          </span>
        </div>
      </motion.header>

      {/* Desktop: painel lateral completo */}
      <motion.aside
        className="hidden h-full min-h-0 w-[min(288px,30vw)] shrink-0 flex-col border-r border-white/15 px-4 py-6 md:flex"
        style={{ backgroundColor: primaryColor, color: fg }}
        initial={{ opacity: 0.94, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-5 flex flex-col items-start gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="max-h-12 w-auto max-w-full object-contain object-left"
            />
          ) : (
            <div className="text-left text-sm font-semibold leading-snug tracking-tight opacity-90">
              {storeName}
            </div>
          )}
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">
          {language === 'es' ? 'Progreso' : language === 'en' ? 'Progress' : 'Progresso'}
        </p>
        <div className="relative mb-5">
          <SidebarProgressBlock progressVal={progressVal} />
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden text-sm"
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
                className={`flex items-start gap-2 rounded-lg px-3 py-2 transition-colors ${
                  active ? 'bg-white/20 font-semibold' : done ? 'opacity-80' : 'opacity-55'
                }`}
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                  {done ? '✓' : idx + 1}
                </span>
                <span className="min-w-0 flex-1 break-words">{label}</span>
              </div>
            );
          })}
        </nav>

        <p className="mt-4 text-xs leading-snug opacity-75">{currentLabel}</p>
      </motion.aside>
    </>
  );
}
