import QRCode from 'qrcode';

/**
 * QR code helpers.
 *
 * The `qrcode` library does the hard part: turning text into a grid of dark
 * and light "modules" (with Reed-Solomon error correction and masking).
 * We draw that grid ourselves, as an SVG for the preview and as exact pixels
 * for the PNG download. Because the pixels come from one function, the tests
 * can decode them with a real QR reader and prove the code scans.
 */

// Quiet zone: the QR standard requires a light border 4 modules wide.
export const QUIET_ZONE = 4;
// Each module must be at least this many pixels, or phone cameras struggle.
export const MIN_MODULE_PIXELS = 3;
// Error correction "M" lets a scanner recover ~15% damage (dirt, glare, folds).
const ERROR_CORRECTION = 'M';

export const QR_SIZES = [
  { value: 256, label: 'Small · 256 px' },
  { value: 512, label: 'Medium · 512 px' },
  { value: 1024, label: 'Large · 1024 px' },
];

// Dark colors only, always on white, so every option keeps strong contrast.
export const QR_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#17243A', label: 'Navy' },
  { value: '#315CE8', label: 'Blue' },
];

const WHITE = [255, 255, 255];

// Text -> { size, isDark(row, col), version }
export function createQrMatrix(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: ERROR_CORRECTION });
  return {
    size: qr.modules.size,
    version: qr.version,
    isDark: (row, col) => Boolean(qr.modules.get(row, col)),
  };
}

// One SVG path that draws every dark module as a 1×1 square, offset by the quiet zone.
export function qrSvgPath(matrix) {
  let path = '';
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return path;
}

// "#315CE8" -> [49, 92, 232]
export function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Draws the QR code into raw RGBA pixels (4 bytes per pixel).
 * The image is `size` × `size` pixels, except that it grows when needed so
 * every module stays at least MIN_MODULE_PIXELS wide (very long URLs).
 */
export function renderQrPixels(matrix, { size = 512, color = '#000000' } = {}) {
  const modulesWithBorder = matrix.size + QUIET_ZONE * 2;
  const imageSize = Math.max(size, modulesWithBorder * MIN_MODULE_PIXELS);
  // Whole pixels per module keep the edges crisp (no blurry half-pixels).
  const scale = Math.floor(imageSize / modulesWithBorder);
  // Center the code; any leftover pixels become extra white border.
  const offset = Math.floor((imageSize - scale * modulesWithBorder) / 2) + QUIET_ZONE * scale;

  const data = new Uint8ClampedArray(imageSize * imageSize * 4);
  const dark = hexToRgb(color);

  for (let y = 0; y < imageSize; y += 1) {
    const row = Math.floor((y - offset) / scale);
    for (let x = 0; x < imageSize; x += 1) {
      const col = Math.floor((x - offset) / scale);
      const inside = row >= 0 && col >= 0 && row < matrix.size && col < matrix.size;
      const [r, g, b] = inside && matrix.isDark(row, col) ? dark : WHITE;
      const i = (y * imageSize + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  return { width: imageSize, height: imageSize, data, modulePixels: scale };
}

// Browser only: pixels -> PNG file (Blob) via an off-screen canvas.
export function qrPngBlob(text, options) {
  const { width, height, data } = renderQrPixels(createQrMatrix(text), options);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the PNG image.'))), 'image/png');
  });
}

// Browser only: saves the PNG with a readable file name.
export async function downloadQrPng(text, options) {
  const blob = await qrPngBlob(text, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = qrFileName(text);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// "https://sho.rt/Abc1234?x=1" -> "shortify-qr-sho.rt-Abc1234.png"
export function qrFileName(text) {
  let readable = text;
  try {
    const url = new URL(text);
    readable = `${url.hostname}${url.pathname}`;
  } catch {
    // not a URL: use the text as-is
  }
  const slug = readable
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `shortify-qr-${slug || 'code'}.png`;
}

// Long URLs make dense codes that are harder to scan; suggest shortening them.
export const isDenseQr = (matrix) => matrix.size > 41; // above QR version 6
