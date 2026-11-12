import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Servido de `public/videos/` no deploy; cai para YouTube se falhar. */
const VIDEO_URL = '/videos/hero.mp4';
const YOUTUBE_VIDEO_ID = 'NR56_2hkH44';
const YOUTUBE_EMBED_URL = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`;

/** Frame de pré-visualização antes do play (~1,76s); a reprodução começa em 0s só no primeiro play. */
const POSTER_TIME_SEC = 1.76;

const sectionShell =
  'relative mx-3 my-6 max-w-7xl sm:mx-4 sm:my-8 md:mx-6 lg:mx-auto lg:my-10';
const frameShell =
  'overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated shadow-elegant-lg sm:rounded-3xl';
const aspectShell =
  'relative aspect-video w-full bg-gradient-to-br from-oma-canvas via-oma-elevated/80 to-oma-canvas';

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

function YoutubeFallback() {
  return (
    <section aria-label="Omafit promotional video" className={sectionShell}>
      <div className={frameShell}>
        <div className={aspectShell}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={YOUTUBE_EMBED_URL}
            title="Omafit — virtual try-on demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export function PainSolutionVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterReadyRef = useRef(false);
  const hasStartedPlaybackRef = useRef(false);
  const [useYoutube, setUseYoutube] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [ready, setReady] = useState(false);

  const fallbackToYoutube = useCallback(() => {
    setUseYoutube(true);
  }, []);

  useEffect(() => {
    if (useYoutube) return;

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

    const markReadyWithoutPoster = () => {
      if (posterReadyRef.current || cancelled) return;
      if (video.error) {
        fallbackToYoutube();
        return;
      }
      posterReadyRef.current = true;
      setHasFrame(true);
      setReady(true);
    };

    const onLoadedMetadata = () => {
      void preparePosterFrame();
    };

    const onLoadedData = () => {
      if (!posterReadyRef.current) void preparePosterFrame();
    };

    const readyTimeout = window.setTimeout(() => {
      if (video.error) fallbackToYoutube();
      else markReadyWithoutPoster();
    }, 12_000);

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('loadeddata', onLoadedData);
    try {
      video.load();
    } catch {
      fallbackToYoutube();
    }
    if (video.readyState >= 1) {
      void preparePosterFrame();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimeout);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('loadeddata', onLoadedData);
    };
  }, [useYoutube, fallbackToYoutube]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready) return;

    try {
      if (video.paused) {
        if (!hasStartedPlaybackRef.current) {
          await seekVideo(video, 0);
          hasStartedPlaybackRef.current = true;
        }
        await video.play();
      } else {
        video.pause();
      }
    } catch {
      fallbackToYoutube();
    }
  }, [ready, fallbackToYoutube]);

  if (useYoutube) {
    return <YoutubeFallback />;
  }

  const showPreparing = !ready;

  return (
    <section aria-label="Omafit promotional video" className={sectionShell}>
      <div className={frameShell}>
        <div className={aspectShell}>
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
            onError={fallbackToYoutube}
          />

          {showPreparing && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-oma-canvas/90 text-oma-muted"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2 className="h-8 w-8 animate-spin text-oma-accent" aria-hidden />
              <span className="text-sm">Loading video…</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(217,104,69,0.06),transparent)]" />

          <div className="pointer-events-auto absolute bottom-3 left-3 z-10 sm:bottom-4 sm:left-4">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border border-oma-cream/20 bg-oma-elevated/85 text-oma-cream shadow-elegant backdrop-blur-sm transition hover:bg-oma-elevated hover:border-oma-accent/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oma-accent sm:h-11 sm:w-11',
                !ready && 'cursor-not-allowed opacity-50',
              )}
              aria-label={playing ? 'Pause video' : 'Play video'}
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
