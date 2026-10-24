// All API routes: handle({ method, path, query, body, headers }) → { status, body }.
// Business rules (docs/LOGIC.md, docs/LAUNCH.md):
//  - only inspected cars with grade ≥ 60 are published; grade is hidden without a pass;
//  - pass: 990 ₽ / 30 days, verified identity only, max 30 deep reports (unique cars) per ISO week;
//  - seller: inspection 2 500 ₽; placement post-pay: 1% (5 000–30 000 ₽) if sold through us,
//    2 990 ₽ if not sold in 60 days, removed or sold elsewhere; confirmed fraud → blocked.
const { getDb } = require('./db');
const auth = require('./auth');
const pay = require('./payments');
const { baseReport } = require('./vin');

const PRICE = { pass: 990, inspection: 2500, notSold: 2990, cardCheck: 1 };
const WEEKLY = 30;
const MIN_GRADE = 60;
const commission = (price) => Math.min(30000, Math.max(5000, Math.round(price * 0.01)));
const POINTS = [
  { id: 'o1', name: 'Осмотрено Савёловская', addr: 'Бутырская ул., 46', ll: [55.8025, 37.5835], type: 'own' },
  { id: 's1', name: 'Гараж 24', addr: 'ул. Нижняя Масловка, 6', ll: [55.7935, 37.5795], type: 'sto' },
  { id: 'd1', name: 'Север-Авто', addr: 'Дмитровское ш., 98', ll: [55.8835, 37.544], type: 'dealer' },
  { id: 'o2', name: 'Осмотрено Люблино', addr: 'ул. Краснодарская, 51', ll: [55.6735, 37.77], type: 'own' },
];

const ok = (body, status = 200) => ({ status, body });
const err = (status, error) => ({ status, body: { error } });
const now = () => new Date();
function isoWeek(d = now()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function km(a, b) {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function currentUser(db, headers) {
  const h = headers.authorization || headers.Authorization || '';
  const p = auth.verify(h.replace(/^Bearer\s+/i, ''));
  if (!p) return null;
  let { rows } = await db.query('select * from users where id=$1', [p.uid]);
  if (!rows.length && p.name) {
    // In-memory demo database resets on cold start; tokens stay valid, so restore the user.
    await db.query('insert into users (id,name,provider,subject) values ($1,$2,$3,$4) on conflict do nothing', [p.uid, p.name, p.provider, p.subject]);
    ({ rows } = await db.query('select * from users where id=$1', [p.uid]));
  }
  return rows[0] || null;
}
async function passOf(db, userId) {
  if (!userId) return null;
  const { rows } = await db.query('select ends_at from passes where user_id=$1 and ends_at > now()', [userId]);
  return rows[0] ? rows[0].ends_at : null;
}
async function usedThisWeek(db, userId) {
  const { rows } = await db.query('select listing_id from report_views where user_id=$1 and iso_week=$2', [userId, isoWeek()]);
  return rows.map((r) => r.listing_id);
}

function listingOut(l, insp, { showGrade, from }) {
  return {
    id: l.id, make: l.make, model: l.model, year: l.year, price: l.price, market_price: l.market_price, km: l.km,
    engine: l.engine, gearbox: l.gearbox, drive: l.drive, body: l.body, color: l.color, city: l.city, district: l.district,
    owners: l.owners, status: l.status,
    distance_km: from && l.lat ? Math.round(km(from, [l.lat, l.lng])) : null,
    inspected_at: insp && insp.done_at ? new Date(insp.done_at).toLocaleDateString('ru-RU') : null,
    inspected_by: insp ? insp.inspector : null,
    grade: showGrade && insp ? insp.grade : null,
    flags: insp ? insp.flags : [],
  };
}
async function lastInspection(db, listingId) {
  const { rows } = await db.query("select * from inspections where listing_id=$1 and status='done' order by done_at desc limit 1", [listingId]);
  return rows[0] || null;
}
async function ownListing(db, user, id) {
  const { rows } = await db.query('select * from listings where id=$1', [id]);
  const l = rows[0];
  if (!l) return [null, err(404, 'Объявление не найдено')];
  if (l.seller_id !== user.id) return [null, err(403, 'Это не ваше объявление')];
  return [l, null];
}
async function savePayment(db, p) {
  await db.query('insert into payments (id,user_id,kind,amount,status,provider_id,listing_id,meta) values ($1,$2,$3,$4,$5,$6,$7,$8)', [p.id, p.user_id, p.kind, p.amount, p.status, p.provider_id || null, p.listing_id || null, JSON.stringify(p.meta || {})]);
}
async function applySucceeded(db, paymentId, methodId, last4) {
  const { rows } = await db.query('select * from payments where id=$1', [paymentId]);
  const p = rows[0];
  if (!p) return;
  await db.query("update payments set status='succeeded' where id=$1", [paymentId]);
  if (p.kind === 'pass') {
    await db.query(
      `insert into passes (user_id, ends_at) values ($1, now() + interval '30 days')
       on conflict (user_id) do update set ends_at = greatest(passes.ends_at, now()) + interval '30 days'`, [p.user_id]);
  }
  if (p.kind === 'inspection') {
    await db.query("insert into inspections (id,listing_id,point_id,status) values ($1,$2,$3,'booked') on conflict do nothing", ['ins_' + p.id, p.listing_id, p.meta.point_id || 'o1']);
  }
  if (p.kind === 'card_check' && methodId) {
    await db.query('insert into seller_cards (user_id,method_id,last4) values ($1,$2,$3) on conflict (user_id) do update set method_id=$2, last4=$3', [p.user_id, methodId, last4 || null]);
  }
}
/** Seller post-pay from the saved card. */
async function chargeSeller(db, l, kind, amount, description) {
  const { rows } = await db.query('select * from seller_cards where user_id=$1', [l.seller_id]);
  const id = pay.newId('pay');
  let status = 'pending', provider_id = null;
  if (rows[0]) ({ status, provider_id } = await pay.chargeSaved({ id, amount, description, methodId: rows[0].method_id }));
  await savePayment(db, { id, user_id: l.seller_id, kind, amount, status, provider_id, listing_id: l.id });
  return { kind, amount, status };
}

const routes = [];
const on = (method, pattern, needs, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), needs, fn });

// ---------- public ----------
on('GET', '/v1/health', null, async (c) => ok({ ok: true, db: c.db.kind, payments: pay.live() ? 'yookassa' : 'demo' }));
on('GET', '/v1/points', null, async () => ok({ items: POINTS }));

on('GET', '/v1/feed', null, async ({ db, user, query }) => {
  const from = query.lat && query.lng ? [Number(query.lat), Number(query.lng)] : [55.7963, 37.588];
  const radius = Number(query.radius_km || 100);
  const showGrade = !!(await passOf(db, user && user.id));
  const { rows } = await db.query("select * from listings where status='published' order by published_at desc limit 200");
  const items = [];
  for (const l of rows) {
    const insp = await lastInspection(db, l.id);
    if (!insp || insp.grade < MIN_GRADE) continue;
    const out = listingOut(l, insp, { showGrade, from });
    if (out.distance_km != null && out.distance_km > radius) continue;
    if (query.price_max && l.price > Number(query.price_max)) continue;
    items.push(out);
  }
  items.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  return ok({ items, pass_active: showGrade });
});

on('GET', '/v1/listings/:id', null, async ({ db, user, params, query }) => {
  const { rows } = await db.query('select * from listings where id=$1', [params.id]);
  const l = rows[0];
  const mine = l && user && l.seller_id === user.id;
  if (!l || (l.status !== 'published' && !mine)) return err(404, 'Объявление не найдено');
  const showGrade = mine || !!(await passOf(db, user && user.id));
  const from = query.lat && query.lng ? [Number(query.lat), Number(query.lng)] : [55.7963, 37.588];
  return ok(listingOut(l, await lastInspection(db, l.id), { showGrade, from }));
});

// ---------- auth ----------
on('GET', '/v1/auth/providers', null, async () => ok({
  providers: Object.entries(auth.PROVIDERS).map(([id, p]) => ({ id, name: p.name, ready: !!auth.configured(id) })),
  demo: auth.demoAllowed(),
}));
on('POST', '/v1/auth/demo', null, async ({ db, body }) => {
  if (!auth.demoAllowed()) return err(403, 'Демо-вход выключен');
  const provider = ['esia', 'tid', 'sberid'].includes(body.provider) ? body.provider : 'esia';
  // Demo identity: one "person" per device id, mimicking the unique (provider, subject) rule.
  const subject = 'demo-' + String(body.device || 'anon').slice(0, 64);
  const name = String(body.name || 'Покупатель').slice(0, 60);
  const { rows } = await db.query('select * from users where provider=$1 and subject=$2', [provider, subject]);
  let u = rows[0];
  if (!u) {
    u = { id: pay.newId('u'), name, provider, subject };
    await db.query('insert into users (id,name,provider,subject) values ($1,$2,$3,$4)', [u.id, name, provider, subject]);
  }
  if (u.blocked) return err(403, 'Аккаунт заблокирован');
  return ok({ token: auth.sign({ uid: u.id, name: u.name, provider, subject }), user: { id: u.id, name: u.name, verified_by: provider } });
});
on('GET', '/v1/auth/:provider/start', null, async ({ params }) => {
  if (!auth.PROVIDERS[params.provider]) return err(404, 'Нет такого способа входа');
  if (!auth.configured(params.provider)) return err(501, `${auth.PROVIDERS[params.provider].name}: вход появится после подключения (нужен договор и ключи)`);
  return err(501, 'Обмен кода на сессию ещё не реализован');
});

// ---------- buyer ----------
on('GET', '/v1/me', 'user', async ({ db, user }) => {
  const until = await passOf(db, user.id);
  const used = await usedThisWeek(db, user.id);
  const card = (await db.query('select last4 from seller_cards where user_id=$1', [user.id])).rows[0];
  return ok({ id: user.id, name: user.name, verified_by: user.provider, pass: { active: !!until, until, used_this_week: used.length, weekly_limit: WEEKLY, opened: used }, seller_card: card ? { last4: card.last4 } : null });
});
on('DELETE', '/v1/me', 'user', async ({ db, user }) => {
  await db.query('delete from users where id=$1', [user.id]);
  return ok({ deleted: true });
});

on('POST', '/v1/pass/checkout', 'user', async ({ db, user }) => {
  const id = pay.newId('pay');
  const r = await pay.createPayment({ id, amount: PRICE.pass, description: 'Пропуск покупателя на 30 дней' });
  await savePayment(db, { id, user_id: user.id, kind: 'pass', amount: PRICE.pass, status: 'pending', provider_id: r.provider_id });
  if (r.status === 'succeeded') await applySucceeded(db, id);
  return ok({ payment_id: id, status: r.status, confirmation_url: r.confirmation_url || null });
});

on('POST', '/v1/listings/:id/report', 'user', async ({ db, user, params }) => {
  if (!(await passOf(db, user.id))) return err(402, 'Нужен пропуск покупателя');
  const { rows } = await db.query("select * from listings where id=$1 and status='published'", [params.id]);
  const l = rows[0];
  if (!l) return err(404, 'Объявление не найдено');
  const used = await usedThisWeek(db, user.id);
  if (!used.includes(l.id)) {
    if (used.length >= WEEKLY) return err(429, 'Лимит 30 отчётов на этой неделе исчерпан. Обновится в понедельник');
    await db.query('insert into report_views (user_id,listing_id,iso_week) values ($1,$2,$3) on conflict do nothing', [user.id, l.id, isoWeek()]);
  }
  const insp = await lastInspection(db, l.id);
  return ok({
    listing_id: l.id,
    history: await baseReport(l),
    paint: insp ? insp.paint : [],
    checklist: insp ? insp.checklist : [],
    grade: insp ? insp.grade : null,
    used_this_week: used.includes(l.id) ? used.length : used.length + 1,
  });
});

on('PUT', '/v1/listings/:id/like', 'user', async ({ db, user, params }) => {
  await db.query('insert into likes (user_id,listing_id) values ($1,$2) on conflict do nothing', [user.id, params.id]);
  return ok({ liked: true });
});
on('DELETE', '/v1/listings/:id/like', 'user', async ({ db, user, params }) => {
  await db.query('delete from likes where user_id=$1 and listing_id=$2', [user.id, params.id]);
  return ok({ liked: false });
});
on('GET', '/v1/favorites', 'user', async ({ db, user }) => {
  const showGrade = !!(await passOf(db, user.id));
  const { rows } = await db.query("select l.* from likes k join listings l on l.id=k.listing_id where k.user_id=$1 and l.status='published' order by k.created_at desc", [user.id]);
  const items = [];
  for (const l of rows) items.push(listingOut(l, await lastInspection(db, l.id), { showGrade, from: [55.7963, 37.588] }));
  return ok({ items });
});
on('POST', '/v1/listings/:id/viewings', 'user', async ({ db, user, params }) => {
  const id = pay.newId('v');
  await db.query('insert into viewings (id,listing_id,buyer_id) values ($1,$2,$3)', [id, params.id, user.id]);
  return ok({ id, status: 'requested' }, 201);
});

// ---------- seller ----------
on('POST', '/v1/seller/import', 'user', async ({ body }) => {
  const { fetchListing } = require('../api/parse.js');
  const r = await fetchListing(body.url);
  return ok(r.body, r.status);
});
on('POST', '/v1/seller/listings', 'user', async ({ db, user, body }) => {
  const year = Number(body.year), price = Number(body.price), kmv = Number(body.km);
  const [make, ...rest] = String(body.title || `${body.make || ''} ${body.model || ''}`).trim().split(/\s+/);
  const model = rest.join(' ');
  if (!make || !model || !(year > 1980) || !(price > 10000) || !(kmv >= 0)) return err(400, 'Нужны марка и модель, год, пробег и цена');
  const id = pay.newId('l');
  await db.query(
    "insert into listings (id,seller_id,status,make,model,year,price,km,vin,source_url,city,district) values ($1,$2,'awaiting_inspection',$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [id, user.id, make, model, year, price, kmv, body.vin || null, body.source_url || null, body.city || 'Москва', body.district || null],
  );
  return ok({ id, status: 'awaiting_inspection' }, 201);
});
on('GET', '/v1/seller/listings', 'user', async ({ db, user }) => {
  const { rows } = await db.query('select * from listings where seller_id=$1 order by created_at desc', [user.id]);
  const items = [];
  for (const l of rows) {
    const insp = await lastInspection(db, l.id);
    const booked = (await db.query("select point_id from inspections where listing_id=$1 and status='booked' limit 1", [l.id])).rows[0];
    items.push({ ...listingOut(l, insp, { showGrade: true }), booked_point: booked ? booked.point_id : null, expires_at: l.expires_at, commission_if_sold: commission(l.price), fee_if_not_sold: PRICE.notSold });
  }
  return ok({ items });
});
on('POST', '/v1/seller/card', 'user', async ({ db, user }) => {
  const id = pay.newId('pay');
  const r = await pay.createPayment({ id, amount: PRICE.cardCheck, description: 'Привязка карты (1 ₽ вернём)', savePaymentMethod: true });
  await savePayment(db, { id, user_id: user.id, kind: 'card_check', amount: PRICE.cardCheck, status: 'pending', provider_id: r.provider_id });
  if (r.status === 'succeeded') await applySucceeded(db, id, r.method_id, '4242');
  return ok({ payment_id: id, status: r.status, confirmation_url: r.confirmation_url || null });
});
on('POST', '/v1/seller/listings/:id/inspection', 'user', async ({ db, user, params, body }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  if (l.status !== 'awaiting_inspection' && l.status !== 'rejected') return err(409, 'Осмотр уже не нужен');
  if (!(await db.query('select 1 from seller_cards where user_id=$1', [user.id])).rows.length) return err(409, 'Сначала привяжите карту — по ней спишем оплату по итогу');
  const point = POINTS.find((p) => p.id === body.point_id) || POINTS[0];
  const id = pay.newId('pay');
  const r = await pay.createPayment({ id, amount: PRICE.inspection, description: `Осмотр: ${l.make} ${l.model}` });
  await savePayment(db, { id, user_id: user.id, kind: 'inspection', amount: PRICE.inspection, status: 'pending', provider_id: r.provider_id, listing_id: l.id, meta: { point_id: point.id } });
  if (r.status === 'succeeded') await applySucceeded(db, id);
  return ok({ payment_id: id, status: r.status, confirmation_url: r.confirmation_url || null, point });
});
on('POST', '/v1/seller/listings/:id/sold', 'user', async ({ db, user, params }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  if (l.status !== 'published') return err(409, 'Объявление не опубликовано');
  await db.query("update listings set status='sold', closed_at=now() where id=$1", [l.id]);
  return ok({ status: 'sold', charge: await chargeSeller(db, l, 'commission', commission(l.price), `Комиссия 1%: ${l.make} ${l.model}`) });
});
on('DELETE', '/v1/seller/listings/:id', 'user', async ({ db, user, params }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  if (['sold', 'removed', 'expired'].includes(l.status)) return err(409, 'Объявление уже закрыто');
  await db.query("update listings set status='removed', closed_at=now() where id=$1", [l.id]);
  const charge = l.status === 'published' ? await chargeSeller(db, l, 'not_sold_fee', PRICE.notSold, `Размещение без продажи: ${l.make} ${l.model}`) : null;
  return ok({ status: 'removed', charge });
});

// ---------- inspection points (partner key) ----------
on('POST', '/v1/inspections/:listingId/result', 'partner', async ({ db, params, body }) => {
  const grade = Number(body.grade);
  if (!(grade >= 0 && grade <= 100)) return err(400, 'Оценка от 0 до 100');
  const { rows } = await db.query('select * from listings where id=$1', [params.listingId]);
  const l = rows[0];
  if (!l) return err(404, 'Объявление не найдено');
  const booked = (await db.query("select id from inspections where listing_id=$1 and status='booked' limit 1", [l.id])).rows[0];
  if (!booked) return err(409, 'Осмотр не оплачен');
  await db.query("update inspections set status='done', grade=$2, flags=$3, checklist=$4, paint=$5, inspector=$6, done_at=now() where id=$1",
    [booked.id, grade, JSON.stringify(body.flags || []), JSON.stringify(body.checklist || []), JSON.stringify(body.paint || []), String(body.inspector || 'Пункт осмотра')]);
  if (grade < MIN_GRADE) {
    await db.query("update listings set status='rejected' where id=$1", [l.id]);
    return ok({ status: 'rejected', reason: 'Оценка ниже 60 — не публикуем. Отчёт остаётся у продавца' });
  }
  await db.query("update listings set status='published', published_at=now(), expires_at=now() + interval '60 days' where id=$1", [l.id]);
  return ok({ status: 'published' });
});

on('GET', '/v1/partner/queue', 'partner', async ({ db }) => {
  const { rows } = await db.query(
    `select l.id, l.make, l.model, l.year, l.km, l.price, l.vin, i.point_id, i.created_at as booked_at
       from inspections i join listings l on l.id = i.listing_id
      where i.status = 'booked' order by i.created_at`);
  return ok({ items: rows });
});

// ---------- admin ----------
on('POST', '/v1/admin/listings/:id/fraud', 'admin', async ({ db, params, body }) => {
  const { rows } = await db.query('select * from listings where id=$1', [params.id]);
  const l = rows[0];
  if (!l) return err(404, 'Объявление не найдено');
  await db.query("update listings set status='removed', closed_at=now() where id=$1", [l.id]);
  if (l.seller_id) {
    await db.query('update users set blocked=true where id=$1', [l.seller_id]);
    await db.query("update listings set status='removed', closed_at=now() where seller_id=$1 and status in ('published','awaiting_inspection')", [l.seller_id]);
  }
  return ok({ removed: true, seller_blocked: !!l.seller_id, reason: String(body.reason || '') });
});

// ---------- payments & cron ----------
on('POST', '/v1/webhooks/yookassa', null, async ({ db, body }) => {
  const w = await pay.readWebhook(body);
  if (w && w.paymentId && w.status === 'succeeded') await applySucceeded(db, w.paymentId, w.methodId, w.last4);
  if (w && w.paymentId && w.status === 'canceled') await db.query("update payments set status='canceled' where id=$1", [w.paymentId]);
  return ok({ received: true });
});
on('GET', '/v1/cron/expire', 'cron', async ({ db }) => {
  const { rows } = await db.query("select * from listings where status='published' and expires_at < now() and seller_id is not null");
  const charged = [];
  for (const l of rows) {
    await db.query("update listings set status='expired', closed_at=now() where id=$1", [l.id]);
    charged.push(await chargeSeller(db, l, 'not_sold_fee', PRICE.notSold, `60 дней без продажи: ${l.make} ${l.model}`));
  }
  return ok({ expired: rows.length, charged });
});

async function handle({ method, path, query = {}, body = {}, headers = {} }) {
  const db = await getDb();
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const user = await currentUser(db, headers);
    if (r.needs === 'user') {
      if (!user) return err(401, 'Войдите через Госуслуги, Т-ID или Сбер ID');
      if (user.blocked) return err(403, 'Аккаунт заблокирован');
    }
    if (r.needs === 'partner' && (headers['x-partner-key'] || '') !== (process.env.PARTNER_KEY || 'demo-partner')) return err(401, 'Нужен ключ пункта осмотра');
    if (r.needs === 'admin' && (headers['x-admin-key'] || '') !== (process.env.ADMIN_KEY || 'demo-admin')) return err(401, 'Нужен ключ администратора');
    if (r.needs === 'cron' && process.env.CRON_SECRET && headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return err(401, 'cron only');
    return r.fn({ db, user, params: m.groups || {}, query, body: body || {}, headers });
  }
  return err(404, 'Нет такого адреса');
}

module.exports = { handle, isoWeek, commission, PRICE, WEEKLY };
