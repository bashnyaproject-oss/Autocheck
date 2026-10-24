import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import type { Listing } from '@/api/types';
import { DeckCard } from '@/components/listing-card';
import { SwipeDeck, type SwipeDir } from '@/components/swipe-deck';
import { Button, T } from '@/components/ui';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function FeedScreen() {
  const router = useRouter();
  const { pass, liked, toggleLike, toast } = useApp();
  const [items, setItems] = useState<Listing[] | null>(null);
  const [round, setRound] = useState(0);
  const deck = useRef<{ swipe: (dir: SwipeDir) => void } | null>(null);

  useEffect(() => {
    api.feed().then(setItems);
  }, [round]);

  const onSwipe = (l: Listing, dir: SwipeDir) => {
    if (dir === 'right' && !liked.includes(l.id)) {
      toggleLike(l.id);
      api.like(l.id, true);
      toast(`${l.make} ${l.model} — в избранном`);
    }
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.col}>
        <View style={st.head}>
          <Text style={st.brand}>осмотрено<Text style={{ color: C.brand }}>.</Text></Text>
          <Pressable onPress={() => router.push('/pass')} style={st.passChip} accessibilityRole="button">
            <Text style={st.passText}>{pass.active ? `Пропуск · ${pass.usedThisWeek}/${pass.weeklyLimit}` : 'Показать оценки'}</Text>
          </Pressable>
        </View>
        <T v="muted" style={{ marginBottom: 12 }}>Только осмотренные машины с оценкой от 60. Вправо — в избранное.</T>
        <View style={st.deck}>
          {items ? (
            <SwipeDeck
              key={round}
              items={items}
              controlsRef={deck}
              onSwipe={onSwipe}
              renderCard={(l, canTap) => <DeckCard l={l} showGrade={pass.active} onOpen={() => canTap() && router.push(`/car/${l.id}`)} />}
              empty={
                <View style={st.empty}>
                  <T v="h2">На сегодня всё</T>
                  <T v="muted" style={{ textAlign: 'center' }}>Новые осмотренные машины появляются каждый день. Пришлём уведомление.</T>
                  <Button kind="grey" title="Посмотреть ещё раз" onPress={() => setRound((r) => r + 1)} />
                </View>
              }
            />
          ) : null}
        </View>
        <View style={st.controls}>
          <Pressable style={[st.round, st.small]} onPress={() => deck.current?.swipe('left')} accessibilityLabel="Дальше"><Text style={st.x}>✕</Text></Pressable>
          <Pressable style={[st.round, st.big]} onPress={() => deck.current?.swipe('right')} accessibilityLabel="В избранное"><Text style={st.heart}>♥</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  col: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, marginBottom: 6 },
  brand: { fontFamily: Font, fontSize: 28, fontWeight: '800', letterSpacing: -1.4, color: C.ink },
  passChip: { backgroundColor: C.fill, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  passText: { fontFamily: Font, fontSize: 14, fontWeight: '700', color: C.ink },
  deck: { flex: 1, minHeight: 380 },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 28, paddingVertical: 16 },
  round: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  small: { width: 60, height: 60 },
  big: { width: 72, height: 72 },
  x: { fontSize: 24, color: C.ink2, fontWeight: '700' },
  heart: { fontSize: 32, color: C.green },
});
