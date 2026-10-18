import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createLinkViaApi, signUpViaApi } from './helpers.js';

// Width and height straight from the PNG header (no image library needed).
async function pngSize(download) {
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe('QR codes', () => {
  test('make and download a QR code for one of my short links', async ({ page }) => {
    await signUpViaApi(page);
    const link = await createLinkViaApi(page, { url: 'https://example.com/qr-target' });

    // "QR code" from a link row opens the generator with that link selected.
    await page.goto('/links');
    await page.getByRole('link', { name: `Create a QR code for ${link.shortUrl.replace('http://', '')}` }).click();
    await expect(page).toHaveURL(/\/qr\?link=/);
    await expect(page.getByRole('radio', { name: 'My short link' })).toBeChecked();
    await expect(page.getByRole('combobox', { name: 'Short link' })).toHaveValue(link.id);

    await page.getByLabel('Image size').selectOption({ label: 'Large · 1024 px' });
    await page.getByRole('button', { name: 'Generate QR code' }).click();
    await expect(page.getByRole('heading', { name: 'Your QR code' })).toBeVisible();
    await expect(page.getByText('Opens your short link')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).first().click(),
    ]);
    expect(download.suggestedFilename()).toBe(`shortify-qr-localhost-${link.shortCode}.png`);
    expect(await pngSize(download)).toEqual({ width: 1024, height: 1024 });

    // Saved to the history for later.
    await expect(page.getByRole('heading', { name: 'Recent QR codes' })).toBeVisible();
    await expect(page.getByRole('button', { name: `Download PNG for ${link.shortUrl}` })).toBeVisible();
  });

  test('a visitor can make a QR code for any website without an account', async ({ page }) => {
    await page.goto('/qr');
    await page.getByRole('textbox', { name: 'Website URL' }).fill('example.com/menu');
    await page.getByRole('button', { name: 'Generate QR code' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('shortify-qr-example.com-menu.png');
    expect(await pngSize(download)).toEqual({ width: 512, height: 512 });
  });
});
