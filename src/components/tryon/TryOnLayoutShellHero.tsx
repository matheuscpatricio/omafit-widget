import { motion } from 'framer-motion';
import { contrastTextOnHex } from '@/utils/contrastText';

type Props = {
  primaryColor: string;
  storeName: string;
  logoUrl: string;
  backgroundImage?: string;
};

export function TryOnLayoutShellHero({
  primaryColor,
  storeName,
  logoUrl,
  backgroundImage,
}: Props) {
  const fg = contrastTextOnHex(primaryColor);
  const bg = backgroundImage || logoUrl || '';
  const imageStyle = bg
    ? {
        backgroundImage: `linear-gradient(180deg, ${primaryColor}e6 0%, ${primaryColor}66 42%, ${primaryColor}12 100%), url("${bg}")`,
      }
    : { backgroundImage: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)` };

  return (
    <>
      <motion.section
        className="order-first flex min-h-[180px] shrink-0 flex-col justify-between overflow-hidden p-5 text-white md:hidden"
        style={{ ...imageStyle, backgroundSize: 'cover', backgroundPosition: 'center top', color: fg }}
        initial={{ opacity: 0.96, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={storeName} className="max-h-10 w-auto max-w-[min(220px,70vw)] object-contain" />
        ) : (
          <p className="text-sm font-semibold tracking-[0.22em]">{storeName}</p>
        )}
        <div className="mt-10 h-px w-16 bg-current opacity-70" />
      </motion.section>

      <motion.aside
        className="order-last hidden min-h-0 w-[min(43vw,520px)] shrink-0 overflow-hidden md:flex"
        style={{ ...imageStyle, backgroundSize: 'cover', backgroundPosition: 'center', color: fg }}
        initial={{ opacity: 0.96, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex h-full w-full flex-col justify-between bg-black/10 p-8">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="max-h-12 w-auto max-w-[220px] object-contain object-left" />
          ) : (
            <p className="text-sm font-semibold tracking-[0.26em]">{storeName}</p>
          )}
          <div className="h-px w-20 bg-current opacity-70" />
        </div>
      </motion.aside>
    </>
  );
}
