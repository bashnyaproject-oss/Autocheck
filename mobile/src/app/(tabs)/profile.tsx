import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, SITE, type MyListing } from '@/api/client';
import { CarImage } from '@/components/car';
import { LISTING_STATUS, TabScreen } from '@/components/screen';
import { Button, Rule } from '@/components/ui';
import { C, Font, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const BY = { esia: 'Госуслуги', tid: 'Т-ID', sberid: 'Сбер ID' } as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { me, access, signOut, toast, version } = useApp();
  const [mine, setMine] = useState<MyListing[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useFocusEffect(useCallback(() => {
    if (me) api.myListings().then((r) => setMine(r.items)).catch(() => undefined);
  }, [me, version]));

  return (
    <TabScreen title="Профиль">
      {me ? (
        <View style={st.user}>
          <View style={st.avatar}><Text style={st.avatarText}>{me.name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{me.name}</Text>
            <Text style={st.p}>Личность подтверждена · {BY[me.verified_by]}</Text>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={st.p}>Войдите, чтобы смотреть машины, записываться на просмотр и продавать.</Text>
          <Button kind="brand" title="Войти" onPress={() => router.push('/auth')} />
        </View>
      )}

      {me ? (
        <Pressable style={st.card} onPress={() => router.push('/pass')} accessibilityRole="button">
          <Text style={st.h}>{access === 'full' ? 'Доступ покупателя открыт' : 'Доступ покупателя'}</Text>
          <Text style={st.p}>{access === 'full'
            ? `До ${me.pass.until ? new Date(me.pass.until).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'} · отчётов на неделе ${me.pass.used_this_week} из ${me.pass.weekly_limit}`
            : 'Все фото, оценка, отчёт и запись на просмотр — 990 ₽ на 30 дней'}</Text>
        </Pressable>
      ) : null}

      <Pressable style={[st.card, st.sell]} onPress={() => router.push(me ? '/sell' : '/auth')} accessibilityRole="button">
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={st.h}>Продать машину на «Осмотрено»</Text>
          <Text style={st.p}>Разместим после осмотра. За размещение платите, только если не продали через нас.</Text>
        </View>
        <View style={st.go}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>→</Text></View>
      </Pressable>

      {mine.length ? (
        <View style={{ gap: 10 }}>
          <Text style={st.h}>Мои машины</Text>
          {mine.map((l) => (
            <Pressable key={l.id} style={st.row} onPress={() => router.push(`/host/${l.id}`)} accessibilityRole="button">
              <CarImage id={l.id} color={l.color} body={l.body} photo={l.photos[0]} style={st.thumb} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.title} numberOfLines={1}>{l.make} {l.model}, {l.year}</Text>
                <Text style={st.p}>{rub(l.price)}</Text>
                <Text style={[st.status, { color: (LISTING_STATUS[l.status] ?? ['', C.muted])[1] }]}>{(LISTING_STATUS[l.status] ?? [l.status])[0]}</Text>
              </View>
              <Text style={{ fontSize: 22, color: C.muted }}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[st.card, { gap: 10 }]}>
        <Text style={st.h}>Как это работает</Text>
        <Rule kind="ok">Каждая машина прошла осмотр, оценка не ниже 60</Rule>
        <Rule kind="ok">Покупатель платит только за доступ — 990 ₽ в месяц</Rule>
        <Rule kind="pay">Продавец: осмотр 2 500 ₽; продал через нас — 1%, не продал — 2 990 ₽</Rule>
        <Rule kind="pay">Обман по осмотру — снятие и блокировка</Rule>
      </View>

      {me ? <Button kind="line" title="Выйти" onPress={signOut} /> : null}
      {me ? (confirmDelete ? (
        <View style={[st.card, { gap: 10 }]}>
          <Text style={st.p}>Удалить аккаунт, избранное, переписку и доступ? Это нельзя отменить.</Text>
          <Button kind="black" title="Удалить навсегда" onPress={async () => { await api.deleteAccount().catch(() => undefined); signOut(); setConfirmDelete(false); toast('Аккаунт удалён'); }} />
          <Button kind="grey" title="Отмена" onPress={() => setConfirmDelete(false)} />
        </View>
      ) : <Text style={st.link} onPress={() => setConfirmDelete(true)}>Удалить аккаунт</Text>) : null}
      <View style={{ flexDirection: 'row', gap: 18, justifyContent: 'center' }}>
        <Text style={st.link} onPress={() => Linking.openURL(SITE + '/terms')}>Условия</Text>
        <Text style={st.link} onPress={() => Linking.openURL(SITE + '/privacy')}>Конфиденциальность</Text>
      </View>
      <Text style={st.link} onPress={() => router.push('/welcome')}>Как работает «Осмотрено»</Text>
      <Text style={[st.p, { textAlign: 'center', fontSize: 13 }]}>Бета: машины в поиске — примеры, вход и оплата тестовые.</Text>
    </TabScreen>
  );
}

const st = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: Font, fontSize: 24, fontWeight: '800' },
  name: { fontFamily: Font, fontSize: 20, fontWeight: '800', color: C.ink },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 1, backgroundColor: '#fff' },
  sell: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  go: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: Font, fontSize: 17, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 6 },
  thumb: { width: 84, height: 64, borderRadius: 12 },
  title: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink },
  status: { fontFamily: Font, fontSize: 13.5, fontWeight: '700' },
  link: { fontFamily: Font, fontSize: 14.5, color: C.ink, textDecorationLine: 'underline', textAlign: 'center' },
});
