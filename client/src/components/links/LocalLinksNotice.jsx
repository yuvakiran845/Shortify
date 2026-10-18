import Alert from '../ui/Alert';
import useAppConfig from '../../hooks/useAppConfig';
import { withoutProtocol } from '../../lib/format';

// localhost, 127.x, private LAN ranges, link-local, IPv6 literals, *.local: other
// devices on the internet cannot open links on these addresses.
const LOCAL_ONLY = /^(localhost|.*\.localhost|.*\.local|\[.*\]|127\..*|10\..*|192\.168\..*|169\.254\..*|172\.(1[6-9]|2\d|3[01])\..*)$/i;

export function isLocalOnlyBaseUrl(baseUrl) {
  try {
    return LOCAL_ONLY.test(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * Says plainly when short links point at this computer (development) instead of
 * a public domain, so nobody shares a link that cannot open elsewhere.
 * Shows nothing once the server runs with a public PUBLIC_BASE_URL.
 */
export default function LocalLinksNotice({ className }) {
  const config = useAppConfig();
  if (!config?.shortLinkBaseUrl || !isLocalOnlyBaseUrl(config.shortLinkBaseUrl)) return null;

  return (
    <Alert tone="warning" title="Your short links only work on this computer" className={className}>
      They use <span className="font-medium">{withoutProtocol(config.shortLinkBaseUrl)}</span>, a local development
      address. To open them on other phones and computers, deploy Shortify and set{' '}
      <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">PUBLIC_BASE_URL</code> to its public address (see the
      README&apos;s Deployment section).
    </Alert>
  );
}
