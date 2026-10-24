import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Font } from '@/constants/theme';

// Web has no system tab bar: a plain bottom bar over the routes of the (tabs) group.
const TABS = [
  { href: '/', label: 'Поиск', icon: '⌕' },
  { href: '/saved', label: 'Избранное', icon: '♡' },
  { href: '/viewings', label: 'Просмотры', icon: '◷' },
  { href: '/inbox', label: 'Сообщения', icon: '✉' },
  { href: '/profile', label: 'Профиль', icon: '◉' },
] as const;

export default function AppTabs() {
  const router = useRouter();
  const path = usePathname();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <View style={st.bar} accessibilityRole="tablist" pointerEvents="box-none">
        <View style={st.inner}>
          {TABS.map((t) => {
            const on = path === t.href;
            const badge = 0;
            return (
              <Pressable key={t.href} style={st.tab} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => router.navigate(t.href)}>
                <View style={[st.iconWrap, on && st.iconOn]}>
                  <Text style={[st.icon, { color: on ? C.night : 'rgba(255,255,255,.62)' }]}>{t.icon}</Text>
                  {badge ? <View style={st.badge}><Text style={st.badgeText}>{badge}</Text></View> : null}
                </View>
                <Text style={[st.label, { color: on ? '#fff' : 'rgba(255,255,255,.55)', fontWeight: on ? '800' : '600' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' as unknown as number },
  inner: { flexDirection: 'row', width: '100%', maxWidth: 520, backgroundColor: 'rgba(11,11,12,.94)', borderRadius: 28, paddingHorizontal: 6, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, backdropFilter: 'blur(16px)' } as object,
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  iconWrap: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', transitionDuration: '220ms' } as object,
  iconOn: { backgroundColor: '#fff', width: 52 },
  icon: { fontSize: 18, lineHeight: 22, textAlign: 'center', fontWeight: '700' },
  label: { fontFamily: Font, fontSize: 10.5 },
  badge: { position: 'absolute', top: -4, right: -8, backgroundColor: '#fff', borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: C.night, fontSize: 11, fontWeight: '800' },
});
