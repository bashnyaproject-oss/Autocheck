-- Осмотрено: MVP database (PostgreSQL 16, hosted in Russia — 152-ФЗ).
-- Money in kopecks. Times in UTC.

create table users (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text,
  created_at    timestamptz not null default now(),
  blocked_at    timestamptz,                 -- confirmed fraud: account closed
  blocked_reason text
);

-- One person = one account: the verified identity is unique.
create table identities (
  user_id     uuid not null references users(id),
  provider    text not null check (provider in ('esia','tid','sberid')),
  subject     text not null,                 -- stable id from the provider
  verified    boolean not null,              -- «подтверждённая учётная запись»
  created_at  timestamptz not null default now(),
  primary key (provider, subject)
);

create table passes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  payment_id   uuid,
  auto_renew   boolean not null default true
);
create index on passes (user_id, ends_at);

-- Weekly limit: 30 unique listings per ISO week.
create table report_views (
  user_id     uuid not null references users(id),
  listing_id  uuid not null,
  iso_week    text not null,                 -- '2026-W43'
  opened_at   timestamptz not null default now(),
  primary key (user_id, listing_id, iso_week)
);

create table cars (
  vin        text primary key,
  make       text not null,
  model      text not null,
  year       int  not null,
  body       text,
  engine     text,
  gearbox    text,
  drive      text
);

create table listings (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid not null references users(id),
  vin            text not null references cars(vin),
  status         text not null check (status in ('draft','awaiting_inspection','published','rejected','sold','removed','expired')),
  price          bigint not null,
  km             int not null,
  city           text not null,
  lat            double precision,
  lng            double precision,
  description    text,
  source_url     text,                       -- seller's own listing on Авто.ру / Авито / Дром
  photos         text[] not null default '{}',
  published_at   timestamptz,
  expires_at     timestamptz,                -- published_at + 60 days
  sold_via_us    boolean,
  created_at     timestamptz not null default now()
);
create index on listings (status, published_at desc);

create table inspections (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references listings(id),
  point_id      text not null,
  scheduled_at  timestamptz,
  done_at       timestamptz,
  inspector     text,
  grade         int check (grade between 0 and 100),   -- below 60 → listing 'rejected'
  flags         jsonb not null default '[]',
  checklist     jsonb not null default '[]',
  paint         jsonb not null default '[]',
  payment_id    uuid
);

create table base_reports (
  vin        text not null references cars(vin),
  fetched_at timestamptz not null default now(),
  provider   text not null,
  data       jsonb not null,
  primary key (vin, fetched_at)
);

create table likes (
  user_id    uuid not null references users(id),
  listing_id uuid not null references listings(id),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table viewings (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id),
  buyer_id    uuid not null references users(id),
  status      text not null check (status in ('requested','confirmed','done','cancelled')),
  at          timestamptz,
  created_at  timestamptz not null default now()
);

-- Saved card of the seller (ЮKassa payment_method_id) for post-pay: commission or not-sold fee.
create table seller_cards (
  user_id            uuid primary key references users(id),
  provider           text not null default 'yookassa',
  payment_method_id  text not null,
  card_last4         text,
  created_at         timestamptz not null default now()
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id),
  kind         text not null check (kind in ('pass','inspection','commission','not_sold_fee','fraud_penalty')),
  amount       bigint not null,
  status       text not null check (status in ('pending','succeeded','canceled','refunded')),
  provider_id  text,                         -- id in ЮKassa
  listing_id   uuid references listings(id),
  created_at   timestamptz not null default now()
);

create table fraud_cases (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id),
  reported_by uuid references users(id),
  reason      text not null,
  confirmed   boolean,
  decided_at  timestamptz
);
