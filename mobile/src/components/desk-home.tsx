import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { photoUrl, type Access, type Filters, type Listing } from '@/api/client';
import { C, Font, MaxGridWidth } from '@/constants/theme';

import { ListingCard } from './car';
import { GEARS, KMS, Opt, PRICES, RangeInput, SearchSuggest, offers, short, toggle, useCount, useFacets } from './filters';
import { ChevronDown, ChevronRight, SlidersHorizontal } from './icons';
import { Appear, PressScale } from './motion';

/*
 * Desktop home in the spirit of auto.ru's front page, in our black & white style:
 * big search, filter pills with dropdowns and «Показать N», service tiles, AI pick card,
 * popular makes with counts and the freshest inspected cars.
 */

function Pill({ label, active, open, onPress, children, width = 300 }: { label: string; active?: boolean; open: boolean; onPress: () => void; children: ReactNode; width?: number }) {
  return (
    <View style={{ zIndex: open ? 100 : 1 }}>
      <Pressable onPress={onPress} style={[st.pill, active && st.pillOn, open && st.pillOpen]} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[st.pillText, active && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
        <ChevronDown size={16} color={active ? '#fff' : C.ink} strokeWidth={2.2} style={open ? { transform: [{ rotate: '180deg' }] } : undefined} />
      </Pressable>
      {open ? <View style={[st.pop, { width }]}><ScrollView style={{ maxHeight: 340 }}>{children}</ScrollView></View> : null}
    </View>
  );
}

const TILES = [
  { img: 'ic-report', label: 'Отчёты', to: '/pass' },
  { img: 'ic-grade', label: 'Оценка', to: '/welcome' },
  { img: 'ic-inspect', label: 'Осмотр', to: '/sell' },
  { img: 'ic-sell', label: 'Продать', to: '/sell' },
] as const;

export function DeskHome({ filters, setFilters, access, fresh }: { filters: Filters; setFilters: (f: Filters) => void; access: Access; fresh: Listing[] | null }) {
  const router = useRouter();
  const facets = useFacets();
  const [d, setD] = useState<Filters>(filters);
  const [open, setOpen] = useState<string | null>(null);
  const [makeQ, setMakeQ] = useState('');
  const n = useCount(d);
  const total = facets ? facets.makes.reduce((a, m) => a + m.count, 0) : null;
  const tg = (k: string) => setOpen(open === k ? null : k);
  const set = (p: Partial<Filters>) => setD({ ...d, ...p });
  const apply = (f: Filters = d) => { setOpen(null); setFilters({ ...f, view: 'all' }); };
  const makes = facets?.makes ?? [];
  const models = makes.filter((m) => d.make?.includes(m.make)).flatMap((m) => m.models.map((md) => ({ ...md, make: m.make })));
  const years = Array.from({ length: (facets?.year[1] ?? 2026) - 2005 + 1 }, (_, i) => (facets?.year[1] ?? 2026) - i);
  const auth = (to: string) => (access === 'guest' && to !== '/welcome' ? `/auth?intent=${to === '/sell' ? 'sell' : 'buy'}` : to);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={st.page}>
      {open ? <Pressable onPress={() => setOpen(null)} style={st.backdrop} accessibilityLabel="Закрыть" /> : null}

      <Appear style={{ alignItems: 'center', gap: 10 }}>
        <Text style={st.h1}>Только осмотренные машины</Text>
        <Text style={st.lead}>
          В Москве и области <Text style={st.leadPill}>{total != null ? offers(total) : '…'}</Text> — каждое прошло осмотр, оценка от 60 до 100
        </Text>
      </Appear>

      <View style={{ zIndex: 60, gap: 16 }}>
        <SearchSuggest big value={d} onPick={(f) => apply(f)} placeholder="Найти, например «Камри» или «кроссовер до 2 млн»"
          right={<Pressable onPress={() => apply()} hitSlop={8} accessibilityLabel="Все фильтры"><SlidersHorizontal size={26} color={C.ink} strokeWidth={1.8} /></Pressable>} />

        <View style={st.pills}>
          <Pill label={d.make?.length ? d.make.join(', ') : 'Марка'} active={!!d.make?.length} open={open === 'make'} onPress={() => tg('make')}>
            <TextInput value={makeQ} onChangeText={setMakeQ} placeholder="Найти марку" placeholderTextColor={C.muted} style={st.popSearch} autoCorrect={false} />
            {makes.filter((m) => !makeQ || m.make.toLowerCase().includes(makeQ.toLowerCase())).map((m) => (
              <Opt key={m.make} label={m.make} count={m.count} on={!!d.make?.includes(m.make)} onPress={() => { const make = toggle(d.make, m.make); set({ make, model: d.model?.filter((x) => models.some((md) => make.includes(md.make) && md.model === x)) }); }} />
            ))}
          </Pill>
          <Pill label={d.model?.length ? d.model.join(', ') : 'Модель'} active={!!d.model?.length} open={open === 'model'} onPress={() => (d.make?.length ? tg('model') : tg('make'))}>
            {models.map((m) => <Opt key={m.make + m.model} label={`${m.make} ${m.model}`} count={m.count} on={!!d.model?.includes(m.model)} onPress={() => set({ model: toggle(d.model, m.model) })} />)}
          </Pill>
          <Pill label={d.year_min || d.year_max ? `${d.year_min ? `от ${d.year_min}` : ''} ${d.year_max ? `до ${d.year_max}` : ''}`.trim() : 'Год'} active={!!(d.year_min || d.year_max)} open={open === 'year'} onPress={() => tg('year')} width={320}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><Text style={st.popHead}>от</Text>{years.map((y) => <Opt key={y} multi={false} label={String(y)} on={d.year_min === y} onPress={() => set({ year_min: d.year_min === y ? undefined : y })} />)}</View>
              <View style={{ flex: 1 }}><Text style={st.popHead}>до</Text>{years.map((y) => <Opt key={y} multi={false} label={String(y)} on={d.year_max === y} onPress={() => set({ year_max: d.year_max === y ? undefined : y })} />)}</View>
            </View>
          </Pill>
          <Pill label={d.gearbox?.length ? GEARS.filter(([k]) => d.gearbox!.includes(k)).map(([, l]) => l).join(', ') : 'Коробка'} active={!!d.gearbox?.length} open={open === 'gear'} onPress={() => tg('gear')}>
            {GEARS.map(([k, l]) => <Opt key={k} label={l} on={!!d.gearbox?.includes(k)} onPress={() => set({ gearbox: k === 'auto' ? (d.gearbox?.includes('auto') ? [] : ['auto']) : toggle(d.gearbox?.filter((g) => g !== 'auto'), k) })} />)}
          </Pill>
          <Pill label={d.km_max ? `до ${short(d.km_max)} км` : 'Пробег'} active={!!d.km_max} open={open === 'km'} onPress={() => tg('km')}>
            {KMS.map((k) => <Opt key={k} multi={false} label={`до ${k.toLocaleString('ru-RU')} км`} on={d.km_max === k} onPress={() => { set({ km_max: d.km_max === k ? undefined : k }); setOpen(null); }} />)}
          </Pill>
          <Pill label={d.price_min || d.price_max ? `${d.price_min ? `от ${short(d.price_min)} ` : ''}${d.price_max ? `до ${short(d.price_max)}` : ''} ₽` : 'Цена'} active={!!(d.price_min || d.price_max)} open={open === 'price'} onPress={() => tg('price')} width={340}>
            <View style={{ flexDirection: 'row', gap: 8, padding: 8 }}>
              <RangeInput label="от" suffix="₽" value={d.price_min} onChange={(v) => set({ price_min: v })} />
              <RangeInput label="до" suffix="₽" value={d.price_max} onChange={(v) => set({ price_max: v })} />
            </View>
            {PRICES.filter((p) => p >= 800000).map((p) => <Opt key={p} multi={false} label={`до ${short(p)} ₽`} on={d.price_max === p} onPress={() => { set({ price_max: p }); setOpen(null); }} />)}
          </Pill>
          <View style={{ flex: 1 }} />
          <PressScale onPress={() => apply()} style={st.apply} accessibilityRole="button">
            <Text style={st.applyText}>{n == null ? 'Показать' : n ? `Показать ${offers(n)}` : 'Ничего не найдено'}</Text>
          </PressScale>
        </View>
      </View>

      <View style={st.services}>
        {TILES.map((t, i) => (
          <Appear key={t.label} delay={60 + i * 50}>
            <PressScale onPress={() => router.push(auth(t.to) as never)} style={st.tile} accessibilityRole="button">
              <View style={st.tileImg}><Image source={{ uri: photoUrl(`/photos/${t.img}.jpg`, 'small') }} style={{ width: '100%', height: '100%' }} contentFit="cover" /></View>
              <Text style={st.tileText}>{t.label}</Text>
            </PressScale>
          </Appear>
        ))}
        <Appear delay={260} style={{ flex: 1 }}>
          <PressScale onPress={() => router.push('/quiz')} style={st.ai} accessibilityRole="button">
            <View style={{ flex: 1, gap: 8, zIndex: 1 }}>
              <Text style={st.aiTitle}>Осмотрено AI — подберёт машину под ваши задачи</Text>
              <Text style={st.aiText}>5 вопросов · 1 минута · объясним, почему подходит</Text>
              <View style={st.aiBtn}><Text style={st.aiBtnText}>Пройти подбор</Text><ChevronRight size={16} color={C.night} strokeWidth={2.4} /></View>
            </View>
            <Image source={{ uri: photoUrl('/photos/ic-ai.jpg', 'small') }} style={st.aiImg} contentFit="cover" />
          </PressScale>
        </Appear>
      </View>

      <View style={{ gap: 22 }}>
        <View style={st.head}>
          <Text style={st.h2}>Популярные марки</Text>
          <PressScale onPress={() => apply({})} style={st.allBtn}><Text style={st.allText}>Все предложения</Text><ChevronRight size={18} color={C.ink} /></PressScale>
        </View>
        <View style={st.brands}>
          {makes.map((m) => (
            <Pressable key={m.make} onPress={() => apply({ make: [m.make] })} style={(s: { pressed: boolean; hovered?: boolean }) => [st.brand, s.hovered && { backgroundColor: C.fill }]}>
              <View style={st.mono}><Text style={st.monoText}>{m.make.slice(0, m.make.length <= 3 ? 3 : 2).toUpperCase()}</Text></View>
              <Text style={st.brandName}>{m.make}</Text>
              <Text style={st.brandCount}>{m.count}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 22 }}>
        <View style={st.head}>
          <Text style={st.h2}>Свежие осмотренные</Text>
          <PressScale onPress={() => apply({ sort: undefined })} style={st.allBtn}><Text style={st.allText}>Смотреть все</Text><ChevronRight size={18} color={C.ink} /></PressScale>
        </View>
        <View style={st.grid}>
          {fresh?.slice(0, 8).map((l, i) => <Appear key={l.id} delay={Math.min(i, 4) * 60}><ListingCard l={l} width={(Math.min(MaxGridWidth, 1280) - 64 - 3 * 20) / 4} /></Appear>)}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { width: '100%', maxWidth: MaxGridWidth, alignSelf: 'center', paddingHorizontal: 32, paddingTop: 56, paddingBottom: 100, gap: 44 },
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 } as object,
  h1: { fontFamily: Font, fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -2, color: C.ink, textAlign: 'center' },
  lead: { fontFamily: Font, fontSize: 18, color: C.muted, textAlign: 'center' },
  leadPill: { color: C.ink, fontWeight: '700', backgroundColor: C.fill, borderRadius: 8, paddingHorizontal: 8 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 999, paddingHorizontal: 20, backgroundColor: C.fill, maxWidth: 260 },
  pillOn: { backgroundColor: C.night },
  pillOpen: { borderWidth: 1.5, borderColor: C.ink },
  pillText: { fontFamily: Font, fontSize: 15.5, fontWeight: '700', color: C.ink },
  pop: { position: 'absolute', top: 56, left: 0, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 14 } },
  popSearch: { margin: 8, height: 42, borderRadius: 12, backgroundColor: C.fill, paddingHorizontal: 12, fontFamily: Font, fontSize: 15, color: C.ink, outlineStyle: 'none' } as object,
  popHead: { fontFamily: Font, fontSize: 12, fontWeight: '700', color: C.muted, paddingHorizontal: 12, paddingTop: 6, letterSpacing: 1 },
  apply: { height: 52, borderRadius: 999, backgroundColor: C.night, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: Font, color: '#fff', fontSize: 16, fontWeight: '800' },
  services: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },
  tile: { width: 150, alignItems: 'center', gap: 10 },
  tileImg: { width: 150, height: 150, borderRadius: 30, overflow: 'hidden', backgroundColor: C.fill },
  tileText: { fontFamily: Font, fontSize: 16, fontWeight: '600', color: C.ink },
  ai: { flex: 1, height: 150, borderRadius: 30, backgroundColor: C.night, padding: 24, flexDirection: 'row', overflow: 'hidden' },
  aiTitle: { fontFamily: Font, color: '#fff', fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4, maxWidth: 320 },
  aiText: { fontFamily: Font, color: 'rgba(255,255,255,.6)', fontSize: 14 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: 'auto' } as object,
  aiBtnText: { fontFamily: Font, fontSize: 14, fontWeight: '800', color: C.night },
  aiImg: { position: 'absolute', right: -10, top: -20, width: 200, height: 200 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h2: { fontFamily: Font, fontSize: 32, fontWeight: '800', letterSpacing: -1, color: C.ink },
  allBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.fill, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  allText: { fontFamily: Font, fontSize: 15.5, fontWeight: '800', color: C.ink },
  brands: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  brand: { width: '25%', flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14 },
  mono: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.fill2, alignItems: 'center', justifyContent: 'center' },
  monoText: { fontFamily: Font, fontSize: 12, fontWeight: '900', color: C.ink, letterSpacing: 0.5 },
  brandName: { fontFamily: Font, fontSize: 19, fontWeight: '600', color: C.ink },
  brandCount: { fontFamily: Font, fontSize: 15, color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
});
