import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, type Access, type Body, type Facets, type Filters } from '@/api/client';
import { C, Font, plural } from '@/constants/theme';

/*
 * Search filters in the spirit of auto.ru: compact fields (Марка → Модель, ranges «от–до»,
 * multi-selects with a summary), live counter «Показать N предложений», applied filters as tags,
 * and a search box that suggests makes and models while you type (Latin or Russian names).
 */

export const SORTS: [string, string, boolean?][] = [
  ['', 'По актуальности'], ['price_asc', 'Сначала дешевле'], ['price_desc', 'Сначала дороже'], ['year_desc', 'Сначала новее'],
  ['km_asc', 'По пробегу'], ['distance', 'По расстоянию'], ['grade_desc', 'По оценке осмотра', true], ['below_market', 'Ниже рынка', true],
];
const BODIES: [Body, string][] = [['sedan', 'Седан'], ['suv', 'Внедорожник / кроссовер'], ['hatch', 'Хэтчбек / универсал']];
const GEARS: [string, string][] = [['auto', 'Автомат (любой)'], ['Автомат', 'Гидроавтомат'], ['Робот', 'Робот'], ['Вариатор', 'Вариатор'], ['Механика', 'Механика']];
const DRIVES: [string, string][] = [['Передний', 'Передний'], ['Задний', 'Задний'], ['Полный', 'Полный']];
const FUELS: [string, string][] = [['Бензин', 'Бензин'], ['Дизель', 'Дизель'], ['Гибрид', 'Гибрид'], ['Электро', 'Электро']];
const PRICES = [500000, 800000, 1000000, 1300000, 1500000, 2000000, 2500000, 3000000, 4000000];
const KMS = [10000, 30000, 50000, 75000, 100000, 150000];
const RU: Record<string, string> = {
  тойота: 'Toyota', киа: 'Kia', кия: 'Kia', хендай: 'Hyundai', хёндай: 'Hyundai', хундай: 'Hyundai', хюндай: 'Hyundai', фольксваген: 'Volkswagen', фольц: 'Volkswagen', бмв: 'BMW',
  чери: 'Chery', черри: 'Chery', джили: 'Geely', хавал: 'Haval', хавейл: 'Haval', лада: 'Lada', ваз: 'Lada', мазда: 'Mazda', шкода: 'Skoda', сузуки: 'Suzuki', судзуки: 'Suzuki',
  камри: 'Camry', рав: 'RAV4', рио: 'Rio', поло: 'Polo', солярис: 'Solaris', крета: 'Creta', спортейдж: 'Sportage', спортаж: 'Sportage', тигуан: 'Tiguan', октавия: 'Octavia',
  веста: 'Vesta', джолион: 'Jolion', кулрей: 'Coolray', тигго: 'Tiggo', джимни: 'Jimny',
};
const fmt = (n: number) => n.toLocaleString('ru-RU');
const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн` : `${Math.round(n / 1000)} тыс.`);
const num = (s: string) => { const n = Number(s.replace(/\D/g, '')); return n || undefined; };
const toggle = <T,>(arr: T[] | undefined, v: T) => (arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v]);

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
export const offers = (n: number) => `${n} ${plural(n, ['предложение', 'предложения', 'предложений'])}`;

// ---------- search with suggestions ----------

type Suggestion = { make: string; model?: string; count: number };
export function suggest(text: string, facets: Facets | null): Suggestion[] {
  const t = text.trim().toLowerCase();
  if (!t || !facets) return [];
  const words = t.split(/\s+/).map((w) => Object.entries(RU).find(([ru]) => ru.startsWith(w) || w.startsWith(ru))?.[1]?.toLowerCase() ?? w);
  const out: (Suggestion & { score: number })[] = [];
  for (const m of facets.makes) {
    const mk = m.make.toLowerCase();
    const makeHit = words.some((w) => mk.startsWith(w));
    if (makeHit && words.length === 1) out.push({ make: m.make, count: m.count, score: 3 });
    for (const md of m.models) {
      const ml = md.model.toLowerCase();
      const modelHit = words.some((w) => ml.startsWith(w) || ml.split(/\s+/).some((p) => p.startsWith(w)));
      if (modelHit || (makeHit && (words.length > 1 ? words.slice(1).some((w) => ml.startsWith(w)) : true)))
        out.push({ make: m.make, model: md.model, count: md.count, score: modelHit ? 2 : 1 });
    }
  }
  return out.sort((a, b) => b.score - a.score || b.count - a.count).slice(0, 8);
}

/** Search field with a suggestion list under it. Picking a suggestion sets Марка/Модель. */
export function SearchSuggest({ value, onPick, onText, style, dark, placeholder }: { value: Filters; onPick: (f: Filters) => void; onText?: (q: string) => void; style?: object; dark?: boolean; placeholder?: string }) {
  const facets = useFacets();
  const [text, setText] = useState(value.q ?? '');
  const [focus, setFocus] = useState(false);
  const list = useMemo(() => suggest(text, facets), [text, facets]);
  const pick = (s: Suggestion) => {
    setText('');
    onPick({ ...value, q: undefined, make: [...new Set([...(value.make ?? []), s.make])], model: s.model ? [...new Set([...(value.model ?? []), s.model])] : value.model });
  };
  return (
    <View style={[{ zIndex: 30 }, style]}>
      <View style={[st.search, dark && { backgroundColor: C.night3 }]}>
        <Text style={[st.searchIcon, dark && { color: '#fff' }]}>⌕</Text>
        <TextInput value={text} onChangeText={(v) => { setText(v); onText?.(v); }} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 180)}
          onSubmitEditing={() => (list[0] ? pick(list[0]) : onPick({ ...value, q: text.trim() || undefined }))}
          placeholder={placeholder ?? 'Марка или модель'} placeholderTextColor={dark ? 'rgba(255,255,255,.55)' : C.muted}
          style={[st.searchInput, dark && { color: '#fff' }]} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
        {text ? <Text style={[st.clear, dark && { color: '#fff' }]} onPress={() => { setText(''); onText?.(''); }}>✕</Text> : null}
      </View>
      {focus && text.trim() ? (
        <View style={st.suggest}>
          {list.length ? list.map((s) => (
            <Pressable key={s.make + (s.model ?? '')} onPress={() => pick(s)} style={(s: { pressed: boolean; hovered?: boolean }) => [st.sRow, s.hovered && { backgroundColor: C.fill }]}>
              <Text style={st.sText}><Text style={{ fontWeight: '800' }}>{s.make}</Text>{s.model ? ` ${s.model}` : ''}</Text>
              <Text style={st.sCount}>{offers(s.count)}</Text>
            </Pressable>
          )) : <Text style={[st.sText, { padding: 14, color: C.muted }]}>Нет такой марки среди осмотренных машин</Text>}
        </View>
      ) : null}
    </View>
  );
}

// ---------- compact fields ----------

function Field({ label, value, open, onPress, disabled, children, onClear }: { label: string; value?: string; open: boolean; onPress: () => void; disabled?: boolean; children?: ReactNode; onClear?: () => void }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Pressable onPress={disabled ? undefined : onPress} style={[st.field, open && st.fieldOpen, disabled && { opacity: 0.45 }]} accessibilityRole="button" accessibilityState={{ expanded: open, disabled }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {value ? <Text style={st.fLabel}>{label}</Text> : null}
          <Text style={[st.fValue, !value && { color: C.muted, fontWeight: '500' }]} numberOfLines={1}>{value || label}</Text>
        </View>
        {value && onClear ? <Text style={st.fClear} onPress={onClear}>✕</Text> : <Text style={st.fArrow}>{open ? '▴' : '▾'}</Text>}
      </Pressable>
      {open ? <View style={st.menu}><ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>{children}</ScrollView></View> : null}
    </View>
  );
}
function Opt({ label, on, onPress, count, multi = true, locked }: { label: string; on: boolean; onPress: () => void; count?: number; multi?: boolean; locked?: boolean }) {
  return (
    <Pressable onPress={onPress} style={(s: { pressed: boolean; hovered?: boolean }) => [st.opt, s.hovered && { backgroundColor: C.fill }, locked && { opacity: 0.45 }]} accessibilityRole={multi ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }}>
      {multi ? <View style={[st.box, on && st.boxOn]}>{on ? <Text style={st.boxTick}>✓</Text> : null}</View> : null}
      <Text style={[st.optText, on && !multi && { fontWeight: '800' }]} numberOfLines={1}>{locked ? '🔒 ' : ''}{label}</Text>
      {count != null ? <Text style={st.optCount}>{count}</Text> : !multi && on ? <Text style={st.optCount}>✓</Text> : null}
    </Pressable>
  );
}
function RangeInput({ label, value, onChange, suffix }: { label: string; value?: number; onChange: (v?: number) => void; suffix?: string }) {
  return (
    <View style={[st.field, { flex: 1, minWidth: 0 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {value ? <Text style={st.fLabel}>{label}{suffix ? `, ${suffix}` : ''}</Text> : null}
        <TextInput value={value ? fmt(value) : ''} onChangeText={(v) => onChange(num(v))} placeholder={`${label}${suffix ? `, ${suffix}` : ''}`} placeholderTextColor={C.muted}
          inputMode="numeric" style={[st.fValue, st.rangeInput]} />
      </View>
      {value ? <Text style={st.fClear} onPress={() => onChange(undefined)}>✕</Text> : null}
    </View>
  );
}
const summary = (vals: string[] | undefined, map: [string, string][]) => (vals?.length ? vals.map((v) => map.find(([k]) => k === v)?.[1] ?? v).join(', ') : undefined);

/** All filters as compact fields. Used in the desktop sidebar and on the phone filter screen. */
export function FilterPanel({ value: f, onChange, access, onLocked }: { value: Filters; onChange: (f: Filters) => void; access: Access; showSort?: boolean; onLocked?: () => void }) {
  const facets = useFacets();
  const [open, setOpen] = useState<string | null>(null);
  const [makeQ, setMakeQ] = useState('');
  const set = (p: Partial<Filters>) => onChange({ ...f, ...p });
  const tg = (k: string) => setOpen(open === k ? null : k);
  const makes = facets?.makes ?? [];
  const shownMakes = makes.filter((m) => !makeQ || m.make.toLowerCase().startsWith(makeQ.toLowerCase()) || suggest(makeQ, facets).some((s) => s.make === m.make));
  const models = makes.filter((m) => f.make?.includes(m.make)).flatMap((m) => m.models.map((md) => ({ ...md, make: m.make })));
  const years = Array.from({ length: (facets?.year[1] ?? 2026) - 2005 + 1 }, (_, i) => (facets?.year[1] ?? 2026) - i);
  const full = access === 'full';

  return (
    <View style={{ gap: 10 }}>
      <Field label="Марка" value={f.make?.join(', ')} open={open === 'make'} onPress={() => tg('make')} onClear={() => set({ make: [], model: [] })}>
        <TextInput value={makeQ} onChangeText={setMakeQ} placeholder="Найти марку" placeholderTextColor={C.muted} style={st.menuSearch} autoCorrect={false} />
        {shownMakes.map((m) => <Opt key={m.make} label={m.make} count={m.count} on={!!f.make?.includes(m.make)} onPress={() => {
          const make = toggle(f.make, m.make);
          set({ make, model: f.model?.filter((x) => makes.some((mm) => make.includes(mm.make) && mm.models.some((md) => md.model === x))) });
        }} />)}
      </Field>
      <Field label={f.make?.length ? 'Модель' : 'Модель — сначала марка'} value={f.model?.join(', ')} open={open === 'model'} onPress={() => tg('model')} disabled={!f.make?.length} onClear={() => set({ model: [] })}>
        {models.map((m) => <Opt key={m.make + m.model} label={(f.make!.length > 1 ? m.make + ' ' : '') + m.model} count={m.count} on={!!f.model?.includes(m.model)} onPress={() => set({ model: toggle(f.model, m.model) })} />)}
      </Field>

      <View style={st.row}>
        <RangeInput label="Цена от" suffix="₽" value={f.price_min} onChange={(v) => set({ price_min: v })} />
        <RangeInput label="до" suffix="₽" value={f.price_max} onChange={(v) => set({ price_max: v })} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
        {PRICES.filter((p) => p >= 1000000).map((p) => (
          <Pressable key={p} onPress={() => set({ price_max: f.price_max === p ? undefined : p })} style={[st.quick, f.price_max === p && st.quickOn]}>
            <Text style={[st.quickText, f.price_max === p && { color: '#fff' }]}>до {short(p)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={st.row}>
        <Field label="Год от" value={f.year_min ? String(f.year_min) : undefined} open={open === 'ymin'} onPress={() => tg('ymin')} onClear={() => set({ year_min: undefined })}>
          {years.map((y) => <Opt key={y} multi={false} label={String(y)} on={f.year_min === y} onPress={() => { set({ year_min: y }); setOpen(null); }} />)}
        </Field>
        <Field label="до" value={f.year_max ? String(f.year_max) : undefined} open={open === 'ymax'} onPress={() => tg('ymax')} onClear={() => set({ year_max: undefined })}>
          {years.filter((y) => !f.year_min || y >= f.year_min).map((y) => <Opt key={y} multi={false} label={String(y)} on={f.year_max === y} onPress={() => { set({ year_max: y }); setOpen(null); }} />)}
        </Field>
      </View>

      <Field label="Пробег до, км" value={f.km_max ? `до ${fmt(f.km_max)} км` : undefined} open={open === 'km'} onPress={() => tg('km')} onClear={() => set({ km_max: undefined })}>
        {KMS.map((k) => <Opt key={k} multi={false} label={`до ${fmt(k)} км`} on={f.km_max === k} onPress={() => { set({ km_max: k }); setOpen(null); }} />)}
      </Field>

      <Field label="Кузов" value={summary(f.body, BODIES)} open={open === 'body'} onPress={() => tg('body')} onClear={() => set({ body: [] })}>
        {BODIES.map(([k, l]) => <Opt key={k} label={l} count={facets?.categories?.[k]} on={!!f.body?.includes(k)} onPress={() => set({ body: toggle(f.body, k) })} />)}
      </Field>
      <View style={st.row}>
        <Field label="Коробка" value={summary(f.gearbox, GEARS)} open={open === 'gear'} onPress={() => tg('gear')} onClear={() => set({ gearbox: [] })}>
          {GEARS.map(([k, l]) => <Opt key={k} label={l} on={!!f.gearbox?.includes(k)} onPress={() => set({ gearbox: k === 'auto' ? (f.gearbox?.includes('auto') ? [] : ['auto']) : toggle(f.gearbox?.filter((g) => g !== 'auto'), k) })} />)}
        </Field>
        <Field label="Привод" value={summary(f.drive, DRIVES)} open={open === 'drive'} onPress={() => tg('drive')} onClear={() => set({ drive: [] })}>
          {DRIVES.map(([k, l]) => <Opt key={k} label={l} on={!!f.drive?.includes(k)} onPress={() => set({ drive: toggle(f.drive, k) })} />)}
        </Field>
      </View>
      <View style={st.row}>
        <Field label="Двигатель" value={summary(f.fuel, FUELS)} open={open === 'fuel'} onPress={() => tg('fuel')} onClear={() => set({ fuel: [] })}>
          {FUELS.map(([k, l]) => <Opt key={k} label={l} on={!!f.fuel?.includes(k)} onPress={() => set({ fuel: toggle(f.fuel, k) })} />)}
        </Field>
        <Field label="Владельцев" value={f.owners_max ? (f.owners_max === 1 ? 'Один' : 'Не более двух') : undefined} open={open === 'own'} onPress={() => tg('own')} onClear={() => set({ owners_max: undefined })}>
          {([[1, 'Один'], [2, 'Не более двух']] as const).map(([k, l]) => <Opt key={k} multi={false} label={l} on={f.owners_max === k} onPress={() => { set({ owners_max: k }); setOpen(null); }} />)}
        </Field>
      </View>
      <Field label={full ? 'Оценка осмотра' : 'Оценка осмотра 🔒'} value={f.grade_min ? `от ${f.grade_min}` : undefined} open={open === 'grade'} onPress={() => (full ? tg('grade') : onLocked?.())} onClear={() => set({ grade_min: undefined })}>
        {([[72, 'Хорошая — от 72'], [85, 'Отличная — от 85']] as const).map(([k, l]) => <Opt key={k} multi={false} label={l} on={f.grade_min === k} onPress={() => { set({ grade_min: k }); setOpen(null); }} />)}
      </Field>
    </View>
  );
}

/** Selected filters as removable tags, like above auto.ru results. */
export function AppliedTags({ f, onChange }: { f: Filters; onChange: (f: Filters) => void }) {
  const tags: [string, Partial<Filters>][] = [];
  f.make?.forEach((m) => tags.push([m, { make: f.make!.filter((x) => x !== m), model: [] }]));
  f.model?.forEach((m) => tags.push([m, { model: f.model!.filter((x) => x !== m) }]));
  if (f.q) tags.push([`«${f.q}»`, { q: undefined }]);
  if (f.price_min || f.price_max) tags.push([`${f.price_min ? `от ${short(f.price_min)} ` : ''}${f.price_max ? `до ${short(f.price_max)}` : ''} ₽`, { price_min: undefined, price_max: undefined }]);
  if (f.year_min || f.year_max) tags.push([`${f.year_min ? `от ${f.year_min} ` : ''}${f.year_max ? `до ${f.year_max}` : ''} г.`, { year_min: undefined, year_max: undefined }]);
  if (f.km_max) tags.push([`до ${fmt(f.km_max)} км`, { km_max: undefined }]);
  f.body?.forEach((b) => tags.push([BODIES.find(([k]) => k === b)?.[1] ?? b, { body: f.body!.filter((x) => x !== b) }]));
  f.gearbox?.forEach((g) => tags.push([GEARS.find(([k]) => k === g)?.[1] ?? g, { gearbox: f.gearbox!.filter((x) => x !== g) }]));
  f.drive?.forEach((d) => tags.push([`${d} привод`, { drive: f.drive!.filter((x) => x !== d) }]));
  f.fuel?.forEach((d) => tags.push([d, { fuel: f.fuel!.filter((x) => x !== d) }]));
  if (f.owners_max) tags.push([f.owners_max === 1 ? 'Один владелец' : 'До 2 владельцев', { owners_max: undefined }]);
  if (f.grade_min) tags.push([`Оценка от ${f.grade_min}`, { grade_min: undefined }]);
  if (!tags.length) return null;
  return (
    <View style={st.tags}>
      {tags.map(([label, patch]) => (
        <Pressable key={label} onPress={() => onChange({ ...f, ...patch })} style={st.tag} accessibilityLabel={`Убрать фильтр ${label}`}>
          <Text style={st.tagText}>{label}</Text><Text style={st.tagX}>✕</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => onChange({ sort: f.sort, category: f.category })} style={[st.tag, { backgroundColor: 'transparent' }]}><Text style={[st.tagText, { textDecorationLine: 'underline' }]}>Сбросить всё</Text></Pressable>
    </View>
  );
}

/** «Сортировка: по актуальности ▾» */
export function SortSelect({ value, onChange, access, onLocked }: { value?: string; onChange: (v?: string) => void; access: Access; onLocked?: () => void }) {
  const [open, setOpen] = useState(false);
  const cur = SORTS.find(([k]) => k === (value ?? ''))?.[1] ?? SORTS[0][1];
  return (
    <View style={{ zIndex: 40 }}>
      <Pressable onPress={() => setOpen(!open)} style={st.sortBtn} accessibilityRole="button"><Text style={st.sortText}>{cur} {open ? '▴' : '▾'}</Text></Pressable>
      {open ? (
        <View style={st.sortMenu}>
          {SORTS.map(([k, l, needFull]) => {
            const locked = needFull && access !== 'full';
            return <Opt key={k} multi={false} locked={locked} label={l} on={(value ?? '') === k} onPress={() => { setOpen(false); if (locked) onLocked?.(); else onChange(k || undefined); }} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: 16, backgroundColor: C.fill, paddingHorizontal: 16 },
  searchIcon: { fontSize: 20, fontWeight: '700', color: C.ink },
  searchInput: { flex: 1, minWidth: 0, height: 54, fontFamily: Font, fontSize: 16, color: C.ink, outlineStyle: 'none' } as object,
  clear: { fontSize: 15, color: C.muted, padding: 6 },
  suggest: { position: 'absolute', top: 60, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  sRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  sText: { fontFamily: Font, fontSize: 15.5, color: C.ink },
  sCount: { fontFamily: Font, fontSize: 13.5, color: C.muted },
  row: { flexDirection: 'row', gap: 8 },
  field: { minHeight: 52, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'transparent' },
  fieldOpen: { borderColor: C.ink, backgroundColor: '#fff' },
  fLabel: { fontFamily: Font, fontSize: 11.5, color: C.muted, fontWeight: '600' },
  fValue: { fontFamily: Font, fontSize: 15, color: C.ink, fontWeight: '700' },
  rangeInput: { padding: 0, minHeight: 22, outlineStyle: 'none', width: '100%' } as object,
  fArrow: { fontSize: 12, color: C.muted },
  fClear: { fontSize: 13, color: C.muted, padding: 4 },
  menu: { marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', paddingVertical: 4, overflow: 'hidden' },
  menuSearch: { margin: 8, height: 40, borderRadius: 10, backgroundColor: C.fill, paddingHorizontal: 12, fontFamily: Font, fontSize: 14.5, color: C.ink, outlineStyle: 'none' } as object,
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  optText: { flex: 1, fontFamily: Font, fontSize: 15, color: C.ink },
  optCount: { fontFamily: Font, fontSize: 13, color: C.muted },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.fill2, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.night, borderColor: C.night },
  boxTick: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  quick: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  quickOn: { backgroundColor: C.night, borderColor: C.night },
  quickText: { fontFamily: Font, fontSize: 13, fontWeight: '700', color: C.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.fill, borderRadius: 999, paddingLeft: 14, paddingRight: 12, paddingVertical: 8 },
  tagText: { fontFamily: Font, fontSize: 14, fontWeight: '700', color: C.ink },
  tagX: { fontSize: 11, color: C.muted, fontWeight: '800' },
  sortBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  sortText: { fontFamily: Font, fontSize: 14.5, fontWeight: '800', color: C.ink },
  sortMenu: { position: 'absolute', top: 40, right: 0, width: 250, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
});
