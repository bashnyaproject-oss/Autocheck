import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, seenWelcome, type Listing } from '@/api/client';
import { CategoryBar, ListingCard } from '@/components/car';
import { Appear, PressScale } from '@/components/motion';
import { C, Font, MaxGridWidth, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

function filterSummary(f: ReturnType<typeof useApp>['filters']) {
  const a = [f.q || 'Любая машина'];
  if (f.price_max) a.push(`до ${rub(f.price_max)}`);
  else a.push('любой бюджет');
  if (f.year_min) a.push(`от ${f.year_min} г.`);
  return a.join(' · ');
}

export default function ExploreScreen() {
  const router = useRouter();
  const { filters, setFilters, version, access, me } = useApp();
  useEffect(() => { if (!seenWelcome()) setTimeout(() => router.push('/welcome'), 30); }, [router]);
  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const inner = Math.min(width, MaxGridWidth) - 40;
  const cols = inner > 1000 ? 3 : inner > 640 ? 2 : 1;
  const cardW = (inner - (cols - 1) * 16) / cols;

  const load = async () => {
    setLoading(true);
    try { setItems((await api.feed(filters)).items); setError(null); } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [version, access]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={st.wrap}>
          <Appear style={st.top}>
            <Pressable onPress={() => router.push('/profile')} style={st.avatar} accessibilityLabel="Профиль">
              <Text style={st.avatarText}>{me ? me.name[0] : '○'}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={st.hello}>{me ? `Привет, ${me.name.split(' ')[0]}` : 'Добро пожаловать'}</Text>
              <Text style={st.city}>Москва · {access === 'full' ? 'доступ открыт' : access === 'member' ? 'без доступа' : 'гость'}</Text>
            </View>
            <PressScale onPress={() => router.push('/welcome')} style={st.round} accessibilityLabel="Как это работает"><Text style={st.roundText}>?</Text></PressScale>
          </Appear>

          <Appear delay={80}><Text style={st.h1}>Найдите машину,{'\n'}<Text style={{ color: C.muted }}>которую уже проверили</Text></Text></Appear>

          <Appear delay={140} style={st.searchRow}>
            <Pressable style={st.search} onPress={() => router.push('/search')} accessibilityRole="search" accessibilityLabel="Поиск машины">
              <Text style={st.searchIcon}>⌕</Text>
              <Text style={st.searchText} numberOfLines={1}>{filters.q || filters.price_max || filters.year_min ? filterSummary(filters) : 'Марка, модель, бюджет'}</Text>
            </Pressable>
            <PressScale onPress={() => router.push('/search')} style={st.filterBtn} accessibilityLabel="Фильтры"><Text style={{ color: '#fff', fontSize: 18 }}>⚙︎</Text></PressScale>
          </Appear>
        </View>

        <Appear delay={200} style={{ maxWidth: MaxGridWidth, width: '100%', alignSelf: 'center', marginTop: 18 }}>
          <CategoryBar value={filters.category ?? ''} onChange={(category) => setFilters({ ...filters, category: category || undefined })} />
        </Appear>

        <View style={{ maxWidth: MaxGridWidth, width: '100%', alignSelf: 'center', paddingTop: 18 }}>
          {access !== 'full' ? (
            <Appear delay={260} style={{ paddingHorizontal: 20 }}>
              <PressScale onPress={() => router.push(access === 'guest' ? '/auth?intent=buy' : '/pass')} style={st.promo} accessibilityRole="button">
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.promoKicker}>{access === 'guest' ? 'ШАГ 1 ИЗ 2' : 'ШАГ 2 ИЗ 2'}</Text>
                  <Text style={st.promoTitle}>{access === 'guest' ? 'Войдите через Госуслуги, чтобы видеть фото и пробег' : 'Откройте оценки, отчёты и запись на просмотр'}</Text>
                </View>
                <View style={st.promoBtn}><Text style={st.promoBtnText}>{access === 'guest' ? 'Войти' : '990 ₽'}</Text></View>
              </PressScale>
            </Appear>
          ) : null}
          <View style={[st.sectionRow, { paddingHorizontal: 20 }]}>
            <Text style={st.section}>Осмотрено недавно</Text>
            {items ? <Text style={st.count}>{items.length} машин</Text> : null}
          </View>
          {error ? <Text style={st.empty}>{error}</Text> : null}
          {!items && !error ? <ActivityIndicator style={{ marginTop: 40 }} color={C.ink} /> : null}
          {items && !items.length ? (
            <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
              <Text style={st.emptyTitle}>Ничего не нашли</Text>
              <Text style={st.empty}>Попробуйте убрать часть фильтров.</Text>
              <Text style={[st.empty, { color: C.ink, textDecorationLine: 'underline' }]} onPress={() => setFilters({})}>Сбросить фильтры</Text>
            </View>
          ) : null}
          <View style={[st.grid, { paddingHorizontal: 20 }]}>
            {items?.map((l, i) => <Appear key={l.id + version} delay={Math.min(i, 6) * 70}><ListingCard l={l} width={cardW} /></Appear>)}
          </View>
          {items?.length ? <Text style={[st.empty, { marginTop: 24 }]}>Все машины прошли осмотр с оценкой от 60. Ниже 60 на площадку не попадают.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, maxWidth: 720, width: '100%', alignSelf: 'center', paddingTop: 12, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Font, fontSize: 18, fontWeight: '800' },
  hello: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink },
  city: { fontFamily: Font, fontSize: 13.5, color: C.muted, marginTop: 1 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink },
  h1: { fontFamily: Font, fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -1, color: C.ink },
  searchRow: { flexDirection: 'row', gap: 10 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, height: 56, paddingHorizontal: 18, backgroundColor: C.fill },
  searchIcon: { fontSize: 22, fontWeight: '700', color: C.ink },
  searchText: { flex: 1, fontFamily: Font, fontSize: 15.5, color: C.muted },
  filterBtn: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.night, borderRadius: 22, padding: 18 },
  promoKicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 11.5, letterSpacing: 1.6, fontWeight: '700' },
  promoTitle: { fontFamily: Font, color: '#fff', fontSize: 15.5, lineHeight: 20, fontWeight: '700' },
  promoBtn: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 },
  promoBtnText: { fontFamily: Font, color: C.night, fontSize: 15, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24 },
  section: { fontFamily: Font, fontSize: 21, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  count: { fontFamily: Font, fontSize: 14, color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 16, marginTop: 14 },
  empty: { fontFamily: Font, fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 20 },
  emptyTitle: { fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink },
});
