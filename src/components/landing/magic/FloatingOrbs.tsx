import { motion } from 'framer-motion';

/** Orbes de luz flutuantes (camada decorativa). */
export function FloatingOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[#810707]/25 blur-[100px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-16 top-1/3 h-96 w-96 rounded-full bg-rose-300/30 blur-[110px]"
        animate={{ x: [0, -25, 0], y: [0, 25, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 bottom-0 h-64 w-64 rounded-full bg-amber-200/20 blur-[90px]"
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
