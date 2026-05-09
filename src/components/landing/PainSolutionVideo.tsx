import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

/** MP4 no Storage (pesado): só começa a pedir dados quando o bloco entra no viewport. */
const VIDEO_URL =
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/VideoOmafit.mp4';

export function PainSolutionVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attachSrc, setAttachSrc] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAttachSrc(true);
      },
      { rootMargin: '160px 0px', threshold: 0 },
    );

    io.observe(root);
    return () => io.disconnect();
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !attachSrc || error) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setError(true);
    }
  }, [attachSrc, error]);

  return (
    <section
      ref={containerRef}
      aria-label="Vídeo promocional Omafit"
      className="relative mx-3 my-6 max-w-7xl sm:mx-4 sm:my-8 md:mx-6 lg:mx-auto lg:my-10"
    >
      <div className="overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated shadow-elegant-lg sm:rounded-3xl">
        <div className="relative aspect-video w-full bg-gradient-to-br from-oma-canvas via-oma-elevated/80 to-oma-canvas">
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              hasFrame ? 'opacity-100' : 'opacity-0',
            )}
            src={attachSrc ? VIDEO_URL : undefined}
            preload={attachSrc ? 'metadata' : 'none'}
            playsInline
            controls={false}
            muted={false}
            onLoadedData={() => setHasFrame(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onPlaying={() => setBuffering(false)}
            onError={() => setError(true)}
          />

          {attachSrc && !hasFrame && !error && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-oma-canvas/90 text-oma-muted"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-oma-accent" aria-hidden />
              <span className="text-sm">A preparar o vídeo…</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-oma-canvas/95 px-6 text-center text-sm text-oma-muted">
              Não foi possível carregar o vídeo. Verifica a ligação à internet e tenta novamente.
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(217,104,69,0.06),transparent)]" />

          <div className="pointer-events-auto absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-4">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!attachSrc || error}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border border-oma-cream/20 bg-oma-elevated/85 text-oma-cream shadow-elegant backdrop-blur-sm transition hover:bg-oma-elevated hover:border-oma-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oma-accent sm:h-11 sm:w-11',
                (!attachSrc || error) && 'cursor-not-allowed opacity-50',
              )}
              aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            >
              {buffering && playing ? (
                <Loader2 className="h-5 w-5 animate-spin text-oma-accent" aria-hidden />
              ) : playing ? (
                <Pause className="h-5 w-5" fill="currentColor" aria-hidden />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
