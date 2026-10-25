import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Pick, Quiz } from '@/api/client';
import { C, Font, kmf, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

import { CarImage } from './car';
import { PressScale } from './motion';

const PURPOSE = { city: 'город', family: 'семья', trips: 'трасса и дача', first: 'первая машина' } as const;
const PRIOR: Record<string, string> = { reliability: 'надёжность', economy: 'экономичность', comfort: 'комфорт', dynamics: 'динамика' };
const BODY: Record<string, string> = { suv: 'кроссовер', sedan: 'седан', hatch: 'хэтчбек' };

/** One-line summary of the quiz answers. */
export function quizSummary(q: Quiz) {
  const a: string[] = [];
  if (q.purpose) a.push(PURPOSE[q.purpose]);
  if (q.budget_max) a.push(`до ${(q.budget_max / 1e6).toLocaleString('ru-RU')} млн`);
  if (q.body?.length) a.push(q.body.map((b) => BODY[b]).join(' / '));
  if (q.gearbox === 'auto') a.push('автомат');
  if (q.gearbox === 'manual') a.push('механика');
  if (q.drive === 'awd') a.push('полный привод');
  if (q.priorities?.length) a.push(q.priorities.map((p) => PRIOR[p]).join(' + '));
  return a.join(' · ');
}

/** Ring-like badge with the match percentage. */
export function MatchBadge({ value, light }: { value: number; light?: boolean }) {
  return (
    <View style={[st.match, light && { backgroundColor: '#fff' }]}>
      <Text style={[st.matchN, light && { color: C.night }]}>{value}%</Text>
      <Text style={[st.matchL, light && { color: C.muted }]}>совпадение</Text>
    </View>
  );
}

/** Big pick card: photo, match, why it fits, what to keep in mind. */
export function PickCard({ p, width, compact }: { p: Pick; width: number; compact?: boolean }) {
  const router = useRouter();
  const { access } = useApp();
  return (
    <PressScale onPress={() => router.push(access === 'guest' ? '/auth?intent=buy' : `/listing/${p.id}`)} style={[st.card, { width }]} scale={0.98} accessibilityRole="button" accessibilityLabel={`${p.make} ${p.model}, совпадение ${p.match}%`}>
      <View>
        <CarImage id={p.id} color={p.color} body={p.body} photo={p.photos[0] ?? p.cover_blur} small blur={p.access === 'guest'} style={{ width: width - 16, aspectRatio: compact ? 1.5 : 1.6, borderRadius: 20 }} />
        <View style={{ position: 'absolute', top: 10, left: 10 }}><MatchBadge value={p.match} light /></View>
        {p.access === 'guest' ? <View style={st.lock}><Text style={st.lockText}>🔒 Фото после входа</Text></View> : null}
      </View>
      <View style={{ paddingHorizontal: 8, paddingTop: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>{p.make} {p.model}, {p.year}</Text>
            <Text style={st.sub} numberOfLines={1}>{[p.km != null && kmf(p.km), p.gearbox, p.city].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={st.price}>{rub(p.price)}</Text>
        </View>
        {(compact ? p.why.slice(0, 2) : p.why).map((w) => <View key={w} style={st.why}><Text style={st.tick}>✓</Text><Text style={st.whyText} numberOfLines={compact ? 1 : 2}>{w}</Text></View>)}
        {!compact ? p.warn.map((w) => <View key={w} style={st.why}><Text style={[st.tick, st.warnTick]}>!</Text><Text style={st.whyText}>{w}</Text></View>) : null}
      </View>
    </PressScale>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.fill, borderRadius: 26, padding: 8, paddingBottom: 16 },
  match: { backgroundColor: C.night, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  matchN: { fontFamily: Font, color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  matchL: { fontFamily: Font, color: 'rgba(255,255,255,.6)', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.4, marginTop: -2 },
  lock: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
  lockText: { fontFamily: Font, backgroundColor: 'rgba(11,11,12,.8)', color: '#fff', fontWeight: '700', fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  title: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  sub: { fontFamily: Font, fontSize: 13.5, color: C.muted, marginTop: 2 },
  price: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink },
  why: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.night, color: '#fff', textAlign: 'center', lineHeight: 18, fontSize: 10.5, fontWeight: '900', overflow: 'hidden', marginTop: 1 },
  warnTick: { backgroundColor: '#E8B500', color: C.night },
  whyText: { flex: 1, fontFamily: Font, fontSize: 14, color: C.ink2, lineHeight: 19 },
});
