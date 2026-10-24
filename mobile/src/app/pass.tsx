import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Rule, T } from '@/components/ui';
import { C, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

/**
 * Pass: 1) verified identity (one person — one pass), 2) payment.
 * iOS: App Store rules require Apple in-app purchase for digital subscriptions, and Russian
 * users currently can't pay in the App Store. Until that is solved (see docs/LAUNCH.md),
 * the iOS build only shows the status and never sells or links out.
 */
const SELL_IN_APP = Platform.OS !== 'ios';

export default function PassScreen() {
  const router = useRouter();
  const { user, signIn, pass, buyPass, toast } = useApp();

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.wrap}>
      <View style={st.col}>
        {pass.active ? (
          <Card>
            <T v="h2">Пропуск активен</T>
            <T v="muted">До {pass.until}. Глубоких отчётов на этой неделе: {pass.usedThisWeek} из {pass.weeklyLimit}. Лимит обновится в понедельник.</T>
            <Button kind="grey" title="Готово" onPress={() => router.back()} />
          </Card>
        ) : !user ? (
          <>
            <T v="h1">Шаг 1. Кто вы</T>
            <T v="muted">Один человек — один пропуск. Так перекупы не заводят десятки аккаунтов, а продавцы знают, что к ним идут настоящие покупатели.</T>
            <View style={{ gap: 10 }}>
              <Button kind="gosu" title="Войти через Госуслуги" onPress={() => signIn('gosuslugi').then(() => toast('Личность подтверждена'), () => toast('Не удалось войти'))} />
              <Button kind="tid" title="Войти с Т-ID" onPress={() => signIn('tid').then(() => toast('Личность подтверждена'), () => toast('Не удалось войти'))} />
              <Button kind="green" title="Войти со Сбер ID" onPress={() => signIn('sberid').then(() => toast('Личность подтверждена'), () => toast('Не удалось войти'))} />
            </View>
            <T v="small">Берём только ФИО и признак подтверждённой учётной записи. Продавец видит «Покупатель подтверждён», но не ваши данные.</T>
            <T v="small">Бета: вход и оплата работают в тестовом режиме, деньги не списываются.</T>
          </>
        ) : (
          <>
            <T v="h1">Шаг 2. Пропуск</T>
            <Card>
              <T v="h2">990 ₽ на 30 дней</T>
              <View style={{ gap: 10 }}>
                <Rule kind="ok">Оценка состояния каждой машины — от жёлтого до зелёного</Rule>
                <Rule kind="ok">До 30 глубоких отчётов в неделю: история по базам, толщиномер, чек-лист осмотра</Rule>
                <Rule kind="ok">Запись на просмотр и покупка через приложение без доплат</Rule>
                <Rule kind="ok">Отмена в любой момент</Rule>
              </View>
              {SELL_IN_APP ? (
                <Button kind="green" title="Оплатить 990 ₽" onPress={() => buyPass().then(() => toast('Оплата прошла'), () => toast('Оплата не прошла'))} />
              ) : (
                <T v="muted">Пропуск не активен.</T>
              )}
            </Card>
            <T v="small">Основные параметры всех машин — год, пробег, цена, был ли осмотр — открыты и без пропуска.</T>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingBottom: 40 },
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
});
