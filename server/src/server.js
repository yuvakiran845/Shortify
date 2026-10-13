import './loadEnv.js'; // must stay first: fills process.env before config is read
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';
import { syncLinkQrCodes } from './services/qrService.js';

try {
  await connectDatabase(config.mongoUri);
} catch (error) {
  console.error(`Could not connect to MongoDB (${error.message}). Is MongoDB running and MONGO_URI correct?`);
  process.exit(1);
}

// If PUBLIC_BASE_URL changed since last time, bring saved QR codes up to date.
// A failure here only leaves old QR history as it was, so the API still starts.
try {
  const updated = await syncLinkQrCodes();
  if (updated > 0) console.log(`Updated ${updated} saved QR code(s) to the current short-link address.`);
} catch (error) {
  console.error('Could not update saved QR codes:', error.message);
}

const server = createApp().listen(config.port, () => {
  console.log(`Shortify API listening on http://localhost:${config.port}`);
  // Short links only work on other devices if this is an address they can reach (see "npm run lan").
  console.log(`Short links look like ${config.publicBaseUrl}/Abc1234`);
});

// Finish in-flight requests and close the DB connection when the host stops the app.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  });
}
