import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, type Listing, type Viewing } from '@/api/client';
import { CarImage } from '@/components/car';
import { Empty, STATUS_RU, TabScreen } from '@/components/screen';
import { Button } from '@/components/ui';
import { C, Font, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const when = (s: string) => new Date(s).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function ViewingsScreen() {
  const router = useRouter();
  const { access, version, toast, bump } = useApp();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [mine, setMine] = useState<Viewing[]>([]);
  const [bought, setBought] = useState<Listing[]>([]);
  const [incoming, setIncoming] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (access === 'guest') return;
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.viewings(), api.sellerViewings()]);
      setMine(a.items); setBought(a.bought); setIncoming(b.items);
    } catch { /* keep previous */ }
    setLoading(false);
  }, [access]);
  useFocusEffect(useCallback(() => { load(); }, [load, version]));

  const act = async (id: string, a: 'confirm' | 'decline' | 'done') => {
    try { await api.answerViewing(id, a); toast({ confirm: 'Просмотр подтверждён', decline: 'Заявка отклонена', done: 'Отмечено: просмотр состоялся' }[a]); bump(); } catch (e) { toast((e as Error).message); }
  };

  if (access === 'guest')
    return (
      <TabScreen title="Просмотры">
        <Empty title="Войдите, чтобы записываться" text="Здесь будут ваши записи на просмотр и заявки покупателей, если вы продаёте.">
          <Button kind="brand" title="Войти" onPress={() => router.push('/auth')} style={{ alignSelf: 'flex-start' }} />
        </Empty>
      </TabScreen>
    );

  const list = mode === 'buy' ? mine : incoming;
  return (
    <TabScreen title="Просмотры" refreshing={loading} onRefresh={load}>
      <View style={st.seg}>
        {(['buy', 'sell'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[st.segBtn, mode === m && st.segOn]} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
            <Text style={[st.segText, mode === m && { color: C.ink }]}>{m === 'buy' ? 'Я покупаю' : `Я продаю${incoming.filter((v) => v.status === 'requested').length ? ` · ${incoming.filter((v) => v.status === 'requested').length}` : ''}`}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'buy' && bought.length ? (
        <View style={{ gap: 8 }}>
          <Text style={st.h}>Куплено</Text>
          {bought.map((b) => <Text key={b.id} style={st.p}>✓ {b.make} {b.model}, {b.year} — {rub(b.price)}</Text>)}
        </View>
      ) : null}

      {!list.length ? (
        mode === 'buy' ? (
          <Empty title="Записей пока нет" text="Откройте машину и нажмите «Записаться на просмотр».">
            <Button kind="black" title="Найти машину" onPress={() => router.navigate('/')} style={{ alignSelf: 'flex-start' }} />
          </Empty>
        ) : <Empty title="Заявок нет" text="Когда покупатели запишутся на ваши машины, заявки появятся здесь." />
      ) : list.map((v) => (
        <View key={v.id} style={st.card}>
          <Pressable style={st.row} onPress={() => router.push(`/listing/${v.listing_id}`)}>
            <CarImage id={v.listing_id} color={v.color} body={v.body} style={st.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={st.title} numberOfLines={1}>{v.title}</Text>
              <Text style={st.p}>{when(v.at)}</Text>
              <Text style={[st.status, { color: STATUS_RU[v.status][1] }]}>{STATUS_RU[v.status][0]}{mode === 'sell' && v.buyer ? ` · ${v.buyer.name}` : ''}</Text>
              {v.district && mode === 'buy' ? <Text style={st.p}>Район: {v.district}</Text> : null}
            </View>
          </Pressable>
          {v.note ? <Text style={st.note}>«{v.note}»</Text> : null}
          <View style={st.actions}>
            {mode === 'sell' && v.status === 'requested' ? <>
              <Button kind="black" title="Подтвердить" onPress={() => act(v.id, 'confirm')} style={st.btn} />
              <Button kind="grey" title="Отклонить" onPress={() => act(v.id, 'decline')} style={st.btn} />
            </> : null}
            {mode === 'sell' && v.status === 'confirmed' ? <Button kind="grey" title="Просмотр состоялся" onPress={() => act(v.id, 'done')} style={st.btn} /> : null}
            {mode === 'buy' && (v.status === 'requested' || v.status === 'confirmed') ? <Button kind="grey" title="Отменить" onPress={async () => { await api.cancelViewing(v.id).catch(() => undefined); bump(); }} style={st.btn} /> : null}
            {v.thread_id ? <Button kind="line" title="Написать" onPress={() => router.push(`/thread/${v.thread_id}`)} style={st.btn} /> : null}
          </View>
        </View>
      ))}
    </TabScreen>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 14, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  segText: { fontFamily: Font, fontSize: 15, fontWeight: '700', color: C.muted },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  thumb: { width: 92, height: 72, borderRadius: 12 },
  title: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink },
  h: { fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 14, color: C.muted },
  status: { fontFamily: Font, fontSize: 14, fontWeight: '700' },
  note: { fontFamily: Font, fontSize: 14.5, color: C.ink2, fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { minHeight: 42, paddingHorizontal: 16 },
});
