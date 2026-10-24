import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Appear, Dots, PressScale, SuccessCheck } from '@/components/motion';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

type By = 'esia' | 'tid' | 'sberid';
const NAME: Record<By, string> = { esia: 'Госуслуги', tid: 'Т-ID', sberid: 'Сбер ID' };
const COLOR: Record<By, [string, string]> = { esia: ['#0D4CD3', '#fff'], tid: ['#FFDD2D', '#0B0B0C'], sberid: ['#21A038', '#fff'] };

/**
 * Sign-in = registration: the account is created on the first sign-in through a verified ID.
 * Beta: the ID provider page below is a test imitation; the phone number is the "person".
 */
export default function AuthScreen() {
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: 'buy' | 'sell' }>();
  const { signIn, me } = useApp();
  const [by, setBy] = useState<By>('esia');
  const [step, setStep] = useState<'choose' | 'provider' | 'consent' | 'wait' | 'done'>('choose');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const nameOk = name.trim().length >= 2;

  const confirm = async () => {
    setStep('wait');
    const wait = new Promise((r) => setTimeout(r, 1300));
    try { await Promise.all([signIn(by, name.trim(), phone), wait]); setStep('done'); } catch (e) { setError((e as Error).message); setStep('provider'); }
  };
  const close = (to?: string) => { if (to) router.replace(to as never); else router.back(); };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: step === 'provider' || step === 'consent' ? NAME[by] : step === 'done' ? '' : 'Вход и регистрация' }} />
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        {step === 'choose' ? <>
          <Appear>
            <View style={st.hero}>
              <Text style={st.heroKicker}>ОСМОТРЕНО</Text>
              <Text style={st.heroTitle}>{intent === 'sell' ? 'Продайте машину\nнастоящему покупателю' : 'Смотрите только\nпроверенные машины'}</Text>
              <Text style={st.heroText}>Регистрация — это вход через подтверждённый аккаунт. Один человек — один профиль, без паролей и анкет.</Text>
            </View>
          </Appear>
          <Appear delay={120} style={{ gap: 10 }}>
            {(['esia', 'tid', 'sberid'] as By[]).filter((b) => b === 'esia' || Platform.OS !== 'ios').map((b) => (
              <PressScale key={b} onPress={() => { setBy(b); setStep('provider'); }} style={[st.provider, { backgroundColor: COLOR[b][0] }]} accessibilityRole="button">
                <Text style={[st.providerText, { color: COLOR[b][1] }]}>Войти через {NAME[b]}</Text>
              </PressScale>
            ))}
          </Appear>
          <Appear delay={220} style={{ gap: 12 }}>
            {[
              ['01', 'Подтверждаете личность', 'Через Госуслуги — так мы отсекаем перекупов с десятками аккаунтов.'],
              ['02', intent === 'sell' ? 'Заполняете объявление' : 'Открываете доступ', intent === 'sell' ? 'Машина, фото, цена — 5 минут. Потом осмотр 2 500 ₽.' : '990 ₽ на 30 дней: фото, оценка, отчёты, запись на просмотр.'],
              ['03', intent === 'sell' ? 'Продаёте' : 'Едете смотреть', intent === 'sell' ? 'Через приложение — комиссия 1%. Остальное без сюрпризов.' : 'Выбираете время, продавец подтверждает, адрес приходит в чат.'],
            ].map(([n, t, d]) => (
              <View key={n} style={st.step}><Text style={st.stepN}>{n}</Text><View style={{ flex: 1 }}><Text style={st.stepT}>{t}</Text><Text style={st.p}>{d}</Text></View></View>
            ))}
          </Appear>
        </> : null}

        {step === 'provider' ? (
          <Appear style={{ gap: 16 }}>
            <View style={[st.provHead, { backgroundColor: COLOR[by][0] }]}>
              <Text style={[st.provLogo, { color: COLOR[by][1] }]}>{NAME[by].toLowerCase()}</Text>
              <Text style={[st.provSub, { color: COLOR[by][1] }]}>тестовый вход · бета</Text>
            </View>
            <Text style={st.h2}>Вход в учётную запись</Text>
            <Text style={st.p}>Сейчас это имитация: введите любой номер. Один номер — один человек: с другим номером вы войдёте как другой человек (удобно проверить и покупателя, и продавца).</Text>
            <View style={{ gap: 6 }}>
              <Text style={st.label}>Телефон</Text>
              <TextInput style={st.input} value={phone} onChangeText={setPhone} placeholder="+7 900 000-00-00" inputMode="tel" autoComplete="tel" placeholderTextColor={C.muted} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={st.label}>Имя и фамилия</Text>
              <TextInput style={st.input} value={name} onChangeText={setName} placeholder="Иван Петров" autoComplete="name" placeholderTextColor={C.muted} />
            </View>
            {error ? <Text style={[st.p, { color: '#B42318' }]}>{error}</Text> : null}
            <PressScale onPress={phoneOk && nameOk ? () => setStep('consent') : undefined} style={[st.provider, { backgroundColor: COLOR[by][0] }, !(phoneOk && nameOk) && { opacity: 0.35 }]} accessibilityRole="button">
              <Text style={[st.providerText, { color: COLOR[by][1] }]}>Войти</Text>
            </PressScale>
            <Text style={st.link} onPress={() => setStep('choose')}>Назад</Text>
          </Appear>
        ) : null}

        {step === 'consent' ? (
          <Appear style={{ gap: 16 }}>
            <Text style={st.h2}>«Осмотрено» запрашивает доступ</Text>
            <View style={st.consent}>
              {['Фамилия, имя', 'Подтверждённая учётная запись', 'Номер телефона — только для входа'].map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={st.tick}>✓</Text><Text style={st.body}>{t}</Text></View>
              ))}
            </View>
            <Text style={st.p}>Продавцу показываем только «{name.trim().split(' ')[0]}, личность подтверждена». Телефон и фамилию — никому.</Text>
            <PressScale onPress={confirm} style={[st.provider, { backgroundColor: COLOR[by][0] }]} accessibilityRole="button">
              <Text style={[st.providerText, { color: COLOR[by][1] }]}>Предоставить</Text>
            </PressScale>
            <Text style={st.link} onPress={() => setStep('provider')}>Отмена</Text>
          </Appear>
        ) : null}

        {step === 'wait' ? (
          <View style={st.center}><Dots /><Text style={st.h2}>Проверяем учётную запись</Text><Text style={st.p}>{NAME[by]} подтверждает личность…</Text></View>
        ) : null}

        {step === 'done' ? (
          <View style={st.center}>
            <SuccessCheck />
            <Appear delay={150}><Text style={[st.h2, { textAlign: 'center' }]}>Готово, {(me?.name ?? name).split(' ')[0]}!</Text></Appear>
            <Appear delay={250}><Text style={[st.p, { textAlign: 'center' }]}>Аккаунт создан, личность подтверждена. {intent === 'sell' ? 'Теперь разместите машину.' : 'Фото и характеристики уже открыты. Оценка, отчёты и запись на просмотр — с доступом покупателя.'}</Text></Appear>
            <Appear delay={350} style={{ alignSelf: 'stretch', gap: 10 }}>
              {intent === 'sell' ? (
                <PressScale onPress={() => close('/sell')} style={st.black} accessibilityRole="button"><Text style={st.blackText}>Разместить машину</Text></PressScale>
              ) : me?.pass.active ? null : (
                <PressScale onPress={() => close('/pass')} style={st.black} accessibilityRole="button"><Text style={st.blackText}>Открыть полный доступ · 990 ₽</Text></PressScale>
              )}
              <Text style={st.link} onPress={() => close()}>{intent === 'sell' ? 'Позже' : 'Пока просто смотреть'}</Text>
            </Appear>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 60 },
  hero: { backgroundColor: C.night, borderRadius: 26, padding: 24, gap: 10 },
  heroKicker: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  heroTitle: { fontFamily: Font, color: '#fff', fontSize: 27, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  heroText: { fontFamily: Font, color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 21 },
  provider: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  providerText: { fontFamily: Font, fontSize: 16.5, fontWeight: '800' },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepN: { fontFamily: Font, fontSize: 13, fontWeight: '800', color: C.muted, width: 26, marginTop: 2 },
  stepT: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink },
  provHead: { borderRadius: 20, padding: 20, gap: 2 },
  provLogo: { fontFamily: Font, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  provSub: { fontFamily: Font, fontSize: 13, opacity: 0.8 },
  h2: { fontFamily: Font, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  body: { fontFamily: Font, fontSize: 15.5, color: C.ink },
  label: { fontFamily: Font, fontSize: 13.5, fontWeight: '700', color: C.ink },
  input: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 16, fontSize: 17, fontFamily: Font, color: C.ink, backgroundColor: '#fff' },
  consent: { borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 18, gap: 12 },
  tick: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.ink, color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: '900', overflow: 'hidden' },
  link: { fontFamily: Font, fontSize: 15, fontWeight: '700', color: C.ink, textDecorationLine: 'underline', textAlign: 'center', paddingVertical: 6 },
  center: { alignItems: 'center', gap: 14, paddingVertical: 40 },
  black: { height: 58, borderRadius: 18, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  blackText: { fontFamily: Font, color: '#fff', fontSize: 16.5, fontWeight: '800' },
});
