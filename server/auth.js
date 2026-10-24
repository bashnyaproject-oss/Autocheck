// Sessions: signed tokens (HMAC-SHA256), no server-side session table.
// Identity providers: Госуслуги (ЕСИА), Т-ID, Сбер ID. Until contracts are signed, a demo
// provider lets anyone "verify" for testing. Turn it off in production with DEMO_AUTH=0.
const crypto = require('crypto');

const SECRET = () => process.env.SESSION_SECRET || 'dev-only-secret-change-me';
const b64 = (s) => Buffer.from(s).toString('base64url');

function sign(payload, ttlDays = 30) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlDays * 864e5 }));
  const mac = crypto.createHmac('sha256', SECRET()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const good = crypto.createHmac('sha256', SECRET()).update(body).digest('base64url');
  if (mac.length !== good.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString());
  return p.exp > Date.now() ? p : null;
}

const PROVIDERS = {
  esia: { name: 'Госуслуги', env: ['ESIA_CLIENT_ID', 'ESIA_CERT', 'ESIA_KEY'] },
  tid: { name: 'Т-ID', env: ['TID_CLIENT_ID', 'TID_CLIENT_SECRET'] },
  sberid: { name: 'Сбер ID', env: ['SBERID_CLIENT_ID', 'SBERID_CLIENT_SECRET'] },
};
const configured = (p) => PROVIDERS[p] && PROVIDERS[p].env.every((k) => process.env[k]);
const demoAllowed = () => process.env.DEMO_AUTH !== '0';

module.exports = { sign, verify, PROVIDERS, configured, demoAllowed };
