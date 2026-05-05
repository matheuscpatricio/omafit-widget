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
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden bg-white">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 85% 55% at 50% 35%, ${primaryColor}40 0%, transparent 58%), linear-gradient(165deg, #fafafa 0%, #ffffff 45%, ${primaryColor}0f 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-md ring-1 ring-black/[0.06]"
          style={{
            background: `linear-gradient(145deg, ${primaryColor}24 0%, ${primaryColor}0d 100%)`,
          }}
          animate={{ scale: [1, 1.04, 1], rotate: [0, 1.5, 0, -1.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="block h-7 w-7 rounded-full shadow-inner"
            style={{ backgroundColor: primaryColor, boxShadow: `0 0 24px ${primaryColor}66` }}
            animate={{ scale: [1, 0.9, 1], opacity: [1, 0.82, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div
          className="mb-4 flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: primaryColor,
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
        <motion.p
          className="max-w-xs text-sm font-medium tracking-tight text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.4 }}
        >
          {label}
        </motion.p>
      </motion.div>
    </div>
  );
}
