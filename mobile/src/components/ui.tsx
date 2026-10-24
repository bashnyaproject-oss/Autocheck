import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { C, Font, R, S, gradeColor, gradeText } from '@/constants/theme';

type BtnKind = 'black' | 'green' | 'grey' | 'line' | 'gosu' | 'tid';

export function Button({ title, onPress, kind = 'black', disabled, loading, style, sub }: {
  title: string; onPress?: () => void; kind?: BtnKind; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; sub?: string;
}) {
  const bg = { black: C.ink, green: C.green, grey: C.fill, line: '#fff', gosu: C.gosu, tid: '#FFDD2D' }[kind];
  const fg = kind === 'grey' || kind === 'line' || kind === 'tid' ? C.ink : '#fff';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        st.btn,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        kind === 'line' && { borderWidth: 1.5, borderColor: C.fill2 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ alignItems: 'center' }}>
          <Text style={[st.btnText, { color: fg }]}>{title}</Text>
          {sub ? <Text style={[st.btnSub, { color: fg }]}>{sub}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

export function T({ children, style, v = 'body', numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; v?: keyof typeof tx; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[tx[v], style]}>{children}</Text>;
}

export function GradePill({ grade, compact }: { grade: number; compact?: boolean }) {
  return (
    <View style={[st.grade, { backgroundColor: gradeColor(grade) }, compact && { height: 26, paddingHorizontal: 8 }]}>
      <Text style={[st.gradeText, { color: gradeText(grade) }, compact && { fontSize: 13 }]}>{grade}</Text>
    </View>
  );
}

export function Tag({ children, kind = 'grey' }: { children: ReactNode; kind?: 'grey' | 'ok' | 'note' | 'dark' }) {
  const bg = { grey: C.fill, ok: C.okSoft, note: C.warnSoft, dark: C.ink }[kind];
  const fg = { grey: C.ink2, ok: '#0E7A3D', note: '#7A5A00', dark: '#fff' }[kind];
  return (
    <View style={[st.tag, { backgroundColor: bg }]}>
      <Text style={[st.tagText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[st.card, style]}>{children}</View>;
}

export function Row({ children, style, gap = S.s }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Rule({ kind, children }: { kind: 'ok' | 'pay'; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={[st.dot, { backgroundColor: kind === 'ok' ? C.green : C.brand }]}>
        <Text style={st.dotText}>{kind === 'ok' ? '✓' : '₽'}</Text>
      </View>
      <Text style={[tx.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

export const tx = StyleSheet.create({
  h1: { fontFamily: Font, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: C.ink },
  h2: { fontFamily: Font, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: C.ink },
  h3: { fontFamily: Font, fontSize: 17, fontWeight: '700', color: C.ink },
  body: { fontFamily: Font, fontSize: 15, lineHeight: 21, color: C.ink },
  muted: { fontFamily: Font, fontSize: 14, lineHeight: 20, color: C.muted },
  price: { fontFamily: Font, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: C.ink },
  small: { fontFamily: Font, fontSize: 13, color: C.muted },
});

const st = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: R.m, paddingHorizontal: S.xl, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: Font, fontSize: 16, fontWeight: '700' },
  btnSub: { fontFamily: Font, fontSize: 12, opacity: 0.85, marginTop: 1 },
  grade: { minWidth: 40, height: 32, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontFamily: Font, fontSize: 16, fontWeight: '800' },
  tag: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { fontFamily: Font, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: R.l, borderWidth: 1, borderColor: C.line, padding: S.l, gap: S.m },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  dotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
