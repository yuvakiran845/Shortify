import { CalendarClock, CalendarDays, MousePointerClick, Pencil, QrCode, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Table from '../ui/Table';
import CopyButton from './CopyButton';
import LinkStatusBadge from './LinkStatusBadge';
import { formatDate, formatDateTime, formatNumber, withoutProtocol } from '../../lib/format';
import { qrPathForLink } from '../../lib/routes';

function LinkSummary({ link }) {
  return (
    <>
      {link.title && <p className="truncate text-sm font-medium text-ink">{link.title}</p>}
      <a
        href={link.shortUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate font-semibold text-brand-700 hover:underline"
      >
        {withoutProtocol(link.shortUrl)}
      </a>
      <p className="mt-0.5 truncate text-sm text-ink-subtle" title={link.originalUrl}>
        {link.originalUrl}
      </p>
    </>
  );
}

function CreatedDate({ value }) {
  return (
    <time dateTime={value} title={formatDateTime(value)}>
      {formatDate(value)}
    </time>
  );
}

// "Expires Oct 20, 2026" / "Expired Oct 1, 2026", or nothing for links without a date.
function ExpiryText({ link }) {
  if (!link.expiresAt) return null;
  const past = new Date(link.expiresAt) <= new Date();
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarClock className="size-4" aria-hidden="true" />
      {past ? 'Expired' : 'Expires'}{' '}
      <time dateTime={link.expiresAt} title={formatDateTime(link.expiresAt)}>
        {formatDate(link.expiresAt)}
      </time>
    </span>
  );
}

const clicksLabel = (count) => `${formatNumber(count)} ${count === 1 ? 'click' : 'clicks'}`;

// Edit and Delete only appear where the page passes handlers (My links, not the dashboard).
function RowActions({ link, onEdit, onDelete }) {
  const name = withoutProtocol(link.shortUrl);
  return (
    <div className="flex shrink-0 justify-end gap-2">
      <CopyButton text={link.shortUrl} iconOnly />
      <Button
        to={qrPathForLink(link)}
        variant="secondary"
        size="sm"
        aria-label={`Create a QR code for ${name}`}
        title="QR code"
      >
        <QrCode className="size-4" aria-hidden="true" />
      </Button>
      {onEdit && (
        <Button variant="secondary" size="sm" onClick={() => onEdit(link)} aria-label={`Edit ${name}`} title="Edit">
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(link)}
          aria-label={`Delete ${name}`}
          title="Delete"
          className="hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

// Wide screens (xl, 1280px+): a table. Below that, cards: one column on phones,
// two on tablets. With five actions per row, a table narrower than ~1000px
// would squeeze the link column until the URLs are unreadable.
export default function LinksList({ links, onEdit, onDelete }) {
  return (
    <>
      <div className="hidden xl:block">
        <Table caption="Your short links">
          <thead>
            <tr>
              <th scope="col">Link</th>
              <th scope="col" className="text-right">
                Clicks
              </th>
              <th scope="col">Created</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                {/* max-w-0 + w-full: this column takes the remaining width and truncates long URLs */}
                <td className="w-full max-w-0">
                  <LinkSummary link={link} />
                </td>
                <td className="text-right font-medium tabular-nums">{formatNumber(link.clickCount)}</td>
                <td className="whitespace-nowrap text-ink-muted">
                  <CreatedDate value={link.createdAt} />
                </td>
                <td>
                  <LinkStatusBadge status={link.status} />
                  {link.expiresAt && (
                    <p className="mt-1 text-xs whitespace-nowrap text-ink-subtle [&_svg]:hidden">
                      <ExpiryText link={link} />
                    </p>
                  )}
                </td>
                <td>
                  <RowActions link={link} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* grid-cols-1 (minmax(0, 1fr)), not the implicit auto column: an auto column grows to fit
          the longest URL and pushes the card and its buttons off a phone screen */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden" aria-label="Your short links">
        {links.map((link) => (
          <li key={link.id}>
            {/* h-full + mt-auto: cards side by side are equally tall, with actions aligned at the bottom */}
            <Card padding="sm" className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <LinkSummary link={link} />
                </div>
                <LinkStatusBadge status={link.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MousePointerClick className="size-4" aria-hidden="true" />
                  {clicksLabel(link.clickCount)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <CreatedDate value={link.createdAt} />
                </span>
                <ExpiryText link={link} />
              </div>
              <div className="mt-auto pt-3">
                <div className="border-t border-line pt-3">
                    <RowActions link={link} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
