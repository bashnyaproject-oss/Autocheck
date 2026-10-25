import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { api, photoUrl, type Access, type Listing } from '@/api/client';
import { C, Font, gradeColor, gradeText, kmf, rub } from '@/constants/theme';
import { carScene, type Body } from '@/lib/car-art';

import { PressScale } from './motion';
import { useApp } from '@/state/app-state';

const variantOf = (id: string) => id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

/** A real photo if the seller uploaded one, otherwise a drawn car. Guests see it blurred. */
export function CarImage({ id, color, body, photo, blur, small, style }: { id: string; color: string; body: Body; photo?: string | null; blur?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const uri = photoUrl(photo, small ? 'small' : 'full') || carScene(color, body, variantOf(id));
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: C.fill }, style]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blur ? (photo?.endsWith('-b.jpg') ? 0 : 18) : 0} transition={250} />
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

/** Photo-first card: big photo with badges, then name, rating chip and price. */
export function ListingCard({ l, width }: { l: Listing; width: number }) {
  const router = useRouter();
  const { access, toast, bump } = useApp();
  const [liked, setLiked] = useState(!!l.liked);
  const open = () => router.push(access === 'guest' ? '/auth?intent=buy' : `/listing/${l.id}`);
  const heart = async () => {
    if (access === 'guest') return router.push('/auth?intent=buy');
    setLiked(!liked);
    try { await api.like(l.id, !liked); bump(); } catch { setLiked(liked); toast('Не получилось'); }
  };
  const sub = [String(l.year), l.km != null && kmf(l.km), l.gearbox, l.access === 'guest' && l.city].filter(Boolean).join(' · ');
  return (
    <PressScale onPress={open} style={{ width }} scale={0.98} accessibilityRole="button" accessibilityLabel={`${l.make} ${l.model}, ${l.year}, ${rub(l.price)}`}>
      <View>
        <CarImage id={l.id} color={l.color} body={l.body} photo={l.photos[0] ?? l.cover_blur} small blur={l.access === 'guest'} style={{ width, aspectRatio: 1.5, borderRadius: 22 }} />
        <View style={st.badge}><Text style={st.badgeText}>✓ Осмотрено</Text></View>
        <Pressable onPress={heart} hitSlop={10} style={st.heart} accessibilityLabel={liked ? 'Убрать из избранного' : 'В избранное'}>
          <Text style={[st.heartText, liked && { color: C.ink }]}>{liked ? '♥' : '♡'}</Text>
        </Pressable>
        {l.access === 'guest' ? <View style={st.lock}><Text style={st.lockText}>🔒 Войдите, чтобы смотреть</Text></View> : null}
      </View>
      <View style={st.row}>
        <Text style={st.title} numberOfLines={1}>{l.make} {l.model}</Text>
        {l.grade != null ? (
          <View style={st.rate}><View style={[st.rateDot, { backgroundColor: gradeColor(l.grade) }]} /><Text style={st.rateText}>{l.grade}</Text></View>
        ) : <View style={st.rate}><Text style={st.rateText}>🔒</Text></View>}
      </View>
      <Text style={st.sub} numberOfLines={1}>{sub}</Text>
      <Text style={st.price}>{rub(l.price)}</Text>
    </PressScale>
  );
}

/** auto.ru-style list row for desktop: photo, specs in a column, price on the right. */
export function ListingRow({ l }: { l: Listing }) {
  const router = useRouter();
  const { access, toast, bump } = useApp();
  const [liked, setLiked] = useState(!!l.liked);
  const open = () => router.push(access === 'guest' ? '/auth?intent=buy' : `/listing/${l.id}`);
  const heart = async () => {
    if (access === 'guest') return router.push('/auth?intent=buy');
    setLiked(!liked);
    try { await api.like(l.id, !liked); bump(); } catch { setLiked(liked); toast('Не получилось'); }
  };
  const BODY_RU = { sedan: 'седан', suv: 'внедорожник', hatch: 'хэтчбек' } as const;
  const below = l.market_price ? Math.round((1 - l.price / l.market_price) * 100) : 0;
  return (
    <Pressable onPress={open} style={(s: { pressed: boolean; hovered?: boolean }) => [st.lrow, s.hovered && st.lrowHover]} accessibilityRole="button" accessibilityLabel={`${l.make} ${l.model}, ${l.year}, ${rub(l.price)}`}>
      <View>
        <CarImage id={l.id} color={l.color} body={l.body} photo={l.photos[0] ?? l.cover_blur} small blur={l.access === 'guest'} style={st.lphoto} />
        <View style={[st.badge, { top: 10, left: 10 }]}><Text style={st.badgeText}>✓ Осмотрено</Text></View>
        {l.photo_count ? <View style={st.lcount}><Text style={st.counterText}>{l.photo_count} фото</Text></View> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text style={st.ltitle} numberOfLines={1}>{l.make} {l.model}</Text>
        {l.access === 'guest' ? (
          <Text style={st.lspec}>Характеристики, пробег и фото — после входа через Госуслуги</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 28 }}>
            <View style={{ gap: 3 }}>
              <Text style={st.lspec}>{l.engine}{l.fuel ? ` / ${l.fuel}` : ''}</Text>
              <Text style={st.lspec}>{l.gearbox}</Text>
              <Text style={st.lspec}>{BODY_RU[l.body]}</Text>
            </View>
            <View style={{ gap: 3 }}>
              <Text style={st.lspec}>{l.drive} привод</Text>
              <Text style={st.lspec}>{l.owners === 1 ? '1 владелец' : `${l.owners} владельца`}</Text>
              {l.consumption ? <Text style={st.lspec}>{String(l.consumption).replace('.', ',')} л / 100 км</Text> : null}
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' as unknown as number, alignItems: 'center' }}>
          {l.grade != null ? <View style={st.rate}><View style={[st.rateDot, { backgroundColor: gradeColor(l.grade) }]} /><Text style={st.rateText}>Оценка {l.grade}/100</Text></View> : <View style={st.rate}><Text style={st.rateText}>🔒 Оценка с доступом</Text></View>}
          <Text style={st.lmuted}>{l.city}{l.inspected_at ? ` · осмотрено ${l.inspected_at}` : ''}</Text>
        </View>
      </View>
      <View style={{ width: 190, alignItems: 'flex-end', gap: 6 }}>
        <Text style={st.lprice}>{rub(l.price)}</Text>
        {l.access === 'full' && below >= 3 ? <Text style={st.lgood}>ниже рынка на {below}%</Text> : null}
        <Text style={st.lyear}>{l.year}{l.km != null ? ` · ${kmf(l.km)}` : ''}</Text>
        <Pressable onPress={heart} hitSlop={8} style={st.lheart} accessibilityLabel={liked ? 'Убрать из избранного' : 'В избранное'}><Text style={{ fontSize: 18, color: C.ink }}>{liked ? '♥' : '♡'}</Text></Pressable>
      </View>
    </Pressable>
  );
}

/** Horizontal photo gallery with page dots. Photos beyond what the access level allows are blurred placeholders. */
export function Gallery({ l, access, tall }: { l: Listing; access: Access; tall?: boolean }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, width >= 1024 ? 1000 : 760);
  const [page, setPage] = useState(0);
  const ref = useRef<any>(null);
  const goTo = (n: number) => { ref.current?.scrollTo({ x: n * w, animated: true }); setPage(n); };
  const total = Math.max(l.photos.length, l.photo_count ?? 0, 1);
  const shown = access === 'full' ? Math.max(l.photos.length, 1) : 1;
  const slides = Array.from({ length: access === 'full' ? shown : Math.min(total, 3) }, (_, i) => i);
  return (
    <View>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))} scrollEventThrottle={32}>
        {slides.map((i) => (
          <View key={i}>
            <CarImage id={l.id + i} color={l.color} body={l.body} photo={l.photos[i] ?? (i === 0 ? l.cover_blur : l.photos[0])} blur={access === 'guest' || i >= shown} style={{ width: w, aspectRatio: width >= 1024 ? 1.75 : tall ? 0.95 : 1.3, borderRadius: width >= 1024 ? 24 : 0 }} />
            {i >= shown ? <View style={st.galLock}><Text style={st.galLockText}>🔒 Остальные фото — с доступом</Text></View> : null}
          </View>
        ))}
      </ScrollView>
      {slides.length > 1 ? <View style={[st.counter, tall && { bottom: 46, left: 16, right: 'auto' as unknown as number }]}><Text style={st.counterText}>{page + 1} / {slides.length}</Text></View> : null}
      {Platform.OS === 'web' && slides.length > 1 ? <>
        {page > 0 ? <Pressable onPress={() => goTo(page - 1)} style={[st.arrow, { left: 14 }]} accessibilityLabel="Предыдущее фото"><Text style={st.arrowText}>‹</Text></Pressable> : null}
        {page < slides.length - 1 ? <Pressable onPress={() => goTo(page + 1)} style={[st.arrow, { right: 14 }]} accessibilityLabel="Следующее фото"><Text style={st.arrowText}>›</Text></Pressable> : null}
      </> : null}
    </View>
  );
}

const CATS: [string, string, string][] = [
  ['', 'Все', 'l4'], ['suv', 'Кроссоверы', 'l10'], ['sedan', 'Седаны', 'l9'], ['hatch', 'Хэтчбеки', 'l5'],
  ['cheap', 'До 1,5 млн', 'l11'], ['fresh', 'Свежие', 'l12'], ['top', 'Оценка 85+', 'l15'],
];
/** Photo tiles with counts, like categories in rental apps. */
export function CategoryBar({ value, onChange, counts, total }: { value: string; onChange: (v: string) => void; counts?: Record<string, number>; total?: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
      {CATS.map(([k, label, car]) => {
        const on = (value || '') === k;
        const n = k ? counts?.[k] : total;
        return (
          <PressScale key={k} onPress={() => onChange(k)} style={st.tile} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={[st.tileImgWrap, on && st.tileOn]}>
              <Image source={{ uri: photoUrl(`/photos/${car}.jpg`, 'small') }} style={st.tileImg} contentFit="cover" />
            </View>
            <Text style={[st.tileLabel, on && { fontWeight: '800' }]} numberOfLines={1}>{label}{n != null ? <Text style={st.tileCount}> {n}</Text> : null}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  lrow: { flexDirection: 'row', gap: 20, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff' },
  lrowHover: { borderColor: C.fill2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  lphoto: { width: 280, height: 196, borderRadius: 16 },
  lcount: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(20,20,20,.7)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ltitle: { fontFamily: Font, fontSize: 21, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  lspec: { fontFamily: Font, fontSize: 14.5, color: C.ink2 },
  lmuted: { fontFamily: Font, fontSize: 13, color: C.muted },
  lprice: { fontFamily: Font, fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  lgood: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: '#0E7A3D' },
  lyear: { fontFamily: Font, fontSize: 14.5, color: C.ink2 },
  lheart: { marginTop: 'auto', width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' } as object,
  tile: { width: 104, gap: 8, alignItems: 'center' },
  tileImgWrap: { width: 104, height: 120, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: C.night },
  tileImg: { width: '100%', height: '100%' },
  tileLabel: { fontFamily: Font, fontSize: 13.5, fontWeight: '600', color: C.ink },
  tileCount: { color: C.muted, fontWeight: '500' },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.fill, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  rateDot: { width: 8, height: 8, borderRadius: 4 },
  rateText: { fontFamily: Font, fontSize: 13.5, fontWeight: '800', color: C.ink },
  gradeOn: { position: 'absolute', left: 12, bottom: 12 },
  pricePill: { backgroundColor: C.night, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  priceText: { fontFamily: Font, color: '#fff', fontSize: 14, fontWeight: '800' },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  badgeText: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: C.ink },
  heart: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heartText: { fontSize: 19, color: C.ink, lineHeight: 22 },
  lock: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  lockText: { fontFamily: Font, backgroundColor: 'rgba(20,20,20,.78)', color: '#fff', fontWeight: '600', fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  title: { flex: 1, fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  sub: { fontFamily: Font, fontSize: 13.5, color: C.muted, marginTop: 3 },
  price: { fontFamily: Font, fontSize: 16.5, fontWeight: '800', color: C.ink, marginTop: 4 },
  grade: { borderRadius: 8, paddingHorizontal: 9, height: 26, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontFamily: Font, fontWeight: '800', fontSize: 14 },
  arrow: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 },
  arrowText: { fontSize: 28, lineHeight: 30, fontWeight: '600', color: C.ink, marginTop: -3 },
  counter: { position: 'absolute', right: 14, bottom: 14, backgroundColor: 'rgba(20,20,20,.7)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  counterText: { color: '#fff', fontFamily: Font, fontSize: 13, fontWeight: '600' },
  galLock: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  galLockText: { fontFamily: Font, backgroundColor: 'rgba(20,20,20,.78)', color: '#fff', fontWeight: '700', fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  cat: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.fill },
  catOn: { backgroundColor: C.night },
  catLabel: { fontFamily: Font, fontSize: 14, fontWeight: '700' },
});
