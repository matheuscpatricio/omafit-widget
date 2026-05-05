import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
};

/**
 * Hero: mobile = degradê vertical + imagem (cover, cover).
 * Desktop = mesmo degradê espelhado (90deg) em overlay fullscreen; imagem em contain à direita sobre fundo primário (evita crop).
 */
export function TryOnLayoutShellHero({ primaryColor, backgroundImage, blurBackground = false }: Props) {
  const p = primaryColor || '#810707';
  const bg = backgroundImage || '';

  /** Igual ao mobile (topo imagem → base primária). */
  const gradientVertical = `linear-gradient(180deg, ${p}00 0%, ${p}00 18%, ${p}d9 42%, ${p}f2 58%, ${p} 100%)`;
  /** Espelho do vertical (esq. primária → dir. transparente), igual ao que era desktop single-layer cover. */
  const gradientHorizontalMirror = `linear-gradient(90deg, ${p} 0%, ${p}f2 42%, ${p}d9 58%, ${p}00 82%, ${p}00 100%)`;

  const mobileStyle: CSSProperties = bg
    ? {
        backgroundImage: `${gradientVertical}, url("${bg}")`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center top, center top',
        backgroundRepeat: 'no-repeat, no-repeat',
      }
    : {
        backgroundImage: `linear-gradient(180deg, ${p}cc 0%, ${p} 100%)`,
        backgroundSize: 'cover',
      };

  const desktopGradientOverlayStyle: CSSProperties = {
    backgroundImage: gradientHorizontalMirror,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  };

  const desktopImageLayerStyle: CSSProperties = {
    backgroundColor: p,
    backgroundImage: `url("${bg}")`,
    backgroundSize: 'contain',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat',
  };

  const desktopNoImageStyle: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${p}cc 0%, ${p} 100%)`,
    backgroundSize: 'cover',
  };

  const bgBlurClass = blurBackground ? 'blur-[4px] scale-[1.03]' : 'blur-0 scale-100';

  return (
    <div className="pointer-events-none absolute inset-0 z-0 isolate overflow-hidden" aria-hidden="true">
      <motion.section
        className={`absolute inset-0 transition-[filter,transform] duration-200 ease-out md:hidden ${bgBlurClass}`}
        style={mobileStyle}
        initial={{ opacity: 0.96, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      />

      {bg ? (
        <motion.div
          className={`absolute inset-0 hidden overflow-hidden transition-[filter,transform] duration-200 ease-out md:block ${bgBlurClass}`}
          initial={{ opacity: 0.96, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0" style={desktopImageLayerStyle} />
          <div className="pointer-events-none absolute inset-0" style={desktopGradientOverlayStyle} />
        </motion.div>
      ) : (
        <motion.aside
          className={`absolute inset-0 hidden transition-[filter,transform] duration-200 ease-out md:block ${bgBlurClass}`}
          style={desktopNoImageStyle}
          initial={{ opacity: 0.96, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </div>
  );
}
