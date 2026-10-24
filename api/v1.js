// Vercel function: all /api/v1/* requests are rewritten here (vercel.json) as ?route=...
const { handle } = require('../server/routes');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Partner-Key, X-Admin-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const url = new URL(req.url, 'http://x');
  const route = (req.query && req.query.route) || url.searchParams.get('route') || '';
  const query = Object.fromEntries(url.searchParams);
  delete query.route;
  try {
    const out = await handle({ method: req.method, path: '/v1/' + String(route).replace(/^\/+/, ''), query, body: req.body || {}, headers: req.headers });
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
};
