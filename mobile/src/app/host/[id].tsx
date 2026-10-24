import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError, type MyListing, type Viewing } from '@/api/client';
import { CarImage, GradeBadge } from '@/components/car';
import { LISTING_STATUS, STATUS_RU } from '@/components/screen';
import { Button } from '@/components/ui';
import { C, Font, MaxContentWidth, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const POINT = { o1: 'Осмотрено Савёловская', s1: 'Гараж 24', d1: 'Север-Авто', o2: 'Осмотрено Люблино' } as Record<string, string>;

export default function HostListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast, bump, version } = useApp();
  const [l, setL] = useState<MyListing | null>(null);
  const [views, setViews] = useState<Viewing[]>([]);
  const [price, setPrice] = useState('');
  const [closing, setClosing] = useState<null | 'sold' | 'remove'>(null);

  const load = useCallback(async () => {
    try {
      const [x, v] = await Promise.all([api.myListing(id), api.sellerViewings()]);
      setL(x); setPrice(String(x.price)); setViews(v.items.filter((i) => i.listing_id === id));
    } catch (e) { toast((e as Error).message); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load, version]);
  if (!l) return <ActivityIndicator style={{ marginTop: 60 }} />;

  const act = async (vid: string, a: 'confirm' | 'decline' | 'done') => { await api.answerViewing(vid, a).catch(() => undefined); bump(); };
  const savePrice = async () => {
    try { await api.updateListing(l.id, { price: Number(price.replace(/\D/g, '')) }); toast('Цена обновлена'); bump(); } catch (e) { toast(e instanceof ApiError ? e.message : 'Не получилось'); }
  };
  const sold = async (buyerId?: string) => {
    const r = await api.markSold(l.id, buyerId);
    toast(r.via_app ? `Продано через приложение · комиссия ${rub(r.charge.amount)}` : `Продано вне приложения · ${rub(r.charge.amount)}`);
    setClosing(null); bump();
  };
  const remove = async () => {
    const r = await api.removeListing(l.id);
    toast(r.charge ? `Снято · ${rub(r.charge.amount)}` : 'Снято с продажи');
    setClosing(null); bump();
  };
  const st0 = LISTING_STATUS[l.status] ?? [l.status, C.muted];

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.col}>
      <Stack.Screen options={{ title: `${l.make} ${l.model}` }} />
      <View style={st.top}>
        <CarImage id={l.id} color={l.color} body={l.body} photo={l.photos[0]} style={st.thumb} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.h1}>{l.make} {l.model}, {l.year}</Text>
          <Text style={[st.status, { color: st0[1] }]}>{st0[0]}</Text>
          {l.grade != null ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><GradeBadge grade={l.grade} small /><Text style={st.p}>оценка осмотра</Text></View> : null}
        </View>
      </View>

      {l.status === 'awaiting_inspection' ? (
        <View style={st.card}>
          <Text style={st.h}>Ждём вас на осмотре</Text>
          <Text style={st.p}>{l.booked_point ? `${POINT[l.booked_point] ?? 'Пункт осмотра'}. ` : ''}Возьмите СТС, ПТС и паспорт. После осмотра пункт отправит протокол — оценка от 60, и машина сразу появится в поиске.</Text>
        </View>
      ) : null}
      {l.status === 'rejected' ? (
        <View style={st.card}><Text style={st.h}>Оценка ниже 60</Text><Text style={st.p}>Такие машины мы не публикуем. Протокол остаётся у вас — можно устранить замечания и пройти осмотр снова.</Text></View>
      ) : null}

      {l.status === 'published' ? <>
        <View style={st.stats}>
          <View style={st.stat}><Text style={st.statN}>{l.stats?.likes ?? 0}</Text><Text style={st.p}>в избранном</Text></View>
          <View style={st.stat}><Text style={st.statN}>{views.length}</Text><Text style={st.p}>заявок на просмотр</Text></View>
        </View>

        <View style={st.card}>
          <Text style={st.h}>Цена</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[st.input, { flex: 1 }]} value={price} onChangeText={setPrice} inputMode="numeric" />
            <Button kind="grey" title="Сохранить" onPress={savePrice} />
          </View>
          <Text style={st.p}>Пока есть записи на просмотр, цену можно только снизить.</Text>
        </View>

        <Text style={st.h}>Заявки на просмотр</Text>
        {!views.length ? <Text style={st.p}>Пока нет. Покупатели с доступом запишутся прямо со страницы машины.</Text> : views.map((v) => (
          <View key={v.id} style={st.card}>
            <Text style={st.h3}>{v.buyer?.name ?? 'Покупатель'} · {new Date(v.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={[st.status, { color: STATUS_RU[v.status][1] }]}>{STATUS_RU[v.status][0]}</Text>
            {v.note ? <Text style={st.p}>«{v.note}»</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {v.status === 'requested' ? <><Button kind="black" title="Подтвердить" onPress={() => act(v.id, 'confirm')} /><Button kind="grey" title="Отклонить" onPress={() => act(v.id, 'decline')} /></> : null}
              {v.status === 'confirmed' ? <Button kind="grey" title="Просмотр состоялся" onPress={() => act(v.id, 'done')} /> : null}
              {v.thread_id ? <Button kind="line" title="Написать" onPress={() => router.push(`/thread/${v.thread_id}`)} /> : null}
            </View>
          </View>
        ))}

        <View style={st.card}>
          <Text style={st.h}>Закрыть объявление</Text>
          {closing === 'sold' ? (
            <View style={{ gap: 8 }}>
              <Text style={st.p}>Кому продали? Покупателю из приложения — комиссия {rub(l.commission_if_sold)}. Вне приложения — {rub(l.fee_if_not_sold)}.</Text>
              {(l.buyers ?? []).map((b) => <Button key={b.id} kind="black" title={`${b.name} (из приложения)`} onPress={() => sold(b.id)} />)}
              <Button kind="grey" title="Продал вне приложения" onPress={() => sold()} />
              <Text style={st.link} onPress={() => setClosing(null)}>Отмена</Text>
            </View>
          ) : closing === 'remove' ? (
            <View style={{ gap: 8 }}>
              <Text style={st.p}>Снятие без продажи через приложение — {rub(l.fee_if_not_sold)} с привязанной карты.</Text>
              <Button kind="black" title={`Снять и оплатить ${rub(l.fee_if_not_sold)}`} onPress={remove} />
              <Text style={st.link} onPress={() => setClosing(null)}>Отмена</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button kind="black" title="Продано" onPress={() => setClosing('sold')} />
              <Button kind="grey" title="Снять с продажи" onPress={() => setClosing('remove')} />
            </View>
          )}
        </View>
        <Pressable onPress={() => router.push(`/listing/${l.id}`)}><Text style={st.link}>Как видят покупатели ›</Text></Pressable>
      </> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 60 },
  top: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  thumb: { width: 110, height: 84, borderRadius: 14 },
  h1: { fontFamily: Font, fontSize: 21, fontWeight: '800', color: C.ink },
  h: { fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink },
  h3: { fontFamily: Font, fontSize: 15.5, fontWeight: '700', color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  status: { fontFamily: Font, fontSize: 14, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 8 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: C.fill, borderRadius: 16, padding: 14 },
  statN: { fontFamily: Font, fontSize: 24, fontWeight: '800', color: C.ink },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 14, fontSize: 16, fontFamily: Font, color: C.ink },
  link: { fontFamily: Font, fontSize: 15, fontWeight: '700', color: C.ink, textDecorationLine: 'underline', textAlign: 'center' },
});
