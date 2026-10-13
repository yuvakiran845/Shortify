import { cn } from '../../lib/cn';

// Grey placeholder block shown while data loads. Size it with className.
export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-line', className)} />;
}
