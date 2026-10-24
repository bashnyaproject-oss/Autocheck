import type { Body } from '@/lib/car-art';

/** Only cars with grade ≥ 60 are ever published. 60–71 yellow, 72–84 lime, 85+ green. */
export type Grade = number;

export type Listing = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  marketPrice: number;
  km: number;
  engine: string;
  gearbox: string;
  drive: string;
  body: Body;
  color: string;
  city: string;
  district: string;
  distanceKm: number;
  owners: number;
  inspectedAt: string; // every published car is inspected
  inspectedBy: string;
  grade: Grade;
  flags: { kind: 'ok' | 'note'; text: string }[];
  sellerVerified: boolean;
};

/** Deep report: unlocked with the pass, max 30 unique cars per week. */
export type DeepReport = {
  listingId: string;
  history: { title: string; value: string; kind: 'ok' | 'note' }[];
  paint: { part: string; microns: number }[];
  checklist: { title: string; ok: boolean; note?: string }[];
};

export type Pass = {
  active: boolean;
  until?: string;
  weeklyLimit: number;
  usedThisWeek: number;
  opened: string[]; // listing ids opened this week
};

export type User = {
  id: string;
  name: string;
  verifiedBy: 'gosuslugi' | 'tid' | 'sberid' | null;
};

export type ImportedListing = {
  title?: string;
  year?: number;
  km?: number;
  price?: number;
  engine?: string;
  transmission?: string;
  photos?: string[];
  source?: string;
};
