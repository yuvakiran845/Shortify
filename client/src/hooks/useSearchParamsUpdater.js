import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Like useSearchParams, but updates are always based on the live URL.
 *
 * Why: React Router's setSearchParams(fn) gives `fn` the params from the
 * *last render*, so two updates in a row (e.g. a filter change right after
 * another) can overwrite each other. The browser's URL, however, changes
 * immediately on every navigation, so we build each update from it.
 *
 *   const [params, updateParams] = useSearchParamsUpdater();
 *   updateParams((current) => { current.set('page', '2'); return current; });
 */
export default function useSearchParamsUpdater() {
  const [searchParams, setSearchParams] = useSearchParams();
  const updateSearchParams = useCallback(
    (update) => setSearchParams(update(new URLSearchParams(window.location.search))),
    [setSearchParams],
  );
  return [searchParams, updateSearchParams];
}
