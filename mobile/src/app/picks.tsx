import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { api, loadQuiz, type Pick } from '@/api/client';
import { Appear, PressScale } from '@/components/motion';
import { PickCard, quizSummary } from '@/components/picks';
import { C, Font, MaxGridWidth, plural } from '@/constants/theme';
import { useApp } from '@/state/app-state';

/** Personal selection from the quiz answers, best match first, each with reasons. */
export default function PicksScreen() {
  const router = useRouter();
  const { access, version } = useApp();
  const q = loadQuiz();
  const [items, setItems] = useState<Pick[] | null>(null);
  const { width } = useWindowDimensions();
  const inner = Math.min(width, MaxGridWidth) - 40;
  const cols = inner > 980 ? 3 : inner > 620 ? 2 : 1;
  const cardW = (inner - (cols - 1) * 16) / cols;

  useEffect(() => {
    if (!q) { router.replace('/quiz'); return; }
    api.match(q).then((r) => setItems(r.items), () => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, access]);
  if (!q) return null;

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.col}>
      <Stack.Screen options={{ title: 'Ваша подборка' }} />
      <Appear>
        <View style={st.hero}>
          <Text style={st.kicker}>ПОДБОРКА ПОД ВАС</Text>
          <Text style={st.h1}>{items ? (items.length ? `${items.length} ${plural(items.length, ['машина подходит', 'машины подходят', 'машин подходят'])}` : 'Пока ничего не подошло') : 'Подбираем…'}</Text>
          <Text style={st.sub}>{quizSummary(q)}</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <PressScale onPress={() => router.replace('/quiz')} style={st.ghost}><Text style={st.ghostText}>Изменить ответы</Text></PressScale>
            <PressScale onPress={() => router.navigate('/')} style={st.ghost}><Text style={st.ghostText}>Все машины</Text></PressScale>
          </View>
        </View>
      </Appear>
      {access !== 'full' ? (
        <Appear delay={100}>
          <PressScale onPress={() => router.push(access === 'guest' ? '/auth?intent=buy' : '/pass')} style={st.note}>
            <Text style={st.noteText}>{access === 'guest' ? 'Войдите через Госуслуги — откроются фото, пробег и характеристики.' : 'С доступом покупателя добавим в сравнение оценку осмотра и цену против рынка.'}</Text>
            <Text style={st.noteCta}>{access === 'guest' ? 'Войти →' : '990 ₽ →'}</Text>
          </PressScale>
        </Appear>
      ) : null}
      {!items ? <ActivityIndicator color={C.ink} style={{ marginTop: 30 }} /> : null}
      {items && !items.length ? <Text style={st.empty}>Попробуйте поднять бюджет или выбрать «не важно» в кузове и коробке.</Text> : null}
      <View style={st.grid}>
        {items?.map((p, i) => <Appear key={p.id} delay={150 + Math.min(i, 6) * 80}><PickCard p={p} width={cardW} /></Appear>)}
      </View>
      {items?.length ? <Text style={st.empty}>Совпадение считаем по вашим ответам, оценке осмотра, расходу, мощности, пробегу и цене против рынка.</Text> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxGridWidth, alignSelf: 'center', padding: 20, gap: 18, paddingBottom: 80 },
  hero: { backgroundColor: C.night, borderRadius: 26, padding: 22, gap: 8 },
  kicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  h1: { fontFamily: Font, color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub: { fontFamily: Font, color: 'rgba(255,255,255,.75)', fontSize: 15, lineHeight: 21 },
  ghost: { borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  ghostText: { fontFamily: Font, color: '#fff', fontSize: 14.5, fontWeight: '700' },
  note: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.fill, borderRadius: 18, padding: 16 },
  noteText: { flex: 1, fontFamily: Font, fontSize: 14.5, color: C.ink2, lineHeight: 20 },
  noteCta: { fontFamily: Font, fontSize: 15, fontWeight: '800', color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  empty: { fontFamily: Font, fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});
