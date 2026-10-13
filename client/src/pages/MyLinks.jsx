import { useEffect, useState } from 'react';
import useSearchParamsUpdater from '../hooks/useSearchParamsUpdater';
import { Link2, Plus, SearchX } from 'lucide-react';
import AppPage from '../components/app/AppPage';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Pagination from '../components/ui/Pagination';
import DeleteLinkDialog from '../components/links/DeleteLinkDialog';
import EditLinkDialog from '../components/links/EditLinkDialog';
import LinksList from '../components/links/LinksList';
import LinksListSkeleton from '../components/links/LinksListSkeleton';
import LinksToolbar from '../components/links/LinksToolbar';
import useAppShell from '../hooks/useAppShell';
import useLinks from '../hooks/useLinks';
import usePageTitle from '../hooks/usePageTitle';
import { DEFAULT_QUERY, hasActiveFilters, readLinkQuery, toSearchParams } from '../lib/linkQuery';
import { formatNumber } from '../lib/format';
import { ROUTES } from '../lib/routes';

const SEARCH_DELAY_MS = 300;

export default function MyLinks() {
  usePageTitle('My links');
  const { openCreateLink, linksVersion } = useAppShell();
  const [searchParams, updateSearchParams] = useSearchParamsUpdater();
  const query = readLinkQuery(searchParams);
  const { data, error, loading, previous, reload } = useLinks(query, linksVersion);

  // Changing a filter or sort goes back to page 1. The updater form reads the
  // current URL (not the last render's values), so quick changes never clash.
  const updateQuery = (changes) =>
    updateSearchParams((current) => toSearchParams({ ...readLinkQuery(current), page: 1, ...changes }));

  // The search box has its own state so typing stays instant; the URL (and the
  // API request) only updates once typing pauses for SEARCH_DELAY_MS ("debounce").
  const [searchText, setSearchText] = useState(query.search);
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    // The URL changed from outside (back button, "Clear"): show it in the box.
    setSyncedSearch(query.search);
    setSearchText(query.search);
  }

  useEffect(() => {
    const nextSearch = searchText.trim();
    if (nextSearch === query.search) return undefined;
    const timer = setTimeout(() => {
      updateSearchParams((current) => toSearchParams({ ...readLinkQuery(current), page: 1, search: nextSearch }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, query.search, updateSearchParams]);

  const clearFilters = () => {
    setSearchText('');
    updateSearchParams((current) => toSearchParams({ ...DEFAULT_QUERY, sort: readLinkQuery(current).sort }));
  };

  const shown = data ?? (loading ? previous : null);
  const filtersActive = hasActiveFilters(query);

  // The link open in the Edit / Delete dialog (null = closed).
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const goToPage = (page) => updateSearchParams((current) => toSearchParams({ ...readLinkQuery(current), page }));

  const handleDeleted = () => {
    setDeleting(null);
    // Deleting the only link on a later page: step back instead of showing an empty page.
    if (shown?.links.length === 1 && query.page > 1) goToPage(query.page - 1);
    else reload();
  };

  // Inside the app the dialog creates links in place; elsewhere, go to the Shorten page.
  const createButtonProps = openCreateLink ? { onClick: openCreateLink } : { to: ROUTES.shorten };

  return (
    <AppPage
      title="My links"
      description="Every short link you have created, with its clicks and status."
      actions={
        <Button {...createButtonProps}>
          <Plus className="size-4" aria-hidden="true" />
          Create link
        </Button>
      }
    >
      <Card>
        <LinksToolbar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          query={query}
          onChange={updateQuery}
          showClear={filtersActive || searchText !== ''}
          onClear={clearFilters}
        />
      </Card>

      <section aria-label="Results" className="mt-6">
        <Results
          shown={shown}
          error={loading ? null : error}
          loading={loading}
          query={query}
          filtersActive={filtersActive}
          onRetry={reload}
          onClearFilters={clearFilters}
          onPageChange={goToPage}
          createButtonProps={createButtonProps}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      </section>

      <EditLinkDialog
        link={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
        onGone={() => {
          setEditing(null);
          reload();
        }}
      />
      <DeleteLinkDialog link={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />
    </AppPage>
  );
}

function Results({
  shown,
  error,
  loading,
  query,
  filtersActive,
  onRetry,
  onClearFilters,
  onPageChange,
  createButtonProps,
  onEdit,
  onDelete,
}) {
  if (error) {
    return <ErrorState title="Could not load your links" message={error.message} onRetry={onRetry} />;
  }
  if (!shown) return <LinksListSkeleton />;

  const { links, pagination } = shown;

  if (pagination.total === 0) {
    return filtersActive ? (
      <EmptyState
        icon={SearchX}
        title="No links match your filters"
        description="Try a different search term or clear the filters."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear search and filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Link2}
        title="No links yet"
        description="Shorten your first URL and it will show up here with its clicks."
        action={
          <Button {...createButtonProps}>
            <Plus className="size-4" aria-hidden="true" />
            Create your first link
          </Button>
        }
      />
    );
  }

  if (links.length === 0) {
    // e.g. ?page=9 when only 3 pages exist
    return (
      <EmptyState
        title="This page is empty"
        description={`There are only ${pagination.totalPages} pages of links.`}
        action={
          <Button variant="secondary" onClick={() => onPageChange(pagination.totalPages)}>
            Go to the last page
          </Button>
        }
      />
    );
  }

  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = first + links.length - 1;

  return (
    <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <p className="mb-3 text-sm text-ink-muted" aria-live="polite">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(pagination.total)}{' '}
        {pagination.total === 1 ? 'link' : 'links'}
      </p>
      <LinksList links={links} onEdit={onEdit} onDelete={onDelete} />
      <div className="mt-6">
        <Pagination
          page={query.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          disabled={loading}
        />
      </div>
    </div>
  );
}
