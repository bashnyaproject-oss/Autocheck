import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError, SITE, type Listing, type Report } from '@/api/client';
import { Gallery } from '@/components/car';
import { Gate } from '@/components/gate';
import { Appear, PressScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { C, Font, MaxContentWidth, gradeColor, gradeLabel, kmf, rub } from '@/constants/theme';
import { useWide } from '@/hooks/use-wide';
import { useApp } from '@/state/app-state';

const BODY = { sedan: 'Седан', suv: 'Кроссовер', hatch: 'Хэтчбек' } as const;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWide();
  const insets = useSafeAreaInsets();
  const { access, version, toast, bump } = useApp();
  const [l, setL] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.listing(id).then(setL, (e) => setError(e.message)); }, [id, version]);

  if (error) return <Text style={[st.p, { padding: 24 }]}>{error}</Text>;
  if (!l) return <View style={{ flex: 1, backgroundColor: C.bg }}><Stack.Screen options={{ headerShown: false }} /><ActivityIndicator style={{ marginTop: 80 }} color={C.ink} /></View>;
  const full = l.access === 'full';
  const below = l.market_price ? Math.round(((l.market_price - l.price) / l.market_price) * 100) : 0;

  const like = async () => {
    if (access === 'guest') return router.push('/auth?intent=buy');
    const on = !l.liked;
    setL({ ...l, liked: on });
    await api.like(l.id, on).catch(() => setL({ ...l, liked: !on }));
    bump();
  };
  const share = async () => {
    const url = `${SITE || (Platform.OS === 'web' ? location.origin : '')}/app/listing/${l.id}`;
    try {
      if (Platform.OS === 'web' && navigator.share) await navigator.share({ title: `${l.make} ${l.model}`, url });
      else if (Platform.OS === 'web') { await navigator.clipboard.writeText(url); toast('Ссылка скопирована'); }
      else await Share.share({ message: `${l.make} ${l.model}, ${l.year} — ${url}` });
    } catch { /* closed */ }
  };
  const openReport = async () => {
    setBusy(true);
    try { setReport(await api.report(l.id)); } catch (e) { toast(e instanceof ApiError ? e.message : 'Не получилось'); }
    setBusy(false);
  };
  const write = async () => {
    try { const t = await api.openThread(l.id); router.push(`/thread/${t.thread_id}`); } catch (e) { toast((e as Error).message); }
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const specs: [string, string][] = [
    ['Двигатель', l.engine ?? '—'], ['Пробег', l.km != null ? kmf(l.km) : '—'], ['Коробка', l.gearbox ?? '—'], ['Привод', l.drive ?? '—'],
    ['Расход', l.consumption ? `${String(l.consumption).replace('.', ',')} л / 100 км` : '—'], ['Топливо', l.fuel ?? '—'], ['Кузов', BODY[l.body]], ['Владельцев', String(l.owners ?? '—')],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: wide ? C.bg : C.night }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} style={{ backgroundColor: wide ? C.bg : undefined }}>
        <View style={[{ maxWidth: 1000, width: '100%', alignSelf: 'center' }, wide && { paddingTop: 20 }]}>
          <Gallery l={l} access={l.access} tall={!wide} />
          <View style={[st.topBtns, { top: (wide ? 32 : insets.top + 8) }]} pointerEvents="box-none">
            <PressScale onPress={back} style={st.round} accessibilityLabel="Назад"><Text style={st.roundText}>‹</Text></PressScale>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PressScale onPress={share} style={st.round} accessibilityLabel="Поделиться"><Text style={[st.roundText, { fontSize: 18 }]}>⇪</Text></PressScale>
              <PressScale onPress={like} style={st.round} accessibilityLabel="В избранное"><Text style={[st.roundText, { fontSize: 19 }]}>{l.liked ? '♥' : '♡'}</Text></PressScale>
            </View>
          </View>
        </View>

        <View style={[st.sheet, wide && st.sheetWide]}>
          <View style={st.col}>
            <Appear>
              <Text style={st.h1}>{l.make} {l.model}</Text>
              <Text style={st.rating}>
                {full && l.grade != null ? <>Оценка осмотра: <Text style={{ color: C.ink, fontWeight: '800' }}>{l.grade}/100</Text> · {gradeLabel(l.grade).toLowerCase()}</> : '🔒 Оценка осмотра — с доступом'}
              </Text>
              <Text style={st.p}>{l.year} · {l.city}{l.district ? `, ${l.district}` : ''}{l.distance_km != null ? ` · ${l.distance_km} км от вас` : ''}</Text>
            </Appear>

            <Appear delay={80}>
              <View style={st.seller}>
                <View style={[st.avatar, !(full && l.seller) && { backgroundColor: C.fill2 }]}><Text style={st.avatarText}>{full && l.seller ? l.seller.name[0] : '?'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.h3}>{full && l.seller ? l.seller.name : 'Собственник'}</Text>
                  <Text style={st.small}>✓ Личность подтверждена{full ? '' : ' · имя с доступом'}</Text>
                </View>
                <Text style={st.rules} onPress={() => Linking.openURL(SITE + '/terms')}>Правила ›</Text>
              </View>
            </Appear>

            {full && l.grade != null ? (
              <Appear delay={120}>
                <View style={st.gradeBox}>
                  <View style={st.gradeTrack}><View style={[st.gradeFill, { width: `${((l.grade - 60) / 40) * 100}%`, backgroundColor: gradeColor(l.grade) }]} /></View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={st.small}>60</Text><Text style={st.small}>100</Text></View>
                  <Text style={st.small}>{l.inspected_by ?? 'Пункт осмотра'} · {l.inspected_at}</Text>
                  {l.flags?.map((f) => <Text key={f.text} style={st.flag}><Text style={{ fontWeight: '900', color: f.kind === 'ok' ? C.ink : '#B58900' }}>{f.kind === 'ok' ? '✓ ' : '! '}</Text>{f.text}</Text>)}
                </View>
              </Appear>
            ) : null}

            {l.access === 'guest' ? <View style={{ marginTop: 22 }}><Gate /></View> : (
              <>
                <Text style={st.h2}>Характеристики</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }} style={{ marginHorizontal: -2 }}>
                  {specs.map(([k, v], i) => (
                    <Appear key={k} delay={140 + i * 40}>
                      <View style={st.spec}><Text style={st.small}>{k}</Text><Text style={st.specV} numberOfLines={2}>{v}</Text></View>
                    </Appear>
                  ))}
                </ScrollView>

                <Text style={st.h2}>О машине</Text>
                {full ? <Text style={st.body}>{l.description || 'Продавец не добавил описание.'}</Text> : <Gate compact title="Описание, оценка и отчёт осмотра" />}

                {full ? (
                  <>
                    <Text style={st.h2}>Глубокий отчёт</Text>
                    {report ? (
                      <View style={{ gap: 10 }}>
                        {report.history.map((h) => <View key={h.title} style={st.line}><Text style={st.body}>{h.title}</Text><Text style={[st.p, { flex: 1, textAlign: 'right', color: h.kind === 'ok' ? C.muted : '#7A5A00' }]}>{h.value}</Text></View>)}
                        <Text style={[st.h3, { marginTop: 8 }]}>Толщина покрытия, мкм</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {report.paint.map((p) => <View key={p.part} style={[st.paint, p.microns > 180 && { borderColor: '#E8B500' }]}><Text style={st.small}>{p.part}</Text><Text style={st.specV}>{p.microns}</Text></View>)}
                        </View>
                        <Text style={[st.h3, { marginTop: 8 }]}>Чек-лист осмотра</Text>
                        {report.checklist.map((c) => <Text key={c.title} style={st.body}>{c.ok ? '✓' : '!'} {c.title}{c.note ? ` — ${c.note}` : ''}</Text>)}
                        <Text style={st.p}>Отчётов на этой неделе: {report.used_this_week} из 30</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        <Text style={st.p}>История по базам, толщиномер по деталям и чек-лист. Расходует 1 из 30 отчётов недели.</Text>
                        <Button kind="line" title="Открыть отчёт" onPress={openReport} loading={busy} />
                      </View>
                    )}
                    {!l.mine ? <Text style={[st.link, { marginTop: 18 }]} onPress={write}>Написать продавцу</Text> : null}
                  </>
                ) : null}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={st.bar}>
        <View style={st.barInner}>
          <View style={{ flex: 1 }}>
            <Text style={st.barSub}>{full && below >= 3 ? `ниже рынка на ${below}%` : l.mine ? 'ваше объявление' : 'цена'}</Text>
            <Text style={st.price}>{rub(l.price)}</Text>
          </View>
          <PressScale style={st.cta} accessibilityRole="button" onPress={() => router.push((l.mine ? `/host/${l.id}` : l.access === 'guest' ? '/auth?intent=buy' : !full ? '/pass' : `/book/${l.id}`) as never)}>
            <Text style={st.ctaText}>{l.mine ? 'Управлять' : l.access === 'guest' ? 'Войти и смотреть' : !full ? 'Открыть · 990 ₽' : 'Записаться'}</Text>
          </PressScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 26, lineHeight: 28, fontWeight: '600', color: C.ink, marginTop: -2 },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, minHeight: 600 },
  sheetWide: { marginTop: 0, borderRadius: 0 },
  col: { width: '100%', maxWidth: MaxContentWidth + 80, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 26, gap: 18 },
  h1: { fontFamily: Font, fontSize: 29, fontWeight: '800', letterSpacing: -0.8, color: C.ink },
  rating: { fontFamily: Font, fontSize: 15, color: C.ink2, marginTop: 6 },
  h2: { fontFamily: Font, fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 8, letterSpacing: -0.3 },
  h3: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20, marginTop: 4 },
  small: { fontFamily: Font, fontSize: 13, color: C.muted },
  body: { fontFamily: Font, fontSize: 15.5, color: C.ink, lineHeight: 22 },
  link: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink, textDecorationLine: 'underline' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.fill, borderRadius: 20, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Font, fontSize: 18, fontWeight: '800' },
  rules: { fontFamily: Font, fontSize: 14, fontWeight: '700', color: C.ink },
  gradeBox: { borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, gap: 8 },
  gradeTrack: { height: 8, borderRadius: 4, backgroundColor: C.fill },
  gradeFill: { height: 8, borderRadius: 4 },
  flag: { fontFamily: Font, fontSize: 14.5, color: C.ink2 },
  spec: { width: 150, minHeight: 82, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14, gap: 6, backgroundColor: '#fff' },
  specV: { fontFamily: Font, fontSize: 15.5, color: C.ink, fontWeight: '800' },
  paint: { borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  line: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingVertical: 12, maxWidth: MaxContentWidth + 80, width: '100%', alignSelf: 'center' },
  barSub: { fontFamily: Font, fontSize: 12.5, color: C.muted },
  price: { fontFamily: Font, fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  cta: { backgroundColor: C.night, borderRadius: 999, paddingHorizontal: 24, height: 54, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: Font, fontSize: 15.5, fontWeight: '800', color: '#fff' },
});
