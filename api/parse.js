// GET /api/parse?url=<listing url>
// Loads a public car listing from auto.ru, Avito or Drom on the server and pulls out
// the basics for the sell wizard: title, make/model, year, price, mileage, specs, photos.
// Sources, in order: JSON-LD blocks, Open Graph / meta tags, then plain-text patterns.
// Sites may answer with a captcha; then we return {ok:false, blocked:true} and the page
// falls back to what can be read from the link itself.

const HOSTS = [/(^|\.)auto\.ru$/, /(^|\.)avito\.ru$/, /(^|\.)drom\.ru$/];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

const decode = s => String(s || '')
  .replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&nbsp;|&#160;| | /g, ' ')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const num = s => { const n = parseInt(String(s).replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null; };

function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = (html.match(re) || [])[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]).trim() : null;
}

function jsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const j = JSON.parse(m[1].trim());
      const walk = x => { if (!x) return; if (Array.isArray(x)) x.forEach(walk); else if (typeof x === 'object') { out.push(x); if (x['@graph']) walk(x['@graph']); } };
      walk(j);
    } catch (e) { /* broken block, skip */ }
  }
  return out;
}

function textOf(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}

function fromUrl(u) {
  const seg = u.pathname.split('/').filter(Boolean).map(x => decodeURIComponent(x).toLowerCase());
  let make, model, year;
  if (/auto\.ru$/.test(u.hostname)) { const i = seg.indexOf('sale'); if (i >= 0) { make = seg[i + 1]; model = seg[i + 2]; } }
  else if (/drom\.ru$/.test(u.hostname)) { if (seg.length >= 3) { make = seg[0]; model = seg[1]; } }
  else if (/avito\.ru$/.test(u.hostname)) { const m = (seg[seg.length - 1] || '').match(/^([a-z0-9-]+?)_([a-z0-9-_]+?)_(\d{4})_/); if (m) { make = m[1]; model = m[2].replace(/_/g, ' '); year = +m[3]; } }
  return { make, model, year };
}

function parse(html, u) {
  const r = { source: /avito/.test(u.hostname) ? 'Авито' : /drom/.test(u.hostname) ? 'Дром' : 'Авто.ру' };
  const ld = jsonLd(html);
  const car = ld.find(x => /Car|Vehicle|Product|Offer/i.test([].concat(x['@type'] || []).join(' '))) || {};
  const offers = [].concat(car.offers || [])[0] || ld.find(x => /Offer/i.test([].concat(x['@type'] || []).join(' '))) || {};

  r.title = decode(car.name || meta(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '').trim();
  r.description = decode(car.description || meta(html, 'og:description') || meta(html, 'description') || '').trim().slice(0, 600);
  r.price = num(offers.price || offers.lowPrice || meta(html, 'product:price:amount')) || null;
  const brand = car.brand && (car.brand.name || car.brand);
  r.make = typeof brand === 'string' ? brand : null;
  r.model = car.model && (car.model.name || car.model) || null;
  r.year = num(car.vehicleModelDate || car.productionDate || car.modelDate) || null;
  const odo = car.mileageFromOdometer; r.km = odo ? num(odo.value || odo) : null;
  r.body = car.bodyType || null;
  r.color = car.color || null;
  r.transmission = car.vehicleTransmission || null;
  const eng = car.vehicleEngine && [].concat(car.vehicleEngine)[0];
  r.engine = eng ? [eng.engineDisplacement && (eng.engineDisplacement.value || eng.engineDisplacement), eng.enginePower && (eng.enginePower.value || eng.enginePower), eng.fuelType].filter(Boolean).join(', ') : null;
  r.vin = car.vehicleIdentificationNumber || null;

  // photos: JSON-LD images, og:image(s), then image URLs from known CDNs
  let photos = [].concat(car.image || []).map(x => typeof x === 'string' ? x : x && (x.url || x.contentUrl)).filter(Boolean);
  const og = []; html.replace(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/gi, (m, a) => og.push(decode(a)));
  photos = photos.concat(og);
  const cdn = html.match(/https:\/\/(?:avatars\.mds\.yandex\.net\/get-autoru-vos\/[^"'\s\\)]+|\d+\.img\.avito\.st\/[^"'\s\\)]+|s\.auto\.drom\.ru\/photo\/[^"'\s\\)]+)/g) || [];
  photos = photos.concat(cdn.map(decode));
  const seen = new Set();
  r.photos = photos.map(p => p.replace(/^\/\//, 'https://')).filter(p => /^https:\/\//.test(p) && !seen.has(p.split('?')[0].replace(/\/(small|thumb|\d+x\d+)[^/]*$/, '')) && seen.add(p.split('?')[0].replace(/\/(small|thumb|\d+x\d+)[^/]*$/, ''))).slice(0, 20);

  // plain-text fallbacks
  const t = textOf(html);
  if (!r.km) { const m = t.match(/Пробег[:\s]*([\d\s]{1,9})\s*км/i) || t.match(/(\d[\d\s]{1,8})\s*км(?=$|[\s,.])/); if (m) r.km = num(m[1]); }
  if (!r.year) { const m = (r.title || '').match(/\b(19[5-9]\d|20[0-4]\d)\b/) || t.match(/Год выпуска[:\s]*(\d{4})/i); if (m) r.year = +m[1]; }
  if (!r.price) { const m = t.match(/(\d[\d\s]{4,11})\s*₽/); if (m) r.price = num(m[1]); }
  if (!r.engine) { const m = t.match(/(\d[.,]\d)\s*л\s*\/?\s*(\d{2,4})\s*л\.?\s*с/i); if (m) r.engine = `${m[1].replace(',', '.')} л, ${m[2]} л.с.`; }
  if (!r.transmission) { const m = t.match(/(?:^|[\s,·])(автомат|механика|робот|вариатор)(?=$|[\s,.·])/i); if (m) r.transmission = m[1].toLowerCase(); }
  if (!r.vin) { const m = t.match(/\b([A-HJ-NPR-Z0-9]{3}[A-HJ-NPR-Z0-9*•]{8,10}[0-9]{2,6})\b/); if (m && m[1].length === 17) r.vin = m[1]; }
  if (!r.city) { const m = t.match(/(?:в|г\.)\s+(Москв[еа]|Санкт-Петербург[е]?|[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?)(?=$|[\s,.])/); if (m) r.city = m[1].replace(/е$/, 'а'); }

  const u2 = fromUrl(u);
  r.make = r.make || u2.make || null; r.model = r.model || u2.model || null; r.year = r.year || u2.year || null;
  // clean title like "Купить Porsche 911 2019 года в Москве..." → "Porsche 911"
  r.title = r.title.replace(/^(Купить|Продажа|Продаю)\s+/i, '').replace(/\s*(—|\||,)\s*(купить|продажа|Авито|Дром|Авто\.ру).*$/i, '').replace(/\s+\d{4}\s*(года|г\.)?.*$/, '').trim().slice(0, 80) || null;
  return r;
}

function looksBlocked(status, html, finalUrl) {
  return status === 403 || status === 429 || /showcaptcha|captcha|Доступ ограничен|Подтвердите, что запросы отправляли вы|firewall/i.test(html.slice(0, 20000)) || /captcha|blocked/i.test(finalUrl || '');
}

// Shared by this endpoint and the app backend (POST /v1/seller/import).
async function fetchListing(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { return { status: 400, body: { ok: false, error: 'Нужна ссылка вида https://auto.ru/...' } }; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.some(h => h.test(u.hostname))) return { status: 400, body: { ok: false, error: 'Поддерживаем ссылки Авто.ру, Авито и Дрома' } };
  const guess = fromUrl(u);
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(u.href, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ru-RU,ru;q=0.9' } });
    clearTimeout(tm);
    const html = (await r.text()).slice(0, 3_000_000);
    if (looksBlocked(r.status, html, r.url)) return { status: 200, body: { ok: false, blocked: true, status: r.status, guess, error: 'Площадка попросила капчу — сервер не смог прочитать объявление' } };
    if (!r.ok) return { status: 200, body: { ok: false, status: r.status, guess, error: r.status === 404 ? 'Объявление не найдено или снято' : 'Площадка ответила ошибкой ' + r.status } };
    const data = parse(html, u);
    const filled = ['price', 'year', 'km', 'photos'].filter(k => k === 'photos' ? data.photos.length : data[k]).length;
    return { status: 200, body: { ok: filled >= 1, partial: filled < 4, data, guess } };
  } catch (e) {
    return { status: 200, body: { ok: false, guess, error: e.name === 'AbortError' ? 'Площадка не ответила за 9 секунд' : 'Не удалось загрузить страницу' } };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600');
  const raw = (req.query && req.query.url) || new URL(req.url, 'http://x').searchParams.get('url');
  const out = await fetchListing(raw);
  return res.status(out.status).json(out.body);
};
module.exports.parse = parse; // for local tests
module.exports.fetchListing = fetchListing;
module.exports.fromUrl = fromUrl;
