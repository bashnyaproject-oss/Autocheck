import Svg, { Circle, Path } from 'react-native-svg';

// Icons: Lucide (lucide.dev) — one consistent 24px line set across the app.
// Body-type icons below are drawn in the same style (2px round strokes) because Lucide has one generic car.
export {
  ArrowUpDown, Award, BadgeCheck, CalendarClock, Camera, Car, Check, ChevronDown, ChevronLeft, ChevronRight, CircleQuestionMark,
  Gauge, Heart, LayoutGrid, LayoutList, Lock, MapPin, MessageCircle, Search, Share, ShieldCheck, SlidersHorizontal, Sparkles,
  UserRound, Wallet, X,
} from 'lucide-react-native';

type P = { size?: number; color?: string; strokeWidth?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });

export function SedanIcon({ size = 24, color = '#0B0B0C', strokeWidth = 1.8 }: P) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.8 16H3.5a1 1 0 0 1-1-1v-1.8a1.5 1.5 0 0 1 1.1-1.4L7 11l2.4-3.2A2 2 0 0 1 11 7h3.6a2 2 0 0 1 1.5.7L18.5 11l2 .5a1.5 1.5 0 0 1 1 1.4V15a1 1 0 0 1-1 1h-1.3" />
      <Path d="M9.2 16h5.6M7 11h11.5" />
      <Circle cx="7" cy="16" r="2.1" /><Circle cx="17" cy="16" r="2.1" />
    </Svg>
  );
}
export function SuvIcon({ size = 24, color = '#0B0B0C', strokeWidth = 1.8 }: P) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.8 16.5H3.5a1 1 0 0 1-1-1V11a2 2 0 0 1 .6-1.4l2.4-2.4A2 2 0 0 1 7 6.5h9.6a2 2 0 0 1 1.6.8l2.6 3.4c.3.4.4.8.4 1.2v3.6a1 1 0 0 1-1 1h-1.3" />
      <Path d="M9.2 16.5h5.6M3 11h18M7.5 4.5h8" />
      <Circle cx="7" cy="16.5" r="2.2" /><Circle cx="17" cy="16.5" r="2.2" />
    </Svg>
  );
}
export function HatchIcon({ size = 24, color = '#0B0B0C', strokeWidth = 1.8 }: P) {
  return (
    <Svg {...base(size)} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.8 16H3.5a1 1 0 0 1-1-1v-2a1.5 1.5 0 0 1 1.1-1.4l3.4-.8 2.6-3.2A2 2 0 0 1 11.1 7H17a2 2 0 0 1 1.7 1l2.5 4.3c.2.3.3.6.3 1V15a1 1 0 0 1-1 1h-1.3" />
      <Path d="M9.2 16h5.6M7 10.8h13" />
      <Circle cx="7" cy="16" r="2.1" /><Circle cx="17" cy="16" r="2.1" />
    </Svg>
  );
}
