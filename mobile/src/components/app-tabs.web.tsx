import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

// Web has no system tab bar: a plain bottom bar over the routes of the (tabs) group.
const TABS = [
  { href: '/', label: 'Подбор', icon: '🚘' },
  { href: '/favorites', label: 'Избранное', icon: '♥' },
  { href: '/sell', label: 'Продать', icon: '＋' },
  { href: '/profile', label: 'Профиль', icon: '👤' },
] as const;

export default function AppTabs() {
  const { liked } = useApp();
  const router = useRouter();
  const path = usePathname();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <View style={st.bar} accessibilityRole="tablist">
        <View style={st.inner}>
          {TABS.map((t) => {
            const on = path === t.href;
            const badge = t.href === '/favorites' ? liked.length : 0;
            return (
              <Pressable key={t.href} style={st.tab} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => router.navigate(t.href)}>
                <View>
                  <Text style={[st.icon, { color: on ? C.ink : C.muted }]}>{t.icon}</Text>
                  {badge ? <View style={st.badge}><Text style={st.badgeText}>{badge}</Text></View> : null}
                </View>
                <Text style={[st.label, { color: on ? C.ink : C.muted, fontWeight: on ? '700' : '500' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff', alignItems: 'center', paddingBottom: 'env(safe-area-inset-bottom)' as unknown as number },
  inner: { flexDirection: 'row', width: '100%', maxWidth: MaxContentWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  icon: { fontSize: 20, lineHeight: 24, textAlign: 'center' },
  label: { fontFamily: Font, fontSize: 12 },
  badge: { position: 'absolute', top: -4, right: -12, backgroundColor: C.brand, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
