import { useRef, useEffect } from 'react';
import gsap from 'gsap';

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
      <div className="absolute inset-0 opacity-60">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(255, 0, 150, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(0, 150, 255, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(150, 0, 255, 0.2) 0%, transparent 50%)
            `,
            animation: 'morphBackground 20s ease-in-out infinite',
          }}
        />
      </div>

      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() * 255}, ${Math.random() * 255}, 255, ${Math.random() * 0.5 + 0.3})`,
              animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      <style>{`
        @keyframes morphBackground {
          0%, 100% {
            filter: hue-rotate(0deg) blur(60px);
          }
          33% {
            filter: hue-rotate(120deg) blur(70px);
          }
          66% {
            filter: hue-rotate(240deg) blur(60px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(20px, -30px) scale(1.2);
            opacity: 0.6;
          }
          50% {
            transform: translate(-20px, -60px) scale(0.8);
            opacity: 0.4;
          }
          75% {
            transform: translate(30px, -40px) scale(1.1);
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

interface NeuralNetworkHeroProps {
  title: string;
  titleItalic: string;
  description: string;
}

export default function NeuralNetworkHero({
  title,
  titleItalic,
  description,
}: NeuralNetworkHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const paraRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!headerRef.current || !paraRef.current) return;

    gsap.set(headerRef.current, {
      opacity: 0,
      y: 40,
      filter: 'blur(10px)',
    });

    gsap.set(paraRef.current, {
      opacity: 0,
      y: 20,
    });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    tl.to(headerRef.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.4,
      delay: 0.3,
    });

    tl.to(
      paraRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
      },
      '-=0.6'
    );
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', minHeight: '600px' }}
    >
      <AnimatedBackground />

      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center px-4">
          <h1
            ref={headerRef}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 sm:mb-12 md:mb-16 drop-shadow-2xl"
            style={{ fontFamily: '"Elms Sans", sans-serif' }}
          >
            {title}
            <br />
            <span style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>
              {titleItalic}
            </span>
          </h1>
          <p
            ref={paraRef}
            className="text-lg sm:text-xl md:text-2xl text-white/90 drop-shadow-lg"
            style={{ fontFamily: '"Elms Sans", sans-serif' }}
          >
            {description}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
    </section>
  );
}
