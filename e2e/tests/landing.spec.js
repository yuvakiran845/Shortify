import { expect, test } from '@playwright/test';
import { API_URL, SHORT_URL, visitShortLink } from './helpers.js';

test.describe('Landing page (visitor without an account)', () => {
  test('shows the shortener and the main sections', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Shortify/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shorten links.');
    await expect(page.getByLabel('Long URL')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shorten URL' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Everything you need to share links' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'From long link to shared link in three steps' })).toBeVisible();

    // FAQ answers open and close (native <details>).
    const question = page.getByText('Can I choose my own short link?');
    await question.click();
    await expect(page.getByText('You can set a custom alias using letters')).toBeVisible();

    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'QR codes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign up' }).first()).toBeVisible();
  });

  test('shortens a URL, copies it, and the short link redirects', async ({ page, request }) => {
    await page.goto('/');
    await page.getByLabel('Long URL').fill('example.com/e2e-guest-link');
    await page.getByRole('button', { name: 'Shorten URL' }).click();

    await expect(page.getByText('Short link created.')).toBeVisible();
    const result = page.getByText('Your short link is ready').locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const shortLink = result.getByRole('link').first();
    const shortUrl = await shortLink.getAttribute('href');
    expect(shortUrl).toMatch(SHORT_URL);
    expect(shortUrl.split('/').pop()).toMatch(/^[A-Za-z0-9]{7}$/); // random 7-character code

    await result.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Short link copied to clipboard.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shortUrl);

    const visit = await visitShortLink(request, shortUrl);
    expect(visit.status()).toBe(302);
    expect(visit.headers().location).toBe('https://example.com/e2e-guest-link');
  });

  test('rejects unsafe or incomplete URLs with a clear message', async ({ page }) => {
    await page.goto('/');
    const input = page.getByLabel('Long URL');
    const submit = page.getByRole('button', { name: 'Shorten URL' });

    await input.fill('javascript:alert(1)');
    await submit.click();
    await expect(page.getByText('Only http:// and https:// links are supported.')).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill('not-a-website');
    await submit.click();
    await expect(page.getByText('Enter a complete web address with a domain, like example.com.')).toBeVisible();
  });

  test('unknown short links show a friendly "not found" page', async ({ page }) => {
    const response = await page.goto(`${API_URL}/Zz9Zz9Z`);
    expect(response.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Link not found' })).toBeVisible();
  });

  test('unknown pages show a "not found" page with a way home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    if (process.env.E2E_SINGLE_SERVICE) {
      // One server for everything: any unknown single-segment path is treated as a short code.
      await expect(page.getByRole('heading', { name: 'Link not found' })).toBeVisible();
      await page.getByRole('link', { name: 'Go to Shortify home' }).click();
    } else {
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
      await page.getByRole('link', { name: 'Back to home' }).click();
    }
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Shorten links.');
  });
});
