import { resetDatabase } from './resetDb.js';

// After the run: remove the test data again.
export default async function globalTeardown() {
  await resetDatabase();
}
