import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, Font, MaxContentWidth } from '@/constants/theme';

/** Tab screen: big title like Airbnb, scrollable content column. */
export function TabScreen({ title, children, refreshing, onRefresh, wide }: { title: string; children: ReactNode; refreshing?: boolean; onRefresh?: () => void; wide?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={[st.col, wide && { maxWidth: 1180 }]} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
        <Text style={st.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <View style={{ gap: 8, paddingVertical: 12 }}>
      <Text style={st.h}>{title}</Text>
      <Text style={st.p}>{text}</Text>
      {children}
    </View>
  );
}

export const STATUS_RU: Record<string, [string, string]> = {
  requested: ['Ждёт подтверждения', '#7A5A00'], confirmed: ['Подтверждён', '#0E7A3D'], declined: ['Отклонён', C.muted],
  done: ['Состоялся', C.ink], cancelled: ['Отменён', C.muted],
};

export const LISTING_STATUS: Record<string, [string, string]> = {
  awaiting_inspection: ['Ждём на осмотре', '#7A5A00'], published: ['Опубликовано', '#0E7A3D'], rejected: ['Оценка ниже 60 — не опубликовано', C.muted],
  sold: ['Продано', C.ink], removed: ['Снято с продажи', C.muted], expired: ['60 дней прошли', C.muted],
};

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 16 },
  title: { fontFamily: Font, fontSize: 32, fontWeight: '800', letterSpacing: -1, color: C.ink, marginBottom: 4 },
  h: { fontFamily: Font, fontSize: 19, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 15, color: C.muted, lineHeight: 21 },
});
