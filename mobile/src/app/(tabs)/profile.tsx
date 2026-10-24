import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Rule, T } from '@/components/ui';
import { C, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, pass } = useApp();
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
        <Card>
          <T v="h3">Как это работает</T>
          <View style={{ gap: 10 }}>
            <Rule kind="ok">Каждая машина осмотрена, оценка не ниже 60</Rule>
            <Rule kind="ok">Покупатель платит только за пропуск, сделка — без доплат</Rule>
            <Rule kind="pay">Продавец: продал через нас — 1%, не продал — 2 990 ₽</Rule>
            <Rule kind="pay">Обман по осмотру — снятие и блокировка</Rule>
          </View>
        </Card>
        <T v="small" style={{ textAlign: 'center' }}>Прототип. Машины, люди и цены — примеры.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 16, paddingBottom: 40 },
});
