import { Link } from 'react-router';
import { ROUTES } from '../../lib/routes';
import { cn } from '../../lib/cn';

// The brand mark: a blue tile with a white + coral chain link (same as favicon.svg).
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" className="fill-brand-600" />
      <g transform="translate(4 4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#ffffff" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" className="stroke-coral-300" />
      </g>
    </svg>
  );
}

export default function Logo({ onClick, className }) {
  return (
    <Link to={ROUTES.home} onClick={onClick} className={cn('inline-flex items-center gap-2.5 rounded-md', className)}>
      <LogoMark className="size-8" />
      <span className="text-lg font-bold tracking-tight text-ink">Shortify</span>
    </Link>
  );
}
