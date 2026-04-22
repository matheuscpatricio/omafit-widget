import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

/**
 * Cartão com borda animada por gradiente cônico (efeito próximo a Magic UI Border Beam).
 */
export function BorderBeamCard({
  children,
  className,
  innerClassName,
  duration = 7,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  duration?: number;
}) {
  return (
    <div className={cn('relative rounded-2xl p-[2px] overflow-hidden shadow-elegant', className)}>
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[280%] w-[280%] -translate-x-1/2 -translate-y-1/2 opacity-80 motion-reduce:hidden"
        style={{
          background:
            'conic-gradient(from 0deg, transparent, rgba(129,7,7,0.35), rgba(255,140,140,0.65), rgba(129,7,7,0.45), transparent 55%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
      <div
        className={cn(
          'relative z-[1] h-full w-full rounded-[14px] bg-white ring-1 ring-black/[0.04]',
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
