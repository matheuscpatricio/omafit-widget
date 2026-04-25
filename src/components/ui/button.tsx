import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] font-bricolage font-medium tracking-[0.05em] ' +
  'transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-[var(--color-bg-light)] disabled:opacity-50 disabled:pointer-events-none ' +
  'select-none will-change-transform';

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-[#D96845] text-[#F6F0E2] shadow-[0_1px_2px_rgba(0,0,0,0.18)] ' +
    'hover:bg-[var(--color-accent-dark)] active:opacity-95',
  secondary:
    'border border-[#D96845] bg-transparent text-[#D96845] shadow-none ' +
    'hover:bg-[#D96845]/[0.08] hover:text-[#D96845]',
  outline:
    'border border-[#D96845] bg-transparent text-[#D96845] shadow-none ' +
    'hover:bg-[#D96845]/[0.08] hover:text-[#D96845]',
  ghost:
    'border border-transparent bg-transparent text-[var(--color-text-light)] hover:bg-[var(--color-text-light)]/[0.08]',
  link:
    'bg-transparent text-[var(--color-accent)] underline-offset-4 hover:underline px-0',
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
