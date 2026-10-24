import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'];

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast, bump } = useApp();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }), []);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState(2);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const d = new Date(days[day]);
    const [h, m] = TIMES[time].split(':').map(Number);
    d.setHours(h, m, 0, 0);
    setBusy(true);
    try {
      await api.book(id, d.toISOString(), note.trim() || undefined);
      bump();
      toast('Заявка отправлена продавцу');
      router.dismiss();
      router.navigate('/viewings');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Не получилось');
    }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={st.col}>
        <Text style={st.h}>Когда удобно посмотреть?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {days.map((d, i) => (
            <Pressable key={i} onPress={() => setDay(i)} style={[st.day, day === i && st.on]} accessibilityRole="radio" accessibilityState={{ checked: day === i }}>
              <Text style={[st.dow, day === i && { color: '#fff' }]}>{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</Text>
              <Text style={[st.num, day === i && { color: '#fff' }]}>{d.getDate()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={st.times}>
          {TIMES.map((t, i) => (
            <Pressable key={t} onPress={() => setTime(i)} style={[st.time, time === i && st.on]} accessibilityRole="radio" accessibilityState={{ checked: time === i }}>
              <Text style={[st.timeText, time === i && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={st.h}>Сообщение продавцу</Text>
        <TextInput style={st.input} value={note} onChangeText={setNote} multiline placeholder="Например: приеду с механиком, интересует торг" placeholderTextColor={C.muted} />
        <Text style={st.p}>Продавец подтвердит время или предложит другое — ответ придёт в «Сообщения». Точный адрес он пришлёт после подтверждения.</Text>
      </ScrollView>
      <View style={st.bar}><Button kind="brand" title="Отправить заявку" onPress={send} loading={busy} style={{ flex: 1 }} /></View>
    </View>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 120 },
  h: { fontFamily: Font, fontSize: 20, fontWeight: '800', color: C.ink },
  p: { fontFamily: Font, fontSize: 14, color: C.muted, lineHeight: 20 },
  day: { width: 64, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.fill2, alignItems: 'center', gap: 2 },
  on: { backgroundColor: C.ink, borderColor: C.ink },
  dow: { fontFamily: Font, fontSize: 13, color: C.muted, textTransform: 'capitalize' },
  num: { fontFamily: Font, fontSize: 20, fontWeight: '800', color: C.ink },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: C.fill2 },
  timeText: { fontFamily: Font, fontSize: 15, fontWeight: '700', color: C.ink },
  input: { minHeight: 90, borderRadius: 14, borderWidth: 1, borderColor: C.fill2, padding: 14, fontSize: 15.5, fontFamily: Font, color: C.ink, textAlignVertical: 'top' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff', flexDirection: 'row' },
});
