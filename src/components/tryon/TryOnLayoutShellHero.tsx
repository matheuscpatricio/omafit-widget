import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
};

/** Hero: imagem de fundo + cor primária com degradê na junção (desktop: esq. primária / dir. imagem; mobile: cima imagem / baixo primária). */
export function TryOnLayoutShellHero({
  primaryColor,
  backgroundImage,
  blurBackground = false,
}: Props) {
  const p = primaryColor || '#810707';
  const bg = backgroundImage || '';

  const mobileStyle: CSSProperties = bg
    ? {
        backgroundImage: `linear-gradient(180deg, ${p}00 0%, ${p}00 18%, ${p}d9 42%, ${p}f2 58%, ${p} 100%), url("${bg}")`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center top, center top',
        backgroundRepeat: 'no-repeat, no-repeat',
      }
    : {
        backgroundImage: `linear-gradient(180deg, ${p}cc 0%, ${p} 100%)`,
        backgroundSize: 'cover',
      };

  const desktopStyle: CSSProperties = bg
    ? {
        backgroundColor: p,
        backgroundImage: `linear-gradient(90deg, ${p} 0%, ${p} 32%, ${p}e8 44%, ${p}55 56%, ${p}00 68%), url("${bg}")`,
        backgroundSize: 'cover, contain',
        backgroundPosition: 'left center, right center',
        backgroundRepeat: 'no-repeat, no-repeat',
      }
    : {
        backgroundImage: `linear-gradient(90deg, ${p} 0%, ${p}dd 100%)`,
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

      <motion.aside
        className={`absolute inset-0 hidden transition-[filter,transform] duration-200 ease-out md:block ${bgBlurClass}`}
        style={desktopStyle}
        initial={{ opacity: 0.96, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
