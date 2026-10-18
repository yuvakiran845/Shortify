import { expect, test } from '@playwright/test';
import { createLinkViaApi, shortPath, signUpViaApi, uniqueAlias, visitShortLink } from './helpers.js';

// Each test gets its own fresh account (logged in through the API for speed).
test.beforeEach(async ({ page }) => {
  await signUpViaApi(page);
});

const linkName = (link) => link.shortUrl.replace(/^https?:\/\//, '');

test.describe('Managing links', () => {
  test('create a link with a custom alias, title, and expiry date', async ({ page, request }) => {
    const alias = uniqueAlias('launch');
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Create link' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Create a short link' });
    await dialog.getByLabel('Long URL').fill('https://example.com/product-launch');
    await dialog.getByRole('button', { name: /More options/ }).click();
    await dialog.getByLabel('Custom alias (optional)').fill(alias);
    await expect(dialog.getByText(`Short link: localhost:5100/${alias}`)).toBeVisible();
    await dialog.getByLabel('Title (optional)').fill('Product launch');
    await dialog.getByLabel('Expire this link on a date').check();
    await dialog.getByRole('button', { name: 'Shorten URL' }).click();

    await expect(dialog.getByText('Link created')).toBeVisible();
    await expect(dialog.getByRole('link', { name: `localhost:5100/${alias}` })).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();

    // The dashboard refreshed by itself.
    await expect(page.getByRole('link', { name: `localhost:5100/${alias}`, exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'My links' }).click();
    const row = page.getByRole('row').filter({ hasText: alias });
    await expect(row).toContainText('Product launch');
    await expect(row).toContainText('Active');
    await expect(row).toContainText('Expires');

    const visit = await visitShortLink(request, `http://localhost:5100/${alias}`);
    expect(visit.status()).toBe(302);
    expect(visit.headers().location).toBe('https://example.com/product-launch');
  });

  test('an alias that is already taken shows a clear conflict message', async ({ page }) => {
    const alias = uniqueAlias('taken');
    await createLinkViaApi(page, { url: 'https://example.com/first', alias });

    await page.goto('/links');
    await page.getByRole('button', { name: 'Create link' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create a short link' });
    await dialog.getByLabel('Long URL').fill('https://example.com/second');
    await dialog.getByRole('button', { name: /More options/ }).click();
    await dialog.getByLabel('Custom alias (optional)').fill(alias);
    await dialog.getByRole('button', { name: 'Shorten URL' }).click();

    await expect(dialog.getByText('That alias is already taken. Please choose another one.')).toBeVisible();
    await expect(dialog.getByLabel('Custom alias (optional)')).toBeFocused();
  });

  test('edit a link: switch it off and give it a new alias', async ({ page, request }) => {
    const link = await createLinkViaApi(page, { url: 'https://example.com/editable', title: 'Editable link' });
    const newAlias = uniqueAlias('renamed');

    await page.goto('/links');
    await page.getByRole('button', { name: `Edit ${linkName(link)}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit link' });
    await dialog.getByRole('switch', { name: 'Active' }).click();
    await dialog.getByLabel('Alias').fill(newAlias);
    await expect(dialog.getByText('The old short link will stop working')).toBeVisible();
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(`Saved. The new short link is localhost:5100/${newAlias}.`)).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: newAlias });
    await expect(row).toContainText('Turned off');

    expect((await visitShortLink(request, link.shortUrl)).status()).toBe(404); // old alias
    expect((await visitShortLink(request, `http://localhost:5100/${newAlias}`)).status()).toBe(410); // switched off
  });

  test('delete a link only after confirming', async ({ page, request }) => {
    const link = await createLinkViaApi(page, { url: 'https://example.com/to-delete' });
    await page.goto('/links');

    const deleteButton = page.getByRole('button', { name: `Delete ${linkName(link)}` });
    await deleteButton.click();
    const dialog = page.getByRole('dialog', { name: 'Delete this link?' });
    await expect(dialog.getByText('This cannot be undone.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('row').filter({ hasText: shortPath(link.shortUrl).slice(1) })).toBeVisible();

    await deleteButton.click();
    await dialog.getByRole('button', { name: 'Delete link' }).click();
    await expect(page.getByText(`Deleted ${linkName(link)}.`)).toBeVisible();
    await expect(page.getByText('No links yet')).toBeVisible();

    const visit = await visitShortLink(request, link.shortUrl);
    expect(visit.status()).toBe(410);
  });

  test('search, filter, and clear on My links', async ({ page }) => {
    const prefix = uniqueAlias('promo');
    await createLinkViaApi(page, { url: 'https://example.com/a', alias: `${prefix}-a` });
    await createLinkViaApi(page, { url: 'https://example.com/b', alias: `${prefix}-b` });
    await createLinkViaApi(page, { url: 'https://example.org/other' });

    await page.goto('/links');
    await expect(page.getByText('Showing 1–3 of 3 links')).toBeVisible();

    await page.getByLabel('Search').fill(prefix);
    await expect(page.getByText('Showing 1–2 of 2 links')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`search=${prefix}`)); // filters live in the URL

    await page.getByLabel('Status').selectOption({ label: 'Turned off' });
    await expect(page.getByText('No links match your filters')).toBeVisible();

    await page.getByRole('button', { name: 'Clear search and filters' }).first().click();
    await expect(page.getByText('Showing 1–3 of 3 links')).toBeVisible();
  });

  test('real clicks are counted; bots are not', async ({ page, request }) => {
    const link = await createLinkViaApi(page, { url: 'https://example.com/counted' });

    expect((await visitShortLink(request, link.shortUrl)).status()).toBe(302); // a person
    expect((await visitShortLink(request, link.shortUrl, 'Mozilla/5.0 (compatible; Googlebot/2.1)')).status()).toBe(302); // a bot

    await page.goto('/dashboard');
    const totalClicks = page.locator('dt', { hasText: 'Total clicks' }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await expect(totalClicks.locator('dd').first()).toHaveText('1');

    await page.goto('/links');
    await expect(page.getByRole('row').filter({ hasText: shortPath(link.shortUrl).slice(1) }).getByRole('cell').nth(1)).toHaveText('1');
  });
});
