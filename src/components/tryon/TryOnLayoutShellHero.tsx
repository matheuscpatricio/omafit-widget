import { motion } from 'framer-motion';

type Props = {
  primaryColor: string;
  backgroundImage?: string;
  blurBackground?: boolean;
};

export function TryOnLayoutShellHero({
  primaryColor,
  backgroundImage,
  blurBackground = false,
}: Props) {
  const bg = backgroundImage || '';
  const mobileImageStyle = bg
    ? {
        backgroundImage: `linear-gradient(180deg, ${primaryColor}f0 0%, ${primaryColor}aa 40%, ${primaryColor}40 78%, ${primaryColor}10 100%), url("${bg}")`,
      }
    : { backgroundImage: `linear-gradient(180deg, ${primaryColor}f0 0%, ${primaryColor}30 100%)` };

  const desktopImageStyle = bg
    ? {
        backgroundImage: `linear-gradient(270deg, ${primaryColor}f0 0%, ${primaryColor}aa 36%, ${primaryColor}4d 68%, ${primaryColor}12 100%), url("${bg}")`,
      }
    : { backgroundImage: `linear-gradient(270deg, ${primaryColor}f0 0%, ${primaryColor}30 100%)` };

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.section
        className="absolute inset-x-0 top-0 h-[30dvh] min-h-[170px] md:hidden"
        style={{ ...mobileImageStyle, backgroundSize: 'cover', backgroundPosition: 'center top' }}
        initial={{ opacity: 0.96, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.aside
        className="absolute inset-y-0 right-0 hidden w-[min(46%,560px)] md:block"
        style={{ ...desktopImageStyle, backgroundSize: 'cover', backgroundPosition: 'center' }}
        initial={{ opacity: 0.96, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />

      {blurBackground && (
        <div className="absolute inset-0 backdrop-blur-[4px] bg-white/25 md:bg-white/20" />
      )}
    </div>
  );
}
