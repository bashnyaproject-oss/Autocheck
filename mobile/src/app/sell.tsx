import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError, type Body } from '@/api/client';
import { CardPayment } from '@/components/pay';
import { Button, Rule } from '@/components/ui';
import { C, Font, MaxContentWidth, rub } from '@/constants/theme';
import { COMMISSION, INSPECTION_PRICE, NOT_SOLD_FEE } from '@/constants/pricing';
import { useApp } from '@/state/app-state';

const STEPS = ['Откуда', 'Машина', 'Фото', 'Описание и цена', 'Где смотреть', 'Осмотр'];
type Draft = { url: string; title: string; year: string; km: string; price: string; body: Body; gearbox: string; engine: string; owners: string; description: string; district: string; point: string; photos: string[] };

function Field({ label, ...p }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput {...p} style={[st.input, p.multiline && { height: 130, paddingTop: 12, textAlignVertical: 'top' }]} placeholderTextColor={C.muted} />
    </View>
  );
}
function Choice<T extends string>({ items, value, onChange }: { items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([v, l]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[st.chip, value === v && st.chipOn]} accessibilityRole="radio" accessibilityState={{ checked: value === v }}>
          <Text style={[st.chipText, value === v && { color: '#fff' }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SellScreen() {
  const router = useRouter();
  const { me, toast, bump } = useApp();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [points, setPoints] = useState<{ id: string; name: string; addr: string }[]>([]);
  const [d, setD] = useState<Draft>({ url: '', title: '', year: '', km: '', price: '', body: 'sedan', gearbox: 'Автомат', engine: '', owners: '1', description: '', district: '', point: 'o1', photos: [] });
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  useEffect(() => { api.points().then((r) => setPoints(r.items)).catch(() => undefined); }, []);
  useEffect(() => { if (!me) router.replace('/auth'); }, [me, router]);

  const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
  const can = [
    true,
    !!(d.title.trim().includes(' ') && num(d.year) > 1980 && num(d.km) >= 0 && d.km !== ''),
    true,
    num(d.price) > 10000,
    d.district.trim().length > 1,
    true,
  ][step];

  const importLink = async () => {
    if (!d.url.trim()) return setStep(1);
    setBusy(true);
    try {
      const r = await api.importListing(d.url.trim());
      const x = r.data ?? {};
      const g = r.guess ?? {};
      set({
        title: x.title || [g.make, g.model].filter(Boolean).map((s) => (s!.length <= 3 ? s!.toUpperCase() : s![0].toUpperCase() + s!.slice(1))).join(' '),
        year: String(x.year ?? g.year ?? ''), km: x.km ? String(x.km) : '', price: x.price ? String(x.price) : '', engine: x.engine ?? '', description: x.description ?? '',
      });
      setNote(r.ok ? 'Данные из объявления подставлены — проверьте.' : `${r.error ?? 'Не удалось прочитать объявление'}. Заполните вручную.`);
    } catch (e) { setNote((e as Error).message); }
    setBusy(false);
    setStep(1);
  };

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 8 - d.photos.length, quality: 1 });
    if (r.canceled) return;
    const out: string[] = [];
    for (const a of r.assets) {
      // Shrink to 1280 px so each photo stays well under the 1 MB upload limit.
      const m = await manipulateAsync(a.uri, [{ resize: { width: 1280 } }], { compress: 0.6, format: SaveFormat.JPEG, base64: true });
      if (m.base64) out.push('data:image/jpeg;base64,' + m.base64);
    }
    set({ photos: [...d.photos, ...out].slice(0, 8) });
  };

  const [paying, setPaying] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  // Called by the card form: creates the listing, uploads photos, saves the card, books the inspection.
  const publish = async () => {
    try {
      const l = created ? { id: created } : await api.createListing({
        title: d.title.trim(), year: num(d.year), km: num(d.km), price: num(d.price), body: d.body, gearbox: d.gearbox, engine: d.engine || null,
        owners: num(d.owners) || 1, description: d.description.trim(), district: d.district.trim(), source_url: d.url.trim() || null,
      });
      if (!created) { setCreated(l.id); for (const p of d.photos) await api.addPhoto(l.id, p).catch(() => undefined); }
      await api.sellerCard();
      await api.bookInspection(l.id, d.point);
      bump();
    } catch (e) {
      throw new Error(e instanceof ApiError ? e.message : 'Не получилось');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.progress}><View style={[st.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
      <ScrollView contentContainerStyle={st.col} keyboardShouldPersistTaps="handled">
        <Text style={st.stepNo}>Шаг {step + 1} из {STEPS.length}</Text>
        <Text style={st.h1}>{['Где уже продаёте машину?', 'Расскажите о машине', 'Добавьте фото', 'Описание и цена', 'Где можно посмотреть?', 'Осмотр и условия'][step]}</Text>

        {step === 0 ? <>
          <Text style={st.p}>Вставьте ссылку на своё объявление на Авто.ру, Авито или Дроме — подставим данные. Нет объявления — пропустите.</Text>
          <Field label="Ссылка на объявление" value={d.url} onChangeText={(url) => set({ url })} placeholder="https://auto.ru/cars/used/sale/…" autoCapitalize="none" inputMode="url" />
        </> : null}

        {step === 1 ? <>
          {note ? <Text style={[st.p, { color: '#7A5A00' }]}>{note}</Text> : null}
          <Field label="Марка и модель" value={d.title} onChangeText={(title) => set({ title })} placeholder="Kia Rio" />
          <View style={st.two}>
            <View style={{ flex: 1 }}><Field label="Год" value={d.year} onChangeText={(year) => set({ year })} inputMode="numeric" placeholder="2020" /></View>
            <View style={{ flex: 1 }}><Field label="Пробег, км" value={d.km} onChangeText={(km) => set({ km })} inputMode="numeric" placeholder="54000" /></View>
          </View>
          <Text style={st.label}>Кузов</Text>
          <Choice items={[['sedan', 'Седан'], ['suv', 'Кроссовер'], ['hatch', 'Хэтчбек']] as const} value={d.body} onChange={(body) => set({ body })} />
          <Text style={st.label}>Коробка</Text>
          <Choice items={[['Автомат', 'Автомат'], ['Робот', 'Робот'], ['Вариатор', 'Вариатор'], ['Механика', 'Механика']] as const} value={d.gearbox} onChange={(gearbox) => set({ gearbox })} />
          <View style={st.two}>
            <View style={{ flex: 1.4 }}><Field label="Двигатель" value={d.engine} onChangeText={(engine) => set({ engine })} placeholder="1.6 л, 123 л.с." /></View>
            <View style={{ flex: 1 }}><Field label="Владельцев" value={d.owners} onChangeText={(owners) => set({ owners })} inputMode="numeric" /></View>
          </View>
        </> : null}

        {step === 2 ? <>
          <Text style={st.p}>До 8 фото. Первое станет обложкой. Можно пропустить — после осмотра добавим фото из протокола.</Text>
          <View style={st.photos}>
            {d.photos.map((p, i) => (
              <Pressable key={i} onPress={() => set({ photos: d.photos.filter((_, j) => j !== i) })} accessibilityLabel="Удалить фото">
                <Image source={{ uri: p }} style={st.photo} />
                <Text style={st.photoX}>✕</Text>
              </Pressable>
            ))}
            {d.photos.length < 8 ? <Pressable onPress={pick} style={[st.photo, st.addPhoto]} accessibilityRole="button"><Text style={{ fontSize: 30, color: C.muted }}>＋</Text><Text style={st.p}>Добавить</Text></Pressable> : null}
          </View>
        </> : null}

        {step === 3 ? <>
          <Field label="Цена, ₽" value={d.price} onChangeText={(price) => set({ price })} inputMode="numeric" placeholder="1290000" />
          {num(d.price) > 10000 ? <Text style={st.p}>{rub(num(d.price))}. Продадите через нас — комиссия {rub(COMMISSION(num(d.price)))}.</Text> : null}
          <Field label="Описание" value={d.description} onChangeText={(description) => set({ description })} multiline placeholder="Сколько владельцев, где обслуживалась, что меняли, почему продаёте" />
        </> : null}

        {step === 4 ? <>
          <Text style={st.p}>Покупатели видят только район. Точный адрес вы пришлёте сами, когда подтвердите просмотр.</Text>
          <Field label="Город" value="Москва" editable={false} />
          <Field label="Район или метро" value={d.district} onChangeText={(district) => set({ district })} placeholder="Сокол" />
        </> : null}

        {step === 5 && paying ? (
          <CardPayment amount={INSPECTION_PRICE} title="Осмотр машины" cta={`Оплатить осмотр ${rub(INSPECTION_PRICE)}`}
            note="Карта сохранится для расчёта по итогу: 1% при продаже через нас или 2 990 ₽, если не продали. Бета: оплата тестовая."
            onPay={publish} doneTitle="Записали на осмотр" doneText="Приезжайте в выбранный пункт с СТС, ПТС и паспортом. После осмотра машина сама появится в поиске."
            doneCta="Открыть мою машину" onDone={() => { toast('Объявление создано'); router.replace(`/host/${created}`); }} />
        ) : null}
        {step === 5 && !paying ? <>
          <Text style={st.label}>Где пройти осмотр — {rub(INSPECTION_PRICE)}</Text>
          {points.map((p) => (
            <Pressable key={p.id} onPress={() => set({ point: p.id })} style={[st.opt, d.point === p.id && st.optOn]} accessibilityRole="radio" accessibilityState={{ checked: d.point === p.id }}>
              <Text style={st.optTitle}>{p.name}</Text>
              <Text style={st.p}>{p.addr}</Text>
            </Pressable>
          ))}
          <View style={[st.opt, { gap: 10 }]}>
            <Text style={st.optTitle}>Условия</Text>
            <Rule kind="ok">Оценка от 60 — публикуем сразу после осмотра</Rule>
            <Rule kind="ok">Сейчас за размещение — 0 ₽</Rule>
            <Rule kind="pay">Продали покупателю из приложения — 1% ({rub(COMMISSION(num(d.price)))})</Rule>
            <Rule kind="pay">Сняли, продали мимо или 60 дней без продажи — {rub(NOT_SOLD_FEE)}</Rule>
            <Text style={st.p}>Привяжем карту: оплату по итогу спишем с неё по оферте. Бета: оплата тестовая.</Text>
          </View>
        </> : null}
      </ScrollView>

      <View style={st.bar}>
        <Text style={[st.back, step === 0 && { opacity: 0 }]} onPress={() => { if (paying) setPaying(false); else if (step > 0) setStep(step - 1); }} accessibilityRole="button">Назад</Text>
        {step === 0 ? <Button kind="black" title={d.url.trim() ? 'Загрузить' : 'Заполню сам'} onPress={importLink} loading={busy} />
          : step < 5 ? <Button kind="black" title="Дальше" onPress={() => setStep(step + 1)} disabled={!can} />
          : paying ? null : <Button kind="brand" title="Перейти к оплате" onPress={() => setPaying(true)} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  progress: { height: 4, backgroundColor: C.fill },
  progressFill: { height: 4, backgroundColor: C.ink },
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 22, gap: 14, paddingBottom: 120 },
  stepNo: { fontFamily: Font, fontSize: 13.5, color: C.muted, fontWeight: '600' },
  h1: { fontFamily: Font, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: C.ink },
  p: { fontFamily: Font, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  label: { fontFamily: Font, fontSize: 14, fontWeight: '700', color: C.ink },
  input: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.fill2, paddingHorizontal: 14, fontSize: 16, fontFamily: Font, color: C.ink, backgroundColor: '#fff' },
  two: { flexDirection: 'row', gap: 12 },
  chip: { borderWidth: 1, borderColor: C.fill2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: Font, fontSize: 14.5, fontWeight: '600', color: C.ink },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 104, height: 104, borderRadius: 14 },
  photoX: { position: 'absolute', top: 6, right: 8, color: '#fff', fontWeight: '800', textShadowColor: '#000', textShadowRadius: 4 },
  addPhoto: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.fill2, alignItems: 'center', justifyContent: 'center' },
  opt: { borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, gap: 2 },
  optOn: { borderColor: C.ink, borderWidth: 2 },
  optTitle: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff' },
  back: { fontFamily: Font, fontSize: 16, fontWeight: '700', color: C.ink, textDecorationLine: 'underline' },
});
