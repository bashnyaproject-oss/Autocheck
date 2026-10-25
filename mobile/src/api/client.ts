import { Platform } from 'react-native';

/**
 * All server calls (docs/openapi.yaml, server/routes.js). The server decides what each
 * access level may see, so the app simply renders whatever fields arrive.
 * Web build: same origin (/api). Phones: EXPO_PUBLIC_API_URL or the live site.
 */
const LIVE = 'https://autocheck-nu.vercel.app';
export const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? (Platform.OS === 'web' ? '' : LIVE);
const API = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'web' ? '/api' : LIVE + '/api');

export type Access = 'guest' | 'member' | 'full';
export type Body = 'sedan' | 'suv' | 'hatch';
export type Flag = { kind: 'ok' | 'note'; text: string };
export type Listing = {
  id: string; make: string; model: string; year: number; price: number; city: string; body: Body; color: string;
  status: string; inspected: boolean; inspected_at: string | null; access: Access; photos: string[];
  cover_blur?: string | null; power?: number | null; fuel?: string | null; consumption?: number | null;
  km?: number; engine?: string | null; gearbox?: string | null; drive?: string | null; owners?: number; distance_km?: number | null; photo_count?: number;
  market_price?: number | null; district?: string | null; description?: string | null; grade?: number | null; flags?: Flag[];
  inspected_by?: string | null; seller?: { id: string; name: string; verified: boolean } | null; liked?: boolean; mine?: boolean;
};
export type Report = { history: { title: string; value: string; kind: string }[]; paint: { part: string; microns: number }[]; checklist: { title: string; ok: boolean; note?: string | null }[]; grade: number | null; used_this_week: number };
export type Me = { id: string; name: string; verified_by: 'esia' | 'tid' | 'sberid'; pass: { active: boolean; until: string | null; used_this_week: number; weekly_limit: number }; seller_card: { last4: string } | null };
export type Viewing = { id: string; listing_id: string; at: string; status: 'requested' | 'confirmed' | 'declined' | 'done' | 'cancelled'; note: string | null; title: string; price: number; color: string; body: Body; district: string | null; buyer?: { id: string; name: string }; thread_id: string | null };
export type Thread = { id: string; listing_id: string; title: string; color: string; body: Body; with: string; role: 'buyer' | 'seller'; last_text: string | null; last_at: string | null };
export type Message = { id: string; mine: boolean; system: boolean; text: string; at: string };
export type MyListing = Listing & { booked_point: string | null; expires_at: string | null; commission_if_sold: number; fee_if_not_sold: number; buyers?: { id: string; name: string }[]; stats?: { likes: number; viewings: number } };
export type Filters = {
  q?: string; make?: string[]; model?: string[]; price_min?: number; price_max?: number; year_min?: number; year_max?: number; km_max?: number;
  body?: Body[]; gearbox?: string[]; drive?: string[]; fuel?: string[]; owners_max?: number; grade_min?: number; category?: string; sort?: string;
  view?: 'all'; // desktop: show the results page even without filters
};
export type Facets = { makes: { make: string; count: number; models: { model: string; count: number }[] }[]; price: [number, number]; year: [number, number]; categories?: Record<string, number> };
export type Quiz = { purpose?: 'city' | 'family' | 'trips' | 'first'; budget_max?: number; body?: Body[]; gearbox?: 'auto' | 'manual' | 'any'; drive?: 'awd' | 'any'; priorities?: string[] };
export type Pick = Listing & { match: number; why: string[]; warn: string[] };
/** Count of active filters, for the filter button badge. */
export function filterCount(f: Filters) {
  return (['make', 'model', 'body', 'gearbox', 'drive', 'fuel'] as const).reduce((n, k) => n + (f[k]?.length ? 1 : 0), 0)
    + (f.price_min || f.price_max ? 1 : 0) + (f.year_min || f.year_max ? 1 : 0) + (f.km_max ? 1 : 0) + (f.owners_max ? 1 : 0) + (f.grade_min ? 1 : 0);
}
/** Photo URL for a size: demo photos have -s (small) variants. Relative paths point at the site. */
export function photoUrl(u: string | null | undefined, size: 'full' | 'small' = 'full') {
  if (!u) return undefined;
  const v = size === 'small' && u.startsWith('/photos/') && !u.endsWith('-b.jpg') ? u.replace(/\.jpg$/, '-s.jpg') : u;
  return v.startsWith('/') ? (Platform.OS === 'web' ? v : LIVE + v) : v;
}

let token: string | null = null;
const store = {
  get(k: string) { try { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : null; } catch { return null; } },
  set(k: string, v: string | null) { try { if (Platform.OS === 'web') { if (v == null) globalThis.localStorage?.removeItem(k); else globalThis.localStorage?.setItem(k, v); } } catch { /* private mode */ } },
};
token = store.get('osm_token');
export const hasToken = () => !!token;
export function setToken(t: string | null) { token = t; store.set('osm_token', t); }
function deviceId() {
  let d = store.get('osm_device');
  if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('osm_device', d); }
  return d;
}

/** Welcome screens are shown once per device. */
let welcomeSeen = false;
export const seenWelcome = () => welcomeSeen || store.get('osm_welcome') === '1';
export function markWelcome() { welcomeSeen = true; store.set('osm_welcome', '1'); }
/** Quiz answers live on the device (no account needed to get picks). */
let quizMem: Quiz | null = null;
export function loadQuiz(): Quiz | null { if (quizMem) return quizMem; try { const v = store.get('osm_quiz'); return v ? (quizMem = JSON.parse(v)) : null; } catch { return null; } }
export function saveQuiz(q: Quiz | null) { quizMem = q; store.set('osm_quiz', q ? JSON.stringify(q) : null); }

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Нет связи с сервером');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error || `Ошибка ${r.status}`);
  return j as T;
}
const qs = (o: Record<string, unknown>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : String(v))}`);
  return p.length ? '?' + p.join('&') : '';
};

export const api = {
  async signIn(provider: 'esia' | 'tid' | 'sberid', name: string, login?: string) {
    const r = await http<{ token: string }>('POST', '/v1/auth/demo', { provider, device: deviceId(), name, login });
    setToken(r.token);
  },
  me: () => http<Me>('GET', '/v1/me'),
  deleteAccount: () => http('DELETE', '/v1/me'),
  feed: (f: Filters) => http<{ items: Listing[]; total: number; access: Access }>('GET', '/v1/feed' + qs(f)),
  count: (f: Filters) => http<{ total: number }>('GET', '/v1/feed' + qs({ ...f, count_only: 1 })),
  facets: () => http<Facets>('GET', '/v1/facets'),
  match: (q: Quiz) => http<{ items: Pick[]; access: Access }>('POST', '/v1/match', q),
  listing: (id: string) => http<Listing>('GET', `/v1/listings/${id}`),
  report: (id: string) => http<Report>('POST', `/v1/listings/${id}/report`),
  like: (id: string, on: boolean) => http(on ? 'PUT' : 'DELETE', `/v1/listings/${id}/like`),
  favorites: () => http<{ items: Listing[] }>('GET', '/v1/favorites'),
  async passCheckout() {
    const r = await http<{ status: string; confirmation_url: string | null; token?: string }>('POST', '/v1/pass/checkout');
    if (r.token) setToken(r.token);
    return r;
  },

  book: (id: string, at: string, note?: string) => http<{ id: string; thread_id: string }>('POST', `/v1/listings/${id}/viewings`, { at, note }),
  viewings: () => http<{ items: Viewing[]; bought: Listing[] }>('GET', '/v1/viewings'),
  cancelViewing: (id: string) => http('POST', `/v1/viewings/${id}/cancel`),
  sellerViewings: () => http<{ items: Viewing[] }>('GET', '/v1/seller/viewings'),
  answerViewing: (id: string, action: 'confirm' | 'decline' | 'done') => http('POST', `/v1/seller/viewings/${id}/${action}`),

  openThread: (listingId: string, text?: string) => http<{ thread_id: string }>('POST', `/v1/listings/${listingId}/thread`, { text }),
  threads: () => http<{ items: Thread[] }>('GET', '/v1/threads'),
  thread: (id: string) => http<{ id: string; listing_id: string; title: string; messages: Message[] }>('GET', `/v1/threads/${id}`),
  send: (id: string, text: string) => http('POST', `/v1/threads/${id}/messages`, { text }),

  importListing: (url: string) => http<{ ok: boolean; data?: { title?: string; year?: number; km?: number; price?: number; engine?: string; transmission?: string; description?: string }; guess?: { make?: string; model?: string; year?: number }; error?: string }>('POST', '/v1/seller/import', { url }),
  createListing: (b: Record<string, unknown>) => http<{ id: string }>('POST', '/v1/seller/listings', b),
  addPhoto: (id: string, data: string) => http<{ count: number }>('POST', `/v1/seller/listings/${id}/photos`, { data }),
  sellerCard: () => http<{ status: string; confirmation_url: string | null }>('POST', '/v1/seller/card'),
  bookInspection: (id: string, point_id: string) => http<{ status: string; confirmation_url: string | null }>('POST', `/v1/seller/listings/${id}/inspection`, { point_id }),
  myListings: () => http<{ items: MyListing[] }>('GET', '/v1/seller/listings'),
  myListing: (id: string) => http<MyListing>('GET', `/v1/seller/listings/${id}`),
  updateListing: (id: string, b: { price?: number; description?: string }) => http('PATCH', `/v1/seller/listings/${id}`, b),
  markSold: (id: string, buyer_id?: string) => http<{ via_app: boolean; charge: { amount: number } }>('POST', `/v1/seller/listings/${id}/sold`, { buyer_id }),
  removeListing: (id: string) => http<{ charge: { amount: number } | null }>('DELETE', `/v1/seller/listings/${id}`),
  points: () => http<{ items: { id: string; name: string; addr: string }[] }>('GET', '/v1/points'),
};
