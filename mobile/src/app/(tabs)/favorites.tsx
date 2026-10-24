import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import type { Listing } from '@/api/types';
import { ListingPhoto } from '@/components/listing-card';
import { Button, GradePill, T } from '@/components/ui';
import { C, MaxContentWidth, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function FavoritesScreen() {
  const router = useRouter();
  const { liked, pass, toggleLike } = useApp();
  const [all, setAll] = useState<Listing[]>([]);
  useEffect(() => {
    api.feed().then(setAll);
  }, []);
  const list = liked.map((id) => all.find((l) => l.id === id)).filter(Boolean) as Listing[];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.col}>
        <T v="h1">Избранное</T>
        {!list.length ? (
          <View style={{ gap: 12 }}>
            <T v="muted">Смахните машину вправо в подборе — она появится здесь.</T>
            <Button kind="grey" title="К подбору" onPress={() => router.navigate('/')} />
          </View>
        ) : (
          list.map((l) => (
            <Pressable key={l.id} style={st.row} onPress={() => router.push(`/car/${l.id}`)} accessibilityRole="button">
              <View style={st.thumb}><ListingPhoto l={l} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h3" numberOfLines={1}>{l.make} {l.model}, {l.year}</T>
                <T v="muted">{l.km.toLocaleString('ru-RU')} км · {l.distanceKm} км</T>
                <T style={{ fontWeight: '800', fontSize: 17 }}>{rub(l.price)}</T>
                <Pressable onPress={() => toggleLike(l.id)} hitSlop={8}><T v="small" style={{ color: C.link }}>Убрать</T></Pressable>
              </View>
              {pass.active ? <GradePill grade={l.grade} compact /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 14 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  thumb: { width: 120, borderRadius: 14, overflow: 'hidden' },
});
