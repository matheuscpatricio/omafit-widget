import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium tracking-tight ' +
  'transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[#810707] focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none ' +
  'select-none will-change-transform';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#810707] text-white shadow-[0_1px_2px_rgba(26,26,26,0.06),0_8px_24px_-4px_rgba(129,7,7,0.35)] ' +
    'hover:bg-[#6b0505] active:bg-[#4a0303]',
  secondary:
    'bg-white text-[#1A1A1A] border border-[#1A1A1A]/10 shadow-sm ' +
    'hover:bg-[#1A1A1A]/[0.03] hover:border-[#1A1A1A]/20',
  outline:
    'bg-transparent text-[#1A1A1A] border border-[#1A1A1A]/15 ' +
    'hover:bg-[#1A1A1A]/[0.04] hover:border-[#1A1A1A]/25',
  ghost:
    'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/[0.05]',
  link:
    'bg-transparent text-[#810707] underline-offset-4 hover:underline px-0',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
  xl: 'h-14 px-7 text-base',
  icon: 'h-10 w-10 p-0',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22, mass: 0.6 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  size?: Size;
  children?: React.ReactNode;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <motion.a
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22, mass: 0.6 }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...(props as HTMLMotionProps<'a'>)}
    >
      {children}
    </motion.a>
  );
}
