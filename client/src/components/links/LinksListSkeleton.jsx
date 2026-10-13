import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

// Placeholder rows shown the first time the list loads. The grey shapes are
// hidden from screen readers, which hear "Loading your links…" instead.
export default function LinksListSkeleton({ rows = 5 }) {
  return (
    <div role="status">
      <span className="sr-only">Loading your links…</span>
      <Card padding="none" className="divide-y divide-line" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-6 px-4 py-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3.5 w-80 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-10 xl:block" />
            <Skeleton className="hidden h-4 w-24 xl:block" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
