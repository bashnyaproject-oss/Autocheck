const test = require('node:test');
const assert = require('node:assert/strict');
const { freshMemoryDb } = require('../db');
const { handle } = require('../routes');

const call = (method, path, { token, body, query, headers } = {}) =>
  handle({ method, path, body, query, headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...(headers || {}) } });

async function signIn(device) {
  const r = await call('POST', '/v1/auth/demo', { body: { provider: 'esia', device, name: 'Тест' } });
  assert.equal(r.status, 200);
  return r.body.token;
}

test.beforeEach(async () => { await freshMemoryDb(); });

test('access levels: guest sees little, member a bit more, pass holder everything', async () => {
  const g = await call('GET', '/v1/feed');
  assert.equal(g.body.access, 'guest');
  assert.equal(g.body.items.length, 8);
  assert.ok(g.body.items.every((i) => i.km === undefined && i.grade === undefined && i.photos.length === 0));
  const t = await signIn('levels');
  const m = await call('GET', '/v1/feed', { token: t });
  assert.equal(m.body.access, 'member');
  assert.ok(m.body.items.every((i) => typeof i.km === 'number' && i.grade === undefined && i.description === undefined));
  await call('POST', '/v1/pass/checkout', { token: t });
  const f = await call('GET', '/v1/listings/l2', { token: t });
  assert.equal(f.body.access, 'full');
  assert.equal(f.body.grade, 88);
  assert.ok(f.body.description && f.body.seller.name);
  // search filters
  const q = await call('GET', '/v1/feed', { token: t, query: { q: 'kia' } });
  assert.deepEqual(q.body.items.map((i) => i.make), ['Kia']);
  const top = await call('GET', '/v1/feed', { token: t, query: { category: 'top' } });
  assert.ok(top.body.items.length > 0 && top.body.items.every((i) => i.grade >= 85));
});

test('viewing: needs the pass, seller confirms, both see the thread, sale to that buyer → 1%', async () => {
  const seller = await signIn('seller-v');
  const c = await call('POST', '/v1/seller/listings', { token: seller, body: { title: 'Kia Rio', year: 2020, km: 50000, price: 1200000, description: 'Тест', district: 'Сокол' } });
  await call('POST', '/v1/seller/card', { token: seller });
  await call('POST', `/v1/seller/listings/${c.body.id}/inspection`, { token: seller, body: {} });
  await call('POST', `/v1/inspections/${c.body.id}/result`, { headers: { 'x-partner-key': 'demo-partner' }, body: { grade: 80 } });
  const buyer = await signIn('buyer-v');
  const at = new Date(Date.now() + 2 * 864e5).toISOString();
  assert.equal((await call('POST', `/v1/listings/${c.body.id}/viewings`, { token: buyer, body: { at } })).status, 402);
  await call('POST', '/v1/pass/checkout', { token: buyer });
  const v = await call('POST', `/v1/listings/${c.body.id}/viewings`, { token: buyer, body: { at, note: 'Можно с механиком?' } });
  assert.equal(v.status, 201);
  const sv = await call('GET', '/v1/seller/viewings', { token: seller });
  assert.equal(sv.body.items[0].buyer.name, 'Тест');
  assert.equal((await call('POST', `/v1/seller/viewings/${v.body.id}/confirm`, { token: seller })).body.status, 'confirmed');
  const th = await call('GET', '/v1/threads', { token: seller });
  assert.equal(th.body.items.length, 1);
  await call('POST', `/v1/threads/${th.body.items[0].id}/messages`, { token: seller, body: { text: 'Да, конечно' } });
  const msgs = await call('GET', `/v1/threads/${v.body.thread_id}`, { token: buyer });
  assert.ok(msgs.body.messages.some((m) => m.text === 'Да, конечно' && !m.mine));
  const me = (await call('GET', '/v1/me', { token: buyer })).body;
  const sold = await call('POST', `/v1/seller/listings/${c.body.id}/sold`, { token: seller, body: { buyer_id: me.id } });
  assert.equal(sold.body.via_app, true);
  assert.equal(sold.body.charge.amount, 12000);
  assert.equal((await call('GET', '/v1/viewings', { token: buyer })).body.bought.length, 1);
});

test('same person gets the same account (one person — one pass)', async () => {
  const a = await call('POST', '/v1/auth/demo', { body: { device: 'd1' } });
  const b = await call('POST', '/v1/auth/demo', { body: { device: 'd1' } });
  assert.equal(a.body.user.id, b.body.user.id);
});

test('pass: 402 without it, grades visible with it, 30 unique reports per week then 429', async () => {
  const t = await signIn('buyer');
  assert.equal((await call('POST', '/v1/listings/l1/report', { token: t })).status, 402);
  const co = await call('POST', '/v1/pass/checkout', { token: t });
  assert.equal(co.body.status, 'succeeded');
  const feed = await call('GET', '/v1/feed', { token: t });
  assert.ok(feed.body.items.every((i) => i.grade >= 60));
  assert.equal(feed.body.access, 'full');
  const r1 = await call('POST', '/v1/listings/l1/report', { token: t });
  assert.equal(r1.status, 200);
  assert.ok(r1.body.history.length > 0 && r1.body.checklist.length > 0);
  // reopening the same car doesn't count again
  assert.equal((await call('POST', '/v1/listings/l1/report', { token: t })).body.used_this_week, 1);
  // fill the week to 30 with fake views, then a new car is refused
  const { getDb } = require('../db');
  const db = await getDb();
  const { isoWeek } = require('../routes');
  const me = (await call('GET', '/v1/me', { token: t })).body;
  for (let i = 0; i < 29; i++) await db.query('insert into report_views (user_id,listing_id,iso_week) values ($1,$2,$3)', [me.id, 'x' + i, isoWeek()]);
  assert.equal((await call('POST', '/v1/listings/l2/report', { token: t })).status, 429);
  assert.equal((await call('POST', '/v1/listings/l1/report', { token: t })).status, 200);
});

test('likes and favorites', async () => {
  const t = await signIn('liker');
  await call('PUT', '/v1/listings/l3/like', { token: t });
  const f = await call('GET', '/v1/favorites', { token: t });
  assert.deepEqual(f.body.items.map((i) => i.id), ['l3']);
});

test('seller: card → inspection → grade < 60 rejected, ≥ 60 published; sold outside or removed → 2 990 ₽', async () => {
  const t = await signIn('seller');
  const c = await call('POST', '/v1/seller/listings', { token: t, body: { title: 'Porsche 911', year: 2019, km: 34000, price: 14900000 } });
  assert.equal(c.status, 201);
  const id = c.body.id;
  assert.equal((await call('POST', `/v1/seller/listings/${id}/inspection`, { token: t, body: { point_id: 'o1' } })).status, 409); // no card yet
  assert.equal((await call('POST', '/v1/seller/card', { token: t })).body.status, 'succeeded');
  assert.equal((await call('POST', `/v1/seller/listings/${id}/inspection`, { token: t, body: { point_id: 'o1' } })).body.status, 'succeeded');
  const partner = { 'x-partner-key': 'demo-partner' };
  assert.equal((await call('POST', `/v1/inspections/${id}/result`, { body: { grade: 55 } })).status, 401);
  assert.equal((await call('POST', `/v1/inspections/${id}/result`, { headers: partner, body: { grade: 55 } })).body.status, 'rejected');
  assert.equal((await call('GET', `/v1/listings/${id}`)).status, 404);
  // second inspection after repair
  await call('POST', `/v1/seller/listings/${id}/inspection`, { token: t, body: { point_id: 's1' } });
  assert.equal((await call('POST', `/v1/inspections/${id}/result`, { headers: partner, body: { grade: 83, flags: [{ kind: 'ok', text: 'Пробег подтверждён' }] } })).body.status, 'published');
  const feed = await call('GET', '/v1/feed');
  assert.ok(feed.body.items.some((i) => i.id === id));
  const sold = await call('POST', `/v1/seller/listings/${id}/sold`, { token: t });
  assert.deepEqual(sold.body.charge, { kind: 'not_sold_fee', amount: 2990, status: 'succeeded' }); // sold outside the app

  const c2 = await call('POST', '/v1/seller/listings', { token: t, body: { title: 'Kia Rio', year: 2020, km: 50000, price: 1200000 } });
  await call('POST', `/v1/seller/listings/${c2.body.id}/inspection`, { token: t, body: {} });
  await call('POST', `/v1/inspections/${c2.body.id}/result`, { headers: partner, body: { grade: 75 } });
  const rm = await call('DELETE', `/v1/seller/listings/${c2.body.id}`, { token: t });
  assert.deepEqual(rm.body.charge, { kind: 'not_sold_fee', amount: 2990, status: 'succeeded' });
});

test('fraud: listing removed and seller blocked', async () => {
  const t = await signIn('cheater');
  const c = await call('POST', '/v1/seller/listings', { token: t, body: { title: 'Lada Granta', year: 2019, km: 20000, price: 700000 } });
  await call('POST', '/v1/seller/card', { token: t });
  await call('POST', `/v1/seller/listings/${c.body.id}/inspection`, { token: t, body: {} });
  await call('POST', `/v1/inspections/${c.body.id}/result`, { headers: { 'x-partner-key': 'demo-partner' }, body: { grade: 70 } });
  const f = await call('POST', `/v1/admin/listings/${c.body.id}/fraud`, { headers: { 'x-admin-key': 'demo-admin' }, body: { reason: 'скручен пробег' } });
  assert.equal(f.body.seller_blocked, true);
  assert.equal((await call('GET', '/v1/me', { token: t })).status, 403);
});

test('expired listings: 2 990 ₽ charged', async () => {
  const t = await signIn('slow');
  const c = await call('POST', '/v1/seller/listings', { token: t, body: { title: 'Kia Ceed', year: 2020, km: 60000, price: 1500000 } });
  await call('POST', '/v1/seller/card', { token: t });
  await call('POST', `/v1/seller/listings/${c.body.id}/inspection`, { token: t, body: {} });
  await call('POST', `/v1/inspections/${c.body.id}/result`, { headers: { 'x-partner-key': 'demo-partner' }, body: { grade: 80 } });
  const db = await require('../db').getDb();
  await db.query("update listings set expires_at = now() - interval '1 day' where id=$1", [c.body.id]);
  const r = await call('GET', '/v1/cron/expire');
  assert.equal(r.body.expired, 1);
  assert.equal(r.body.charged[0].amount, 2990);
});
