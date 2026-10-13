import Card from '../ui/Card';
import Table from '../ui/Table';
import { deviceLabel, sourceLabel } from '../../lib/analyticsLabels';
import { formatDateTime, formatNumber, formatPercent, formatRelativeTime, withoutProtocol } from '../../lib/format';

function LinkCell({ link }) {
  if (link.deleted) return <span className="text-ink-subtle italic">Deleted link</span>;
  return (
    <>
      <span className="block truncate font-semibold text-brand-700">{withoutProtocol(link.shortUrl)}</span>
      <span className="block truncate text-xs text-ink-subtle" title={link.originalUrl}>
        {link.originalUrl}
      </span>
    </>
  );
}

function TableCard({ title, description, children }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
      {children}
    </Card>
  );
}

// The links with the most clicks in the selected range.
export function TopLinksTable({ rows, total }) {
  return (
    <TableCard title="Most-clicked links" description={`Top ${rows.length} in this period`}>
      <Table caption="Most-clicked links in this period" flush>
        <thead>
          <tr>
            <th scope="col">Link</th>
            <th scope="col" className="text-right">
              Clicks
            </th>
            <th scope="col" className="text-right">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.link.id}>
              <td className="w-full max-w-0">
                <LinkCell link={row.link} />
              </td>
              <td className="text-right font-medium tabular-nums">{formatNumber(row.clicks)}</td>
              <td className="text-right text-ink-muted tabular-nums">{formatPercent(total ? row.clicks / total : 0)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableCard>
  );
}

// The latest individual clicks: when, which link, from where, on what device.
export function RecentClicksTable({ clicks }) {
  return (
    <TableCard title="Recent clicks" description={`The latest ${clicks.length} in this period`}>
      <Table caption="Most recent clicks" flush>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Link</th>
            <th scope="col">Source</th>
            <th scope="col">Device</th>
          </tr>
        </thead>
        <tbody>
          {clicks.map((click) => (
            <tr key={click.id}>
              <td className="whitespace-nowrap text-ink-muted">
                <time dateTime={click.clickedAt} title={formatDateTime(click.clickedAt)}>
                  {formatRelativeTime(click.clickedAt)}
                </time>
              </td>
              <td className="w-full max-w-0 min-w-48">
                <LinkCell link={click.link} />
              </td>
              <td className="whitespace-nowrap">{sourceLabel(click.source)}</td>
              <td className="whitespace-nowrap">{deviceLabel(click.device)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableCard>
  );
}
