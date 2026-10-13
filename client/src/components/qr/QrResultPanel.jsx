import { useMemo } from 'react';
import { Download, Lightbulb, QrCode } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CopyButton from '../links/CopyButton';
import QrPreview from './QrPreview';
import { createQrMatrix, isDenseQr, MIN_MODULE_PIXELS, QUIET_ZONE } from '../../lib/qr';
import { withoutProtocol } from '../../lib/format';

// The right-hand panel: empty placeholder, or the QR preview with its actions.
export default function QrResultPanel({ content, color, size, isShortLink, onDownload, downloading }) {
  const matrix = useMemo(() => (content ? createQrMatrix(content) : null), [content]);

  if (!content) {
    return (
      <Card className="flex min-h-80 flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <QrCode className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-ink">Your QR code will appear here</h2>
        <p className="mt-1 max-w-xs text-sm leading-6 text-ink-muted">
          Enter a URL or choose one of your links, then select Generate QR code.
        </p>
      </Card>
    );
  }

  // Same rule as renderQrPixels: the image grows if modules would be too small.
  const pixels = Math.max(size, (matrix.size + QUIET_ZONE * 2) * MIN_MODULE_PIXELS);

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">Your QR code</h2>
      <div className="mt-4 flex justify-center rounded-lg border border-line bg-white p-3">
        <QrPreview content={content} color={color} size={240} className="h-auto w-full max-w-60" />
      </div>

      <p className="mt-4 text-xs font-medium tracking-wide text-ink-subtle uppercase">
        {isShortLink ? 'Opens your short link' : 'Opens'}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink" title={content}>
        {withoutProtocol(content)}
      </p>
      <p className="mt-1 text-sm text-ink-subtle">
        PNG · {pixels} × {pixels} px
      </p>

      {isDenseQr(matrix) && !isShortLink && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This long URL makes a dense code. Shorten it first for a simpler QR code that scans more easily.
        </p>
      )}

      {/* Side by side when stacked below the form; one column in the narrow preview column */}
      <div className="mt-5 grid gap-2 @xl:grid-cols-2 @4xl:grid-cols-1">
        <Button onClick={onDownload} loading={downloading}>
          {!downloading && <Download className="size-4" aria-hidden="true" />}
          Download PNG
        </Button>
        <CopyButton text={content} label="Copy URL" successMessage="URL copied to clipboard." size="md" />
      </div>
    </Card>
  );
}
