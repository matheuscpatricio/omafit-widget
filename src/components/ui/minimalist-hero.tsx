import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MinimalistHeroProps {
  logoText?: string;
  navLinks?: { label: string; href: string }[];
  mainText?: string;
  readMoreLink?: string;
  imageSrc: string;
  imageAlt: string;
  overlayText: {
    part1: string;
    part2: string;
    part3?: string;
  };
  /** Palavras que alternam no lugar de part2 (ex: ["extraordinária", "única"]). part2 vira o prefixo antes da palavra rotativa. */
  rotatingWords?: string[];
  socialLinks?: { icon: LucideIcon; href: string }[];
  locationText?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="text-sm font-medium tracking-widest text-gray-600 transition-colors hover:text-gray-900"
  >
    {children}
  </a>
);

const SocialIcon = ({ href, icon: Icon }: { href: string; icon: LucideIcon }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-gray-600 transition-colors hover:text-gray-900">
    <Icon className="h-5 w-5" />
  </a>
);

export const MinimalistHero = ({
  logoText = 'OMAFIT',
  navLinks = [],
  mainText,
  readMoreLink,
  imageSrc,
  imageAlt,
  overlayText,
  rotatingWords,
  socialLinks = [],
  locationText,
  showHeader = false,
  showFooter = false,
  className,
}: MinimalistHeroProps) => {
  const [wordIndex, setWordIndex] = useState(0);
  const words = rotatingWords ?? [];

  useEffect(() => {
    if (words.length <= 1) return;
    const id = setTimeout(() => {
      setWordIndex((i) => (i === words.length - 1 ? 0 : i + 1));
    }, 2000);
    return () => clearTimeout(id);
  }, [wordIndex, words.length]);

  return (
    <div
      className={cn(
        'relative flex min-h-[520px] sm:min-h-[650px] w-full flex-col items-center justify-between overflow-hidden bg-white pt-24 pb-8 px-8 font-sans md:pt-32 md:pb-12 md:px-12',
        className
      )}
    >
      {showHeader && (
        <header className="z-30 flex w-full max-w-7xl items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="admin-logo text-xl font-bold tracking-wider text-gray-900"
          >
            {logoText}
          </motion.div>
          <div className="hidden items-center space-x-8 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.label} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-1.5 md:hidden"
            aria-label="Open menu"
          >
            <span className="block h-0.5 w-6 bg-gray-900" />
            <span className="block h-0.5 w-6 bg-gray-900" />
            <span className="block h-0.5 w-5 bg-gray-900" />
          </motion.button>
        </header>
      )}

      <div className="relative grid w-full max-w-7xl flex-grow grid-cols-1 items-center gap-8">
        {mainText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="z-20 order-1 text-center"
          >
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-gray-600 italic">{mainText}</p>
          </motion.div>
        )}

        <div className="relative order-2 flex justify-center items-center h-full min-h-[320px]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="absolute z-0 h-[260px] w-[260px] rounded-full bg-[#810707]/20 md:h-[300px] md:w-[300px] lg:h-[340px] lg:w-[340px] xl:h-[380px] xl:w-[380px]"
          />
          <motion.img
            src={imageSrc}
            alt={imageAlt}
            className="relative z-10 h-auto w-[380px] object-cover md:w-[480px] lg:w-[480px] xl:w-[560px]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80';
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="z-20 order-3 flex items-center justify-center text-center"
        >
          <h1
            className="text-2xl font-extrabold text-gray-900 sm:text-3xl md:text-3xl md:whitespace-nowrap lg:text-4xl xl:text-5xl leading-tight"
          >
            <span style={{ fontFamily: '"Outfit", sans-serif' }}>{overlayText.part1}</span>
            <br className="md:hidden" />
            {rotatingWords && rotatingWords.length > 0 ? (
              <>
                <span className="crimson-text-bold-italic text-[#810707]">{overlayText.part2}</span>
                <span className="relative inline-block overflow-hidden align-baseline leading-none" style={{ width: `${rotatingWords[wordIndex].length}ch` }}>
                  <span className="invisible crimson-text-bold-italic leading-none" aria-hidden="true">{rotatingWords[wordIndex]}</span>
                  {rotatingWords.map((word, index) => (
                    <motion.span
                      key={index}
                      className="absolute left-0 top-0 leading-none crimson-text-bold-italic text-[#810707]"
                      initial={{ opacity: 0, y: '-100%' }}
                      transition={{ type: 'spring', stiffness: 50 }}
                      animate={
                        wordIndex === index
                          ? { y: 0, opacity: 1 }
                          : { y: wordIndex > index ? -150 : 150, opacity: 0 }
                      }
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
                {overlayText.part3 && <span style={{ fontFamily: '"Outfit", sans-serif' }}>{overlayText.part3}</span>}
              </>
            ) : (
              <>
                <span className="crimson-text-bold-italic text-[#810707]">{overlayText.part2}</span>
                {overlayText.part3 && <span style={{ fontFamily: '"Outfit", sans-serif' }}>{overlayText.part3}</span>}
              </>
            )}
          </h1>
        </motion.div>
      </div>

      {showFooter && (socialLinks.length > 0 || locationText) && (
        <footer className="z-30 flex w-full max-w-7xl items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center space-x-4"
          >
            {socialLinks.map((link, index) => (
              <SocialIcon key={index} href={link.href} icon={link.icon} />
            ))}
          </motion.div>
          {locationText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-sm font-medium text-gray-600"
            >
              {locationText}
            </motion.div>
          )}
        </footer>
      )}
    </div>
  );
};
