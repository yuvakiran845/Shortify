import Card from '../ui/Card';
import { formatNumber, formatPercent } from '../../lib/format';

/**
 * A ranked list with proportional bars (sources, devices).
 * Every value is written out as text, so the bars are a visual aid only:
 * the list is fully readable without seeing the bars.
 * items: [{ key, label, clicks }]
 */
export default function BarList({ title, description, items, total }) {
  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      <ul className="mt-4 space-y-3.5">
        {items.map((item) => {
          const share = total ? item.clicks / total : 0;
          return (
            <li key={item.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 text-ink-muted tabular-nums">
                  <span className="font-semibold text-ink">{formatNumber(item.clicks)}</span> · {formatPercent(share)}
                </span>
              </div>
              {/* Track in a light step of the same blue; the fill carries the value. */}
              <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-50">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(share * 100, 2)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
