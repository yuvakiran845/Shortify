import useApiData from './useApiData';
import { listQrCodes } from '../lib/qrApi';

/**
 * The logged-in user's recent QR codes.
 * `items` keeps the last loaded list while a reload is in progress, so the
 * list does not flash empty after every new QR code.
 */
export default function useQrHistory(enabled) {
  const { lastData, error, loading, reload, setLastData } = useApiData(
    'qr-history',
    (signal) => listQrCodes({ limit: 10, signal }),
    { enabled },
  );
  return {
    items: lastData,
    error,
    loading,
    reload,
    // Remove an entry right away (after a successful delete) without refetching.
    remove: (id) => setLastData((items) => items?.filter((item) => item.id !== id) ?? null),
  };
}
