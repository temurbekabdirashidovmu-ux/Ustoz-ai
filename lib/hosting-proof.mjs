// Shared by the Worker and the Render gateway. Secrets never enter browser code.
const encoder = new TextEncoder();
export function encode(value) {
  const bytes = encoder.encode(typeof value === 'string' ? value : JSON.stringify(value));
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
async function key(secret) {
  if (typeof secret !== 'string' || secret.length < 43) throw new Error('Hosting secret is unavailable');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);
}
function rawBase64(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4-value.length%4)%4)), c => c.charCodeAt(0));
}
export async function signToken(secret, payload) {
  const data = encode(payload);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(data)));
  let binary = ''; for (const byte of signature) binary += String.fromCharCode(byte);
  return data + '.' + btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export async function verifyToken(secret, token, purpose, audience, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 12000) return null;
    const parts = token.split('.'); if(parts.length !== 2 || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) return null;
    if (!await crypto.subtle.verify('HMAC', await key(secret), rawBase64(parts[1]), encoder.encode(parts[0]))) return null;
    const payload = JSON.parse(decode(parts[0]));
    if (payload.purpose !== purpose || payload.aud !== audience || !Number.isSafeInteger(payload.exp) || payload.exp <= now || !Number.isSafeInteger(payload.iat) || payload.iat > now + 10000 || payload.iat > payload.exp) return null;
    const maximumAge = purpose === 'session' ? 24*60*60*1000 : purpose === 'google-pending' ? 10*60*1000 : 90*1000;
    if(payload.exp - payload.iat > maximumAge) return null;
    return payload;
  } catch { return null; }
}
export async function hashBody(body) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), b => b.toString(16).padStart(2,'0')).join('');
}
export function validIdentity(value) {
  return value && typeof value.userId === 'string' && value.userId.length > 0 && value.userId.length <= 256 && !/[\r\n\0]/.test(value.userId) && typeof value.email === 'string' && value.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email);
}
export function safeReturnPath(value, origin = 'https://return.invalid') {
  if (typeof value !== 'string' || value.length > 2000 || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n\0]/.test(value)) return '/';
  try { const url = new URL(value, origin); if(url.origin !== origin || /^\/(?:auth|hosting|signin-with-chatgpt|signout-with-chatgpt|callback)(?:\/|$)/.test(url.pathname)) return '/'; return url.pathname+url.search; } catch { return '/'; }
}
