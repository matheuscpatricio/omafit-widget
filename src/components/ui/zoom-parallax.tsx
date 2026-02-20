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

  const positions = [
    { top: '50%', left: '50%', transform: '-translate-x-1/2 -translate-y-1/2' },
    { top: '0%', left: '5%', transform: 'md:-translate-y-[30vh]' },
    { top: '0%', left: '-15%', transform: 'md:-translate-y-[10vh] md:-translate-x-[10vw]' },
    { top: '50%', left: '60%', transform: '-translate-y-1/2' },
    { top: '70%', left: '5%', transform: '' },
    { top: '70%', left: '-10%', transform: 'md:-translate-x-[12.5vw]' },
    { top: '60%', left: '65%', transform: '' },
  ];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden bg-black/50">
        {images.map(({ src, alt }, index) => {
          const scale = scales[index % scales.length];
          const isCentralItem = index === 0;
          const position = positions[index] || positions[0];

          return (
            <motion.div
              key={index}
              style={{
                scale,
                top: position.top,
                left: position.left,
              }}
              className={`absolute ${position.transform}`}
            >
              <div
                className={`relative rounded-2xl overflow-hidden shadow-2xl
                  ${isCentralItem
                    ? 'h-[40vh] w-[80vw] md:h-[50vh] md:w-[40vw]'
                    : index === 1
                      ? 'h-[20vh] w-[40vw] md:h-[30vh] md:w-[35vw]'
                      : index === 2
                        ? 'h-[25vh] w-[35vw] md:h-[45vh] md:w-[20vw]'
                        : index === 3
                          ? 'h-[18vh] w-[35vw] md:h-[25vh] md:w-[25vw]'
                          : index === 4
                            ? 'h-[18vh] w-[30vw] md:h-[25vh] md:w-[20vw]'
                            : index === 5
                              ? 'h-[20vh] w-[40vw] md:h-[25vh] md:w-[30vw]'
                              : 'h-[15vh] w-[25vw] md:h-[15vh] md:w-[15vw]'
                  }
                `}
              >
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
