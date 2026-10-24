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
  // Demo without DATABASE_URL: each serverless instance has its own memory, so a paid demo pass
  // travels inside the token and is restored here. With a real database this never triggers.
  if (rows[0] && p.pass_until && !process.env.DATABASE_URL && new Date(p.pass_until) > new Date()) {
    await db.query('insert into passes (user_id, ends_at) values ($1,$2) on conflict (user_id) do update set ends_at = greatest(passes.ends_at, excluded.ends_at)', [p.uid, p.pass_until]);
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

/**
 * What each access level may see (docs/FLOWS.md). Closed fields are not sent at all.
 *  guest  — not signed in: name, year, city, price, "inspected"; photos blurred on the client (none sent)
 *  member — signed in, no pass: + km, engine, gearbox, distance, first photo
 *  full   — active pass (or the seller himself): everything
 */
function listingOut(l, insp, { level, from, seller }) {
  const o = {
    id: l.id, make: l.make, model: l.model, year: l.year, price: l.price, city: l.city, body: l.body, color: l.color,
    status: l.status, inspected: !!insp, inspected_at: insp && insp.done_at ? new Date(insp.done_at).toLocaleDateString('ru-RU') : null,
    access: level, photos: [],
  };
  if (level === 'guest') return o;
  const photos = Array.isArray(l.photos) ? l.photos : [];
  Object.assign(o, {
    km: l.km, engine: l.engine, gearbox: l.gearbox, drive: l.drive, owners: l.owners,
    distance_km: from && l.lat ? Math.round(km(from, [l.lat, l.lng])) : null,
    photos: photos.slice(0, 1), photo_count: photos.length,
  });
  if (level === 'member') return o;
  return Object.assign(o, {
    photos, market_price: l.market_price, district: l.district, description: l.description,
    grade: insp ? insp.grade : null, flags: insp ? insp.flags : [], inspected_by: insp ? insp.inspector : null,
    seller: seller ? { id: seller.id, name: seller.name, verified: true } : null,
  });
}
async function accessOf(db, user) {
  if (!user) return 'guest';
  return (await passOf(db, user.id)) ? 'full' : 'member';
}
const HOME = [55.7963, 37.588];
const CATEGORY = {
  suv: (l) => l.body === 'suv', sedan: (l) => l.body === 'sedan', hatch: (l) => l.body === 'hatch',
  cheap: (l) => l.price <= 1500000, fresh: (l) => l.published_at && Date.now() - new Date(l.published_at) < 7 * 864e5,
  top: (l, insp) => insp && insp.grade >= 85,
};

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
  const level = await accessOf(db, user);
  const from = query.lat && query.lng ? [Number(query.lat), Number(query.lng)] : HOME;
  const radius = Number(query.radius_km || 300);
  const q = String(query.q || '').trim().toLowerCase();
  const { rows } = await db.query("select * from listings where status='published' order by published_at desc limit 300");
  const items = [];
  for (const l of rows) {
    const insp = await lastInspection(db, l.id);
    if (!insp || insp.grade < MIN_GRADE) continue;
    if (q && !`${l.make} ${l.model}`.toLowerCase().includes(q)) continue;
    if (query.price_min && l.price < Number(query.price_min)) continue;
    if (query.price_max && l.price > Number(query.price_max)) continue;
    if (query.year_min && l.year < Number(query.year_min)) continue;
    if (query.body && l.body !== query.body) continue;
    if (query.gearbox && l.gearbox !== query.gearbox) continue;
    if (query.category && CATEGORY[query.category] && !CATEGORY[query.category](l, insp)) continue;
    const d = l.lat ? km(from, [l.lat, l.lng]) : null;
    if (d != null && d > radius) continue;
    // Grade filters work only for people who can see grades.
    if (query.category === 'top' && level !== 'full') continue;
    items.push({ out: listingOut(l, insp, { level, from }), d: d ?? 999 });
  }
  if (query.sort === 'price') items.sort((a, b) => a.out.price - b.out.price);
  else if (query.sort === 'new') items.sort((a, b) => b.out.year - a.out.year);
  else items.sort((a, b) => a.d - b.d);
  return ok({ items: items.map((x) => x.out), access: level });
});

on('GET', '/v1/listings/:id', null, async ({ db, user, params, query }) => {
  const { rows } = await db.query('select * from listings where id=$1', [params.id]);
  const l = rows[0];
  const mine = l && user && l.seller_id === user.id;
  if (!l || (l.status !== 'published' && !mine)) return err(404, 'Объявление не найдено');
  const level = mine ? 'full' : await accessOf(db, user);
  const from = query.lat && query.lng ? [Number(query.lat), Number(query.lng)] : HOME;
  const seller = l.seller_id ? (await db.query('select id,name from users where id=$1', [l.seller_id])).rows[0] : null;
  const out = listingOut(l, await lastInspection(db, l.id), { level, from, seller });
  if (user) out.liked = !!(await db.query('select 1 from likes where user_id=$1 and listing_id=$2', [user.id, l.id])).rows.length;
  out.mine = !!mine;
  return ok(out);
});

// ---------- auth ----------
on('GET', '/v1/auth/providers', null, async () => ok({
  providers: Object.entries(auth.PROVIDERS).map(([id, p]) => ({ id, name: p.name, ready: !!auth.configured(id) })),
  demo: auth.demoAllowed(),
}));
on('POST', '/v1/auth/demo', null, async ({ db, body }) => {
  if (!auth.demoAllowed()) return err(403, 'Демо-вход выключен');
  const provider = ['esia', 'tid', 'sberid'].includes(body.provider) ? body.provider : 'esia';
  // Demo identity mimics the unique (provider, subject) rule: the test login (phone) is the person;
  // without one, the device is. Same login on any device → same account.
  const login = String(body.login || '').replace(/\D/g, '').slice(-10);
  const subject = login.length >= 6 ? 'demo-p' + login : 'demo-' + String(body.device || 'anon').slice(0, 64);
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
  const until = await passOf(db, user.id);
  const token = until && !process.env.DATABASE_URL ? auth.sign({ uid: user.id, name: user.name, provider: user.provider, subject: user.subject, pass_until: new Date(until).toISOString() }) : undefined;
  return ok({ payment_id: id, status: r.status, confirmation_url: r.confirmation_url || null, token });
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
  const level = await accessOf(db, user);
  const { rows } = await db.query("select l.* from likes k join listings l on l.id=k.listing_id where k.user_id=$1 and l.status='published' order by k.created_at desc", [user.id]);
  const items = [];
  for (const l of rows) items.push(listingOut(l, await lastInspection(db, l.id), { level, from: HOME }));
  return ok({ items });
});
async function needFull(db, user) {
  return (await accessOf(db, user)) === 'full' ? null : err(402, 'Нужен доступ покупателя: 990 ₽ на 30 дней');
}
const newId = (p) => pay.newId(p);
async function threadFor(db, listing, buyerId) {
  const ex = (await db.query('select * from threads where listing_id=$1 and buyer_id=$2', [listing.id, buyerId])).rows[0];
  if (ex) return ex;
  const t = { id: newId('t'), listing_id: listing.id, buyer_id: buyerId, seller_id: listing.seller_id };
  await db.query('insert into threads (id,listing_id,buyer_id,seller_id) values ($1,$2,$3,$4)', [t.id, t.listing_id, t.buyer_id, t.seller_id]);
  return t;
}
async function addMessage(db, threadId, authorId, text) {
  const id = newId('m');
  await db.query('insert into messages (id,thread_id,author_id,text) values ($1,$2,$3,$4)', [id, threadId, authorId, String(text).slice(0, 2000)]);
  return id;
}
const fmtAt = (d) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

on('POST', '/v1/listings/:id/viewings', 'user', async ({ db, user, params, body }) => {
  const e = await needFull(db, user);
  if (e) return e;
  const l = (await db.query("select * from listings where id=$1 and status='published'", [params.id])).rows[0];
  if (!l) return err(404, 'Объявление не найдено');
  if (l.seller_id === user.id) return err(409, 'Это ваша машина');
  const at = body.at ? new Date(body.at) : null;
  if (!at || isNaN(at) || at < now()) return err(400, 'Выберите день и время');
  const active = (await db.query("select 1 from viewings where listing_id=$1 and buyer_id=$2 and status in ('requested','confirmed')", [l.id, user.id])).rows.length;
  if (active) return err(409, 'Вы уже записаны на эту машину');
  const id = newId('v');
  await db.query('insert into viewings (id,listing_id,buyer_id,at,note) values ($1,$2,$3,$4,$5)', [id, l.id, user.id, at.toISOString(), body.note ? String(body.note).slice(0, 500) : null]);
  const t = await threadFor(db, l, user.id);
  await addMessage(db, t.id, null, `Заявка на просмотр: ${fmtAt(at)}`);
  if (body.note) await addMessage(db, t.id, user.id, body.note);
  return ok({ id, status: 'requested', thread_id: t.id }, 201);
});

const viewingRow = (v) => ({ id: v.id, listing_id: v.listing_id, at: v.at, status: v.status, note: v.note, title: `${v.make} ${v.model}, ${v.year}`, price: v.price, color: v.color, body: v.body, district: v.status === 'confirmed' || v.status === 'done' ? v.district : null, buyer: v.buyer_name ? { id: v.buyer_id, name: v.buyer_name } : undefined, thread_id: v.thread_id });
on('GET', '/v1/viewings', 'user', async ({ db, user }) => {
  const { rows } = await db.query(
    `select v.*, l.make, l.model, l.year, l.price, l.color, l.body, l.district, t.id as thread_id
       from viewings v join listings l on l.id=v.listing_id left join threads t on t.listing_id=v.listing_id and t.buyer_id=v.buyer_id
      where v.buyer_id=$1 order by v.at desc`, [user.id]);
  const bought = (await db.query("select id, make, model, year, price, color, body from listings where buyer_id=$1 and status='sold'", [user.id])).rows;
  return ok({ items: rows.map(viewingRow), bought });
});
on('GET', '/v1/seller/viewings', 'user', async ({ db, user }) => {
  const { rows } = await db.query(
    `select v.*, l.make, l.model, l.year, l.price, l.color, l.body, l.district, u.name as buyer_name, t.id as thread_id
       from viewings v join listings l on l.id=v.listing_id join users u on u.id=v.buyer_id left join threads t on t.listing_id=v.listing_id and t.buyer_id=v.buyer_id
      where l.seller_id=$1 order by v.at`, [user.id]);
  return ok({ items: rows.map(viewingRow) });
});
on('POST', '/v1/seller/viewings/:id/:action', 'user', async ({ db, user, params }) => {
  const next = { confirm: 'confirmed', decline: 'declined', done: 'done' }[params.action];
  if (!next) return err(404, 'Нет такого действия');
  const v = (await db.query('select v.*, l.seller_id, l.make, l.model from viewings v join listings l on l.id=v.listing_id where v.id=$1', [params.id])).rows[0];
  if (!v || v.seller_id !== user.id) return err(404, 'Заявка не найдена');
  await db.query('update viewings set status=$2 where id=$1', [v.id, next]);
  const t = (await db.query('select id from threads where listing_id=$1 and buyer_id=$2', [v.listing_id, v.buyer_id])).rows[0];
  if (t) await addMessage(db, t.id, null, { confirmed: `Продавец подтвердил просмотр: ${fmtAt(v.at)}`, declined: 'Продавец не сможет в это время — выберите другое', done: 'Просмотр состоялся' }[next]);
  return ok({ id: v.id, status: next });
});
on('POST', '/v1/viewings/:id/cancel', 'user', async ({ db, user, params }) => {
  const v = (await db.query('select * from viewings where id=$1 and buyer_id=$2', [params.id, user.id])).rows[0];
  if (!v) return err(404, 'Заявка не найдена');
  await db.query("update viewings set status='cancelled' where id=$1", [v.id]);
  return ok({ id: v.id, status: 'cancelled' });
});

// ---------- messages ----------
on('POST', '/v1/listings/:id/thread', 'user', async ({ db, user, params, body }) => {
  const e = await needFull(db, user);
  if (e) return e;
  const l = (await db.query("select * from listings where id=$1 and status='published'", [params.id])).rows[0];
  if (!l) return err(404, 'Объявление не найдено');
  if (l.seller_id === user.id) return err(409, 'Это ваша машина');
  const t = await threadFor(db, l, user.id);
  if (body.text) await addMessage(db, t.id, user.id, body.text);
  return ok({ thread_id: t.id });
});
on('GET', '/v1/threads', 'user', async ({ db, user }) => {
  const { rows } = await db.query(
    `select t.*, l.make, l.model, l.year, l.color, l.body, b.name as buyer_name, s.name as seller_name,
            (select text from messages m where m.thread_id=t.id order by created_at desc limit 1) as last_text,
            (select created_at from messages m where m.thread_id=t.id order by created_at desc limit 1) as last_at
       from threads t join listings l on l.id=t.listing_id join users b on b.id=t.buyer_id left join users s on s.id=t.seller_id
      where t.buyer_id=$1 or t.seller_id=$1 order by last_at desc nulls last`, [user.id]);
  return ok({ items: rows.map((r) => ({ id: r.id, listing_id: r.listing_id, title: `${r.make} ${r.model}, ${r.year}`, color: r.color, body: r.body, with: r.buyer_id === user.id ? r.seller_name : r.buyer_name, role: r.buyer_id === user.id ? 'buyer' : 'seller', last_text: r.last_text, last_at: r.last_at })) });
});
on('GET', '/v1/threads/:id', 'user', async ({ db, user, params }) => {
  const t = (await db.query('select t.*, l.make, l.model, l.year from threads t join listings l on l.id=t.listing_id where t.id=$1', [params.id])).rows[0];
  if (!t || (t.buyer_id !== user.id && t.seller_id !== user.id)) return err(404, 'Переписка не найдена');
  const { rows } = await db.query('select id, author_id, text, created_at from messages where thread_id=$1 order by created_at', [t.id]);
  return ok({ id: t.id, listing_id: t.listing_id, title: `${t.make} ${t.model}, ${t.year}`, me: user.id, messages: rows.map((m) => ({ id: m.id, mine: m.author_id === user.id, system: !m.author_id, text: m.text, at: m.created_at })) });
});
on('POST', '/v1/threads/:id/messages', 'user', async ({ db, user, params, body }) => {
  const t = (await db.query('select * from threads where id=$1', [params.id])).rows[0];
  if (!t || (t.buyer_id !== user.id && t.seller_id !== user.id)) return err(404, 'Переписка не найдена');
  const text = String(body.text || '').trim();
  if (!text) return err(400, 'Пустое сообщение');
  return ok({ id: await addMessage(db, t.id, user.id, text) }, 201);
});

// ---------- seller ----------
on('POST', '/v1/seller/import', 'user', async ({ body }) => {
  const { fetchListing } = require('../api/parse.js');
  const r = await fetchListing(body.url);
  return ok(r.body, r.status);
});
const BODIES = ['sedan', 'suv', 'hatch'];
on('POST', '/v1/seller/listings', 'user', async ({ db, user, body }) => {
  const year = Number(body.year), price = Number(body.price), kmv = Number(body.km);
  const [make, ...rest] = String(body.title || `${body.make || ''} ${body.model || ''}`).trim().split(/\s+/);
  const model = rest.join(' ');
  if (!make || !model || !(year > 1980) || !(price > 10000) || !(kmv >= 0)) return err(400, 'Нужны марка и модель, год, пробег и цена');
  const id = pay.newId('l');
  const district = body.district ? String(body.district).slice(0, 80) : null;
  await db.query(
    `insert into listings (id,seller_id,status,make,model,year,price,km,vin,source_url,city,district,description,body,gearbox,engine,drive,owners,color,lat,lng)
     values ($1,$2,'awaiting_inspection',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [id, user.id, make, model, year, price, kmv, body.vin || null, body.source_url || null, body.city || 'Москва', district,
     body.description ? String(body.description).slice(0, 3000) : null, BODIES.includes(body.body) ? body.body : 'sedan',
     body.gearbox || null, body.engine || null, body.drive || null, Number(body.owners) || 1, body.color || '#7C8A96', HOME[0] + (Math.random() - 0.5) * 0.12, HOME[1] + (Math.random() - 0.5) * 0.2],
  );
  return ok({ id, status: 'awaiting_inspection' }, 201);
});
on('PATCH', '/v1/seller/listings/:id', 'user', async ({ db, user, params, body }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  const price = body.price != null ? Number(body.price) : l.price;
  if (l.status === 'published' && price > l.price && (await db.query("select 1 from viewings where listing_id=$1 and status in ('requested','confirmed')", [l.id])).rows.length) return err(409, 'Пока есть записи на просмотр, цену можно только снизить');
  await db.query('update listings set price=$2, description=coalesce($3, description) where id=$1', [l.id, price, body.description != null ? String(body.description).slice(0, 3000) : null]);
  return ok({ id: l.id, price });
});
on('POST', '/v1/seller/listings/:id/photos', 'user', async ({ db, user, params, body }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  const data = String(body.data || '');
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(data)) return err(400, 'Нужна фотография JPEG, PNG или WEBP');
  if (data.length > 1_600_000) return err(413, 'Фото слишком большое — до 1 МБ');
  const photos = Array.isArray(l.photos) ? l.photos : [];
  if (photos.length >= 8) return err(409, 'Не больше 8 фото');
  photos.push(data);
  await db.query('update listings set photos=$2 where id=$1', [l.id, JSON.stringify(photos)]);
  return ok({ count: photos.length }, 201);
});
on('GET', '/v1/seller/listings/:id', 'user', async ({ db, user, params }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  const insp = await lastInspection(db, l.id);
  const booked = (await db.query("select point_id from inspections where listing_id=$1 and status='booked' limit 1", [l.id])).rows[0];
  const buyers = (await db.query("select distinct u.id, u.name from viewings v join users u on u.id=v.buyer_id where v.listing_id=$1 and v.status in ('confirmed','done','requested')", [l.id])).rows;
  const stats = { likes: Number((await db.query('select count(*)::int n from likes where listing_id=$1', [l.id])).rows[0].n), viewings: buyers.length };
  return ok({ ...listingOut(l, insp, { level: 'full', from: HOME }), booked_point: booked ? booked.point_id : null, expires_at: l.expires_at, commission_if_sold: commission(l.price), fee_if_not_sold: PRICE.notSold, buyers, stats });
});

on('GET', '/v1/seller/listings', 'user', async ({ db, user }) => {
  const { rows } = await db.query('select * from listings where seller_id=$1 order by created_at desc', [user.id]);
  const items = [];
  for (const l of rows) {
    const insp = await lastInspection(db, l.id);
    const booked = (await db.query("select point_id from inspections where listing_id=$1 and status='booked' limit 1", [l.id])).rows[0];
    items.push({ ...listingOut(l, insp, { level: 'full', from: HOME }), booked_point: booked ? booked.point_id : null, expires_at: l.expires_at, commission_if_sold: commission(l.price), fee_if_not_sold: PRICE.notSold });
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
on('POST', '/v1/seller/listings/:id/sold', 'user', async ({ db, user, params, body }) => {
  const [l, e] = await ownListing(db, user, params.id);
  if (e) return e;
  if (l.status !== 'published') return err(409, 'Объявление не опубликовано');
  const buyer = body.buyer_id ? (await db.query('select 1 from viewings where listing_id=$1 and buyer_id=$2', [l.id, body.buyer_id])).rows.length : 0;
  await db.query("update listings set status='sold', closed_at=now(), buyer_id=$2 where id=$1", [l.id, buyer ? body.buyer_id : null]);
  const charge = buyer
    ? await chargeSeller(db, l, 'commission', commission(l.price), `Комиссия 1%: ${l.make} ${l.model}`)
    : await chargeSeller(db, l, 'not_sold_fee', PRICE.notSold, `Продано вне приложения: ${l.make} ${l.model}`);
  return ok({ status: 'sold', via_app: !!buyer, charge });
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
