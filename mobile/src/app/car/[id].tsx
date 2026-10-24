import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import type { Listing } from '@/api/types';
import { ListingPhoto } from '@/components/listing-card';
import { Button, Card, GradePill, Row, Tag, T } from '@/components/ui';
import { C, Font, MaxContentWidth, gradeLabel, kmf, rub } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function CarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { pass, reports, openReport: open, liked, toggleLike, user, toast } = useApp();
  const [l, setL] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listing(id).then((x) => setL(x ?? null)).catch(() => setL(null));
  }, [id, pass.active]);
  if (!l) return null;

  const report = reports[l.id];
  const left = pass.weeklyLimit - pass.usedThisWeek;
  const isLiked = liked.includes(l.id);

  const openReport = async () => {
    setLoading(true);
    await open(l.id);
    setLoading(false);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={st.wrap} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: `${l.make} ${l.model}` }} />
      <View style={st.col}>
        <View style={st.photo}><ListingPhoto l={l} /></View>

        <View style={{ gap: 4 }}>
          <T v="h1">{l.make} {l.model}, {l.year}</T>
          <T v="muted">{kmf(l.km)} · {l.gearbox} · {l.distanceKm} км, {l.district}</T>
          <Text style={st.price}>{rub(l.price)}</Text>
        </View>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T v="h3">Осмотрено {l.inspectedAt}</T>
              <T v="muted">{l.inspectedBy}</T>
            </View>
            {pass.active ? <GradePill grade={l.grade} /> : <Tag kind="dark">🔒 оценка</Tag>}
          </Row>
          {pass.active ? <T v="body">Состояние: <Text style={{ fontWeight: '700' }}>{gradeLabel(l.grade)}</Text></T> : null}
          <Row>{l.flags.map((f) => <Tag key={f.text} kind={f.kind === 'ok' ? 'ok' : 'note'}>{f.text}</Tag>)}</Row>
        </Card>

        <Card>
          <T v="h3">Характеристики</T>
          {[['Двигатель', l.engine], ['Коробка', l.gearbox], ['Привод', l.drive], ['Владельцев', String(l.owners)], ['Продавец', l.sellerVerified ? 'Собственник, подтверждён' : '—']].map(([k, v]) => (
            <Row key={k} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><T v="muted">{k}</T><T>{v}</T></Row>
          ))}
        </Card>

        <Card>
          <T v="h3">Глубокий отчёт</T>
          {report ? (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 8 }}>
                {report.history.map((h) => (
                  <Row key={h.title} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <T style={{ flex: 1 }}>{h.title}</T>
                    <T v="muted" style={{ color: h.kind === 'ok' ? C.muted : '#7A5A00', textAlign: 'right', flex: 1.2 }}>{h.value}</T>
                  </Row>
                ))}
              </View>
              <T v="h3">Толщина покрытия, мкм</T>
              <Row>{report.paint.map((p) => <Tag key={p.part} kind={p.microns > 160 ? 'note' : 'grey'}>{p.part}: {p.microns}</Tag>)}</Row>
              <T v="h3">Осмотр по пунктам</T>
              {report.checklist.map((c) => (
                <View key={c.title}><T>{c.ok ? '✓' : '•'} {c.title}</T>{c.note ? <T v="muted" style={{ marginLeft: 18 }}>{c.note}</T> : null}</View>
              ))}
            </View>
          ) : pass.active ? (
            <View style={{ gap: 10 }}>
              <T v="muted">История по базам, толщиномер и чек-лист осмотра. На этой неделе осталось {left} из {pass.weeklyLimit}.</T>
              <Button title="Открыть отчёт" onPress={openReport} loading={loading} disabled={left <= 0} />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <T v="muted">Основные параметры открыты всем. Оценка и глубокий отчёт — с пропуском покупателя, до 30 машин в неделю.</T>
              <Button kind="green" title="Оформить пропуск" onPress={() => router.push('/pass')} />
            </View>
          )}
        </Card>

        <View style={{ gap: 10 }}>
          <Button
            title="Записаться на просмотр"
            onPress={async () => {
              if (!user) return router.push('/pass');
              await api.requestViewing(l.id);
              toast('Продавец получит заявку и предложит время');
            }}
          />
          <Button kind="line" title={isLiked ? 'В избранном ♥' : 'В избранное'} onPress={() => toggleLike(l.id)} />
          <T v="small" style={{ textAlign: 'center' }}>Покупка через приложение: эскроу и договор онлайн. Для покупателя — без доплат.</T>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingBottom: 48 },
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 16 },
  photo: { borderRadius: 20, overflow: 'hidden', backgroundColor: C.fill },
  price: { fontFamily: Font, fontSize: 26, fontWeight: '800', color: C.ink, marginTop: 4 },
});
