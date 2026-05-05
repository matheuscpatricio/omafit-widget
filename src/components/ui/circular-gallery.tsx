import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MutableRefObject,
} from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CircularGalleryItem {
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  objectPosition?: string;
}

export interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: CircularGalleryItem[];
  /** Distância em px dos cartões ao centro (eixo 3D). */
  radius?: number;
  /** Incremento de rotação (graus) por frame quando em movimento. */
  autoRotateSpeed?: number;
}

/**
 * Galeria circular 3D (rotateY + translateZ). Leve: só auto-rotação quando o bloco está visível;
 * com `prefers-reduced-motion` cai para lista horizontal com scroll.
 */
export const CircularGallery = forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 420, autoRotateSpeed = 0.012, ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const [rotation, setRotation] = useState(0);
    const [visible, setVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number>(0);

    const setContainerRef = (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node;
    };

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
        threshold: 0.12,
        rootMargin: '40px 0px',
      });
      io.observe(el);
      return () => io.disconnect();
    }, []);

    useEffect(() => {
      if (reduceMotion || items.length < 2) return;
      const tick = () => {
        if (visible) {
          setRotation((prev) => prev + autoRotateSpeed);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [visible, reduceMotion, autoRotateSpeed, items.length]);

    const n = items.length;

    if (reduceMotion || n === 0) {
      return (
        <div
          ref={setContainerRef}
          role="region"
          aria-label="Galeria de soluções"
          className={cn('w-full', className)}
          {...props}
        >
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <article
                key={item.imageUrl + item.title}
                className="w-[min(280px,78vw)] shrink-0 snap-center overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated shadow-elegant"
              >
                <div className="relative aspect-[3/4] w-full">
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: item.objectPosition ?? 'center' }}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 text-oma-cream">
                    <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-oma-cream/80">{item.subtitle}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      );
    }

    const anglePerItem = 360 / n;

    const cardW = 260;
    const cardH = 340;
    const ml = -cardW / 2;
    const mt = -cardH / 2;

    return (
      <div
        ref={setContainerRef}
        role="region"
        aria-label="Galeria circular de soluções"
        className={cn('relative flex h-full min-h-[280px] w-full items-center justify-center', className)}
        style={{ perspective: 'min(2000px, 140vw)' }}
        {...props}
      >
        <div
          className="relative h-[min(100%,420px)] w-full max-w-[min(100%,960px)]"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.35, 1 - normalizedAngle / 180);

            return (
              <div
                key={item.imageUrl + item.title}
                role="group"
                aria-label={item.title}
                className="absolute"
                style={{
                  width: cardW,
                  height: cardH,
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: ml,
                  marginTop: mt,
                  opacity,
                  transition: 'opacity 0.35s linear',
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-oma-line/50 bg-oma-elevated/90 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.65)] backdrop-blur-sm">
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: item.objectPosition ?? 'center' }}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/45 to-transparent p-3 sm:p-4">
                    <h3 className="text-sm font-semibold leading-snug text-oma-cream sm:text-base">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-oma-cream/85 sm:text-xs">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CircularGallery.displayName = 'CircularGallery';
