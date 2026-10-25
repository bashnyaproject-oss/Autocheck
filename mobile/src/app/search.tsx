import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Filters } from '@/api/client';
import { AppliedTags, FilterPanel, SearchSuggest, offers, useCount } from '@/components/filters';
import { PressScale } from '@/components/motion';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

/** Phone filter screen: edit a draft, see the live count, apply. */
export default function SearchScreen() {
  const router = useRouter();
  const { filters, setFilters, access } = useApp();
  const [d, setD] = useState<Filters>(filters);
  const n = useCount(d);
  const apply = () => { setFilters(d); router.back(); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        <SearchSuggest value={d} onPick={setD} style={{ marginBottom: 14 }} />
        <AppliedTags f={d} onChange={setD} />
        <View style={{ height: 14 }} />
        <FilterPanel value={d} onChange={setD} access={access} onLocked={() => router.push('/pass')} />
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.bar}>
        <View style={st.barInner}>
          <Text style={st.reset} onPress={() => setD({})} accessibilityRole="button">Сбросить</Text>
          <PressScale onPress={apply} style={[st.show, n === 0 && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={st.showText}>{n == null ? 'Показать' : n === 0 ? 'Ничего не найдено' : `Показать ${offers(n)}`}</Text>
          </PressScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  search: { height: 52, borderRadius: 16, backgroundColor: C.fill, paddingHorizontal: 16, fontSize: 16, fontFamily: Font, color: C.ink },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line },
  barInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 20, paddingVertical: 12, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  reset: { fontFamily: Font, fontSize: 15.5, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
  show: { width: 250, height: 54, borderRadius: 16, backgroundColor: C.night, alignItems: 'center', justifyContent: 'center' },
  showText: { fontFamily: Font, color: '#fff', fontSize: 16, fontWeight: '800' },
});
