import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, usingServer, type SellerListing } from '@/api/client';
import { Button, Card, Row, Rule, Tag, T } from '@/components/ui';
import { C, MaxContentWidth, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

// Legal pages live on the website. Web build: same origin; native: EXPO_PUBLIC_SITE_URL.
const SITE: string | null = process.env.EXPO_PUBLIC_SITE_URL ?? (Platform.OS === 'web' ? '' : null);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, pass, signOut, toast } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mine, setMine] = useState<SellerListing[]>([]);
  useFocusEffect(useCallback(() => {
    if (usingServer && user) api.sellerListings().then((r) => setMine(r.items)).catch(() => undefined);
  }, [user]));
  const STATUS: Record<string, [string, 'grey' | 'ok' | 'note' | 'dark']> = {
    awaiting_inspection: ['Ждём на осмотре', 'note'], published: ['Опубликовано', 'ok'], rejected: ['Оценка ниже 60 — не опубликовано', 'grey'],
    sold: ['Продано', 'dark'], removed: ['Снято', 'grey'], expired: ['60 дней прошли', 'grey'],
  };
  const by = user?.verifiedBy === 'gosuslugi' ? 'Госуслуги' : user?.verifiedBy === 'tid' ? 'Т-ID' : 'Сбер ID';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.col}>
        <T v="h1">Профиль</T>
        <Card>
          {user ? (
            <>
              <T v="h3">{user.name}</T>
              <T v="muted">Личность подтверждена · {by}</T>
            </>
          ) : (
            <>
              <T v="h3">Вы не вошли</T>
              <T v="muted">Смотреть машины можно без входа. Вход нужен для пропуска, записи на просмотр и продажи.</T>
              <Button kind="gosu" title="Войти" onPress={() => router.push('/pass')} />
            </>
          )}
        </Card>
        <Card>
          <T v="h3">Пропуск покупателя</T>
          <T v="muted">{pass.active ? `Активен до ${pass.until} · отчётов на неделе ${pass.usedThisWeek} из ${pass.weeklyLimit}` : 'Не активен'}</T>
          {!pass.active ? <Button kind="green" title="Оформить" onPress={() => router.push('/pass')} /> : null}
        </Card>
        {mine.length ? (
          <Card>
            <T v="h3">Мои объявления</T>
            {mine.map((l) => (
              <View key={l.id} style={{ gap: 4, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>{l.make} {l.model}, {l.year}</T><T>{rub(l.price)}</T></Row>
                <Row><Tag kind={(STATUS[l.status] ?? ['', 'grey'])[1]}>{(STATUS[l.status] ?? [l.status])[0]}</Tag>{l.grade ? <Tag>Оценка {l.grade}</Tag> : null}</Row>
                {l.status === 'published' ? <T v="small">Продадите через нас — {rub(l.commission_if_sold)}; не продадите за 60 дней — {rub(l.fee_if_not_sold)}</T> : null}
              </View>
            ))}
          </Card>
        ) : null}
        <Card>
          <T v="h3">Как это работает</T>
          <View style={{ gap: 10 }}>
            <Rule kind="ok">Каждая машина осмотрена, оценка не ниже 60</Rule>
            <Rule kind="ok">Покупатель платит только за пропуск, сделка — без доплат</Rule>
            <Rule kind="pay">Продавец: продал через нас — 1%, не продал — 2 990 ₽</Rule>
            <Rule kind="pay">Обман по осмотру — снятие и блокировка</Rule>
          </View>
        </Card>
        {user ? <Button kind="line" title="Выйти" onPress={signOut} /> : null}
        {user ? (
          confirmDelete ? (
            <Card>
              <T>Удалить аккаунт, избранное и историю? Пропуск сгорит. Это нельзя отменить.</T>
              <Button kind="black" title="Удалить навсегда" onPress={async () => { if (usingServer) await api.deleteAccount().catch(() => undefined); signOut(); setConfirmDelete(false); toast('Аккаунт удалён'); }} />
              <Button kind="grey" title="Отмена" onPress={() => setConfirmDelete(false)} />
            </Card>
          ) : (
            <Button kind="grey" title="Удалить аккаунт" onPress={() => setConfirmDelete(true)} />
          )
        ) : null}
        {SITE !== null ? <Row style={{ justifyContent: 'center' }}>
          <T v="small" style={{ color: C.link }} onPress={() => Linking.openURL(SITE + '/privacy')}>Конфиденциальность</T>
          <T v="small" style={{ color: C.link }} onPress={() => Linking.openURL(SITE + '/terms')}>Условия</T>
        </Row> : null}
        <T v="small" style={{ textAlign: 'center' }}>Бета. Машины в ленте — примеры, оплата тестовая.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 16, paddingBottom: 40 },
});
