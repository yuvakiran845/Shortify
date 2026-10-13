import useApiData from './useApiData';
import { getLink, listLinks } from '../lib/linksApi';

const MAX_OPTIONS = 50;

// Newest links first; if `preselectedId` is older than those, it is fetched on
// its own and added to the top. An id that is not the user's is left out.
async function loadLinkOptions(preselectedId, signal) {
  const { links, pagination } = await listLinks({ page: 1, limit: MAX_OPTIONS, sort: 'newest' }, { signal });
  let options = links;
  if (preselectedId && !links.some((link) => link.id === preselectedId)) {
    const extra = await getLink(preselectedId, { signal }).catch((error) => {
      if (error.name === 'AbortError') throw error;
      return null; // not found or not yours: just leave it out
    });
    if (extra) options = [extra, ...links];
  }
  return { links: options, total: pagination.total };
}

// The user's links for a "pick one of your links" dropdown (e.g. /qr?link=...).
export default function useLinkOptions(enabled, preselectedId) {
  const { data, error, loading, reload } = useApiData(
    `link-options#${preselectedId}`,
    (signal) => loadLinkOptions(preselectedId, signal),
    { enabled },
  );
  return { links: data?.links ?? null, total: data?.total ?? 0, error, loading, reload };
}
