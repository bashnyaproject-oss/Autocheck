import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Body, Filters } from '@/api/client';
import { Button } from '@/components/ui';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const BUDGET = [[0, 'Любой'], [1000000, 'до 1 млн'], [1500000, 'до 1,5 млн'], [2000000, 'до 2 млн'], [3000000, 'до 3 млн']] as const;
const YEARS = [[0, 'Любой'], [2016, 'от 2016'], [2018, 'от 2018'], [2020, 'от 2020'], [2022, 'от 2022']] as const;
const BODIES: [Body | '', string][] = [['', 'Любой'], ['suv', 'Кроссовер'], ['sedan', 'Седан'], ['hatch', 'Хэтчбек']];
const GEARS = [['', 'Любая'], ['Автомат', 'Автомат'], ['Робот', 'Робот'], ['Вариатор', 'Вариатор'], ['Механика', 'Механика']] as const;
const SORT = [['', 'Сначала ближе'], ['price', 'Сначала дешевле'], ['new', 'Сначала новее']] as const;

function Chips<T extends string | number>({ items, value, onChange }: { items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={st.chips}>
      {items.map(([v, label]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} style={[st.chip, value === v && st.chipOn]} accessibilityRole="radio" accessibilityState={{ checked: value === v }}>
          <Text style={[st.chipText, value === v && { color: '#fff' }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const { filters, setFilters } = useApp();
  const [f, setF] = useState<Filters>(filters);
  const apply = () => { setFilters(f); router.back(); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        <View style={st.block}>
          <Text style={st.h}>Марка или модель</Text>
          <TextInput style={st.input} value={f.q ?? ''} onChangeText={(q) => setF({ ...f, q })} placeholder="Например, Kia Rio" placeholderTextColor={C.muted} returnKeyType="search" onSubmitEditing={apply} autoFocus />
        </View>
        <View style={st.block}><Text style={st.h}>Бюджет</Text><Chips items={BUDGET} value={f.price_max ?? 0} onChange={(v) => setF({ ...f, price_max: v || undefined })} /></View>
        <View style={st.block}><Text style={st.h}>Год выпуска</Text><Chips items={YEARS} value={f.year_min ?? 0} onChange={(v) => setF({ ...f, year_min: v || undefined })} /></View>
        <View style={st.block}><Text style={st.h}>Кузов</Text><Chips items={BODIES} value={f.body ?? ''} onChange={(v) => setF({ ...f, body: (v || undefined) as Body | undefined })} /></View>
        <View style={st.block}><Text style={st.h}>Коробка</Text><Chips items={GEARS} value={f.gearbox ?? ''} onChange={(v) => setF({ ...f, gearbox: v || undefined })} /></View>
        <View style={st.block}><Text style={st.h}>Сортировка</Text><Chips items={SORT} value={f.sort ?? ''} onChange={(v) => setF({ ...f, sort: v || undefined })} /></View>
      </ScrollView>
      <View style={st.bar}>
        <Text style={st.clear} onPress={() => setF({})} accessibilityRole="button">Очистить всё</Text>
        <Button kind="brand" title="Показать машины" onPress={apply} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 14, paddingBottom: 120 },
  block: { borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, gap: 12 },
  h: { fontFamily: Font, fontSize: 18, fontWeight: '800', color: C.ink },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 14, fontSize: 16, fontFamily: Font, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.fill2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: Font, fontSize: 14.5, fontWeight: '600', color: C.ink },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff' },
  clear: { fontFamily: Font, fontSize: 15, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
});
