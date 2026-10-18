// Drops the end-to-end test database, so every run starts empty.
// Safety: refuses to touch any database whose name does not end in "_e2e".
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

export const E2E_DATABASE = 'mongodb://127.0.0.1:27017/shortify_e2e';

export async function resetDatabase(uri = E2E_DATABASE) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    if (!db.databaseName.endsWith('_e2e')) throw new Error(`Refusing to drop "${db.databaseName}"`);
    await db.dropDatabase();
  } finally {
    await client.close();
  }
}

// Run directly: "node scripts/resetDb.js"
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await resetDatabase();
  console.log('E2E database reset.');
}
