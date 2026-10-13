// Proves the QR codes actually scan: every test renders the exact pixels the
// PNG download uses, then reads them back with jsQR (a real QR decoder).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {
  createQrMatrix,
  hexToRgb,
  MIN_MODULE_PIXELS,
  QR_COLORS,
  QR_SIZES,
  qrFileName,
  qrSvgPath,
  QUIET_ZONE,
  renderQrPixels,
} from '../src/lib/qr.js';

function scan(text, options) {
  const image = renderQrPixels(createQrMatrix(text), options);
  const result = jsQR(image.data, image.width, image.height);
  return { decoded: result?.data, image };
}

describe('generated QR codes scan back to the exact text', () => {
  const samples = [
    'https://sho.rt/Abc1234',
    'http://localhost:5000/Xy9_-Z1',
    'https://example.com/blog/2026/spring-collection-launch?utm_source=newsletter&utm_medium=email#top',
    'https://xn--r8jz45g.jp/%E3%83%91%E3%82%B9?q=%20space',
  ];
  for (const text of samples) {
    test(`decodes ${text.slice(0, 50)}`, () => {
      assert.equal(scan(text, { size: 512 }).decoded, text);
    });
  }

  for (const { value: size } of QR_SIZES) {
    test(`size ${size}px: exact dimensions and scannable`, () => {
      const { decoded, image } = scan('https://sho.rt/Abc1234', { size });
      assert.equal(image.width, size);
      assert.equal(image.height, size);
      assert.equal(decoded, 'https://sho.rt/Abc1234');
    });
  }

  for (const { value: color, label } of QR_COLORS) {
    test(`color ${label} (${color}) scans`, () => {
      assert.equal(scan('https://sho.rt/Abc1234', { size: 256, color }).decoded, 'https://sho.rt/Abc1234');
    });
  }

  test('a 2,000-character URL still scans: the image grows so modules stay readable', () => {
    const longUrl = `https://example.com/${'a'.repeat(1980)}`;
    const { decoded, image } = scan(longUrl, { size: 256 });
    assert.ok(image.width > 256, 'image grew beyond the requested size');
    assert.ok(image.modulePixels >= MIN_MODULE_PIXELS);
    assert.equal(decoded, longUrl);
  });
});

describe('control: the decoder really checks the image', () => {
  test('a blank white image does not decode', () => {
    const data = new Uint8ClampedArray(256 * 256 * 4).fill(255);
    assert.equal(jsQR(data, 256, 256), null);
  });

  test('a code with its finder patterns painted over does not decode', () => {
    const image = renderQrPixels(createQrMatrix('https://sho.rt/Abc1234'), { size: 256 });
    // Paint the top-left quarter white: removes one of the three corner "eyes".
    for (let y = 0; y < image.height / 2; y += 1) {
      for (let x = 0; x < image.width / 2; x += 1) image.data.fill(255, (y * image.width + x) * 4, (y * image.width + x) * 4 + 3);
    }
    assert.equal(jsQR(image.data, image.width, image.height), null);
  });
});

describe('QR rendering details', () => {
  test('keeps the required 4-module quiet zone of white pixels', () => {
    const matrix = createQrMatrix('https://sho.rt/Abc1234');
    const image = renderQrPixels(matrix, { size: 512 });
    const border = QUIET_ZONE * image.modulePixels;
    for (let y = 0; y < border; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const i = (y * image.width + x) * 4;
        assert.deepEqual([image.data[i], image.data[i + 1], image.data[i + 2]], [255, 255, 255]);
      }
    }
  });

  test('uses only the chosen color and white (no decorative effects)', () => {
    const image = renderQrPixels(createQrMatrix('https://sho.rt/Abc1234'), { size: 256, color: '#315CE8' });
    const colors = new Set();
    for (let i = 0; i < image.data.length; i += 4) colors.add(`${image.data[i]},${image.data[i + 1]},${image.data[i + 2]}`);
    assert.deepEqual([...colors].sort(), ['255,255,255', hexToRgb('#315CE8').join(',')].sort());
  });

  test('the SVG preview draws exactly the dark modules', () => {
    const matrix = createQrMatrix('https://sho.rt/Abc1234');
    let darkModules = 0;
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) if (matrix.isDark(row, col)) darkModules += 1;
    }
    assert.equal(qrSvgPath(matrix).split('M').length - 1, darkModules);
  });
});

describe('qrFileName', () => {
  test('builds a readable, safe file name', () => {
    assert.equal(qrFileName('https://sho.rt/Abc1234'), 'shortify-qr-sho.rt-Abc1234.png');
    assert.equal(qrFileName('https://example.com/a b/<script>?x=1'), 'shortify-qr-example.com-a-20b-3Cscript-3E.png');
    assert.equal(qrFileName('???'), 'shortify-qr-code.png');
  });
});
