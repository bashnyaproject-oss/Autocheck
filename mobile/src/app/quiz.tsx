import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadQuiz, saveQuiz, type Body, type Quiz } from '@/api/client';
import { Appear, PressScale } from '@/components/motion';
import { C, Font, MaxContentWidth } from '@/constants/theme';

type Opt = { v: string; title: string; text: string; icon: string };
type Step = { key: keyof Quiz | 'extra'; q: string; hint: string; multi?: boolean; max?: number; opts: Opt[] };

const STEPS: Step[] = [
  { key: 'purpose', q: 'Для чего вам машина?', hint: 'От этого зависит, что важнее: расход, место или проходимость.', opts: [
    { v: 'city', icon: '◎', title: 'Город и работа', text: 'Пробки, парковки, каждый день' },
    { v: 'family', icon: '◇', title: 'Семья и дети', text: 'Кресла, коляска, багажник' },
    { v: 'trips', icon: '△', title: 'Трасса и дача', text: 'Дальние поездки, грунтовка, зима' },
    { v: 'first', icon: '○', title: 'Первая машина', text: 'Недорого, просто, без сюрпризов' },
  ] },
  { key: 'budget_max', q: 'Сколько готовы потратить?', hint: 'Покажем машины в бюджете и чуть выше — если они того стоят.', opts: [
    { v: '1000000', icon: '₽', title: 'До 1 млн', text: '' }, { v: '1500000', icon: '₽', title: 'До 1,5 млн', text: '' },
    { v: '2000000', icon: '₽', title: 'До 2 млн', text: '' }, { v: '2500000', icon: '₽', title: 'До 2,5 млн', text: '' },
    { v: '3000000', icon: '₽', title: 'До 3 млн', text: '' }, { v: '0', icon: '∞', title: 'Не важно', text: '' },
  ] },
  { key: 'body', q: 'Какой кузов нравится?', hint: 'Можно выбрать несколько.', multi: true, opts: [
    { v: 'suv', icon: '▲', title: 'Кроссовер', text: 'Высокая посадка, клиренс' },
    { v: 'sedan', icon: '▬', title: 'Седан', text: 'Классика, отдельный багажник' },
    { v: 'hatch', icon: '■', title: 'Хэтчбек или универсал', text: 'Компактно или много места' },
  ] },
  { key: 'gearbox', q: 'Какая коробка?', hint: 'Автомат — это и робот, и вариатор: педали сцепления нет.', opts: [
    { v: 'auto', icon: 'A', title: 'Только автомат', text: 'Без педали сцепления' },
    { v: 'manual', icon: 'M', title: 'Механика', text: 'Дешевле и проще в ремонте' },
    { v: 'any', icon: '·', title: 'Не важно', text: '' },
  ] },
  { key: 'priorities', q: 'Что важнее всего?', hint: 'Выберите до двух — по ним и будем сравнивать.', multi: true, max: 2, opts: [
    { v: 'reliability', icon: '✓', title: 'Надёжность', text: 'Оценка осмотра, марка, владельцы' },
    { v: 'economy', icon: '%', title: 'Экономичность', text: 'Расход и стоимость владения' },
    { v: 'comfort', icon: '≈', title: 'Комфорт', text: 'Тишина, подвеска, салон' },
    { v: 'dynamics', icon: '↗', title: 'Динамика', text: 'Мощность и разгон' },
  ] },
];
const CHECKS = ['Бюджет и цена против рынка', 'Кузов и коробка', 'Оценка осмотра и замечания', 'Расход и мощность', 'Пробег и владельцы', 'Для чего вам машина'];

export default function QuizScreen() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [a, setA] = useState<Quiz>(() => loadQuiz() ?? {});
  const [thinking, setThinking] = useState(false);
  const step = STEPS[i];
  const val = a[step?.key as keyof Quiz];
  const chosen = (v: string) => (Array.isArray(val) ? (val as string[]).includes(v) : String(val ?? '') === v);

  const pick = (v: string) => {
    if (step.multi) {
      const cur = (Array.isArray(val) ? val : []) as string[];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].slice(-(step.max ?? 9));
      setA({ ...a, [step.key]: next });
      return;
    }
    const next = { ...a, [step.key]: step.key === 'budget_max' ? Number(v) : v } as Quiz;
    setA(next);
    setTimeout(() => go(next), 180);
  };
  const go = (q: Quiz) => {
    if (i < STEPS.length - 1) return setI(i + 1);
    saveQuiz({ ...q, body: (q.body ?? []) as Body[] });
    setThinking(true);
  };
  const canNext = !step?.multi || ((val as string[] | undefined)?.length ?? 0) > 0 || step.key === 'body';

  if (thinking) return <Thinking onDone={() => router.replace('/picks')} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Подбор машины' }} />
      <View style={st.progress}><Animated.View style={[st.progressFill, { width: `${((i + 1) / STEPS.length) * 100}%` }]} /></View>
      <ScrollView contentContainerStyle={st.col}>
        <View key={i} style={{ gap: 18 }}>
          <Appear><Text style={st.kicker}>ВОПРОС {i + 1} ИЗ {STEPS.length}</Text></Appear>
          <Appear delay={60}><Text style={st.q}>{step.q}</Text></Appear>
          <Appear delay={110}><Text style={st.hint}>{step.hint}</Text></Appear>
          <View style={st.grid}>
            {step.opts.map((o, k) => (
              <Appear key={o.v} delay={150 + k * 50} style={step.key === 'budget_max' ? st.half : st.full}>
                <PressScale onPress={() => pick(o.v)} style={[st.opt, chosen(o.v) && st.optOn]} accessibilityRole={step.multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: chosen(o.v) }}>
                  <View style={[st.icon, chosen(o.v) && { backgroundColor: '#fff' }]}><Text style={[st.iconText, chosen(o.v) && { color: C.night }]}>{o.icon}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.optT, chosen(o.v) && { color: '#fff' }]}>{o.title}</Text>
                    {o.text ? <Text style={[st.optD, chosen(o.v) && { color: 'rgba(255,255,255,.65)' }]}>{o.text}</Text> : null}
                  </View>
                </PressScale>
              </Appear>
            ))}
          </View>
          {step.key === 'priorities' ? (
            <PressScale onPress={() => setA({ ...a, drive: a.drive === 'awd' ? 'any' : 'awd' })} style={[st.opt, a.drive === 'awd' && st.optOn]} accessibilityRole="checkbox" accessibilityState={{ checked: a.drive === 'awd' }}>
              <View style={[st.icon, a.drive === 'awd' && { backgroundColor: '#fff' }]}><Text style={[st.iconText, a.drive === 'awd' && { color: C.night }]}>4×4</Text></View>
              <Text style={[st.optT, { flex: 1 }, a.drive === 'awd' && { color: '#fff' }]}>Нужен только полный привод</Text>
            </PressScale>
          ) : null}
        </View>
      </ScrollView>
      <View style={st.bar}>
        <Text style={[st.back, i === 0 && { opacity: 0 }]} onPress={() => i > 0 && setI(i - 1)} accessibilityRole="button">Назад</Text>
        {step.multi ? (
          <PressScale onPress={canNext ? () => go(a) : undefined} style={[st.next, !canNext && { opacity: 0.35 }]} accessibilityRole="button">
            <Text style={st.nextText}>{i === STEPS.length - 1 ? 'Подобрать' : step.key === 'body' && !(val as string[] | undefined)?.length ? 'Не важно' : 'Дальше'}</Text>
          </PressScale>
        ) : <Text style={st.hint}>Выберите вариант</Text>}
      </View>
    </SafeAreaView>
  );
}

/** "AI is comparing" moment: a scanning bar and checks ticking one by one. */
function Thinking({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const scan = useState(() => new Animated.Value(0))[0];
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    Animated.loop(Animated.timing(scan, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' })).start();
    const t = setInterval(() => setN((x) => x + 1), 380);
    const d = setTimeout(() => done.current(), CHECKS.length * 380 + 600);
    return () => { clearInterval(t); clearTimeout(d); };
  }, [scan]);
  return (
    <View style={[st.think]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={st.thinkCol}>
        <View style={st.scanBox}>
          <Animated.View style={[st.scanLine, { transform: [{ translateX: scan.interpolate({ inputRange: [0, 1], outputRange: [-20, 280] }) }] }]} />
          <Text style={st.scanText}>16 машин · 12 параметров</Text>
        </View>
        <Text style={st.thinkTitle}>Сравниваем машины{'\n'}под ваши ответы</Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          {CHECKS.map((c, k) => (
            <View key={c} style={[st.check, { opacity: k < n ? 1 : 0.28 }]}>
              <View style={[st.checkDot, k < n && { backgroundColor: '#fff' }]}><Text style={{ color: C.night, fontWeight: '900', fontSize: 12 }}>{k < n ? '✓' : ''}</Text></View>
              <Text style={st.checkText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  progress: { height: 4, backgroundColor: C.fill },
  progressFill: { height: 4, backgroundColor: C.night },
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 22, paddingBottom: 120 },
  kicker: { fontFamily: Font, fontSize: 12.5, letterSpacing: 2, fontWeight: '700', color: C.muted },
  q: { fontFamily: Font, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -1, color: C.ink },
  hint: { fontFamily: Font, fontSize: 15, color: C.muted, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  full: { width: '100%' },
  half: { width: '48.5%' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 16, backgroundColor: '#fff' },
  optOn: { backgroundColor: C.night, borderColor: C.night },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink },
  optT: { fontFamily: Font, fontSize: 16.5, fontWeight: '800', color: C.ink },
  optD: { fontFamily: Font, fontSize: 13.5, color: C.muted, marginTop: 2 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff' },
  back: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
  next: { height: 52, borderRadius: 16, backgroundColor: C.night, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontFamily: Font, color: '#fff', fontSize: 16, fontWeight: '800' },
  think: { flex: 1, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center', padding: 28 },
  thinkCol: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 28 },
  scanBox: { width: 280, height: 64, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, backgroundColor: 'rgba(255,255,255,.18)' },
  scanText: { fontFamily: Font, color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  thinkTitle: { fontFamily: Font, color: '#fff', fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: Font, color: '#fff', fontSize: 15.5 },
});
