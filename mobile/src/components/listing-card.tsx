import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Listing } from '@/api/types';
import { C, Font, R, gradeColor, gradeLabel, kmf, rub } from '@/constants/theme';
import { carScene } from '@/lib/car-art';

import { GradePill } from './ui';

const variantOf = (id: string) => id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

export function ListingPhoto({ l, style }: { l: Listing; style?: object }) {
  return <Image source={{ uri: carScene(l.color, l.body, variantOf(l.id)) }} style={[{ width: '100%', aspectRatio: 4 / 3 }, style]} contentFit="cover" />;
}

/** Big card in the swipe deck. Grade colour and number are visible only with the pass. */
export function DeckCard({ l, showGrade, onOpen }: { l: Listing; showGrade: boolean; onOpen: () => void }) {
  const below = Math.round(((l.marketPrice - l.price) / l.marketPrice) * 100);
  return (
    <Pressable onPress={onOpen} style={st.card} accessibilityRole="button" accessibilityLabel={`${l.make} ${l.model}, ${l.year}, ${rub(l.price)}`}>
      <View style={st.photoWrap}>
        <ListingPhoto l={l} />
        <View style={st.topRow}>
          <View style={st.chip}><Text style={st.chipText}>✓ Осмотрено {l.inspectedAt.slice(0, 5)}</Text></View>
          {showGrade ? (
            <View style={[st.chip, { backgroundColor: gradeColor(l.grade) }]}><Text style={[st.chipText, { color: l.grade >= 72 ? '#fff' : '#3A2E00' }]}>{gradeLabel(l.grade)} · {l.grade}</Text></View>
          ) : (
            <View style={[st.chip, { backgroundColor: 'rgba(20,20,20,.72)' }]}><Text style={[st.chipText, { color: '#fff' }]}>🔒 Оценка в пропуске</Text></View>
          )}
        </View>
      </View>
      <View style={st.info}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>{l.make} {l.model}, {l.year}</Text>
            <Text style={st.meta}>{kmf(l.km)} · {l.gearbox} · {l.engine}</Text>
            <Text style={st.meta}>{l.distanceKm} км · {l.district}, {l.city}</Text>
          </View>
          {showGrade ? <GradePill grade={l.grade} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <Text style={st.price}>{rub(l.price)}</Text>
          {below >= 3 ? <Text style={st.deal}>ниже рынка на {below}%</Text> : null}
        </View>
        <View style={st.flags}>
          {l.flags.map((f) => (
            <View key={f.text} style={[st.flag, { backgroundColor: f.kind === 'ok' ? '#E7F7EE' : '#FFF6DA' }]}>
              <Text style={[st.flagText, { color: f.kind === 'ok' ? '#0E7A3D' : '#7A5A00' }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  photoWrap: { width: '100%', aspectRatio: 4 / 3, backgroundColor: C.fill },
  topRow: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: C.ink },
  info: { padding: 18, gap: 2 },
  title: { fontFamily: Font, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: C.ink },
  meta: { fontFamily: Font, fontSize: 14.5, color: C.muted, marginTop: 2 },
  price: { fontFamily: Font, fontSize: 24, fontWeight: '800', color: C.ink },
  flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  flag: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  flagText: { fontFamily: Font, fontSize: 13, fontWeight: '600' },
  deal: { fontFamily: Font, fontSize: 14, fontWeight: '600', color: C.green },
});
