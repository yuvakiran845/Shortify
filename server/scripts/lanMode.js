/**
 * Makes short links work on other devices in the same Wi-Fi (phones, tablets).
 *
 *   npm run lan          use this computer's network address, e.g. http://192.168.1.20:5000/Abc1234
 *   npm run lan -- off   back to http://localhost:5000 (only this computer)
 *
 * Short URLs are built from PUBLIC_BASE_URL. "localhost" always means "this
 * device", so on a phone http://localhost:5000/Abc1234 points at the phone
 * itself. This script finds the computer's Wi-Fi/Ethernet address and writes
 * it into server/.env (PUBLIC_BASE_URL, plus CLIENT_ORIGIN so error pages link
 * back to an app the phone can open). Existing links change too, because the
 * short URL is built from the setting every time, not stored.
 *
 * Restart the API afterwards (.env is read at startup). Links then work on any
 * device in the same network; for access from anywhere, deploy the app
 * (README → Deployment).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const CLIENT_PORT = 5173; // Vite dev server

// Virtual adapters (WSL, Hyper-V, VirtualBox, VPNs...) have addresses other
// devices cannot reach, so they are skipped.
const VIRTUAL_ADAPTER = /vethernet|wsl|hyper-v|virtualbox|vmware|docker|loopback|bluetooth|tailscale|zerotier|vpn|utun|vboxnet|br-/i;
const PRIVATE_RANGE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Picks the address other devices on the local network can reach, from the
 * shape returned by os.networkInterfaces(). Returns null if there is none.
 */
export function pickLanAddress(interfaces) {
  const candidates = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (VIRTUAL_ADAPTER.test(name)) continue;
    for (const address of addresses ?? []) {
      const isIPv4 = address.family === 'IPv4' || address.family === 4;
      if (!isIPv4 || address.internal || address.address.startsWith('169.254.')) continue;
      candidates.push(address.address);
    }
  }
  return candidates.find((ip) => PRIVATE_RANGE.test(ip)) ?? candidates[0] ?? null;
}

// Older .env files used APP_BASE_URL (now PUBLIC_BASE_URL): rename it in place,
// or drop it if PUBLIC_BASE_URL already exists, so only one setting remains.
export function renameLegacyBaseUrl(text) {
  return /^PUBLIC_BASE_URL=/m.test(text)
    ? text.replace(/^APP_BASE_URL=[^\r\n]*(\r?\n)?/m, '')
    : text.replace(/^APP_BASE_URL=/m, 'PUBLIC_BASE_URL=');
}

// Replaces (or appends) KEY=value lines in .env text, keeping everything else.
export function setEnvValues(text, values) {
  let result = text;
  for (const [key, value] of Object.entries(values)) {
    const line = new RegExp(`^${key}=[^\r\n]*`, 'm'); // [^\r\n]: keeps Windows line endings intact
    result = line.test(result) ? result.replace(line, `${key}=${value}`) : `${result.replace(/\n?$/, '\n')}${key}=${value}\n`;
  }
  return result;
}

function main() {
  const envPath = fileURLToPath(new URL('../.env', import.meta.url));
  let text;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    console.error('server/.env not found. Create it first: copy .env.example to .env (see README → Run locally).');
    process.exitCode = 1;
    return;
  }
  const port = text.match(/^PORT=(\d+)/m)?.[1] ?? '5000';
  text = renameLegacyBaseUrl(text);

  if (process.argv[2] === 'off') {
    writeFileSync(envPath, setEnvValues(text, {
      PUBLIC_BASE_URL: `http://localhost:${port}`,
      CLIENT_ORIGIN: `http://localhost:${CLIENT_PORT}`,
    }));
    console.log(`Short links use http://localhost:${port} again (this computer only).`);
    console.log('Restart the API (npm run dev) for the change to take effect.');
    return;
  }

  const ip = pickLanAddress(networkInterfaces());
  if (!ip) {
    console.error('No network address found. Connect this computer to Wi-Fi or Ethernet and try again.');
    process.exitCode = 1;
    return;
  }

  writeFileSync(envPath, setEnvValues(text, {
    PUBLIC_BASE_URL: `http://${ip}:${port}`,
    // First entry: where "Go to Shortify" links on error pages point. localhost stays allowed for this computer.
    CLIENT_ORIGIN: `http://${ip}:${CLIENT_PORT},http://localhost:${CLIENT_PORT}`,
  }));

  console.log(`Short links now look like http://${ip}:${port}/Abc1234 and open on any device in this network.\n`);
  console.log('Next:');
  console.log('  1. Restart the API:              npm run dev            (in server/)');
  console.log('  2. Optional, use the app on a phone too:');
  console.log(`     start the frontend with       npm run dev:lan        (in client/), then open http://${ip}:${CLIENT_PORT}`);
  console.log('  3. The phone must be on the same Wi-Fi. If it cannot connect, allow Node.js through the firewall.');
  console.log('\nThe address can change when you switch networks; run "npm run lan" again then.');
  console.log('To share links with anyone, anywhere, deploy the app (README → Deployment).');
}

// Run only when started from the command line (tests import the functions above).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
