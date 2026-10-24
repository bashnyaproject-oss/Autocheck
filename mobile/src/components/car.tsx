import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { api, type Access, type Listing } from '@/api/client';
import { C, Font, gradeColor, gradeText, kmf, rub } from '@/constants/theme';
import { carScene, type Body } from '@/lib/car-art';

import { PressScale } from './motion';
import { useApp } from '@/state/app-state';

const variantOf = (id: string) => id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

/** A real photo if the seller uploaded one, otherwise a drawn car. Guests see it blurred. */
export function CarImage({ id, color, body, photo, blur, style }: { id: string; color: string; body: Body; photo?: string; blur?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: C.fill }, style]}>
      <Image source={{ uri: photo || carScene(color, body, variantOf(id)) }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blur ? 28 : 0} />
      {blur ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,.18)' }]} /> : null}
    </View>
  );
}

export function GradeBadge({ grade, small }: { grade: number; small?: boolean }) {
  return (
    <View style={[st.grade, { backgroundColor: gradeColor(grade) }, small && { paddingHorizontal: 7, height: 22 }]}>
      <Text style={[st.gradeText, { color: gradeText(grade) }, small && { fontSize: 12 }]}>{grade}</Text>
    </View>
  );
}

/** Studio card: grey stage with the car, badges on top, name + black price pill below. */
export function ListingCard({ l, width }: { l: Listing; width: number }) {
  const router = useRouter();
  const { access, toast, bump } = useApp();
  const [liked, setLiked] = useState(!!l.liked);
  const open = () => router.push(access === 'guest' ? '/auth' : `/listing/${l.id}`);
  const heart = async () => {
    if (access === 'guest') return router.push('/auth');
    setLiked(!liked);
    try { await api.like(l.id, !liked); bump(); } catch { setLiked(liked); toast('Не получилось'); }
  };
  const sub = l.access === 'guest' ? `${l.city} · фото после входа` : [l.km != null && kmf(l.km), l.gearbox, l.distance_km != null && `${l.distance_km} км от вас`].filter(Boolean).join(' · ');
  return (
    <PressScale onPress={open} style={[st.card, { width }]} scale={0.98} accessibilityRole="button" accessibilityLabel={`${l.make} ${l.model}, ${l.year}, ${rub(l.price)}`}>
      <View>
        <CarImage id={l.id} color={l.color} body={l.body} photo={l.photos[0]} blur={l.access === 'guest'} style={{ width: width - 16, aspectRatio: 1.45, borderRadius: 20 }} />
        <View style={st.badge}><Text style={st.badgeText}>✓ Осмотрено</Text></View>
        <Pressable onPress={heart} hitSlop={10} style={st.heart} accessibilityLabel={liked ? 'Убрать из избранного' : 'В избранное'}>
          <Text style={[st.heartText, liked && { color: C.ink }]}>{liked ? '♥' : '♡'}</Text>
        </Pressable>
        {l.grade != null ? <View style={st.gradeOn}><GradeBadge grade={l.grade} /></View> : null}
        {l.access === 'guest' ? <View style={st.lock}><Text style={st.lockText}>🔒 Войдите, чтобы смотреть</Text></View> : null}
      </View>
      <View style={st.row}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={st.title} numberOfLines={1}>{l.make} {l.model}</Text>
          <Text style={st.sub} numberOfLines={1}>{l.year} · {sub}</Text>
        </View>
        <View style={st.pricePill}><Text style={st.priceText}>{rub(l.price)}</Text></View>
      </View>
    </PressScale>
  );
}

/** Horizontal photo gallery with page dots. Photos beyond what the access level allows are blurred placeholders. */
export function Gallery({ l, access }: { l: Listing; access: Access }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 760);
  const [page, setPage] = useState(0);
  const total = Math.max(l.photos.length, l.photo_count ?? 0, 1);
  const shown = access === 'full' ? Math.max(l.photos.length, 1) : 1;
  const slides = Array.from({ length: access === 'full' ? shown : Math.min(total, 3) }, (_, i) => i);
  return (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))} scrollEventThrottle={32}>
        {slides.map((i) => (
          <View key={i}>
            <CarImage id={l.id + i} color={l.color} body={l.body} photo={l.photos[i]} blur={access === 'guest' || i >= shown} style={{ width: w, aspectRatio: 1.3 }} />
            {i >= shown ? <View style={st.galLock}><Text style={st.galLockText}>🔒 Остальные фото — с доступом</Text></View> : null}
          </View>
        ))}
      </ScrollView>
      {slides.length > 1 ? <View style={st.counter}><Text style={st.counterText}>{page + 1} / {slides.length}</Text></View> : null}
    </View>
  );
}

const CATS = [
  ['', 'Все'], ['suv', 'Кроссоверы'], ['sedan', 'Седаны'], ['hatch', 'Хэтчбеки'],
  ['cheap', 'До 1,5 млн'], ['fresh', 'Свежие'], ['top', 'Оценка 85+'],
] as const;
export function CategoryBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      {CATS.map(([k, label]) => {
        const on = (value || '') === k;
        return (
          <PressScale key={k} onPress={() => onChange(k)} style={[st.cat, on && st.catOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[st.catLabel, { color: on ? '#fff' : C.ink }]}>{label}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.fill, borderRadius: 26, padding: 8, paddingBottom: 14 },
  gradeOn: { position: 'absolute', left: 12, bottom: 12 },
  pricePill: { backgroundColor: C.night, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  priceText: { fontFamily: Font, color: '#fff', fontSize: 14, fontWeight: '800' },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  badgeText: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: C.ink },
  heart: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heartText: { fontSize: 19, color: C.ink, lineHeight: 22 },
  lock: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  lockText: { fontFamily: Font, backgroundColor: 'rgba(20,20,20,.78)', color: '#fff', fontWeight: '600', fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: 8 },
  title: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  sub: { fontFamily: Font, fontSize: 13.5, color: C.muted },
  price: { fontFamily: Font, fontSize: 16, color: C.ink, marginTop: 4 },
  grade: { borderRadius: 8, paddingHorizontal: 9, height: 26, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontFamily: Font, fontWeight: '800', fontSize: 14 },
  counter: { position: 'absolute', right: 14, bottom: 14, backgroundColor: 'rgba(20,20,20,.7)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  counterText: { color: '#fff', fontFamily: Font, fontSize: 13, fontWeight: '600' },
  galLock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  galLockText: { fontFamily: Font, backgroundColor: 'rgba(20,20,20,.78)', color: '#fff', fontWeight: '700', fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  cat: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.fill },
  catOn: { backgroundColor: C.night },
  catLabel: { fontFamily: Font, fontSize: 14, fontWeight: '700' },
});
