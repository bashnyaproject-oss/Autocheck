import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import type { ImportedListing } from '@/api/types';
import { Button, Card, Row, Rule, T } from '@/components/ui';
import { COMMISSION, NOT_SOLD_FEE } from '@/constants/pricing';
import { C, Font, MaxContentWidth, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const POINTS = [
  { id: 'o1', name: 'Осмотрено Савёловская', addr: 'Бутырская ул., 46', when: 'сегодня, без записи' },
  { id: 's1', name: 'Гараж 24 (СТО-партнёр)', addr: 'ул. Нижняя Масловка, 6', when: 'сегодня 15:00' },
  { id: 'd1', name: 'Север-Авто (дилер)', addr: 'Дмитровское ш., 98', when: 'сегодня 17:30' },
];

export default function SellScreen() {
  const { user, signIn, sellerCard, linkSellerCard, toast } = useApp();
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [car, setCar] = useState<ImportedListing | null>(null);
  const [note, setNote] = useState('');
  const [point, setPoint] = useState('o1');
  const [done, setDone] = useState(false);

  const load = async () => {
    setBusy(true);
    const r = await api.importListing(link.trim());
    setCar(r.data ?? {});
    setNote(r.ok ? '' : (r.error ?? 'Не удалось прочитать объявление') + '. Допишите данные ниже.');
    setBusy(false);
  };
  const num = (s: string) => Number(s.replace(/\D/g, '')) || undefined;
  const ready = !!(car && car.title && car.year && car.km && car.price);

  if (done)
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.col}>
          <T v="h1">Ждём вас на осмотре</T>
          <T v="muted">{POINTS.find((p) => p.id === point)!.name}, {POINTS.find((p) => p.id === point)!.when}. Возьмите СТС, ПТС и паспорт.</T>
          <Card>
            <Rule kind="ok">Оценка от 60 — публикуем сразу, с отметкой «Осмотрено»</Rule>
            <Rule kind="ok">Ниже 60 — не публикуем, но отчёт остаётся у вас</Rule>
          </Card>
          <Button kind="grey" title="Новое объявление" onPress={() => { setDone(false); setCar(null); setLink(''); }} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        <T v="h1">Продать машину</T>
        <T v="muted">Публикуем только машины с осмотром и оценкой от 60. Платите за размещение, только если не продали через нас.</T>

        <Card>
          <T v="h3">1. Ссылка на ваше объявление</T>
          <TextInput style={st.input} value={link} onChangeText={setLink} placeholder="https://auto.ru/cars/used/sale/…" autoCapitalize="none" autoCorrect={false} inputMode="url" placeholderTextColor={C.muted} />
          <Button title="Загрузить" onPress={load} loading={busy} disabled={!link.trim()} />
          <T v="small">Авто.ру, Авито или Дром. Объявления нет — введите данные вручную после загрузки.</T>
        </Card>

        {car ? (
          <Card>
            <T v="h3">2. Проверьте данные</T>
            {note ? <T v="muted" style={{ color: '#7A5A00' }}>{note}</T> : null}
            <TextInput style={st.input} value={car.title ?? ''} onChangeText={(v) => setCar({ ...car, title: v })} placeholder="Марка и модель" placeholderTextColor={C.muted} />
            <Row style={{ flexWrap: 'nowrap' }}>
              <TextInput style={[st.input, { flex: 1, minWidth: 0, width: 0 }]} value={car.year ? String(car.year) : ''} onChangeText={(v) => setCar({ ...car, year: num(v) })} placeholder="Год" inputMode="numeric" placeholderTextColor={C.muted} />
              <TextInput style={[st.input, { flex: 1.3, minWidth: 0, width: 0 }]} value={car.km ? car.km.toLocaleString('ru-RU') : ''} onChangeText={(v) => setCar({ ...car, km: num(v) })} placeholder="Пробег, км" inputMode="numeric" placeholderTextColor={C.muted} />
            </Row>
            <TextInput style={st.input} value={car.price ? car.price.toLocaleString('ru-RU') : ''} onChangeText={(v) => setCar({ ...car, price: num(v) })} placeholder="Цена, ₽" inputMode="numeric" placeholderTextColor={C.muted} />
          </Card>
        ) : null}

        {ready ? (
          <>
            <Card>
              <T v="h3">3. Осмотр — 2 500 ₽</T>
              <T v="muted">Отчёт останется у вас, даже если передумаете продавать.</T>
              {POINTS.map((p) => (
                <Pressable key={p.id} onPress={() => setPoint(p.id)} style={[st.opt, point === p.id && st.optOn]} accessibilityRole="radio" accessibilityState={{ checked: point === p.id }}>
                  <T style={{ fontWeight: '700' }}>{p.name}</T>
                  <T v="muted">{p.addr} · {p.when}</T>
                </Pressable>
              ))}
            </Card>
            <Card>
              <T v="h3">4. Размещение — оплата по итогу</T>
              <View style={{ gap: 10 }}>
                <Rule kind="ok">Сейчас за размещение — 0 ₽</Rule>
                <Rule kind="pay">Продали через нас — комиссия 1%: {rub(COMMISSION(car!.price!))}</Rule>
                <Rule kind="pay">Не продали за 60 дней, сняли или продали мимо — {rub(NOT_SOLD_FEE)}</Rule>
                <Rule kind="pay">Подтвердился обман — снимаем объявление и блокируем аккаунт</Rule>
              </View>
              {!user ? (
                <Button kind="gosu" title="Подтвердить владельца через Госуслуги" onPress={() => { signIn('gosuslugi'); toast('Владелец подтверждён'); }} />
              ) : !sellerCard ? (
                <Button kind="black" title="Привязать карту" onPress={() => { linkSellerCard(); toast('Карта привязана'); }} />
              ) : (
                <Button kind="green" title="Оплатить осмотр 2 500 ₽" onPress={() => setDone(true)} />
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 16, paddingBottom: 40 },
  input: { height: 50, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 14, fontSize: 16, fontFamily: Font, color: C.ink },
  opt: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, gap: 2 },
  optOn: { borderColor: C.ink, borderWidth: 2 },
});
