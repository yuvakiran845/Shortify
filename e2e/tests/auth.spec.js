import { expect, test } from '@playwright/test';
import { PASSWORD, signUpViaApi, uniqueEmail } from './helpers.js';

async function fillSignUp(page, { name, email, password = PASSWORD }) {
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function logOut(page) {
  await page.getByRole('button', { name: /account menu/i }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  // Wait until logout has finished (the app then goes home); otherwise the next
  // page could still see the old session and redirect away from /login.
  await expect(page).toHaveURL('/');
}

test.describe('Accounts', () => {
  test('sign up, log out, and log back in to the page you wanted', async ({ page }) => {
    const email = uniqueEmail('signup');
    await page.goto('/signup');
    await fillSignUp(page, { name: 'Asha Rao', email });

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Asha');
    await expect(page.getByText('Welcome to Shortify, Asha!')).toBeVisible();

    await logOut(page);

    // Protected pages send you to log in, then back where you wanted to go.
    await page.goto('/links');
    await expect(page).toHaveURL('/login');
    await expect(page.getByText('Please log in to continue to that page.')).toBeVisible();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/links');
    await expect(page.getByRole('heading', { name: 'My links' })).toBeVisible();
  });

  test('wrong passwords and duplicate emails show clear errors', async ({ page }) => {
    const { email } = await signUpViaApi(page);
    await page.goto('/dashboard');
    await logOut(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('not the right password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password.' })).toBeVisible();

    await page.goto('/signup');
    await fillSignUp(page, { name: 'Someone Else', email });
    await expect(page.getByText('An account with this email already exists. Try logging in instead.')).toBeVisible();
    await expect(page).toHaveURL('/signup');
  });

  test('links shortened before signing up move into the new account', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Long URL').fill('https://example.org/made-before-signup');
    await page.getByRole('button', { name: 'Shorten URL' }).click();
    await expect(page.getByText('Your short link is ready')).toBeVisible();

    await page.goto('/signup');
    await fillSignUp(page, { name: 'Ravi Kumar', email: uniqueEmail('claim') });
    await expect(page.getByText('1 link you created on this browser was added to your account.')).toBeVisible();

    await page.goto('/links');
    // Desktop shows the table (the phone card list is hidden), so look inside the table.
    await expect(page.getByRole('table', { name: 'Your short links' }).getByText('https://example.org/made-before-signup')).toBeVisible();
  });
});
