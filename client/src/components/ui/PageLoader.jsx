import { LoaderCircle } from 'lucide-react';

// Full-area spinner for whole pages that are still loading.
export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <LoaderCircle className="size-6 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
