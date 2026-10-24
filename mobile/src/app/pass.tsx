import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Appear, PressScale } from '@/components/motion';
import { CardPayment } from '@/components/pay';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

/**
 * Buyer access. iOS native build: App Store requires Apple in-app purchase for digital access and
 * Russian users can't pay there (docs/LAUNCH.md), so it never sells. The web app on iPhone does.
 */
const SELL_IN_APP = Platform.OS !== 'ios';
const PERKS = [
  ['Все фото и описание', 'галерея целиком, район, слова продавца'],
  ['Оценка состояния', 'от 60 до 100, от жёлтого к зелёному'],
  ['До 30 глубоких отчётов в неделю', 'история по базам, толщиномер, чек-лист'],
  ['Запись на просмотр и чат', 'продавец подтверждает, адрес — в чате'],
];

export default function PassScreen() {
  const router = useRouter();
  const { me, access, buyPass, bump } = useApp();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  useEffect(() => { if (access === 'guest') router.replace('/auth?intent=buy'); }, [access, router]);
  const until = me?.pass.until ? new Date(me.pass.until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';

  if (access === 'full' && me && !paid)
    return (
      <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.col}>
        <View style={st.plan}><Text style={st.planKicker}>ДОСТУП ОТКРЫТ</Text><Text style={st.planPrice}>до {until}</Text><Text style={st.planSub}>Глубоких отчётов на этой неделе: {me.pass.used_this_week} из {me.pass.weekly_limit}</Text></View>
        <PressScale onPress={() => router.back()} style={st.black}><Text style={st.blackText}>Смотреть машины</Text></PressScale>
      </ScrollView>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        {!paying ? <>
          <Appear>
            <View style={st.plan}>
              <Text style={st.planKicker}>ДОСТУП ПОКУПАТЕЛЯ</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={st.planPrice}>990 ₽</Text><Text style={st.planSub}>/ 30 дней</Text></View>
              <Text style={st.planSub}>Без автопродления в бете. Покупка машины через приложение — без доплат.</Text>
            </View>
          </Appear>
          <View style={{ gap: 4 }}>
            {PERKS.map(([t, d], i) => (
              <Appear key={t} delay={100 + i * 70}>
                <View style={st.perk}><Text style={st.tick}>✓</Text><View style={{ flex: 1 }}><Text style={st.perkT}>{t}</Text><Text style={st.p}>{d}</Text></View></View>
              </Appear>
            ))}
          </View>
          {SELL_IN_APP ? (
            <Appear delay={420}><PressScale onPress={() => setPaying(true)} style={st.black} accessibilityRole="button"><Text style={st.blackText}>Перейти к оплате</Text></PressScale></Appear>
          ) : <Text style={st.p}>Доступ не активен.</Text>}
        </> : (
          <CardPayment
            amount={990} title="Доступ покупателя на 30 дней"
            note="Бета: оплата тестовая, деньги не списываются. В рабочей версии здесь будет форма ЮKassa."
            onPay={async () => { await buyPass(); setPaid(true); }}
            doneTitle="Доступ открыт" doneText="30 дней: оценки, все фото, отчёты и запись на просмотр." doneCta="Смотреть машины"
            onDone={() => { bump(); router.back(); }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 60 },
  plan: { backgroundColor: C.night, borderRadius: 26, padding: 24, gap: 8 },
  planKicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  planPrice: { fontFamily: Font, color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  planSub: { fontFamily: Font, color: 'rgba(255,255,255,.7)', fontSize: 15, lineHeight: 21 },
  perk: { flexDirection: 'row', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.ink, color: '#fff', textAlign: 'center', lineHeight: 26, fontWeight: '900', overflow: 'hidden' },
  perkT: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 14, color: C.muted, lineHeight: 20 },
  black: { height: 58, borderRadius: 18, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  blackText: { fontFamily: Font, color: '#fff', fontSize: 16.5, fontWeight: '800' },
});
