import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, type Message } from '@/api/client';
import { C, Font, MaxContentWidth } from '@/constants/theme';
import { useApp } from '@/state/app-state';

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useApp();
  const [title, setTitle] = useState('');
  const [listingId, setListingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const scroll = useRef<any>(null);

  const load = useCallback(async () => {
    try { const t = await api.thread(id); setTitle(t.title); setListingId(t.listing_id); setMessages(t.messages); } catch (e) { toast((e as Error).message); }
  }, [id, toast]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000); // simple polling; push notifications later
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    setMessages((m) => [...m, { id: 'local' + Date.now(), mine: true, system: false, text: t, at: new Date().toISOString() }]);
    try { await api.send(id, t); load(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title }} />
      {listingId ? <Pressable onPress={() => router.push(`/listing/${listingId}`)} style={st.carLink}><Text style={st.carLinkText}>Открыть объявление ›</Text></Pressable> : null}
      <ScrollView ref={scroll} contentContainerStyle={st.col} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {messages.map((m) => m.system ? (
          <Text key={m.id} style={st.system}>{m.text}</Text>
        ) : (
          <View key={m.id} style={[st.bubble, m.mine ? st.mine : st.theirs]}>
            <Text style={[st.text, m.mine && { color: '#fff' }]}>{m.text}</Text>
            <Text style={[st.time, m.mine && { color: 'rgba(255,255,255,.7)' }]}>{new Date(m.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        ))}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.bar}>
        <View style={st.barInner}>
          <TextInput style={st.input} value={text} onChangeText={setText} placeholder="Сообщение" placeholderTextColor={C.muted} onSubmitEditing={send} returnKeyType="send" />
          <Pressable onPress={send} style={st.send} accessibilityLabel="Отправить"><Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>↑</Text></Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  col: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 16, gap: 8 },
  carLink: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  carLinkText: { fontFamily: Font, fontSize: 14.5, fontWeight: '700', color: C.ink, textAlign: 'center' },
  system: { fontFamily: Font, fontSize: 13, color: C.muted, textAlign: 'center', marginVertical: 6 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.ink, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: C.fill, borderBottomLeftRadius: 6 },
  text: { fontFamily: Font, fontSize: 15.5, color: C.ink, lineHeight: 21 },
  time: { fontFamily: Font, fontSize: 11, color: C.muted, marginTop: 2, alignSelf: 'flex-end' },
  bar: { borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#fff' },
  barInner: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' },
  input: { flex: 1, height: 46, borderRadius: 23, backgroundColor: C.fill, paddingHorizontal: 16, fontSize: 15.5, fontFamily: Font, color: C.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
});
