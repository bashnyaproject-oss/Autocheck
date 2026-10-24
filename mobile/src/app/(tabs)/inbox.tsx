import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, type Thread } from '@/api/client';
import { CarImage } from '@/components/car';
import { Empty, TabScreen } from '@/components/screen';
import { Button } from '@/components/ui';
import { C, Font } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const ago = (s: string | null) => (s ? new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function InboxScreen() {
  const router = useRouter();
  const { access, version } = useApp();
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (access === 'guest') return;
    setLoading(true);
    try { setItems((await api.threads()).items); } catch { /* keep */ }
    setLoading(false);
  }, [access]);
  useFocusEffect(useCallback(() => { load(); }, [load, version]));

  return (
    <TabScreen title="Сообщения" refreshing={loading} onRefresh={load}>
      {access === 'guest' ? (
        <Empty title="Войдите, чтобы переписываться" text="Здесь будет переписка с продавцами и покупателями.">
          <Button kind="brand" title="Войти" onPress={() => router.push('/auth')} style={{ alignSelf: 'flex-start' }} />
        </Empty>
      ) : !items.length ? (
        <Empty title="Сообщений нет" text="Запишитесь на просмотр или напишите продавцу со страницы машины." />
      ) : items.map((t) => (
        <Pressable key={t.id} style={st.row} onPress={() => router.push(`/thread/${t.id}`)} accessibilityRole="button">
          <CarImage id={t.listing_id} color={t.color} body={t.body} style={st.thumb} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={st.name} numberOfLines={1}>{t.with}</Text>
              <Text style={st.time}>{ago(t.last_at)}</Text>
            </View>
            <Text style={st.car} numberOfLines={1}>{t.role === 'buyer' ? 'Продавец' : 'Покупатель'} · {t.title}</Text>
            <Text style={st.last} numberOfLines={1}>{t.last_text ?? 'Начните переписку'}</Text>
          </View>
        </Pressable>
      ))}
    </TabScreen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  thumb: { width: 60, height: 60, borderRadius: 30 },
  name: { flex: 1, fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink },
  time: { fontFamily: Font, fontSize: 13, color: C.muted },
  car: { fontFamily: Font, fontSize: 13.5, color: C.muted },
  last: { fontFamily: Font, fontSize: 15, color: C.ink2 },
});
