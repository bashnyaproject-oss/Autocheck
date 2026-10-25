import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, ApiError, type Listing, type Report } from '@/api/client';
import { Gallery, GradeBadge } from '@/components/car';
import { Gate } from '@/components/gate';
import { PressScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { C, Font, MaxContentWidth, gradeLabel, kmf, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const BODY = { sedan: 'Седан', suv: 'Кроссовер', hatch: 'Хэтчбек' } as const;

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { access, me, version, toast, bump } = useApp();
  const [l, setL] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listing(id).then(setL, (e) => setError(e.message));
  }, [id, version]);

  if (error) return <Text style={[st.p, { padding: 24 }]}>{error}</Text>;
  if (!l) return <ActivityIndicator style={{ marginTop: 60 }} />;
  const full = l.access === 'full';
  const below = l.market_price ? Math.round(((l.market_price - l.price) / l.market_price) * 100) : 0;

  const like = async () => {
    if (access === 'guest') return router.push('/auth');
    const on = !l.liked;
    setL({ ...l, liked: on });
    await api.like(l.id, on).catch(() => setL({ ...l, liked: !on }));
    bump();
  };
  const openReport = async () => {
    setBusy(true);
    try { setReport(await api.report(l.id)); } catch (e) { toast(e instanceof ApiError ? e.message : 'Не получилось'); }
    setBusy(false);
  };
  const write = async () => {
    try { const t = await api.openThread(l.id); router.push(`/thread/${t.thread_id}`); } catch (e) { toast((e as Error).message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: `${l.make} ${l.model}`, headerRight: () => <Pressable onPress={like} hitSlop={10} accessibilityLabel="Избранное"><Text style={{ fontSize: 24, color: l.liked ? C.brand : C.ink }}>{l.liked ? '♥' : '♡'}</Text></Pressable> }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ maxWidth: 1000, width: '100%', alignSelf: 'center' }}><Gallery l={l} access={l.access} /></View>
        <View style={st.col}>
          <Text style={st.h1}>{l.make} {l.model}, {l.year}</Text>
          <Text style={st.p}>{l.city}{l.district ? `, ${l.district}` : ''}{l.distance_km != null ? ` · ${l.distance_km} км от вас` : ''}</Text>

          <View style={st.hr} />
          {full && l.seller ? (
            <View style={st.row}>
              <View style={st.avatar}><Text style={st.avatarText}>{l.seller.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.h3}>Продаёт {l.seller.name}</Text>
                <Text style={st.p}>Собственник · личность подтверждена</Text>
              </View>
            </View>
          ) : (
            <View style={st.row}>
              <View style={[st.avatar, { backgroundColor: C.fill }]}><Text style={[st.avatarText, { color: C.muted }]}>?</Text></View>
              <View style={{ flex: 1 }}><Text style={st.h3}>Продаёт собственник</Text><Text style={st.p}>Имя и связь — с доступом</Text></View>
            </View>
          )}
          <View style={st.hr} />

          <View style={{ gap: 18 }}>
            <Feature icon="✓" title={`Осмотрено ${l.inspected_at ?? ''}`} text={full ? `${l.inspected_by ?? 'Пункт осмотра'}. Публикуем только машины с оценкой от 60.` : 'Машина прошла осмотр в пункте-партнёре.'} />
            {full && l.grade != null ? <Feature icon={<GradeBadge grade={l.grade} />} title={`Состояние: ${gradeLabel(l.grade).toLowerCase()}`} text="Оценка специалиста от 60 до 100" /> : <Feature icon="🔒" title="Оценка состояния" text="От жёлтого до зелёного — видна с доступом" />}
            {full ? l.flags?.map((f) => <Feature key={f.text} icon={f.kind === 'ok' ? '✓' : '!'} title={f.text} />) : null}
          </View>

          {l.access === 'guest' ? <View style={{ marginTop: 24 }}><Gate /></View> : (
            <>
              <View style={st.hr} />
              <Text style={st.h2}>Характеристики</Text>
              <View style={st.specs}>
                {[['Год', String(l.year)], ['Пробег', l.km != null ? kmf(l.km) : '—'], ['Кузов', BODY[l.body]], ['Двигатель', l.engine ?? '—'], ['Топливо', l.fuel ?? '—'], ['Расход', l.consumption ? `${String(l.consumption).replace('.', ',')} л / 100 км` : '—'], ['Коробка', l.gearbox ?? '—'], ['Привод', l.drive ?? '—'], ['Владельцев', String(l.owners ?? '—')]].map(([k, v]) => (
                  <View key={k} style={st.spec}><Text style={st.p}>{k}</Text><Text style={st.specV}>{v}</Text></View>
                ))}
              </View>

              <View style={st.hr} />
              <Text style={st.h2}>О машине</Text>
              {full ? <Text style={[st.body, { marginTop: 10 }]}>{l.description || 'Продавец не добавил описание.'}</Text> : <View style={{ marginTop: 12 }}><Gate compact title="Описание продавца и отчёт осмотра" /></View>}

              {full ? (
                <>
                  <View style={st.hr} />
                  <Text style={st.h2}>Глубокий отчёт</Text>
                  {report ? (
                    <View style={{ gap: 10, marginTop: 12 }}>
                      {report.history.map((h) => <View key={h.title} style={st.line}><Text style={st.body}>{h.title}</Text><Text style={[st.p, { flex: 1, textAlign: 'right', color: h.kind === 'ok' ? C.muted : '#7A5A00' }]}>{h.value}</Text></View>)}
                      <Text style={[st.h3, { marginTop: 8 }]}>Толщина покрытия, мкм</Text>
                      <Text style={st.p}>{report.paint.map((p) => `${p.part}: ${p.microns}`).join(' · ')}</Text>
                      <Text style={[st.h3, { marginTop: 8 }]}>Чек-лист осмотра</Text>
                      {report.checklist.map((c) => <Text key={c.title} style={st.body}>{c.ok ? '✓' : '!'} {c.title}{c.note ? ` — ${c.note}` : ''}</Text>)}
                      <Text style={st.p}>Отчётов на этой неделе: {report.used_this_week} из 30</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10, marginTop: 10 }}>
                      <Text style={st.p}>История по базам, толщиномер по деталям и чек-лист. Расходует 1 из 30 отчётов недели.</Text>
                      <Button kind="line" title="Открыть отчёт" onPress={openReport} loading={busy} />
                    </View>
                  )}
                  {!l.mine ? <Text style={[st.link, { marginTop: 20 }]} onPress={write}>Написать продавцу</Text> : null}
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={st.bar}>
        <View style={st.barInner}>
          <View style={{ flex: 1 }}>
            <Text style={st.price} numberOfLines={1} adjustsFontSizeToFit>{rub(l.price)}</Text>
            <Text style={st.barSub} numberOfLines={1}>{full && below >= 3 ? `ниже рынка на ${below}%` : l.mine ? 'Ваше объявление' : 'без доплат'}</Text>
          </View>
          <PressScale style={st.cta} accessibilityRole="button" onPress={() => router.push((l.mine ? `/host/${l.id}` : l.access === 'guest' ? '/auth?intent=buy' : !full ? '/pass' : `/book/${l.id}`) as never)}>
            <Text style={st.ctaText}>{l.mine ? 'Управлять' : l.access === 'guest' ? 'Войти' : !full ? 'Открыть · 990 ₽' : 'Записаться'}</Text>
            <Text style={st.ctaText}>→</Text>
          </PressScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text?: string }) {
  return (
    <View style={st.row}>
      <View style={{ width: 40, alignItems: 'center' }}>{typeof icon === 'string' ? <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink }}>{icon}</Text> : icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={st.h3}>{title}</Text>
        {text ? <Text style={st.p}>{text}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 20 },
  h1: { fontFamily: Font, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: C.ink },
  h2: { fontFamily: Font, fontSize: 21, fontWeight: '800', color: C.ink },
  h3: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  body: { fontFamily: Font, fontSize: 15.5, color: C.ink, lineHeight: 22 },
  link: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
  hr: { height: 1, backgroundColor: C.line, marginVertical: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Font, fontSize: 20, fontWeight: '800' },
  specs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, rowGap: 14 },
  spec: { width: '50%', paddingRight: 10 },
  specV: { fontFamily: Font, fontSize: 15.5, color: C.ink, fontWeight: '600', marginTop: 2 },
  line: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 10 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 8, paddingVertical: 8, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', backgroundColor: C.night, borderRadius: 26, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  price: { fontFamily: Font, fontSize: 19, fontWeight: '800', color: '#fff' },
  barSub: { fontFamily: Font, fontSize: 12.5, color: 'rgba(255,255,255,.6)' },
  cta: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#fff', borderRadius: 19, paddingHorizontal: 18, height: 50 },
  ctaText: { fontFamily: Font, fontSize: 15.5, fontWeight: '800', color: C.night },
});
