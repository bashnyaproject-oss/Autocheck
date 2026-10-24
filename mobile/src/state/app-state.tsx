import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError, hasToken, setToken, usingServer } from '@/api/client';
import type { DeepReport, Pass, User } from '@/api/types';
import { C, Font } from '@/constants/theme';

/**
 * App state. With the backend (usingServer) the server is the source of truth for the user,
 * the pass, the weekly limit and favorites; without it everything is local demo state.
 */
type Ctx = {
  user: User | null;
  signIn: (by: NonNullable<User['verifiedBy']>) => Promise<void>;
  signOut: () => void;
  pass: Pass;
  buyPass: () => Promise<void>;
  liked: string[];
  toggleLike: (id: string) => void;
  reports: Record<string, DeepReport>;
  openReport: (id: string) => Promise<void>;
  sellerCard: boolean;
  linkSellerCard: () => Promise<void>;
  refresh: () => Promise<void>;
  toast: (msg: string) => void;
};

const AppState = createContext<Ctx | null>(null);
export const WEEKLY_LIMIT = 30;
const EMPTY_PASS: Pass = { active: false, weeklyLimit: WEEKLY_LIMIT, usedThisWeek: 0, opened: [] };

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pass, setPass] = useState<Pass>(EMPTY_PASS);
  const [liked, setLiked] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, DeepReport>>({});
  const [sellerCard, setSellerCard] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);

  const refresh = useCallback(async () => {
    if (!usingServer || !hasToken()) return;
    try {
      const me = await api.me();
      setUser({ id: me.id, name: me.name, verifiedBy: me.verified_by === 'esia' ? 'gosuslugi' : me.verified_by });
      setPass({ active: me.pass.active, until: me.pass.until ? new Date(me.pass.until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : undefined, weeklyLimit: me.pass.weekly_limit, usedThisWeek: me.pass.used_this_week, opened: me.pass.opened });
      setSellerCard(!!me.seller_card);
      const fav = await api.favorites();
      setLiked((local) => Array.from(new Set([...fav, ...local])));
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setToken(null); setUser(null); setPass(EMPTY_PASS); }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<Ctx>(() => ({
    user,
    async signIn(by) {
      if (!usingServer) { setUser({ id: 'u1', name: 'Иван П.', verifiedBy: by }); return; }
      await api.signIn(by, 'Иван П.');
      for (const id of liked) await api.like(id, true).catch(() => undefined); // sync likes made before sign-in
      await refresh();
    },
    signOut() { setToken(null); setUser(null); setPass(EMPTY_PASS); setLiked([]); setReports({}); setSellerCard(false); },
    pass,
    async buyPass() {
      if (!usingServer) { setPass((p) => ({ ...p, active: true, until: '23 ноября' })); return; }
      const r = await api.passCheckout();
      if (r.confirmation_url) await Linking.openURL(r.confirmation_url); // ЮKassa page; webhook activates the pass
      await refresh();
    },
    liked,
    toggleLike(id) {
      const on = !liked.includes(id);
      setLiked((l) => (on ? [id, ...l.filter((x) => x !== id)] : l.filter((x) => x !== id)));
      api.like(id, on).catch(() => undefined);
    },
    reports,
    async openReport(id) {
      try {
        const r = await api.openReport(id);
        setReports((m) => ({ ...m, [id]: r }));
        setPass((p) => ({ ...p, usedThisWeek: r.usedThisWeek ?? (p.opened.includes(id) ? p.usedThisWeek : p.usedThisWeek + 1), opened: p.opened.includes(id) ? p.opened : [...p.opened, id] }));
      } catch (e) {
        toast(e instanceof ApiError ? e.message : 'Не удалось открыть отчёт');
      }
    },
    sellerCard,
    async linkSellerCard() {
      if (!usingServer) { setSellerCard(true); return; }
      const r = await api.sellerCard();
      if (r.confirmation_url) await Linking.openURL(r.confirmation_url);
      await refresh();
    },
    refresh,
    toast,
  }), [user, pass, liked, reports, sellerCard, refresh, toast]);

  return (
    <AppState.Provider value={value}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={st.toastWrap}>
          <View style={st.toast} accessibilityLiveRegion="polite"><Text style={st.toastText}>{msg}</Text></View>
        </View>
      ) : null}
    </AppState.Provider>
  );
}

export function useApp() {
  const c = useContext(AppState);
  if (!c) throw new Error('useApp outside AppStateProvider');
  return c;
}

const st = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, bottom: 110, alignItems: 'center' },
  toast: { backgroundColor: C.ink, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, maxWidth: 520 },
  toastText: { color: '#fff', fontFamily: Font, fontSize: 15, fontWeight: '500' },
});
