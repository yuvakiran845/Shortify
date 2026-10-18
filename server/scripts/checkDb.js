/**
 * Checks that a MongoDB connection string works, without printing it.
 *
 *   PowerShell:  $env:MONGO_URI="mongodb+srv://..."; npm run check-db
 *   bash:        MONGO_URI="mongodb+srv://..." npm run check-db
 *
 * Useful before deploying: a wrong password, a missing Network Access rule, or
 * a missing database name shows up here instead of as a failed deploy.
 */
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI?.trim();
if (!uri) {
  console.error('Set MONGO_URI first (see the comment at the top of scripts/checkDb.js).');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const { name, host } = mongoose.connection;
  console.log(`✔ Connected to database "${name}" on ${host}`);
  if (name === 'test') {
    console.log('⚠ The database is "test": add /shortify before the "?" in the connection string.');
  }
  // A write and a delete, to confirm the user has readWrite access.
  const probe = mongoose.connection.db.collection('connection_checks');
  await probe.insertOne({ checkedAt: new Date() });
  await probe.drop();
  console.log('✔ This user can read and write. The string is ready to use as MONGO_URI on Vercel.');
} catch (error) {
  console.error(`✖ Could not use the database: ${error.message}`);
  if (/bad auth|authentication failed/i.test(error.message)) console.error('  → Check the username and password in the string.');
  if (/whitelist|IP|ECONNREFUSED|timed out|Server selection/i.test(error.message)) {
    console.error('  → Check Atlas → Network Access allows your IP (or 0.0.0.0/0).');
  }
  if (/not authorized/i.test(error.message)) console.error('  → Give the user readWrite on the "shortify" database.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
