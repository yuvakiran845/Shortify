import useSearchParamsUpdater from '../hooks/useSearchParamsUpdater';
import { ChartColumn, MousePointerClick, Plus, TrendingUp, Users } from 'lucide-react';
import AppPage from '../components/app/AppPage';
import AnalyticsFilters from '../components/analytics/AnalyticsFilters';
import BarList from '../components/analytics/BarList';
import ClicksChart from '../components/analytics/ClicksChart';
import { RecentClicksTable, TopLinksTable } from '../components/analytics/ClickTables';
import StatCard, { StatCardSkeleton } from '../components/dashboard/StatCard';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';
import useAnalytics from '../hooks/useAnalytics';
import useAppShell from '../hooks/useAppShell';
import useLinkOptions from '../hooks/useLinkOptions';
import usePageTitle from '../hooks/usePageTitle';
import { deviceLabel, sourceLabel } from '../lib/analyticsLabels';
import { browserTimeZone, RANGE_PRESETS, resolveRange } from '../lib/dateRange';
import { formatDayLong, formatDayShort, withoutProtocol } from '../lib/format';

// The browser's time zone, so "per day" means the user's own days.
const TIME_ZONE = browserTimeZone();

/**
 * Click analytics. Every number and chart on this page comes from recorded
 * click events (GET /api/analytics); days with no clicks are shown as 0.
 * Filters live in the URL: ?range=7d | ?from=YYYY-MM-DD&to=YYYY-MM-DD, plus &link=<id>.
 */
export default function Analytics() {
  usePageTitle('Analytics');
  const { openCreateLink } = useAppShell();
  const [searchParams, updateSearchParams] = useSearchParamsUpdater();
  const range = resolveRange(searchParams);
  const linkId = searchParams.get('link') ?? '';

  const linkOptions = useLinkOptions(true, linkId);
  const { data, error, loading, reload } = useAnalytics({ from: range.from, to: range.to, timeZone: TIME_ZONE, linkId });

  // Replace the range but keep the link filter (or the other way around).
  // The updater form reads the *current* URL, not the values from the last
  // render, so two quick filter changes can never undo each other.
  const setRange = (next) =>
    updateSearchParams((current) => {
      const params = new URLSearchParams();
      if (next.preset) params.set('range', next.preset);
      else {
        params.set('from', next.from);
        params.set('to', next.to);
      }
      const currentLink = current.get('link');
      if (currentLink) params.set('link', currentLink);
      return params;
    });
  const setLink = (id) =>
    updateSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (id) params.set('link', id);
      else params.delete('link');
      return params;
    });

  const rangeLabel = range.preset
    ? RANGE_PRESETS.find((preset) => preset.value === range.preset).label
    : `${formatDayShort(range.fromKey)} – ${formatDayShort(range.toKey)}`;

  return (
    <AppPage
      title="Analytics"
      description="How your links are performing. Every number comes from recorded clicks; bots and repeat clicks are not counted."
    >
      <AnalyticsFilters
        range={range}
        onRangeChange={setRange}
        linkId={linkId}
        onLinkChange={setLink}
        linkOptions={linkOptions}
      />

      {range.invalidCustom && (
        <Alert className="mt-4">That date range was not valid, so the last 30 days are shown instead.</Alert>
      )}

      <div className="mt-6">
        {/* The error belongs to the current filters, so it wins over older results
            (showing those would label another selection's numbers as this one's). */}
        {error ? (
          error.status === 404 ? (
            <ErrorState
              title="Link not found"
              message="That link is not in your account. It may have been deleted."
              onRetry={() => setLink('')}
              retryLabel="Show all links"
            />
          ) : (
            <ErrorState title="Could not load analytics" message={error.message} onRetry={reload} />
          )
        ) : !data ? (
          <AnalyticsSkeleton />
        ) : (
          // Refetching keeps the previous results on screen, dimmed: no layout jump.
          <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <AnalyticsContent data={data} rangeLabel={rangeLabel} onCreateLink={openCreateLink} />
          </div>
        )}
      </div>
    </AppPage>
  );
}

function AnalyticsContent({ data, rangeLabel, onCreateLink }) {
  const { totals, timeline } = data;
  const busiest = timeline.reduce((best, day) => (day.clicks > best.clicks ? day : best), timeline[0]);
  const linkName = data.link && !data.link.deleted ? withoutProtocol(data.link.shortUrl) : null;

  return (
    <div className="space-y-6">
      {linkName && (
        <p className="text-sm text-ink-muted">
          Showing <span className="font-semibold text-ink">{linkName}</span> only.
        </p>
      )}

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={MousePointerClick} label="Total clicks" value={totals.clicks} hint={rangeLabel} />
        <StatCard
          icon={Users}
          label="Unique visitors"
          value={totals.uniqueVisitors}
          hint="Each person counted once per day, per device"
        />
        <StatCard
          icon={TrendingUp}
          label="Busiest day"
          value={busiest?.clicks ?? 0}
          hint={busiest?.clicks ? `clicks on ${formatDayLong(busiest.date)}` : 'No clicks yet in this period'}
        />
      </dl>

      {totals.clicks === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title={linkName ? 'No clicks on this link in this period' : 'No clicks in this period'}
          description="Share your short links. Every real visit shows up here, with its date, source, and device. Try a longer date range to see older clicks."
          action={
            onCreateLink && (
              <Button onClick={onCreateLink}>
                <Plus className="size-4" aria-hidden="true" />
                Create link
              </Button>
            )
          }
        />
      ) : (
        <>
          <ClicksChart timeline={timeline} rangeLabel={rangeLabel} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.topLinks.length > 0 && !linkName && <TopLinksTable rows={data.topLinks} total={totals.clicks} />}
            <BarList
              title="Sources"
              description="The website a click came from (domain only)"
              total={totals.clicks}
              items={data.sources.map((row) => ({ key: String(row.source), label: sourceLabel(row.source), clicks: row.clicks }))}
            />
            <BarList
              title="Devices"
              total={totals.clicks}
              items={data.devices.map((row) => ({ key: row.device, label: deviceLabel(row.device), clicks: row.clicks }))}
            />
          </div>

          <RecentClicksTable clicks={data.recentClicks} />
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <StatCardSkeleton key={key} />
        ))}
      </div>
      <Card>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Card>
    </div>
  );
}
