import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLanAddress, setEnvValues } from '../scripts/lanMode.js';

const ipv4 = (address, internal = false) => ({ address, family: 'IPv4', internal });

describe('pickLanAddress', () => {
  test('picks the Wi-Fi address and skips loopback and virtual adapters', () => {
    const interfaces = {
      'Loopback Pseudo-Interface 1': [ipv4('127.0.0.1', true)],
      'vEthernet (WSL (Hyper-V firewall))': [ipv4('172.27.224.1')],
      'Wi-Fi': [{ address: 'fe80::1', family: 'IPv6', internal: false }, ipv4('192.168.68.106')],
    };
    assert.equal(pickLanAddress(interfaces), '192.168.68.106');
  });

  test('prefers private network ranges and ignores link-local 169.254.x.x', () => {
    assert.equal(pickLanAddress({ Ethernet: [ipv4('169.254.10.2'), ipv4('10.0.0.15')] }), '10.0.0.15');
    assert.equal(pickLanAddress({ eth0: [ipv4('203.0.113.5')], wlan0: [ipv4('172.20.1.4')] }), '172.20.1.4');
  });

  test('returns null when the computer is offline', () => {
    assert.equal(pickLanAddress({ lo: [ipv4('127.0.0.1', true)] }), null);
  });
});

describe('setEnvValues', () => {
  const env = '# Public address\nPUBLIC_BASE_URL=http://localhost:5000\n\nJWT_SECRET=keep-me\n';

  test('replaces existing values and keeps comments and other settings', () => {
    const result = setEnvValues(env, { PUBLIC_BASE_URL: 'http://192.168.1.20:5000' });
    assert.equal(result, '# Public address\nPUBLIC_BASE_URL=http://192.168.1.20:5000\n\nJWT_SECRET=keep-me\n');
  });

  test('adds a missing setting at the end', () => {
    const result = setEnvValues(env, { CLIENT_ORIGIN: 'http://192.168.1.20:5173' });
    assert.ok(result.endsWith('JWT_SECRET=keep-me\nCLIENT_ORIGIN=http://192.168.1.20:5173\n'));
  });
});
