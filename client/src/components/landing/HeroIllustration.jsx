import { ArrowDown, Check, Copy, Download, Link2 } from 'lucide-react';

// --- Decorative QR-style artwork -------------------------------------------
// This is an illustration only (it is hidden from screen readers and is not
// meant to be scanned). Real, scannable QR codes are generated on the QR page.
const GRID = 21;
const FINDER_ORIGINS = [
  [0, 0],
  [0, GRID - 7],
  [GRID - 7, 0],
];

const isInFinderZone = (row, col) =>
  (row < 8 && col < 8) || (row < 8 && col >= GRID - 8) || (row >= GRID - 8 && col < 8);

// Deterministic "random" pattern so the artwork is identical on every render.
const pseudoRandom = (row, col) => {
  const value = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const MODULES = [];
for (let row = 0; row < GRID; row += 1) {
  for (let col = 0; col < GRID; col += 1) {
    if (isInFinderZone(row, col)) continue;
    const isTimingLine = row === 6 || col === 6;
    const filled = isTimingLine ? (row + col) % 2 === 0 : pseudoRandom(row, col) > 0.5;
    if (filled) MODULES.push([row, col]);
  }
}

function QrArtwork({ className }) {
  return (
    <svg viewBox={`0 0 ${GRID} ${GRID}`} className={className} shapeRendering="crispEdges" aria-hidden="true">
      {FINDER_ORIGINS.map(([row, col]) => (
        <g key={`${row}-${col}`} className="fill-ink">
          <path d={`M${col} ${row}h7v7h-7zM${col + 1} ${row + 1}v5h5v-5z`} fillRule="evenodd" />
          <rect x={col + 2} y={row + 2} width="3" height="3" />
        </g>
      ))}
      {MODULES.map(([row, col]) => (
        <rect key={`${row}-${col}`} x={col} y={row} width="1" height="1" className="fill-ink" />
      ))}
    </svg>
  );
}

// --- Product illustration ----------------------------------------------------
export default function HeroIllustration() {
  return (
    <div
      role="img"
      aria-label="Illustration: a long web address becomes a short Shortify link with a downloadable QR code"
      className="relative mx-auto w-full max-w-md lg:mr-0"
    >
      {/* Subtle dotted backdrop */}
      <div
        aria-hidden="true"
        className="absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_80%)] sm:-inset-6"
      />

      <div aria-hidden="true" className="relative rounded-2xl border border-line bg-white p-5 shadow-raised sm:p-6">
        {/* "Copied" confirmation chip */}
        <div className="absolute -top-3.5 right-5 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-card">
          <Check className="size-3.5" />
          Link copied
        </div>

        <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Long URL</p>
        <div className="mt-2 truncate rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink-muted">
          https://www.example.com/blog/2026/spring-collection-launch?utm_source=newsletter&amp;utm_medium=email
        </div>

        <div className="my-3 flex justify-center">
          <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-600">
            <ArrowDown className="size-4" />
          </span>
        </div>

        <p className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Short link</p>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-700">
            <Link2 className="size-4 shrink-0" />
            <span className="truncate">shortify.link/spring</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white">
            <Copy className="size-3.5" />
            Copy
          </span>
        </div>

        <div className="mt-5 flex items-center gap-4 border-t border-line pt-5">
          <div className="shrink-0 rounded-lg border border-line bg-white p-2 shadow-card">
            <QrArtwork className="size-20 sm:size-24" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">QR code ready</p>
            <p className="mt-0.5 text-sm text-ink-muted">Points to your short link.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-2.5 py-1.5 text-xs font-semibold text-ink">
              <Download className="size-3.5" />
              Download PNG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
