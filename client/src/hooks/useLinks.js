import useApiData from './useApiData';
import { listLinks } from '../lib/linksApi';
import { PAGE_SIZE } from '../lib/linkQuery';

/**
 * Loads one page of the user's links for the given search/sort/filter/page.
 * `previous` is the last successful page, shown (dimmed) while the next one
 * loads instead of flashing an empty table.
 * `refreshKey` changes when a link is created elsewhere (Create link dialog).
 */
export default function useLinks({ page, search, sort, status, clicks }, refreshKey = 0) {
  const { data, error, loading, lastData, reload } = useApiData(
    JSON.stringify([page, search, sort, status, clicks, refreshKey]),
    (signal) => listLinks({ page, search, sort, status, clicks, limit: PAGE_SIZE }, { signal }),
  );
  return { data, error, loading, previous: lastData, reload };
}
