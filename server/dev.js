// Local run without Vercel: node server/dev.js → http://localhost:3001
// Serves the site's static files and both functions (/api/v1/*, /api/parse) like Vercel does.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handle } = require('./routes');
const parse = require('../api/parse.js');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Partner-Key, X-Admin-Key', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };

function sendFile(res, file) {
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (url.pathname.startsWith('/api/v1/')) {
    let raw = '';
    for await (const c of req) raw += c;
    const out = await handle({ method: req.method, path: url.pathname.replace(/^\/api/, ''), query: Object.fromEntries(url.searchParams), body: raw ? JSON.parse(raw) : {}, headers: req.headers }).catch((e) => ({ status: 500, body: { error: String(e) } }));
    res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
    return res.end(JSON.stringify(out.body));
  }
  if (url.pathname === '/api/parse') {
    const out = await parse.fetchListing(url.searchParams.get('url'));
    res.writeHead(out.status, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
    return res.end(JSON.stringify(out.body));
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file) && p.startsWith('/app/')) file = path.join(ROOT, 'app', 'index.html'); // SPA fallback
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  sendFile(res, file);
}).listen(process.env.PORT || 3001, () => console.log('http://localhost:' + (process.env.PORT || 3001)));
