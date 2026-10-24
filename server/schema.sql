-- Осмотрено: backend schema (PostgreSQL 16). Money in rubles (integers).
-- For real users the database must live in Russia (152-ФЗ). See docs/LAUNCH.md.

create table if not exists users (
  id          text primary key,
  name        text not null,
  provider    text not null,                 -- esia | tid | sberid | demo
  subject     text not null,                 -- stable id from the provider
  verified    boolean not null default true,
  blocked     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (provider, subject)                 -- one person = one account
);

create table if not exists passes (
  user_id   text primary key references users(id) on delete cascade,
  ends_at   timestamptz not null
);

create table if not exists report_views (
  user_id     text not null references users(id) on delete cascade,
  listing_id  text not null,
  iso_week    text not null,
  opened_at   timestamptz not null default now(),
  primary key (user_id, listing_id, iso_week)
);

create table if not exists listings (
  id            text primary key,
  seller_id     text references users(id) on delete set null,
  status        text not null,               -- awaiting_inspection | published | rejected | sold | removed | expired
  make          text not null,
  model         text not null,
  year          int  not null,
  price         int  not null,
  market_price  int,
  km            int  not null,
  engine        text,
  gearbox       text,
  drive         text,
  body          text not null default 'sedan',
  color         text not null default '#7C8A96',
  city          text not null default 'Москва',
  district      text,
  lat           double precision,
  lng           double precision,
  owners        int not null default 1,
  vin           text,
  source_url    text,
  published_at  timestamptz,
  expires_at    timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists listings_status on listings (status, published_at desc);

create table if not exists inspections (
  id          text primary key,
  listing_id  text not null references listings(id) on delete cascade,
  point_id    text not null,
  status      text not null,                 -- booked | done
  grade       int,
  flags       jsonb not null default '[]',
  checklist   jsonb not null default '[]',
  paint       jsonb not null default '[]',
  inspector   text,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists likes (
  user_id     text not null references users(id) on delete cascade,
  listing_id  text not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists viewings (
  id          text primary key,
  listing_id  text not null references listings(id) on delete cascade,
  buyer_id    text not null references users(id) on delete cascade,
  status      text not null default 'requested',
  created_at  timestamptz not null default now()
);

create table if not exists seller_cards (
  user_id    text primary key references users(id) on delete cascade,
  method_id  text not null,                  -- ЮKassa payment_method.id
  last4      text
);

create table if not exists payments (
  id           text primary key,
  user_id      text references users(id) on delete set null,
  kind         text not null,                -- pass | inspection | card_check | commission | not_sold_fee
  amount       int  not null,
  status       text not null,                -- pending | succeeded | canceled
  provider_id  text,
  listing_id   text,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
