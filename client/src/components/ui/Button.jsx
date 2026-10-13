import { Link } from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0';

const variants = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-line-strong bg-white text-ink shadow-xs hover:border-ink/25 hover:bg-surface',
  ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700',
  // For use on brand-colored backgrounds
  light: 'bg-white text-brand-700 shadow-xs hover:bg-brand-50 focus-visible:outline-white',
  'outline-light': 'border border-white/50 text-white hover:bg-white/10 focus-visible:outline-white',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

/**
 * One button for the whole app.
 * - `to`   renders a React Router <Link> (in-app navigation)
 * - `href` renders a plain <a> (external links)
 * - otherwise renders a <button>; `loading` disables it and shows a spinner
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
