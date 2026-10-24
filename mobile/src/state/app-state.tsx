import * as Linking from 'expo-linking';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, ApiError, hasToken, setToken, type Access, type Filters, type Me } from '@/api/client';
import { C, Font } from '@/constants/theme';

type Ctx = {
  me: Me | null;
  access: Access;
  ready: boolean;
  signIn: (by: 'esia' | 'tid' | 'sberid', name?: string, login?: string) => Promise<void>;
  signOut: () => void;
  buyPass: () => Promise<void>;
  refresh: () => Promise<void>;
  filters: Filters;
  setFilters: (f: Filters) => void;
  version: number; // bumps when data visible to the user may have changed
  bump: () => void;
  toast: (msg: string) => void;
};

const AppState = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [version, setVersion] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const refresh = useCallback(async () => {
    if (!hasToken()) { setMe(null); setReady(true); return; }
    try {
      setMe(await api.me());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { setToken(null); setMe(null); }
    }
    setReady(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const access: Access = !me ? 'guest' : me.pass.active ? 'full' : 'member';

  const value = useMemo<Ctx>(() => ({
    me, access, ready,
    async signIn(by, name, login) {
      await api.signIn(by, name || 'Покупатель', login);
      await refresh();
      bump();
    },
    signOut() { setToken(null); setMe(null); bump(); },
    async buyPass() {
      const r = await api.passCheckout();
      if (r.confirmation_url) await Linking.openURL(r.confirmation_url); // ЮKassa page; webhook activates the pass
      await refresh();
      bump();
    },
    refresh, filters, setFilters: (f) => { setFilters(f); bump(); }, version, bump, toast,
  }), [me, access, ready, refresh, filters, version, bump, toast]);

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
  toastWrap: { position: 'absolute', left: 16, right: 16, bottom: 100, alignItems: 'center' },
  toast: { backgroundColor: C.ink, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, maxWidth: 520 },
  toastText: { color: '#fff', fontFamily: Font, fontSize: 15, fontWeight: '500' },
});
