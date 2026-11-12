const YOUTUBE_VIDEO_ID = 'NR56_2hkH44';
const YOUTUBE_EMBED_URL = `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`;

export function PainSolutionVideo() {
  return (
    <section
      aria-label="Omafit promotional video"
      className="relative mx-3 my-6 max-w-7xl sm:mx-4 sm:my-8 md:mx-6 lg:mx-auto lg:my-10"
    >
      <div className="overflow-hidden rounded-2xl border border-oma-line/40 bg-oma-elevated shadow-elegant-lg sm:rounded-3xl">
        <div className="relative aspect-video w-full bg-gradient-to-br from-oma-canvas via-oma-elevated/80 to-oma-canvas">
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
