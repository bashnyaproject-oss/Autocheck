import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { markWelcome } from '@/api/client';
import { Appear, PressScale } from '@/components/motion';
import { C, Font } from '@/constants/theme';
import { artDeal, artGrade, artInspect, artPeople } from '@/lib/onboarding-art';
import { useApp } from '@/state/app-state';

const SLIDES = [
  { art: artInspect, kicker: '01 · ОСМОТР', title: 'Каждая машина\nпроверена до вас', text: 'Перед публикацией машину осматривает партнёрский сервис: кузов толщиномером, VIN по базам, пробег, подвеска, двигатель.' },
  { art: artGrade, kicker: '02 · ОЦЕНКА', title: 'Оценка вместо\nобещаний продавца', text: 'Шкала от 60 до 100 — от жёлтого к зелёному. Ниже 60 машина просто не попадает на площадку. Обман по осмотру — снятие и бан.' },
  { art: artPeople, kicker: '03 · ЛЮДИ', title: 'Только настоящие\nпокупатели', text: 'Вход через Госуслуги: один человек — один аккаунт. Перекупы не создают десятки профилей и не дёргают продавца.' },
  { art: artDeal, kicker: '04 · ЧЕСТНО', title: 'Платит тот,\nкто передумал', text: 'Покупатель — 990 ₽ за месяц доступа ко всему. Продавец — 1% только если продал через нас, иначе 2 990 ₽ за размещение.' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { me } = useApp();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width, 560);
  const [i, setI] = useState(0);
  const scroll = useRef<any>(null);
  const nonce = useMemo(() => Date.now(), []);
  useEffect(() => { markWelcome(); }, []);

  const go = (n: number) => { setI(n); scroll.current?.scrollTo({ x: n * w, animated: true }); };
  const leave = (to: string) => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
    if (to !== '/') setTimeout(() => router.push(to as never), 60);
  };
  const last = i === SLIDES.length - 1;
  const art = Math.min(w - 40, height * 0.42, 380);

  return (
    <View style={st.root}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, width: w, alignSelf: 'center' }}>
        <View style={st.top}>
          <Text style={st.logo}>осмотрено<Text style={{ color: '#7BD88F' }}>.</Text></Text>
          {!last ? <Text style={st.skip} onPress={() => go(SLIDES.length - 1)} accessibilityRole="button">Пропустить</Text> : null}
        </View>

        <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}
          onScroll={(e) => { const n = Math.round(e.nativeEvent.contentOffset.x / w); if (n !== i) setI(n); }} scrollEventThrottle={64}>
          {SLIDES.map((s, k) => (
            <View key={k} style={{ width: w, paddingHorizontal: 24 }}>
              <View style={{ height: art, alignItems: 'center', justifyContent: 'center' }}>
                {k === i ? <Image source={{ uri: s.art(nonce + k * 7 + i) }} style={{ width: art, height: art }} contentFit="contain" /> : null}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={st.textBox} key={i}>
          <Appear delay={60}><Text style={st.kicker}>{SLIDES[i].kicker}</Text></Appear>
          <Appear delay={140}><Text style={st.title}>{SLIDES[i].title}</Text></Appear>
          <Appear delay={220}><Text style={st.text}>{SLIDES[i].text}</Text></Appear>
        </View>

        <View style={st.bottom}>
          <View style={st.dots}>
            {SLIDES.map((_, k) => <Pressable key={k} onPress={() => go(k)} hitSlop={8}><View style={[st.dot, k === i && st.dotOn]} /></Pressable>)}
          </View>
          {!last ? (
            <PressScale onPress={() => go(i + 1)} style={st.next} accessibilityRole="button" accessibilityLabel="Далее">
              <Text style={st.nextText}>Далее</Text><Text style={st.arrow}>→</Text>
            </PressScale>
          ) : (
            <Appear style={{ gap: 10 }}>
              <PressScale onPress={() => leave('/quiz')} style={st.next} accessibilityRole="button">
                <Text style={st.nextText}>Я покупаю машину</Text><Text style={st.arrow}>→</Text>
              </PressScale>
              <PressScale onPress={() => leave(me ? '/sell' : '/auth?intent=sell')} style={[st.next, st.ghost]} accessibilityRole="button">
                <Text style={[st.nextText, { color: '#fff' }]}>Я продаю машину</Text><Text style={[st.arrow, { color: '#fff' }]}>→</Text>
              </PressScale>
              <Text style={st.later} onPress={() => leave('/')} accessibilityRole="button">Сначала просто посмотреть</Text>
            </Appear>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.night },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  logo: { fontFamily: Font, color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  skip: { fontFamily: Font, color: 'rgba(255,255,255,.6)', fontSize: 15, fontWeight: '600' },
  textBox: { paddingHorizontal: 24, gap: 10, flex: 1, paddingTop: 6 },
  kicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 12.5, fontWeight: '700', letterSpacing: 2 },
  title: { fontFamily: Font, color: '#fff', fontSize: 32, lineHeight: 37, fontWeight: '800', letterSpacing: -1 },
  text: { fontFamily: Font, color: 'rgba(255,255,255,.72)', fontSize: 15.5, lineHeight: 22 },
  bottom: { paddingHorizontal: 24, paddingBottom: 18, gap: 18 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.28)' },
  dotOn: { width: 26, backgroundColor: '#fff' },
  next: { height: 58, borderRadius: 18, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.35)' },
  nextText: { fontFamily: Font, fontSize: 16.5, fontWeight: '800', color: C.night },
  arrow: { fontSize: 22, fontWeight: '700', color: C.night },
  later: { fontFamily: Font, color: 'rgba(255,255,255,.7)', fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: 6, textDecorationLine: 'underline' },
});
