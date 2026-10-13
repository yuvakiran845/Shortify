import { useEffect } from 'react';

const DEFAULT_TITLE = 'Shortify — Shorten links. Share smarter.';

// Sets the browser tab title for the current page.
// usePageTitle('QR Code Generator') -> "QR Code Generator · Shortify"
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Shortify` : DEFAULT_TITLE;
  }, [title]);
}
