import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { C, Font } from '@/constants/theme';

export type SwipeDir = 'left' | 'right';

/**
 * Tinder-style deck on core React Native (Animated + PanResponder), so it behaves the same
 * on iOS, Android and web without extra native modules.
 */
export function SwipeDeck<T extends { id: string }>({ items, renderCard, onSwipe, empty, controlsRef }: {
  items: T[];
  /** canTap() is false right after a drag, so releasing a swipe doesn't also open the card. */
  renderCard: (item: T, canTap: () => boolean) => ReactNode;
  onSwipe: (item: T, dir: SwipeDir) => void;
  empty: ReactNode;
  controlsRef?: React.MutableRefObject<{ swipe: (dir: SwipeDir) => void } | null>;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const pos = useRef(new Animated.ValueXY()).current;
  const moved = useRef(false);
  const canTap = () => !moved.current;
  const threshold = Math.min(140, width * 0.28);

  const finish = (dir: SwipeDir) => {
    const item = items[index];
    Animated.timing(pos, { toValue: { x: (dir === 'right' ? 1 : -1) * width * 1.2, y: 30 }, duration: 220, useNativeDriver: false }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
      if (item) onSwipe(item, dir);
    });
  };
  if (controlsRef) controlsRef.current = { swipe: finish };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        // capture: take the gesture from the tappable card underneath
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          moved.current = true;
          pos.setValue({ x: g.dx, y: g.dy * 0.2 });
        },
        onPanResponderRelease: (_, g) => {
          setTimeout(() => (moved.current = false), 120);
          if (g.dx > threshold) finish('right');
          else if (g.dx < -threshold) finish('left');
          else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, items, threshold, width],
  );

  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = pos.x.interpolate({ inputRange: [0, threshold], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pos.x.interpolate({ inputRange: [-threshold, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({ inputRange: [-threshold, 0, threshold], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });

  const top = items[index];
  const next = items[index + 1];
  if (!top) return <View style={st.wrap}>{empty}</View>;

  return (
    <View style={st.wrap}>
      {next ? (
        <Animated.View key={next.id} style={[st.card, { transform: [{ scale: nextScale }] }]} pointerEvents="none">
          {renderCard(next, () => false)}
        </Animated.View>
      ) : null}
      <Animated.View key={top.id} style={[st.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]} {...responder.panHandlers}>
        {renderCard(top, canTap)}
        <Animated.View style={[st.stamp, st.like, { opacity: likeOpacity }]} pointerEvents="none"><Text style={[st.stampText, { color: C.green }]}>В ИЗБРАННОЕ</Text></Animated.View>
        <Animated.View style={[st.stamp, st.nope, { opacity: nopeOpacity }]} pointerEvents="none"><Text style={[st.stampText, { color: C.ink2 }]}>ДАЛЬШЕ</Text></Animated.View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'stretch' },
  card: { position: 'absolute', top: 0, left: 0, right: 0 },
  stamp: { position: 'absolute', top: 28, borderWidth: 3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,.9)' },
  like: { left: 22, borderColor: C.green, transform: [{ rotate: '-10deg' }] },
  nope: { right: 22, borderColor: C.ink2, transform: [{ rotate: '10deg' }] },
  stampText: { fontFamily: Font, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
});
