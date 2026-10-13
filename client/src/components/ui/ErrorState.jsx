import { RotateCw, TriangleAlert } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/cn';

// Shown when a request fails. Pass onRetry to offer a "Try again" button
// (or a different action, with its own retryLabel).
export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this content. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center rounded-xl border border-red-200 bg-red-50/50 px-6 py-12 text-center', className)}
    >
      <span className="grid size-12 place-items-center rounded-full bg-red-100 text-red-600">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          <RotateCw className="size-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
