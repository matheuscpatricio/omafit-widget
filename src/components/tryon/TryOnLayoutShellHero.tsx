import type { CSSProperties } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
  /** Enquanto true, não pinta gradiente/imagem da marca — só placeholder neutro até UI/fontes estarem prontos. */
  presentationLocked?: boolean;
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

/** Degradê desktop: paragens muito opacas em volta de `seam` (%), com cauda suave para transparente. */
function buildDesktopOverlayGradient(primaryHex: string, seamPct: number | null): string {
  const p = primaryHex;
  if (seamPct == null) {
    return `linear-gradient(90deg, ${p} 0%, ${p}f2 42%, ${p}d9 58%, ${p}00 82%, ${p}00 100%)`;
  }
  const s = clampPct(seamPct);
  let t1 = clampPct(s - 26);
  let t2 = clampPct(s - 16);
  let t3 = clampPct(s - 8);
  let t4 = clampPct(s - 2);
  let t5 = s;
  let t6 = clampPct(s + 4);
  let t7 = clampPct(s + 10);
  let t8 = clampPct(s + 18);
  let t9 = Math.min(100, Math.max(t8 + 0.5, s + 30));
  if (t2 <= t1) t2 = Math.min(100, t1 + 0.35);
  if (t3 <= t2) t3 = Math.min(100, t2 + 0.35);
  if (t4 <= t3) t4 = Math.min(100, t3 + 0.35);
  if (t5 <= t4) t5 = Math.min(100, t4 + 0.35);
  if (t6 <= t5) t6 = Math.min(100, t5 + 0.35);
  if (t7 <= t6) t7 = Math.min(100, t6 + 0.35);
  if (t8 <= t7) t8 = Math.min(100, t7 + 0.35);
  if (t9 <= t8) t9 = Math.min(100, t8 + 0.35);
  return `linear-gradient(90deg, ${p} 0%, ${p} ${t1}%, ${p}fe ${t2}%, ${p}fc ${t3}%, ${p}fa ${t4}%, ${p}f5 ${t5}%, ${p}d5 ${t6}%, ${p}88 ${t7}%, ${p}38 ${t8}%, ${p}00 ${t9}%, ${p}00 100%)`;
}

/**
 * Hero: mobile = degradê vertical + imagem (cover, cover).
 * Desktop = imagem contain à direita + degradê calculado com pico de opacidade na junção primária/imagem.
 *
 * Até a imagem estar decodificada e a costura medida, mostra só gradiente da marca (sem foto) para evitar
 * “piscar” vermelho + produto antes do layout final.
 */
export function TryOnLayoutShellHero({
  primaryColor,
  backgroundImage,
  blurBackground = false,
  presentationLocked = false,
}: Props) {
  const p = primaryColor || '#810707';
  const bg = backgroundImage || '';
  const desktopMeasureRef = useRef<HTMLDivElement>(null);
  const [seamPercent, setSeamPercent] = useState<number | null>(null);
  /** Superfície completa (foto + overlay alinhados) — um único commit após decode + measure. */
  const [surfaceReady, setSurfaceReady] = useState(() => !bg);
  const [imgFailed, setImgFailed] = useState(false);

  const gradientVertical = `linear-gradient(180deg, ${p}00 0%, ${p}00 18%, ${p}d9 42%, ${p}f2 58%, ${p} 100%)`;

  const desktopOverlayImage = useMemo(
    () => buildDesktopOverlayGradient(p, seamPercent ?? (bg && surfaceReady ? 58 : null)),
    [p, seamPercent, bg, surfaceReady]
  );

  const desktopSeamFeatherStyle = useMemo((): CSSProperties | null => {
    if (!bg || !surfaceReady || seamPercent == null) return null;
    const s = clampPct(seamPercent);
    return {
      position: 'absolute',
      left: `${s}%`,
      top: 0,
      bottom: 0,
      width: 'min(2.25rem, 5.5vw)',
      transform: 'translateX(-50%)',
      zIndex: 2,
      pointerEvents: 'none',
      background: `linear-gradient(90deg, transparent 0%, ${p}45 42%, ${p}2a 72%, transparent 100%)`,
      WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
      maskImage: 'linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%)',
    };
  }, [bg, seamPercent, p, surfaceReady]);

  useLayoutEffect(() => {
    if (!bg) {
      setSeamPercent(null);
      setSurfaceReady(true);
      setImgFailed(false);
      return;
    }

    setImgFailed(false);
    setSurfaceReady(false);
    setSeamPercent(null);

    let cancelled = false;
    let revealStarted = false;
    const img = new Image();

    const measure = () => {
      if (cancelled) return;
      const el = desktopMeasureRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w <= 0 || h <= 0) return;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw <= 0 || ih <= 0) return;
      setSeamPercent(containImageLeftPercent(w, h, iw, ih));
    };

    const runReveal = () => {
      if (cancelled || revealStarted) return;
      revealStarted = true;
      void (async () => {
        try {
          await img.decode();
        } catch {
          /* decode opcional */
        }
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          measure();
          setSurfaceReady(true);
        });
      })();
    };

    img.onload = () => runReveal();

    img.onerror = () => {
      if (!cancelled) {
        setSeamPercent(null);
        setSurfaceReady(true);
        setImgFailed(true);
      }
    };

    img.src = bg;
    if (img.complete && img.naturalWidth > 0) {
      queueMicrotask(runReveal);
    }

    const el = desktopMeasureRef.current;
    const ro =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!cancelled && img.complete && img.naturalWidth > 0) {
              measure();
            }
          })
        : null;
    ro?.observe(el as Element);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [bg]);

  const mobileStyleFull: CSSProperties =
    !imgFailed && bg
      ? {
          backgroundImage: `${gradientVertical}, url("${bg}")`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center top, center top',
          backgroundRepeat: 'no-repeat, no-repeat',
        }
      : {
          backgroundImage: 'linear-gradient(180deg, #d1d5db 0%, #9ca3af 100%)',
          backgroundSize: 'cover',
        };

  /** Placeholder alinhado ao hero sem foto (evita flash da imagem a carregar). */
  const mobileStylePlaceholder: CSSProperties = {
    backgroundImage: 'linear-gradient(180deg, #e5e7eb 0%, #d1d5db 45%, #9ca3af 100%)',
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
    backgroundImage: 'linear-gradient(90deg, #d1d5db 0%, #9ca3af 100%)',
    backgroundSize: 'cover',
  };

  const bgBlurClass = blurBackground ? 'blur-[4px] scale-[1.03]' : 'blur-0 scale-100';

  const showHeroVisual = Boolean(bg && surfaceReady && !imgFailed && !presentationLocked);

  return (
    <div
      ref={desktopMeasureRef}
      className="pointer-events-none absolute inset-0 z-0 isolate overflow-hidden"
      aria-hidden="true"
    >
      <motion.section
        className={`absolute inset-0 transition-[filter,transform] duration-200 ease-out md:hidden ${bgBlurClass}`}
        style={
          showHeroVisual ? mobileStyleFull : bg && imgFailed ? mobileStyleFull : mobileStylePlaceholder
        }
        initial={false}
      />

      {bg && !imgFailed ? (
        <motion.div
          className={`absolute inset-0 hidden overflow-hidden transition-[filter,transform] duration-200 ease-out md:block ${bgBlurClass}`}
          initial={false}
        >
          {showHeroVisual ? (
            <>
              <div className="absolute inset-0" style={desktopImageLayerStyle} />
              <div className="pointer-events-none absolute inset-0" style={desktopGradientOverlayStyle} />
              {desktopSeamFeatherStyle ? <div style={desktopSeamFeatherStyle} /> : null}
            </>
          ) : (
            <div className="absolute inset-0" style={desktopNoImageStyle} />
          )}
        </motion.div>
      ) : (
        <motion.aside
          className={`absolute inset-0 hidden transition-[filter,transform] duration-200 ease-out md:block ${bgBlurClass}`}
          style={desktopNoImageStyle}
          initial={false}
        />
      )}
    </div>
  );
}
