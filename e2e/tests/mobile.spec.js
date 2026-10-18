import { expect, test } from '@playwright/test';
import { createLinkViaApi, signUpViaApi } from './helpers.js';

// Runs in the "mobile" project (Pixel 7 emulation, see playwright.config.js).

async function expectNoSidewaysScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page should not scroll sideways').toBeLessThanOrEqual(0);
}

test.describe('On a phone', () => {
  test('the landing page fits the screen and the menu opens', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel('Long URL')).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const menu = page.getByRole('navigation', { name: 'Mobile' });
    await expect(menu.getByRole('link', { name: 'QR codes' })).toBeVisible();
    await menu.getByRole('link', { name: 'Shorten' }).click();
    await expect(page).toHaveURL('/shorten');
    await expect(page.getByRole('heading', { name: 'Shorten a long URL' })).toBeVisible();
  });

  test('the signed-in app shows link cards and a slide-in navigation drawer', async ({ page }) => {
    await signUpViaApi(page);
    const link = await createLinkViaApi(page, { url: 'https://example.com/on-a-phone', title: 'Phone test' });

    await page.goto('/links');
    const cards = page.getByRole('list', { name: 'Your short links' });
    await expect(cards.getByText('Phone test')).toBeVisible();
    await expect(cards.getByRole('button', { name: `Edit ${link.shortUrl.replace('http://', '')}` })).toBeVisible();
    await expectNoSidewaysScroll(page);

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'QR codes' }).click();
    await expect(page).toHaveURL('/qr');
    await expect(drawer).toBeHidden();
    await expectNoSidewaysScroll(page);
  });
});
