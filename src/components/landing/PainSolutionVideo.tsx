import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

const VIDEO_URL =
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/VideoOmafit.mp4';

/** Frame de pré-visualização antes do play; a reprodução começa sempre em 0s. */
const POSTER_TIME_SEC = 2;

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSec) < 0.05) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = timeSec;
    } catch {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }
  });
}

export function PainSolutionVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterReadyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const preparePosterFrame = async () => {
      if (posterReadyRef.current || cancelled) return;

      const duration = video.duration;
      const posterTime =
        Number.isFinite(duration) && duration > 0
          ? Math.min(POSTER_TIME_SEC, Math.max(0, duration - 0.05))
          : POSTER_TIME_SEC;

      try {
        await seekVideo(video, posterTime);
        if (cancelled) return;
        video.pause();
        posterReadyRef.current = true;
        setHasFrame(true);
        setReady(true);
      } catch {
        if (cancelled) return;
        posterReadyRef.current = true;
        setHasFrame(true);
        setReady(true);
      }
    };

    const onLoadedMetadata = () => {
      void preparePosterFrame();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    try {
      video.load();
    } catch {
      /* noop */
    }
    if (video.readyState >= 1) {
      void preparePosterFrame();
    }

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready || error) return;

    try {
      if (video.paused) {
        await seekVideo(video, 0);
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      setError(true);
    }
  }, [ready, error]);

  const showPreparing = !ready && !error;

  return (
    <section
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
            src={VIDEO_URL}
            preload="auto"
            playsInline
            controls={false}
            muted={false}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onError={() => setError(true)}
          />

          {showPreparing && (
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
              disabled={!ready || error}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border border-oma-cream/20 bg-oma-elevated/85 text-oma-cream shadow-elegant backdrop-blur-sm transition hover:bg-oma-elevated hover:border-oma-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oma-accent sm:h-11 sm:w-11',
                (!ready || error) && 'cursor-not-allowed opacity-50',
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
