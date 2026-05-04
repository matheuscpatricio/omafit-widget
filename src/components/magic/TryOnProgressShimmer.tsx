/**
 * Efeito tipo “border beam” / brilho animado (inspirado em Magic UI — magicui.design).
 * Variante mínima vendored: faixa em gradiente a mover-se sobre a barra de progresso.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Duração de uma passagem completa (s) */
  durationSec?: number;
};

export function TryOnProgressShimmer({ className, durationSec = 2.4 }: Props) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-full', className)}>
      <motion.div
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '400%' }}
        transition={{
          duration: durationSec,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
