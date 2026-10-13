import { Download, History, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Skeleton from '../ui/Skeleton';
import QrPreview from './QrPreview';
import { formatDate, formatDateTime, withoutProtocol } from '../../lib/format';

/**
 * The logged-in user's recently generated QR codes.
 * Clicking an entry shows it in the preview again.
 */
export default function QrHistory({ items, loading, error, onRetry, onShow, onDownload, onDelete, busyId }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <History className="size-5 text-ink-subtle" aria-hidden="true" />
        Recent QR codes
      </h2>

      <div className="mt-5">
        {error && <ErrorState title="Could not load your QR codes" message={error.message} onRetry={onRetry} />}

        {!error && loading && !items && (
          <ul className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <li key={key} className="flex items-center gap-4">
                <Skeleton className="size-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56 max-w-full" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!error && items?.length === 0 && (
          <EmptyState
            icon={History}
            title="No QR codes yet"
            description="QR codes you generate while logged in are saved here so you can download them again."
          />
        )}

        {!error && items?.length > 0 && (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onShow(item)}
                  className="shrink-0 rounded-md border border-line p-1 transition-colors hover:border-brand-300"
                  aria-label={`Show QR code for ${item.content}`}
                >
                  <QrPreview content={item.content} size={48} decorative />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onShow(item)}
                    className="block max-w-full truncate rounded-sm text-left text-sm font-semibold text-ink hover:text-brand-700"
                    title={item.content}
                  >
                    {withoutProtocol(item.content)}
                  </button>
                  <p className="mt-0.5 text-sm text-ink-subtle">
                    {item.linkId ? 'Short link · ' : ''}
                    <time dateTime={item.lastGeneratedAt} title={formatDateTime(item.lastGeneratedAt)}>
                      {formatDate(item.lastGeneratedAt)}
                    </time>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(item)}
                    aria-label={`Download PNG for ${item.content}`}
                    title="Download PNG"
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(item)}
                    loading={busyId === item.id}
                    aria-label={`Remove ${item.content} from history`}
                    title="Remove from history"
                  >
                    {busyId !== item.id && <Trash2 className="size-4" aria-hidden="true" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
