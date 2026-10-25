import { Slot, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, Font, MaxGridWidth } from '@/constants/theme';
import { useWide } from '@/hooks/use-wide';
import { useApp } from '@/state/app-state';

import { CalendarClock, Heart, MessageCircle, Search, Sparkles, UserRound } from './icons';
import { PressScale } from './motion';

// Web: phones get a floating bottom bar, desktops a top navigation bar.
const TABS = [
  { href: '/', label: 'Поиск', icon: Search },
  { href: '/saved', label: 'Избранное', icon: Heart },
  { href: '/viewings', label: 'Просмотры', icon: CalendarClock },
  { href: '/inbox', label: 'Сообщения', icon: MessageCircle },
  { href: '/profile', label: 'Профиль', icon: UserRound },
] as const;

export default function AppTabs() {
  const wide = useWide();
  return wide ? (
    <View style={{ flex: 1 }}>
      <TopNav />
      <View style={{ flex: 1 }}><Slot /></View>
    </View>
  ) : (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <BottomBar />
    </View>
  );
}

function TopNav() {
  const router = useRouter();
  const path = usePathname();
  const { me, setFilters } = useApp();
  return (
    <View style={st.top}>
      <View style={st.topInner}>
        <Text style={st.logo} onPress={() => { setFilters({}); router.navigate('/'); }}>осмотрено<Text style={{ color: '#16A34A' }}>.</Text></Text>
        <View style={st.links}>
          {[...TABS.slice(0, 4), { href: '/quiz', label: 'Подбор', icon: Sparkles }].map((t) => {
            const on = path === t.href;
            return (
              <Pressable key={t.href} onPress={() => { if (t.href === '/quiz') return router.push('/quiz'); if (t.href === '/') setFilters({ view: 'all' }); router.navigate(t.href); }} style={[st.link, on && st.linkOn]} accessibilityRole="link">
                <Text style={[st.linkText, on && { color: '#fff' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <PressScale onPress={() => router.push(me ? '/sell' : '/auth?intent=sell')} style={st.sell}><Text style={st.sellText}>Продать машину</Text></PressScale>
          {me ? (
            <PressScale onPress={() => router.navigate('/profile')} style={st.avatar} accessibilityLabel="Профиль"><Text style={st.avatarText}>{me.name[0]}</Text></PressScale>
          ) : (
            <PressScale onPress={() => router.push('/auth?intent=buy')} style={st.login}><Text style={st.loginText}>Войти</Text></PressScale>
          )}
        </View>
      </View>
    </View>
  );
}

function BottomBar() {
  const router = useRouter();
  const path = usePathname();
  return (
    <View style={st.bar} accessibilityRole="tablist" pointerEvents="box-none">
      <View style={st.inner}>
        {TABS.map((t) => {
          const on = path === t.href;
          return (
            <Pressable key={t.href} style={st.tab} accessibilityRole="tab" accessibilityLabel={t.label} accessibilityState={{ selected: on }} onPress={() => router.navigate(t.href)}>
              <View style={[st.iconWrap, on && st.iconOn]}>
                <t.icon size={20} color={on ? C.night : 'rgba(255,255,255,.7)'} strokeWidth={2} />
              </View>
              <Text style={[st.label, { color: on ? '#fff' : 'rgba(255,255,255,.55)', fontWeight: on ? '800' : '600' }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(14px)', zIndex: 10 } as object,
  topInner: { height: 72, maxWidth: MaxGridWidth, width: '100%', alignSelf: 'center', paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  logo: { fontFamily: Font, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: C.ink, cursor: 'pointer' } as object,
  links: { flexDirection: 'row', gap: 4, backgroundColor: C.fill, borderRadius: 999, padding: 4 },
  link: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  linkOn: { backgroundColor: C.night },
  linkText: { fontFamily: Font, fontSize: 14.5, fontWeight: '700', color: C.ink },
  sell: { borderWidth: 1.5, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  sellText: { fontFamily: Font, fontSize: 14.5, fontWeight: '800', color: C.ink },
  login: { backgroundColor: C.night, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10.5 },
  loginText: { fontFamily: Font, fontSize: 14.5, fontWeight: '800', color: '#fff' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Font, color: '#fff', fontSize: 17, fontWeight: '800' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' as unknown as number },
  inner: { flexDirection: 'row', width: '100%', maxWidth: 520, backgroundColor: 'rgba(11,11,12,.94)', borderRadius: 28, paddingHorizontal: 6, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, backdropFilter: 'blur(16px)' } as object,
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 2 },
  iconWrap: { width: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', transitionDuration: '220ms' } as object,
  iconOn: { backgroundColor: '#fff', width: 52 },
  icon: { fontSize: 18, lineHeight: 22, textAlign: 'center', fontWeight: '700' },
  label: { fontFamily: Font, fontSize: 10.5 },
});
