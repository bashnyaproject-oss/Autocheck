import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { api, type Listing } from '@/api/client';
import { ListingCard } from '@/components/car';
import { Empty, TabScreen } from '@/components/screen';
import { Button } from '@/components/ui';
import { useApp } from '@/state/app-state';

export default function SavedScreen() {
  const router = useRouter();
  const { access, version } = useApp();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 1180) - 40;
  const cols = inner > 1000 ? 4 : inner > 700 ? 3 : inner > 480 ? 2 : 1;
  const cardW = (inner - (cols - 1) * 20) / cols;

  const load = useCallback(async () => {
    if (access === 'guest') return setItems([]);
    setLoading(true);
    try { setItems((await api.favorites()).items); } catch { /* shown as empty */ }
    setLoading(false);
  }, [access]);
  useFocusEffect(useCallback(() => { load(); }, [load, version]));

  return (
    <TabScreen title="Избранное" refreshing={loading} onRefresh={load} wide>
      {access === 'guest' ? (
        <Empty title="Войдите, чтобы сохранять машины" text="Нажмите на сердечко у машины — она появится здесь.">
          <Button kind="brand" title="Войти" onPress={() => router.push('/auth')} style={{ alignSelf: 'flex-start' }} />
        </Empty>
      ) : !items.length ? (
        <Empty title="Пока пусто" text="Нажмите на сердечко у машины в поиске.">
          <Button kind="black" title="Начать поиск" onPress={() => router.navigate('/')} style={{ alignSelf: 'flex-start' }} />
        </Empty>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, rowGap: 30 }}>
          {items.map((l) => <ListingCard key={l.id} l={{ ...l, liked: true }} width={cardW} />)}
        </View>
      )}
    </TabScreen>
  );
}
