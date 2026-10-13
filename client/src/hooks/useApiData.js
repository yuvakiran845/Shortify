import { useCallback, useEffect, useEffectEvent, useState } from 'react';

/**
 * Shared "load something from the API" logic behind the page data hooks.
 *
 *   const { data, error, loading, lastData, reload } = useApiData(key, (signal) => request(signal));
 *
 * - `key` (a string) describes the request, e.g. the current filters. When it
 *   changes, the data loads again and the old request is aborted, so a slow
 *   old response can never overwrite newer results.
 * - The stored result remembers which key it belongs to, so `loading` is simply
 *   "the stored result is for a different key".
 * - `data` and `error` belong to the current key only. `lastData` is the last
 *   successful result, so a page can keep showing it (dimmed) while reloading
 *   instead of flashing empty.
 * - `reload()` fetches again with the same key (for "Try again" buttons).
 * - `enabled: false` skips loading (e.g. features that need a login).
 */
export default function useApiData(key, load, { enabled = true } = {}) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [lastData, setLastData] = useState(null);
  const requestKey = `${key}#${reloadCount}`;

  // Calls the latest `load` (with the latest filters) without making the
  // effect depend on a function that is new on every render.
  const runLoad = useEffectEvent((signal) => load(signal));

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    runLoad(controller.signal)
      .then((data) => {
        setResult({ key: requestKey, data, error: null });
        setLastData(data);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ key: requestKey, data: null, error });
      });
    return () => controller.abort();
  }, [enabled, requestKey]);

  const isCurrent = result.key === requestKey;
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: enabled && !isCurrent,
    lastData,
    setLastData,
    reload,
  };
}
