import { useMemo } from 'react';
import { createQrMatrix, qrSvgPath, QUIET_ZONE } from '../../lib/qr';

// Draws a scannable QR code as an SVG (sharp at any zoom level).
export default function QrPreview({ content, color = '#000000', size = 240, className, decorative = false }) {
  const matrix = useMemo(() => createQrMatrix(content), [content]);
  const path = useMemo(() => qrSvgPath(matrix), [matrix]);
  const total = matrix.size + QUIET_ZONE * 2;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `QR code for ${content}` })}
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={path} fill={color} />
    </svg>
  );
}
