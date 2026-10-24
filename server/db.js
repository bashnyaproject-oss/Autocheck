// Database access. With DATABASE_URL → real PostgreSQL (pg). Without it → embedded
// PostgreSQL in memory (PGlite) with demo data: good for local runs, tests and a public demo,
// but it resets on every cold start, so don't use it for real users.
const fs = require('fs');
const path = require('path');
const { seed } = require('./seed');

let ready = null;

async function connect() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  let db;
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false } });
    db = { kind: 'postgres', query: (sql, params) => pool.query(sql, params), exec: (sql) => pool.query(sql) };
  } else {
    const { PGlite } = require('@electric-sql/pglite');
    const pg = new PGlite();
    db = { kind: 'memory', query: (sql, params) => pg.query(sql, params), exec: (sql) => pg.exec(sql) };
  }
  await db.exec(schema);
  const { rows } = await db.query('select count(*)::int as n from listings');
  if (!rows[0].n && process.env.SEED !== '0') await seed(db);
  return db;
}

function getDb() {
  if (!ready) ready = connect().catch((e) => { ready = null; throw e; });
  return ready;
}

/** Fresh in-memory database, for tests. */
async function freshMemoryDb() {
  const saved = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  ready = null;
  const db = await getDb();
  if (saved) process.env.DATABASE_URL = saved;
  return db;
}

module.exports = { getDb, freshMemoryDb };
