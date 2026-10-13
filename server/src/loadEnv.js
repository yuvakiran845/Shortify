// Loads variables from server/.env into process.env (built into Node 20.12+).
// Imported first by server.js. On hosting platforms there is usually no .env
// file because variables are set in the dashboard, so a missing file is fine.
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
