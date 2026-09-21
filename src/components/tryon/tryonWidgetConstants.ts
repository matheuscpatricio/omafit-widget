export const TRYON_LAYOUT_SESSION_PREFIX = 'omafit_tryon_layout:';

export const SHOPPER_RESTORE_DISMISS_PREFIX = 'omafit_shopper_restore_dismissed_v2:';

export const SHOPPER_SAVE_DISMISS_PREFIX = 'omafit_shopper_save_dismissed_v1:';

export const GPT_INTERACTION_LIMIT = 8;

export const TRYON_IMAGE_MAX_DIMENSION = 1024;

export const TRYON_IMAGE_QUALITY = 0.76;

export const TRYON_REMOTE_IMAGE_MAX_DIMENSION = 1024;

export const TRYON_REMOTE_IMAGE_QUALITY = 75;

export const TRYON_MAX_POLL_MS = 300000;

/** Entrada de textos (Framer Motion) — variantes estáveis fora do componente. */
export const tryonTextStaggerParent = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
} as const;

export const tryonTextStaggerChild = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

export const tryonFadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
} as const;
