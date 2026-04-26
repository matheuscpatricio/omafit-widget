/** Vídeo promocional entre a secção de dores e a de solução (YouTube). */
const YOUTUBE_VIDEO_ID = 'o6OHZzTjB9s';

export function PainSolutionYoutube() {
  return (
    <section
      aria-label="Vídeo Omafit no YouTube"
      className="relative mx-3 my-6 max-w-7xl sm:mx-4 sm:my-8 md:mx-6 lg:mx-auto lg:my-10"
    >
      <div className="overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated shadow-elegant-lg sm:rounded-3xl">
        <div className="relative aspect-video w-full bg-oma-canvas">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
            title="Omafit no YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
