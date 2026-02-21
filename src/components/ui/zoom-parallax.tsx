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

  const opacity1 = useTransform(scrollYProgress, [0.15, 0.3, 0.7, 0.85], [0, 1, 1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.25, 0.4, 0.7, 0.85], [0, 1, 1, 0]);

  const pictures = [
    {
      scale: scale4,
      className: 'w-screen h-screen',
      position: 'inset-0',
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
              className={`absolute ${picture.position}`}
            >
              <div className={`relative ${picture.className} overflow-hidden`}>
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
            </motion.div>
          );
        })}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-full px-4 max-w-7xl">
            <motion.h2
              style={{ opacity: opacity1, fontFamily: '"DM Sans", sans-serif' }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl text-left"
            >
              precisão e inteligência
            </motion.h2>
            <motion.h3
              style={{ opacity: opacity2, fontFamily: '"DM Sans", sans-serif' }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl mt-2 md:mt-4 text-right"
            >
              que fortalecem sua{' '}
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'url(https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Video%20banner/omafitbanner2.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                marca
              </span>
            </motion.h3>
          </div>
        </div>
      </div>
    </div>
  );
}
