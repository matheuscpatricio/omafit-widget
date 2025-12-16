'use client';

import { useScroll, useTransform, motion } from 'framer-motion';
import { useRef } from 'react';

interface Image {
  src: string;
  alt?: string;
}

interface ZoomParallaxProps {
  images: Image[];
  videoUrl?: string;
}

export function ZoomParallax({ images, videoUrl }: ZoomParallaxProps) {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  const scale4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const scale5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const scale6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const scale8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const scale9 = useTransform(scrollYProgress, [0, 1], [1, 9]);

  const scales = [scale4, scale5, scale6, scale5, scale6, scale8, scale9];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {images.map(({ src, alt }, index) => {
          const scale = scales[index % scales.length];
          const isCentralItem = index === 0;

          return (
            <motion.div
              key={index}
              style={{ scale }}
              className={`absolute top-0 flex h-full w-full items-center justify-center ${
                index === 1
                  ? 'md:[&>div]:!-top-[30vh] md:[&>div]:!left-[5vw] md:[&>div]:!h-[30vh] md:[&>div]:!w-[35vw] [&>div]:!-top-[15vh] [&>div]:!left-[10vw] [&>div]:!h-[20vh] [&>div]:!w-[40vw]'
                  : ''
              } ${
                index === 2
                  ? 'md:[&>div]:!-top-[10vh] md:[&>div]:!-left-[25vw] md:[&>div]:!h-[45vh] md:[&>div]:!w-[20vw] [&>div]:!-top-[5vh] [&>div]:!-left-[15vw] [&>div]:!h-[30vh] [&>div]:!w-[25vw]'
                  : ''
              } ${
                index === 3
                  ? 'md:[&>div]:!left-[27.5vw] md:[&>div]:!h-[25vh] md:[&>div]:!w-[25vw] [&>div]:!left-[35vw] [&>div]:!h-[20vh] [&>div]:!w-[30vw]'
                  : ''
              } ${
                index === 4
                  ? 'md:[&>div]:!top-[27.5vh] md:[&>div]:!left-[5vw] md:[&>div]:!h-[25vh] md:[&>div]:!w-[20vw] [&>div]:!top-[20vh] [&>div]:!left-[10vw] [&>div]:!h-[18vh] [&>div]:!w-[25vw]'
                  : ''
              } ${
                index === 5
                  ? 'md:[&>div]:!top-[27.5vh] md:[&>div]:!-left-[22.5vw] md:[&>div]:!h-[25vh] md:[&>div]:!w-[30vw] [&>div]:!top-[20vh] [&>div]:!-left-[12vw] [&>div]:!h-[18vh] [&>div]:!w-[35vw]'
                  : ''
              } ${
                index === 6
                  ? 'md:[&>div]:!top-[22.5vh] md:[&>div]:!left-[25vw] md:[&>div]:!h-[15vh] md:[&>div]:!w-[15vw] [&>div]:!top-[15vh] [&>div]:!left-[30vw] [&>div]:!h-[12vh] [&>div]:!w-[18vw]'
                  : ''
              } `}
            >
              <div className="relative h-[40vh] w-[80vw] md:h-[25vh] md:w-[25vw] rounded-2xl overflow-hidden shadow-2xl">
                {isCentralItem && videoUrl ? (
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={src || '/placeholder.svg'}
                    alt={alt || `Parallax image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
