import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C, Font } from '@/constants/theme';

import type { DeepReport, Pass, User } from '@/api/types';

/**
 * Client state for the prototype. In production the server is the source of truth for
 * the pass, the weekly limit and likes; this only mirrors it.
 */
type Ctx = {
  user: User | null;
  signIn: (by: NonNullable<User['verifiedBy']>) => void;
  pass: Pass;
  buyPass: () => void;
  liked: string[];
  toggleLike: (id: string) => void;
  reports: Record<string, DeepReport>;
  saveReport: (r: DeepReport) => void;
  sellerCard: boolean;
  linkSellerCard: () => void;
  toast: (msg: string) => void;
};

const AppState = createContext<Ctx | null>(null);
export const WEEKLY_LIMIT = 30;

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [pass, setPass] = useState<Pass>({ active: false, weeklyLimit: WEEKLY_LIMIT, usedThisWeek: 0, opened: [] });
  const [liked, setLiked] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, DeepReport>>({});
  const [sellerCard, setSellerCard] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  };

  const value = useMemo<Ctx>(
    () => ({
      user,
      signIn: (by) => setUser({ id: 'u1', name: 'Иван П.', verifiedBy: by }),
      pass,
      buyPass: () => setPass((p) => ({ ...p, active: true, until: '23 ноября' })),
      liked,
      toggleLike: (id) => setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l])),
      reports,
      saveReport: (r) => {
        setReports((m) => ({ ...m, [r.listingId]: r }));
        setPass((p) => (p.opened.includes(r.listingId) ? p : { ...p, usedThisWeek: p.usedThisWeek + 1, opened: [...p.opened, r.listingId] }));
      },
      sellerCard,
      linkSellerCard: () => setSellerCard(true),
      toast,
    }),
    [user, pass, liked, reports, sellerCard],
  );
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
