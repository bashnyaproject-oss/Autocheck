import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, type Access, type Body, type Facets, type Filters } from '@/api/client';
import { C, Font } from '@/constants/theme';

export const SORTS: [string, string, boolean?][] = [
  ['', 'Сначала свежие'], ['price_asc', 'Сначала дешевле'], ['price_desc', 'Сначала дороже'], ['year_desc', 'Сначала новее'],
  ['km_asc', 'Меньше пробег'], ['distance', 'Ближе ко мне'], ['grade_desc', 'Лучшая оценка', true], ['below_market', 'Ниже рынка', true],
];
const BODIES: [Body, string][] = [['suv', 'Кроссовер / внедорожник'], ['sedan', 'Седан'], ['hatch', 'Хэтчбек / универсал']];
const GEARS: [string, string][] = [['auto', 'Любой автомат'], ['Автомат', 'Классический автомат'], ['Робот', 'Робот'], ['Вариатор', 'Вариатор'], ['Механика', 'Механика']];
const DRIVES: [string, string][] = [['Передний', 'Передний'], ['Полный', 'Полный'], ['Задний', 'Задний']];
const FUELS: [string, string][] = [['Бензин', 'Бензин'], ['Дизель', 'Дизель'], ['Гибрид', 'Гибрид'], ['Электро', 'Электро']];
const PRICE_PRESETS = [1000000, 1500000, 2000000, 2500000, 3000000];
const KM: [number, string][] = [[30000, 'до 30 тыс'], [60000, 'до 60 тыс'], [90000, 'до 90 тыс'], [120000, 'до 120 тыс']];
const mln = (n: number) => (n / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';

let facetsCache: Facets | null = null;
export function useFacets() {
  const [f, setF] = useState<Facets | null>(facetsCache);
  useEffect(() => { if (!facetsCache) api.facets().then((x) => { facetsCache = x; setF(x); }).catch(() => undefined); }, []);
  return f;
}

/** Live number of cars for a filter draft (debounced). */
export function useCount(f: Filters) {
  const [n, setN] = useState<number | null>(null);
  const key = JSON.stringify(f);
  useEffect(() => {
    const t = setTimeout(() => api.count(f).then((r) => setN(r.total)).catch(() => undefined), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return n;
}

function Chip({ on, label, onPress, locked, count }: { on: boolean; label: string; onPress: () => void; locked?: boolean; count?: number }) {
  return (
    <Pressable onPress={onPress} style={[st.chip, on && st.chipOn, locked && { opacity: 0.45 }]} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: locked }}>
      <Text style={[st.chipText, on && { color: '#fff' }]}>{locked ? '🔒 ' : ''}{label}{count != null ? <Text style={[st.count, on && { color: 'rgba(255,255,255,.6)' }]}>  {count}</Text> : null}</Text>
    </Pressable>
  );
}
function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={st.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={st.h}>{title}</Text>{right}</View>
      {children}
    </View>
  );
}
const toggle = <T,>(arr: T[] | undefined, v: T) => (arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v]);
const num = (s: string) => { const n = Number(s.replace(/\D/g, '')); return n || undefined; };

/** All search filters. Used as the mobile filter screen and as the desktop sidebar. */
export function FilterPanel({ value: f, onChange, access, showSort, onLocked }: { value: Filters; onChange: (f: Filters) => void; access: Access; showSort?: boolean; onLocked?: () => void }) {
  const facets = useFacets();
  const set = (p: Partial<Filters>) => onChange({ ...f, ...p });
  const [allMakes, setAllMakes] = useState(false);
  const makes = facets?.makes ?? [];
  const shownMakes = allMakes ? makes : makes.slice(0, 8);
  const models = makes.filter((m) => f.make?.includes(m.make)).flatMap((m) => m.models);
  const years = facets ? Array.from({ length: facets.year[1] - facets.year[0] + 1 }, (_, i) => facets.year[0] + i) : [];
  const full = access === 'full';

  return (
    <View>
      {showSort ? (
        <Section title="Сортировка">
          <View style={st.chips}>{SORTS.map(([k, label, needFull]) => <Chip key={k} on={(f.sort ?? '') === k} label={label} locked={needFull && !full} onPress={() => (needFull && !full ? onLocked?.() : set({ sort: k || undefined }))} />)}</View>
        </Section>
      ) : null}

      <Section title="Марка" right={makes.length > 8 ? <Text style={st.link} onPress={() => setAllMakes(!allMakes)}>{allMakes ? 'Свернуть' : `Все ${makes.length}`}</Text> : null}>
        <View style={st.chips}>{shownMakes.map((m) => <Chip key={m.make} on={!!f.make?.includes(m.make)} label={m.make} count={m.count} onPress={() => {
          const make = toggle(f.make, m.make);
          set({ make, model: f.model?.filter((x) => makes.some((mm) => make.includes(mm.make) && mm.models.some((md) => md.model === x))) });
        }} />)}</View>
      </Section>
      {models.length ? (
        <Section title="Модель">
          <View style={st.chips}>{models.map((m) => <Chip key={m.model} on={!!f.model?.includes(m.model)} label={m.model} count={m.count} onPress={() => set({ model: toggle(f.model, m.model) })} />)}</View>
        </Section>
      ) : null}

      <Section title="Цена, ₽">
        <View style={st.row2}>
          <TextInput style={st.input} placeholder="от" placeholderTextColor={C.muted} inputMode="numeric" value={f.price_min ? f.price_min.toLocaleString('ru-RU') : ''} onChangeText={(v) => set({ price_min: num(v) })} />
          <TextInput style={st.input} placeholder="до" placeholderTextColor={C.muted} inputMode="numeric" value={f.price_max ? f.price_max.toLocaleString('ru-RU') : ''} onChangeText={(v) => set({ price_max: num(v) })} />
        </View>
        <View style={st.chips}>{PRICE_PRESETS.map((p) => <Chip key={p} on={f.price_max === p && !f.price_min} label={`до ${mln(p)}`} onPress={() => set({ price_max: f.price_max === p ? undefined : p, price_min: undefined })} />)}</View>
      </Section>

      <Section title="Год выпуска">
        <View style={st.row2}>
          <View style={{ flex: 1, gap: 6 }}><Text style={st.small}>от</Text><View style={st.chips}>{years.map((y) => <Chip key={y} on={f.year_min === y} label={String(y)} onPress={() => set({ year_min: f.year_min === y ? undefined : y })} />)}</View></View>
        </View>
      </Section>

      <Section title="Пробег">
        <View style={st.chips}>{KM.map(([k, l]) => <Chip key={k} on={f.km_max === k} label={l} onPress={() => set({ km_max: f.km_max === k ? undefined : k })} />)}</View>
      </Section>

      <Section title="Кузов">
        <View style={st.chips}>{BODIES.map(([k, l]) => <Chip key={k} on={!!f.body?.includes(k)} label={l} onPress={() => set({ body: toggle(f.body, k) })} />)}</View>
      </Section>
      <Section title="Коробка">
        <View style={st.chips}>{GEARS.map(([k, l]) => <Chip key={k} on={!!f.gearbox?.includes(k)} label={l} onPress={() => set({ gearbox: k === 'auto' ? (f.gearbox?.includes('auto') ? [] : ['auto']) : toggle(f.gearbox?.filter((g) => g !== 'auto'), k) })} />)}</View>
      </Section>
      <Section title="Привод">
        <View style={st.chips}>{DRIVES.map(([k, l]) => <Chip key={k} on={!!f.drive?.includes(k)} label={l} onPress={() => set({ drive: toggle(f.drive, k) })} />)}</View>
      </Section>
      <Section title="Двигатель">
        <View style={st.chips}>{FUELS.map(([k, l]) => <Chip key={k} on={!!f.fuel?.includes(k)} label={l} onPress={() => set({ fuel: toggle(f.fuel, k) })} />)}</View>
      </Section>
      <Section title="Владельцев по ПТС">
        <View style={st.chips}>{([[1, 'Один'], [2, 'Не больше двух']] as const).map(([k, l]) => <Chip key={k} on={f.owners_max === k} label={l} onPress={() => set({ owners_max: f.owners_max === k ? undefined : k })} />)}</View>
      </Section>
      <Section title="Оценка осмотра" right={!full ? <Text style={st.small}>с доступом</Text> : null}>
        <View style={st.chips}>{([[72, 'Хорошая — от 72'], [85, 'Отличная — от 85']] as const).map(([k, l]) => <Chip key={k} on={f.grade_min === k} locked={!full} label={l} onPress={() => (!full ? onLocked?.() : set({ grade_min: f.grade_min === k ? undefined : k }))} />)}</View>
      </Section>
    </View>
  );
}

const st = StyleSheet.create({
  section: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.line, gap: 12 },
  h: { fontFamily: Font, fontSize: 16, fontWeight: '800', color: C.ink },
  small: { fontFamily: Font, fontSize: 13, color: C.muted },
  link: { fontFamily: Font, fontSize: 14, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.fill2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.night, borderColor: C.night },
  chipText: { fontFamily: Font, fontSize: 14, fontWeight: '600', color: C.ink },
  count: { fontFamily: Font, fontSize: 12.5, color: C.muted, fontWeight: '500' },
  row2: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, minWidth: 0, width: '48%', height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 14, fontSize: 15.5, fontFamily: Font, color: C.ink, backgroundColor: '#fff' },
});
