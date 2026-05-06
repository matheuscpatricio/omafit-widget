import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  label: string;
};

/**
 * Entrada enquanto `tryon_layout` ainda não foi resolvido (Supabase / postMessage).
 * Evita mostrar o layout default antes do hero/sidebar.
 */
export function TryonLayoutPendingSplash({ primaryColor, label }: Props) {
  void primaryColor;
  const neutralAccent = '#6b7280';
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden bg-white">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 55% at 50% 35%, rgba(107,114,128,0.18) 0%, transparent 58%), linear-gradient(165deg, #f5f5f5 0%, #ffffff 45%, rgba(107,114,128,0.08) 100%)',
        }}
        initial={false}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        initial={false}
      >
        <motion.div
          className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-md ring-1 ring-black/[0.06]"
          style={{
            background: 'linear-gradient(145deg, rgba(107,114,128,0.20) 0%, rgba(107,114,128,0.10) 100%)',
          }}
          animate={{ scale: [1, 1.04, 1], rotate: [0, 1.5, 0, -1.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="block h-7 w-7 rounded-full shadow-inner"
            style={{ backgroundColor: neutralAccent, boxShadow: '0 0 24px rgba(107,114,128,0.35)' }}
            animate={{ scale: [1, 0.9, 1], opacity: [1, 0.82, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div className="mb-4 flex items-center justify-center gap-1.5" initial={false}>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: neutralAccent,
              }}
              animate={{ y: [0, -6, 0], opacity: [0.45, 1, 0.45] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.14,
                ease: [0.45, 0, 0.55, 1],
              }}
            />
          ))}
        </motion.div>
        <motion.p className="max-w-xs text-sm font-medium tracking-tight text-gray-600" initial={false}>
          {label}
        </motion.p>
      </motion.div>
    </div>
  );
}
