import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * React Router does not scroll on navigation by itself. This component:
 * - scrolls to the matching section for links like "/#faq"
 * - scrolls to the top when moving to a new page
 * `key` changes on every navigation, so clicking "/#faq" twice still scrolls.
 */
export default function ScrollManager() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (hash) {
      const section = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (section) {
        section.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  return null;
}
