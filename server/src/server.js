import './loadEnv.js'; // must stay first: fills process.env before config is read
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDatabase(config.mongoUri);
} catch (error) {
  console.error(`Could not connect to MongoDB (${error.message}). Is MongoDB running and MONGO_URI correct?`);
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`Shortify API listening on http://localhost:${config.port}`);
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
