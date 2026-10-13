import { cn } from '../../lib/cn';

const widths = {
  default: 'max-w-6xl',
  narrow: 'max-w-3xl',
};

// Centers content with consistent side gutters (16px on phones).
export default function Container({ size = 'default', className, children }) {
  return <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', widths[size], className)}>{children}</div>;
}
