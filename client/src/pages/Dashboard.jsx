import { Link } from 'react-router';
import { ArrowRight, ChartColumn, CircleCheck, Link2, MousePointerClick, Plus, QrCode } from 'lucide-react';
import AppPage from '../components/app/AppPage';
import GetStarted from '../components/dashboard/GetStarted';
import StatCard, { StatCardSkeleton } from '../components/dashboard/StatCard';
import LinksList from '../components/links/LinksList';
import LinksListSkeleton from '../components/links/LinksListSkeleton';
import Button from '../components/ui/Button';
import ErrorState from '../components/ui/ErrorState';
import useAppShell from '../hooks/useAppShell';
import useAuth from '../hooks/useAuth';
import useDashboard from '../hooks/useDashboard';
import usePageTitle from '../hooks/usePageTitle';
import { ROUTES } from '../lib/routes';

// Every number on this page comes from GET /api/dashboard (real data only).
export default function Dashboard() {
  usePageTitle('Overview');
  const { user } = useAuth();
  const { openCreateLink, linksVersion } = useAppShell();
  const { data, error, loading, reload } = useDashboard(linksVersion);
  const firstName = user.name.split(' ')[0];

  return (
    <AppPage
      title={`Hello, ${firstName}`}
      description="Here's how your links are doing."
      actions={
        <>
          <Button to={ROUTES.analytics} variant="secondary">
            <ChartColumn className="size-4" aria-hidden="true" />
            View analytics
          </Button>
          <Button onClick={openCreateLink}>
            <Plus className="size-4" aria-hidden="true" />
            Create link
          </Button>
        </>
      }
    >
      {error && !data ? (
        <ErrorState title="Could not load your dashboard" message={error.message} onRetry={reload} />
      ) : (
        <DashboardContent data={data} loading={loading} onCreateLink={openCreateLink} />
      )}
    </AppPage>
  );
}

function DashboardContent({ data, loading, onCreateLink }) {
  const stats = data?.stats;

  return (
    <div className="space-y-8">
      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="sr-only">
          Your numbers
        </h2>
        {stats ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
            <StatCard icon={Link2} label="Total links" value={stats.totalLinks} hint="All the links you've created" />
            <StatCard
              icon={MousePointerClick}
              label="Total clicks"
              value={stats.totalClicks}
              hint="Real visits across all your links"
            />
            <StatCard
              icon={CircleCheck}
              label="Active links"
              value={stats.activeLinks}
              hint={stats.totalLinks ? `${stats.activeLinks} of ${stats.totalLinks} can be opened` : 'Not expired or turned off'}
            />
            <StatCard icon={QrCode} label="QR codes generated" value={stats.qrCodes} hint="Saved in your QR history" />
          </dl>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <StatCardSkeleton key={key} />
            ))}
          </div>
        )}
      </section>

      {stats?.totalLinks === 0 ? (
        <GetStarted onCreateLink={onCreateLink} />
      ) : (
        <section aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="recent-title" className="text-lg font-semibold text-ink">
              Recent links
            </h2>
            <Link
              to={ROUTES.links}
              className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-brand-700 hover:underline"
            >
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {data ? <LinksList links={data.recentLinks} /> : <LinksListSkeleton rows={5} />}
        </section>
      )}
    </div>
  );
}
