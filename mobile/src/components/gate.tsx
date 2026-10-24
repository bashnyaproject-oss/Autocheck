import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { C, Font } from '@/constants/theme';
import { useApp } from '@/state/app-state';

import { PressScale } from './motion';

/** Explains what is closed and leads to the next step: sign in (guest) or get access (member). */
export function Gate({ title, compact }: { title?: string; compact?: boolean }) {
  const router = useRouter();
  const { access } = useApp();
  if (access === 'full') return null;
  const guest = access === 'guest';
  return (
    <View style={[st.box, compact && { padding: 14 }]}>
      <Text style={st.lock}>🔒</Text>
      <Text style={st.title}>{title ?? (guest ? 'Войдите, чтобы смотреть машины' : 'Откройте доступ покупателя')}</Text>
      <Text style={st.text}>
        {guest
          ? 'Фото, пробег и характеристики видны после входа через Госуслуги, Т-ID или Сбер ID. Один человек — один аккаунт.'
          : 'Оценка состояния, все фото, описание, отчёт осмотра и запись на просмотр — 990 ₽ на 30 дней.'}
      </Text>
      <PressScale onPress={() => router.push(guest ? '/auth?intent=buy' : '/pass')} style={st.btn} accessibilityRole="button">
        <Text style={st.btnText}>{guest ? 'Войти через Госуслуги' : 'Открыть доступ · 990 ₽'}</Text>
      </PressScale>
    </View>
  );
}

/** Thin banner above the feed. */
export function AccessBanner() {
  const router = useRouter();
  const { access } = useApp();
  if (access === 'full') return null;
  const guest = access === 'guest';
  return (
    <Text style={st.banner} onPress={() => router.push(guest ? '/auth' : '/pass')} accessibilityRole="link">
      {guest ? '🔒 Фото и характеристики — после входа. ' : '🔒 Оценка и запись на просмотр — с доступом. '}
      <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>{guest ? 'Войти' : 'Открыть за 990 ₽'}</Text>
    </Text>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: C.night, borderRadius: 24, padding: 20, gap: 8 },
  lock: { fontSize: 22 },
  title: { fontFamily: Font, fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  text: { fontFamily: Font, fontSize: 14.5, lineHeight: 20, color: 'rgba(255,255,255,.72)', marginBottom: 6 },
  btn: { height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Font, fontSize: 15.5, fontWeight: '800', color: C.night },
  banner: { fontFamily: Font, fontSize: 14, color: C.ink, backgroundColor: '#FFF1EF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 20, overflow: 'hidden' },
});
