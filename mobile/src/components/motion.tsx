import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';

/** Fades and slides children in on mount; `delay` lets lists stagger. */
export function Appear({ children, delay = 0, dy = 18, style }: { children: ReactNode; delay?: number; dy?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that shrinks slightly under the finger. */
export function PressScale({ children, style, scale = 0.97, ...p }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: native, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...p} onPressIn={(e) => { to(scale); p.onPressIn?.(e); }} onPressOut={(e) => { to(1); p.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Black circle with a check that pops in — used after sign-in and payment. */
export function SuccessCheck({ size = 96, dark }: { size?: number; dark?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(v, { toValue: 1, useNativeDriver: native, speed: 10, bounciness: 14 }),
      Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: native })),
    ]).start();
  }, [v, ring]);
  const bg = dark ? '#fff' : '#0B0B0C';
  return (
    <Animated.View style={{ width: size * 1.8, height: size * 1.8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 2, borderColor: bg,
        opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }) }] }} />
      <Animated.View style={{ width: size, height: size, borderRadius: size, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: v }] }}>
        <Animated.Text style={{ color: dark ? '#0B0B0C' : '#fff', fontSize: size * 0.46, fontWeight: '900' }}>✓</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

/** Three dots that pulse while we "talk to the bank". */
export function Dots({ color = '#0B0B0C' }: { color?: string }) {
  const vs = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const a = Animated.loop(Animated.stagger(160, vs.map((v) => Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 320, useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: 320, useNativeDriver: native }),
    ]))));
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ flexDirection: 'row', gap: 8 }}>
      {vs.map((v, i) => <Animated.View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }} />)}
    </Animated.View>
  );
}
