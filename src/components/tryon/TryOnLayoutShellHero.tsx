import type { CSSProperties } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
};

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Borda esquerda da caixa da imagem (% da largura), com background-size contain + right center. */
function containImageLeftPercent(w: number, h: number, iw: number, ih: number): number {
  if (w <= 0 || h <= 0 || iw <= 0 || ih <= 0) return 58;
  const scale = Math.min(w / iw, h / ih);
  const dispW = iw * scale;
  return clampPct(((w - dispW) / w) * 100);
}

/** Degradê desktop: espelho do mobile fora da junção; paragens mais opacas em volta de `seam` (%). */
function buildDesktopOverlayGradient(primaryHex: string, seamPct: number | null): string {
  const p = primaryHex;
  if (seamPct == null) {
    return `linear-gradient(90deg, ${p} 0%, ${p}f2 42%, ${p}d9 58%, ${p}00 82%, ${p}00 100%)`;
  }
  const s = clampPct(seamPct);
  let t1 = clampPct(s - 18);
  let t2 = clampPct(s - 10);
  let t3 = clampPct(s - 4);
  let t4 = s;
  let t5 = clampPct(s + 5);
  let t6 = clampPct(s + 14);
  let t7 = Math.min(100, Math.max(t6 + 0.5, s + 24));
  if (t2 <= t1) t2 = Math.min(100, t1 + 0.5);
  if (t3 <= t2) t3 = Math.min(100, t2 + 0.5);
  if (t4 <= t3) t4 = Math.min(100, t3 + 0.5);
  if (t5 <= t4) t5 = Math.min(100, t4 + 0.5);
  if (t6 <= t5) t6 = Math.min(100, t5 + 0.5);
  if (t7 <= t6) t7 = Math.min(100, t6 + 0.5);
  return `linear-gradient(90deg, ${p} 0%, ${p} ${t1}%, ${p}fc ${t2}%, ${p}f7 ${t3}%, ${p}ee ${t4}%, ${p}8a ${t5}%, ${p}32 ${t6}%, ${p}00 ${t7}%, ${p}00 100%)`;
}

/**
 * Hero: mobile = degradê vertical + imagem (cover, cover).
 * Desktop = imagem contain à direita + degradê calculado com pico de opacidade na junção primária/imagem.
 */
export function TryOnLayoutShellHero({ primaryColor, backgroundImage, blurBackground = false }: Props) {
  const p = primaryColor || '#810707';
  const bg = backgroundImage || '';
  const desktopMeasureRef = useRef<HTMLDivElement>(null);
  const [seamPercent, setSeamPercent] = useState<number | null>(null);

  const gradientVertical = `linear-gradient(180deg, ${p}00 0%, ${p}00 18%, ${p}d9 42%, ${p}f2 58%, ${p} 100%)`;

  const desktopOverlayImage = useMemo(() => buildDesktopOverlayGradient(p, seamPercent), [p, seamPercent]);

  useLayoutEffect(() => {
    if (!bg) {
      setSeamPercent(null);
      return;
    }

    let cancelled = false;
    const img = new Image();

    const measure = () => {
      const el = desktopMeasureRef.current;
      if (!el || cancelled) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw <= 0 || ih <= 0) return;
      setSeamPercent(containImageLeftPercent(w, h, iw, ih));
    };

    img.onload = measure;
    img.onerror = () => {
      if (!cancelled) setSeamPercent(null);
    };
    img.src = bg;

    const el = desktopMeasureRef.current;
    const ro =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measure();
          })
        : null;
    ro?.observe(el as Element);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [bg]);

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
    backgroundImage: desktopOverlayImage,
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
    <div
      ref={desktopMeasureRef}
      className="pointer-events-none absolute inset-0 z-0 isolate overflow-hidden"
      aria-hidden="true"
    >
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
