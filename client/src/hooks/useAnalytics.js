import useApiData from './useApiData';
import { getAnalytics } from '../lib/analyticsApi';

/**
 * Loads analytics for a date range (and optionally one link).
 * When the filters change, the previous result stays on screen (dimmed by the
 * page) until the new one arrives, so charts never flash empty.
 */
export default function useAnalytics({ from, to, timeZone, linkId }) {
  const { lastData, error, loading, reload } = useApiData(JSON.stringify([from, to, timeZone, linkId]), (signal) =>
    getAnalytics({ from, to, timeZone, linkId }, { signal }),
  );
  return { data: lastData, error, loading, reload };
}
