import { Platform } from 'react-native';

import { LISTINGS, mockReport } from './mock';
import type { DeepReport, ImportedListing, Listing, User } from './types';

/**
 * One place for all server calls (docs/openapi.yaml).
 * EXPO_PUBLIC_API_URL set (web build uses "/api") → the real backend.
 * Not set → mock data, so screens still work offline.
 */
const API = process.env.EXPO_PUBLIC_API_URL ?? '';
const PARSE = process.env.EXPO_PUBLIC_PARSE_URL ?? (Platform.OS === 'web' ? '/api/parse' : '');
export const usingServer = !!API;

let token: string | null = null;
const store = {
  get(k: string) { try { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : null; } catch { return null; } },
  set(k: string, v: string | null) { try { if (Platform.OS === 'web') { if (v == null) globalThis.localStorage?.removeItem(k); else globalThis.localStorage?.setItem(k, v); } } catch { /* private mode */ } },
};
token = store.get('osm_token');
export function setToken(t: string | null) { token = t; store.set('osm_token', t); }
export function hasToken() { return !!token; }
function deviceId() {
  let d = store.get('osm_device');
  if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('osm_device', d); }
  return d;
}

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error || `Ошибка ${r.status}`);
  return j as T;
}

type ServerListing = {
  id: string; make: string; model: string; year: number; price: number; market_price: number | null; km: number;
  engine: string | null; gearbox: string | null; drive: string | null; body: Listing['body']; color: string; city: string;
  district: string | null; owners: number; distance_km: number | null; inspected_at: string | null; inspected_by: string | null;
  grade: number | null; flags: Listing['flags']; status?: string;
};
const toListing = (s: ServerListing): Listing => ({
  id: s.id, make: s.make, model: s.model, year: s.year, price: s.price, marketPrice: s.market_price ?? s.price, km: s.km,
  engine: s.engine ?? '—', gearbox: s.gearbox ?? '—', drive: s.drive ?? '—', body: s.body, color: s.color, city: s.city,
  district: s.district ?? '', distanceKm: s.distance_km ?? 0, owners: s.owners, inspectedAt: s.inspected_at ?? '—',
  inspectedBy: s.inspected_by ?? '', grade: s.grade ?? 0, flags: s.flags ?? [], sellerVerified: true,
});

export type Me = { id: string; name: string; verified_by: 'esia' | 'tid' | 'sberid'; pass: { active: boolean; until: string | null; used_this_week: number; weekly_limit: number; opened: string[] }; seller_card: { last4: string } | null };
export type SellerListing = { id: string; make: string; model: string; year: number; price: number; status: string; grade: number | null; booked_point: string | null; commission_if_sold: number; fee_if_not_sold: number };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async signIn(provider: NonNullable<User['verifiedBy']>, name: string) {
    const r = await http<{ token: string; user: { id: string; name: string } }>('POST', '/v1/auth/demo', { provider: provider === 'gosuslugi' ? 'esia' : provider, device: deviceId(), name });
    setToken(r.token);
    return r.user;
  },
  me: () => http<Me>('GET', '/v1/me'),
  async feed(): Promise<{ items: Listing[]; passActive: boolean }> {
    if (!API) { await wait(150); return { items: LISTINGS.slice().sort((a, b) => a.distanceKm - b.distanceKm), passActive: false }; }
    const r = await http<{ items: ServerListing[]; pass_active: boolean }>('GET', '/v1/feed');
    return { items: r.items.map(toListing), passActive: r.pass_active };
  },
  async listing(id: string): Promise<Listing | undefined> {
    if (!API) return LISTINGS.find((l) => l.id === id);
    return toListing(await http<ServerListing>('GET', `/v1/listings/${id}`));
  },
  /** Counts against the weekly limit (30). Throws ApiError 402 (no pass) or 429 (limit). */
  async openReport(id: string): Promise<DeepReport & { usedThisWeek?: number }> {
    if (!API) { await wait(200); return mockReport(LISTINGS.find((l) => l.id === id)!); }
    const r = await http<{ listing_id: string; history: DeepReport['history']; paint: DeepReport['paint']; checklist: DeepReport['checklist']; used_this_week: number }>('POST', `/v1/listings/${id}/report`);
    return { listingId: r.listing_id, history: r.history, paint: r.paint, checklist: r.checklist, usedThisWeek: r.used_this_week };
  },
  async like(id: string, liked: boolean) {
    if (API && token) await http(liked ? 'PUT' : 'DELETE', `/v1/listings/${id}/like`);
  },
  async favorites(): Promise<string[]> {
    if (!API || !token) return [];
    return (await http<{ items: ServerListing[] }>('GET', '/v1/favorites')).items.map((i) => i.id);
  },
  async requestViewing(id: string) {
    if (API) await http('POST', `/v1/listings/${id}/viewings`);
    else await wait(200);
  },
  /** Pass payment. Demo backend answers "succeeded"; with ЮKassa — a confirmation_url to open. */
  passCheckout: () => http<{ status: string; confirmation_url: string | null }>('POST', '/v1/pass/checkout'),

  async importListing(url: string): Promise<{ ok: boolean; data?: ImportedListing; error?: string }> {
    try {
      let j: { ok: boolean; data?: ImportedListing; error?: string } | null = null;
      if (API && token) j = await http('POST', '/v1/seller/import', { url });
      else if (PARSE) j = await (await fetch(`${PARSE}?url=${encodeURIComponent(url)}`)).json();
      if (!j) return { ok: false, data: guessFromUrl(url), error: 'Загрузка по ссылке заработает после подключения сервера' };
      return { ok: !!j.ok, data: j.data ?? guessFromUrl(url), error: j.error };
    } catch (e) {
      return { ok: false, data: guessFromUrl(url), error: e instanceof ApiError ? e.message : 'Сервер загрузки недоступен' };
    }
  },
  sellerCard: () => http<{ status: string; confirmation_url: string | null }>('POST', '/v1/seller/card'),
  createListing: (b: { title: string; year: number; km: number; price: number; source_url?: string }) => http<{ id: string }>('POST', '/v1/seller/listings', b),
  bookInspection: (id: string, point_id: string) => http<{ status: string; confirmation_url: string | null }>('POST', `/v1/seller/listings/${id}/inspection`, { point_id }),
  deleteAccount: () => http<{ deleted: boolean }>('DELETE', '/v1/me'),
  sellerListings: () => http<{ items: SellerListing[] }>('GET', '/v1/seller/listings'),
};

/** Make and model straight from the link: auto.ru/…/sale/kia/rio/…, drom.ru/kia/rio/…, avito.ru/…/kia_rio_2020_… */
function guessFromUrl(url: string): ImportedListing | undefined {
  const m = url.match(/sale\/([a-z-]+)\/([a-z0-9-]+)\//i) || url.match(/drom\.ru\/([a-z-]+)\/([a-z0-9-]+)\/\d+/i) || url.match(/avtomobili\/([a-z-]+)_([a-z0-9-]+)_(\d{4})_/i);
  if (!m) return undefined;
  return { title: `${cap(m[1])} ${m[2].length <= 4 ? m[2].toUpperCase() : cap(m[2])}`, year: m[3] ? Number(m[3]) : undefined };
}

const cap = (s: string) => (s.length <= 3 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));
