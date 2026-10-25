import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, filterCount, loadQuiz, seenWelcome, type Listing, type Pick } from '@/api/client';
import { CategoryBar, ListingCard } from '@/components/car';
import { FilterPanel, SORTS } from '@/components/filters';
import { Appear, PressScale } from '@/components/motion';
import { MatchBadge, PickCard, quizSummary } from '@/components/picks';
import { C, Font, MaxGridWidth, plural } from '@/constants/theme';
import { useWide } from '@/hooks/use-wide';
import { useApp } from '@/state/app-state';

const SIDEBAR = 300;

export default function ExploreScreen() {
  const router = useRouter();
  const wide = useWide();
  const { filters, setFilters, version, access, me } = useApp();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(filters.q ?? '');
  const { width } = useWindowDimensions();
  const quiz = loadQuiz();

  const page = Math.min(width, MaxGridWidth);
  const inner = wide ? page - 64 - SIDEBAR - 32 : page - 40;
  const cols = wide ? (inner > 820 ? 3 : 2) : inner > 640 ? 2 : 1;
  const cardW = (inner - (cols - 1) * 16) / cols;

  useEffect(() => { if (!seenWelcome()) setTimeout(() => router.push('/welcome'), 30); }, [router]);
  const load = async () => {
    setLoading(true);
    try { const r = await api.feed(filters); setItems(r.items); setTotal(r.total ?? r.items.length); setError(null); } catch (e) { setError((e as Error).message); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [version, access]);
  useEffect(() => { if (quiz) api.match(quiz).then((r) => setPicks(r.items.slice(0, 6)), () => setPicks([])); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [version, access]);

  // desktop search box: apply after the user stops typing
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onQ = (v: string) => {
    setQ(v);
    if (typing.current) clearTimeout(typing.current);
    typing.current = setTimeout(() => setFilters({ ...filters, q: v.trim() || undefined }), 350);
  };
  const nf = filterCount(filters);
  const sortLabel = SORTS.find(([k]) => k === (filters.sort ?? ''))?.[1] ?? 'Сначала свежие';

  const results = (
    <View style={{ gap: 14 }}>
      <View style={st.resultsHead}>
        <View style={{ flexShrink: 1 }}>
          <Text style={st.section}>{filters.q || nf ? 'Результаты поиска' : 'Все осмотренные машины'}</Text>
          <Text style={st.count}>{total} {plural(total, ['машина', 'машины', 'машин'])}{nf ? ` · фильтров: ${nf}` : ''}</Text>
        </View>
        {wide ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0, maxWidth: 520 }}>
            {SORTS.map(([k, label, needFull]) => {
              const on = (filters.sort ?? '') === k;
              const locked = needFull && access !== 'full';
              return (
                <Pressable key={k} onPress={() => (locked ? router.push('/pass') : setFilters({ ...filters, sort: k || undefined }))} style={[st.sort, on && st.sortOn, locked && { opacity: 0.45 }]}>
                  <Text style={[st.sortText, on && { color: '#fff' }]}>{locked ? '🔒 ' : ''}{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={st.sortLink} onPress={() => router.push('/search')}>{sortLabel} ▾</Text>
        )}
      </View>
      {error ? <Text style={st.empty}>{error}</Text> : null}
      {!items && !error ? <ActivityIndicator style={{ marginTop: 40 }} color={C.ink} /> : null}
      {items && !items.length ? (
        <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
          <Text style={st.emptyTitle}>Ничего не нашли</Text>
          <Text style={st.empty}>Попробуйте убрать часть фильтров.</Text>
          <Text style={[st.empty, { color: C.ink, textDecorationLine: 'underline' }]} onPress={() => { setQ(''); setFilters({}); }}>Сбросить фильтры</Text>
        </View>
      ) : null}
      <View style={st.grid}>
        {items?.map((l, i) => <Appear key={l.id + version} delay={Math.min(i, 6) * 60}><ListingCard l={l} width={cardW} /></Appear>)}
      </View>
      {items?.length ? <Text style={[st.empty, { marginTop: 12 }]}>Все машины прошли осмотр с оценкой от 60. Ниже 60 на площадку не попадают. Фото в бете — студийные примеры.</Text> : null}
    </View>
  );

  const picksBlock = quiz ? (
    picks && picks.length ? (
      <View style={{ gap: 12 }}>
        <View style={st.resultsHead}>
          <View style={{ flex: 1 }}>
            <Text style={st.section}>Подобрано для вас</Text>
            <Text style={st.count} numberOfLines={1}>{quizSummary(quiz)}</Text>
          </View>
          <Text style={st.sortLink} onPress={() => router.push('/picks')}>Все →</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
          {picks.map((p) => <PickCard key={p.id} p={p} width={wide ? 300 : Math.min(300, width - 70)} compact />)}
        </ScrollView>
      </View>
    ) : null
  ) : (
    <PressScale onPress={() => router.push('/quiz')} style={st.quiz} accessibilityRole="button">
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={st.quizKicker}>ПОДБОР ЗА 1 МИНУТУ</Text>
        <Text style={st.quizTitle}>Не знаете, что выбрать?{'\n'}Ответьте на 5 вопросов</Text>
        <Text style={st.quizText}>Сравним все машины под ваши задачи и объясним, почему каждая подходит.</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <MatchBadge value={94} light />
        <View style={st.quizBtn}><Text style={st.quizBtnText}>Начать →</Text></View>
      </View>
    </PressScale>
  );

  const promo = access !== 'full' ? (
    <PressScale onPress={() => router.push(access === 'guest' ? '/auth?intent=buy' : '/pass')} style={st.promo} accessibilityRole="button">
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.promoKicker}>{access === 'guest' ? 'ФОТО И ХАРАКТЕРИСТИКИ ЗАКРЫТЫ' : 'ОЦЕНКА И ОТЧЁТЫ ЗАКРЫТЫ'}</Text>
        <Text style={st.promoTitle}>{access === 'guest' ? 'Войдите через Госуслуги — откроются фото, пробег и коробка' : 'Откройте оценку осмотра, отчёты и запись на просмотр'}</Text>
      </View>
      <View style={st.promoBtn}><Text style={st.promoBtnText}>{access === 'guest' ? 'Войти' : '990 ₽'}</Text></View>
    </PressScale>
  ) : null;

  if (wide)
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={st.desk}>
        <View style={st.deskHero}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.h1Wide}>Машины, которые уже проверили</Text>
            <Text style={st.lead}>Каждая прошла осмотр в сервисе-партнёре. Оценка от 60 до 100, ниже — не публикуем.</Text>
          </View>
          <View style={st.deskSearch}>
            <Text style={st.searchIcon}>⌕</Text>
            <TextInput value={q} onChangeText={onQ} placeholder="Марка или модель" placeholderTextColor={C.muted} style={st.deskInput} />
            {q ? <Text style={st.clear} onPress={() => onQ('')}>✕</Text> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 32, alignItems: 'flex-start' }}>
          <View style={st.side}>
            <View style={st.sideHead}>
              <Text style={st.sideTitle}>Фильтры{nf ? ` · ${nf}` : ''}</Text>
              {nf ? <Text style={st.sortLink} onPress={() => { setQ(''); setFilters({}); }}>Сбросить</Text> : null}
            </View>
            <FilterPanel value={filters} onChange={setFilters} access={access} onLocked={() => router.push('/pass')} />
          </View>
          <View style={{ flex: 1, gap: 28 }}>
            {promo}
            {picksBlock}
            {results}
          </View>
        </View>
      </ScrollView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={st.wrap}>
          <Appear style={st.top}>
            <Pressable onPress={() => router.navigate('/profile')} style={st.avatar} accessibilityLabel="Профиль">
              <Text style={st.avatarText}>{me ? me.name[0] : '○'}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={st.hello}>{me ? `Привет, ${me.name.split(' ')[0]}` : 'Добро пожаловать'}</Text>
              <Text style={st.city}>Москва и область · {access === 'full' ? 'доступ открыт' : access === 'member' ? 'без доступа' : 'гость'}</Text>
            </View>
            <PressScale onPress={() => router.push('/welcome')} style={st.round} accessibilityLabel="Как это работает"><Text style={st.roundText}>?</Text></PressScale>
          </Appear>

          <Appear delay={80}><Text style={st.h1}>Найдите машину,{'\n'}<Text style={{ color: C.muted }}>которую уже проверили</Text></Text></Appear>

          <Appear delay={140} style={st.searchRow}>
            <Pressable style={st.search} onPress={() => router.push('/search')} accessibilityRole="search" accessibilityLabel="Поиск и фильтры">
              <Text style={st.searchIcon}>⌕</Text>
              <Text style={st.searchText} numberOfLines={1}>{filters.q || 'Марка, модель, цена, год…'}</Text>
            </Pressable>
            <PressScale onPress={() => router.push('/search')} style={st.filterBtn} accessibilityLabel="Фильтры">
              <Text style={{ color: '#fff', fontSize: 18 }}>⚙︎</Text>
              {nf ? <View style={st.badge}><Text style={st.badgeText}>{nf}</Text></View> : null}
            </PressScale>
          </Appear>
        </View>

        <Appear delay={200} style={{ marginTop: 16 }}>
          <CategoryBar value={filters.category ?? ''} onChange={(category) => setFilters({ ...filters, category: category || undefined })} />
        </Appear>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 24 }}>
          {promo ? <Appear delay={240}>{promo}</Appear> : null}
          <Appear delay={280}>{picksBlock}</Appear>
          {results}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  desk: { width: '100%', maxWidth: MaxGridWidth, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 28, paddingBottom: 80, gap: 28 },
  deskHero: { flexDirection: 'row', alignItems: 'flex-end', gap: 32 },
  h1Wide: { fontFamily: Font, fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.4, color: C.ink },
  lead: { fontFamily: Font, fontSize: 16, color: C.muted, lineHeight: 23, maxWidth: 560 },
  deskSearch: { width: 420, height: 58, borderRadius: 18, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 },
  deskInput: { flex: 1, height: 58, fontFamily: Font, fontSize: 16, color: C.ink, outlineStyle: 'none' } as object,
  clear: { fontSize: 15, color: C.muted, padding: 6 },
  side: { width: SIDEBAR, position: 'sticky', top: 16, maxHeight: 'calc(100vh - 110px)', overflowY: 'auto', paddingRight: 6 } as object,
  sideHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  sideTitle: { fontFamily: Font, fontSize: 20, fontWeight: '800', color: C.ink },
  sort: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.fill },
  sortOn: { backgroundColor: C.night },
  sortText: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: C.ink },
  wrap: { paddingHorizontal: 20, paddingTop: 12, gap: 18 },
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
  badge: { position: 'absolute', top: -5, right: -5, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  quiz: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 24, padding: 20, backgroundColor: C.fill, borderWidth: 1, borderColor: C.line },
  quizKicker: { fontFamily: Font, color: C.muted, fontSize: 11.5, letterSpacing: 1.6, fontWeight: '800' },
  quizTitle: { fontFamily: Font, color: C.ink, fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  quizText: { fontFamily: Font, color: C.muted, fontSize: 14, lineHeight: 19 },
  quizBtn: { backgroundColor: C.night, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  quizBtnText: { fontFamily: Font, color: '#fff', fontSize: 14.5, fontWeight: '800' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.night, borderRadius: 22, padding: 18 },
  promoKicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 11.5, letterSpacing: 1.6, fontWeight: '700' },
  promoTitle: { fontFamily: Font, color: '#fff', fontSize: 15.5, lineHeight: 20, fontWeight: '700' },
  promoBtn: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 },
  promoBtnText: { fontFamily: Font, color: C.night, fontSize: 15, fontWeight: '800' },
  resultsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  section: { fontFamily: Font, fontSize: 21, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  count: { fontFamily: Font, fontSize: 14, color: C.muted, fontWeight: '500', letterSpacing: 0 },
  sortLink: { fontFamily: Font, fontSize: 14.5, fontWeight: '800', color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  empty: { fontFamily: Font, fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  emptyTitle: { fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink },
});
