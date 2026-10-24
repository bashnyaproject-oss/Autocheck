import { Platform } from 'react-native';

import { LISTINGS, mockReport } from './mock';
import type { DeepReport, ImportedListing, Listing } from './types';

/**
 * One place for all server calls. Until the backend exists (EXPO_PUBLIC_API_URL unset)
 * everything is answered from mock data, so screens can be built and tested now.
 * Endpoints match docs/openapi.yaml.
 */
const API = process.env.EXPO_PUBLIC_API_URL ?? '';
// The listing parser already runs on the website (Vercel function /api/parse).
const PARSE = process.env.EXPO_PUBLIC_PARSE_URL ?? (Platform.OS === 'web' ? '/api/parse' : '');

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json() as Promise<T>;
}

export const api = {
  /** Swipe feed: only inspected cars with grade ≥ 60, nearest first. */
  async feed(): Promise<Listing[]> {
    if (API) return http('/v1/feed');
    await wait(150);
    return LISTINGS.slice().sort((a, b) => a.distanceKm - b.distanceKm);
  },
  async listing(id: string): Promise<Listing | undefined> {
    if (API) return http(`/v1/listings/${id}`);
    return LISTINGS.find((l) => l.id === id);
  },
  /** Counts against the weekly limit on the server. */
  async openReport(id: string): Promise<DeepReport> {
    if (API) return http(`/v1/listings/${id}/report`, { method: 'POST' });
    await wait(200);
    return mockReport(LISTINGS.find((l) => l.id === id)!);
  },
  async like(id: string, liked: boolean): Promise<void> {
    if (API) await http(`/v1/listings/${id}/like`, { method: liked ? 'PUT' : 'DELETE' });
  },
  async requestViewing(id: string): Promise<void> {
    if (API) await http(`/v1/listings/${id}/viewings`, { method: 'POST' });
    else await wait(200);
  },
  /** Reads the seller's own listing from Авто.ру / Авито / Дром. */
  async importListing(url: string): Promise<{ ok: boolean; data?: ImportedListing; error?: string }> {
    if (!PARSE) {
      await wait(300);
      return { ok: false, data: guessFromUrl(url), error: 'Загрузка по ссылке заработает после подключения сервера' };
    }
    try {
      const r = await fetch(`${PARSE}?url=${encodeURIComponent(url)}`);
      const j = await r.json();
      return { ok: !!j.ok, data: j.data ?? guessFromUrl(url), error: j.error };
    } catch {
      return { ok: false, data: guessFromUrl(url), error: 'Сервер загрузки недоступен' };
    }
  },
};

/** Make and model straight from the link: auto.ru/…/sale/kia/rio/…, drom.ru/kia/rio/…, avito.ru/…/kia_rio_2020_… */
function guessFromUrl(url: string): ImportedListing | undefined {
  const m = url.match(/sale\/([a-z-]+)\/([a-z0-9-]+)\//i) || url.match(/drom\.ru\/([a-z-]+)\/([a-z0-9-]+)\/\d+/i) || url.match(/avtomobili\/([a-z-]+)_([a-z0-9-]+)_(\d{4})_/i);
  if (!m) return undefined;
  return { title: `${cap(m[1])} ${m[2].length <= 4 ? m[2].toUpperCase() : cap(m[2])}`, year: m[3] ? Number(m[3]) : undefined };
}

const cap = (s: string) => (s.length <= 3 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));
