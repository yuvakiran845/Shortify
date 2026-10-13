import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { formatNumber } from '../../lib/format';

// One number on the Overview page. Rendered as <dt>/<dd> inside the parent <dl>,
// so screen readers announce "Total clicks: 1,234".
export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <dt className="text-sm font-medium text-ink-muted">{label}</dt>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      {/* Proportional digits for a large standalone number (tabular digits look loose at this size). */}
      <dd className="mt-2 text-3xl font-bold tracking-tight text-ink">{formatNumber(value)}</dd>
      {hint && <dd className="mt-1 text-sm text-ink-subtle">{hint}</dd>}
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3.5 w-32" />
    </Card>
  );
}
