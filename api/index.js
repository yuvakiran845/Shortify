// Vercel serverless function: runs the Express API and the short-link redirects.
// vercel.json sends /api/... and /<code> here; the website itself is served
// as static files from client/dist. See server/src/serverless.js.
export { default } from '../server/src/serverless.js';
