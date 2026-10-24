import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { C, Font, rub } from '@/constants/theme';

import { Appear, Dots, PressScale, SuccessCheck } from './motion';

/**
 * Test card payment. Looks and behaves like the real checkout (card → bank → done), but nothing is
 * charged: in production this sheet is replaced by the ЮKassa payment form (docs/LAUNCH.md).
 */
const TEST = '4242 4242 4242 4242';
const fmtCard = (s: string) => s.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const fmtExp = (s: string) => { const d = s.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

export function CardPayment({ amount, title, note, cta, onPay, onDone, doneTitle, doneText, doneCta }: {
  amount: number; title: string; note?: string; cta?: string;
  onPay: () => Promise<void>; onDone: () => void; doneTitle: string; doneText: string; doneCta: string;
}) {
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [stage, setStage] = useState<'form' | 'bank' | 'done' | 'error'>('form');
  const [error, setError] = useState('');
  const valid = num.replace(/\D/g, '').length === 16 && /^(0[1-9]|1[0-2])\/\d\d$/.test(exp) && cvc.length === 3;

  const pay = async () => {
    setStage('bank');
    const wait = new Promise((r) => setTimeout(r, 1600)); // feels like a bank round-trip
    try { await Promise.all([onPay(), wait]); setStage('done'); } catch (e) { await wait; setError((e as Error).message || 'Платёж не прошёл'); setStage('error'); }
  };

  if (stage === 'bank') return (
    <View style={st.center}>
      <Dots />
      <Text style={st.h}>Связываемся с банком</Text>
      <Text style={st.p}>Подтверждаем платёж {rub(amount)}…</Text>
    </View>
  );
  if (stage === 'done') return (
    <View style={st.center}>
      <SuccessCheck />
      <Appear delay={200}><Text style={[st.h, { textAlign: 'center' }]}>{doneTitle}</Text></Appear>
      <Appear delay={300}><Text style={[st.p, { textAlign: 'center' }]}>{doneText}</Text></Appear>
      <Appear delay={400} style={{ alignSelf: 'stretch' }}>
        <PressScale onPress={onDone} style={st.payBtn} accessibilityRole="button"><Text style={st.payText}>{doneCta}</Text></PressScale>
      </Appear>
    </View>
  );

  const digits = num.replace(/\D/g, '');
  return (
    <View style={{ gap: 16 }}>
      <Appear>
        <View style={st.card}>
          <View style={st.cardTop}>
            <View style={st.chip} />
            <Text style={st.cardBrand}>{digits.startsWith('4') ? 'VISA' : digits.startsWith('2') ? 'МИР' : 'КАРТА'}</Text>
          </View>
          <Text style={st.cardNum}>{(fmtCard(num) || '•••• •••• •••• ••••').padEnd(19, '•')}</Text>
          <View style={st.cardBottom}>
            <View><Text style={st.cardLabel}>СРОК</Text><Text style={st.cardVal}>{exp || 'ММ/ГГ'}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={st.cardLabel}>К ОПЛАТЕ</Text><Text style={st.cardVal}>{rub(amount)}</Text></View>
          </View>
        </View>
      </Appear>

      <View style={st.testBox}>
        <Text style={st.testText}>Тестовый режим — деньги не спишутся.</Text>
        <Text style={st.testLink} onPress={() => { setNum(TEST); setExp('12/29'); setCvc('123'); }} accessibilityRole="button">Подставить тестовую карту</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={st.label}>Номер карты</Text>
        <TextInput style={st.input} value={num} onChangeText={(v) => setNum(fmtCard(v))} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number" placeholderTextColor={C.muted} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.label}>Срок</Text>
          <TextInput style={st.input} value={exp} onChangeText={(v) => setExp(fmtExp(v))} placeholder="ММ/ГГ" inputMode="numeric" autoComplete="cc-exp" placeholderTextColor={C.muted} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.label}>CVC</Text>
          <TextInput style={st.input} value={cvc} onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 3))} placeholder="•••" inputMode="numeric" secureTextEntry autoComplete="cc-csc" placeholderTextColor={C.muted} />
        </View>
      </View>
      {stage === 'error' ? <Text style={[st.p, { color: '#B42318' }]}>{error}</Text> : null}
      <PressScale onPress={valid ? pay : undefined} style={[st.payBtn, !valid && { opacity: 0.35 }]} accessibilityRole="button" accessibilityState={{ disabled: !valid }}>
        <Text style={st.payText}>{cta ?? `Оплатить ${rub(amount)}`}</Text>
      </PressScale>
      <Text style={[st.p, { fontSize: 12.5, textAlign: 'center' }]}>{note ?? title}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', gap: 14, paddingVertical: 30 },
  h: { fontFamily: Font, fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  card: { height: 196, borderRadius: 22, backgroundColor: C.night, padding: 22, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { width: 40, height: 30, borderRadius: 7, backgroundColor: '#D9D9DC', opacity: 0.9 },
  cardBrand: { fontFamily: Font, color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
  cardNum: { fontFamily: Font, color: '#fff', fontSize: 21, letterSpacing: 2, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { fontFamily: Font, color: 'rgba(255,255,255,.5)', fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  cardVal: { fontFamily: Font, color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  testBox: { backgroundColor: C.fill, borderRadius: 14, padding: 12, gap: 4 },
  testText: { fontFamily: Font, fontSize: 13.5, color: C.ink2 },
  testLink: { fontFamily: Font, fontSize: 14, fontWeight: '800', color: C.ink, textDecorationLine: 'underline' },
  label: { fontFamily: Font, fontSize: 13.5, fontWeight: '700', color: C.ink },
  input: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 16, fontSize: 17, fontFamily: Font, color: C.ink, backgroundColor: '#fff', letterSpacing: 1 },
  payBtn: { height: 58, borderRadius: 18, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  payText: { fontFamily: Font, color: '#fff', fontSize: 16.5, fontWeight: '800' },
});
