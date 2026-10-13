import { apiRequest } from './api';

// Public settings from the API (GET /api/config), fetched once and reused.
// { shortLinkBaseUrl: "http://localhost:5000" }
let configPromise = null;

export function getAppConfig() {
  configPromise ??= apiRequest('/config').catch((error) => {
    configPromise = null; // allow a retry later
    throw error;
  });
  return configPromise;
}
