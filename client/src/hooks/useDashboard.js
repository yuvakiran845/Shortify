import useApiData from './useApiData';
import { getDashboard } from '../lib/dashboardApi';

/**
 * Loads the Overview page data. `refreshKey` changes when something outside
 * the page changes the user's links (e.g. the Create link dialog), which
 * triggers a reload. While reloading, the previous numbers stay on screen.
 */
export default function useDashboard(refreshKey = 0) {
  const { lastData, error, loading, reload } = useApiData(`dashboard#${refreshKey}`, (signal) =>
    getDashboard({ signal }),
  );
  return { data: lastData, error, loading, reload };
}
