import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
  /** Step 1 (info): degradê desktop mais longo e marcante até à zona da imagem. */
  infoStep?: boolean;
};

/** Hero: imagem de fundo + cor primária com degradê na junção (desktop: esq. primária / dir. imagem; mobile: cima imagem / baixo primária). */
export function TryOnLayoutShellHero({
  primaryColor,
  backgroundImage,
  blurBackground = false,
  infoStep = false,
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

  /** Transição longa e contínua (sem “linha”): muitas paradas + sem fundo sólido por baixo; imagem em cover alinhada à direita. */
  const desktopGradient = infoStep
    ? `linear-gradient(90deg, ${p} 0%, ${p} 14%, ${p}fc 20%, ${p}f4 28%, ${p}e6 36%, ${p}d2 44%, ${p}b8 52%, ${p}98 60%, ${p}74 67%, ${p}54 74%, ${p}38 80%, ${p}24 86%, ${p}14 90%, ${p}0a 94%, ${p}03 97%, ${p}00 100%)`
    : `linear-gradient(90deg, ${p} 0%, ${p}fa 10%, ${p}ee 22%, ${p}dc 34%, ${p}c4 44%, ${p}a5 54%, ${p}82 63%, ${p}62 71%, ${p}44 78%, ${p}2c 84%, ${p}1a 89%, ${p}0c 93%, ${p}04 97%, ${p}00 100%)`;

  const desktopStyle: CSSProperties = bg
    ? {
        backgroundImage: `${desktopGradient}, url("${bg}")`,
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
