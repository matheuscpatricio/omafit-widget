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

  const y = useTransform(scrollYProgress, [0, 1], ['0vh', '-150vh']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0]);

  const pictures = [
    {
      scale: scale4,
      top: '50%',
      left: '50%',
      className: '-translate-x-1/2 -translate-y-1/2 w-[70vw] h-[40vh] md:w-[25vw] md:h-[25vw]',
    },
    {
      scale: scale5,
      top: '0',
      left: '25%',
      className: '-translate-x-1/2 w-[35vw] h-[30vh] md:w-[25vw] md:h-[25vw]',
    },
    {
      scale: scale6,
      top: '5vh',
      left: '5vw',
      className: 'w-[25vw] h-[30vh] md:w-[20vw] md:h-[45vh]',
    },
    {
      scale: scale5,
      top: '10vh',
      left: '70vw',
      className: 'w-[25vw] h-[25vh] md:w-[25vw] md:h-[25vw]',
    },
    {
      scale: scale6,
      top: '75vh',
      left: '27.5vw',
      className: 'w-[25vw] h-[20vh] md:w-[20vw] md:h-[25vw]',
    },
    {
      scale: scale8,
      top: '60vh',
      left: '5vw',
      className: 'w-[30vw] h-[25vh] md:w-[30vw] md:h-[25vw]',
    },
    {
      scale: scale9,
      top: '65vh',
      left: '70vw',
      className: 'w-[20vw] h-[20vh] md:w-[15vw] md:h-[15vw]',
    },
  ];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {pictures.map((picture, index) => {
          const isCentralItem = index === 0;

          return (
            <motion.div
              key={index}
              style={{ scale: picture.scale }}
              className="absolute w-full h-full flex items-center justify-center"
            >
              <div
                className={`relative ${picture.className}`}
                style={{
                  top: picture.top,
                  left: picture.left,
                }}
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  {isCentralItem && videoUrl ? (
                    <video
                      src={videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={images[index]?.src || '/placeholder.svg'}
                      alt={images[index]?.alt || `Parallax image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          style={{ y, opacity }}
          className="absolute left-1/2 top-[calc(50vh+15rem)] -translate-x-1/2 pointer-events-none z-50"
        >
          <p className="text-white text-4xl md:text-6xl lg:text-7xl font-bold text-center px-4 drop-shadow-2xl">
            Precisão absoluta em medidas
          </p>
        </motion.div>
      </div>
    </div>
  );
}
