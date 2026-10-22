import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../worker/.dev.vars', import.meta.url), 'utf8');
const secret = envText.match(/^SESSION_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error('Missing local SESSION_SECRET');

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

const keyMaterial = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(secret),
);
const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
  'encrypt',
]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const payload = new TextEncoder().encode(
  JSON.stringify({
    token: 'worker-session-test',
    region: 'china',
    email: 'session-test@example.com',
    exp: Date.now() + 60_000,
  }),
);
const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
const cookie = `yuliang_session=${base64Url(iv)}.${base64Url(new Uint8Array(cipher))}`;

const response = await fetch('http://127.0.0.1:8787/api/auth/session', {
  headers: {
    Origin: 'http://localhost:8081',
    Cookie: cookie,
  },
});
const data = await response.json();
console.log('STATUS:', response.status);
console.log('AUTHENTICATED:', data.authenticated);
console.log('REGION:', data.region);
console.log('CORS:', response.headers.get('Access-Control-Allow-Origin'));
