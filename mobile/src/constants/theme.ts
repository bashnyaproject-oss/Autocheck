import '@/global.css';

import { Platform } from 'react-native';

/** Monochrome premium look: white surfaces, black ink and black actions; colour only for the grade scale. */
export const C = {
  bg: '#FFFFFF',
  fill: '#F3F3F4',
  fill2: '#E5E7EA',
  line: '#EBECEF',
  ink: '#0B0B0C',
  ink2: '#3A3A3F',
  muted: '#86878D',
  brand: '#0B0B0C',
  night: '#0B0B0C',
  night2: '#17181B',
  night3: '#24262A',
  green: '#0B0B0C',
  link: '#2B6AEB',
  gosu: '#0D4CD3',
  warnSoft: '#FFF6DA',
  okSoft: '#E7F7EE',
} as const;

/** Grade scale: no red. Below 60 is never published. */
export function gradeColor(g: number) {
  return g >= 85 ? '#16A34A' : g >= 72 ? '#8DB82B' : '#E8B500';
}
export function gradeText(g: number) {
  return g >= 85 ? '#FFFFFF' : g >= 72 ? '#FFFFFF' : '#3A2E00';
}
export function gradeLabel(g: number) {
  return g >= 85 ? 'Отличное' : g >= 72 ? 'Хорошее' : 'Есть что учесть';
}

export const S = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const R = { s: 10, m: 14, l: 20, xl: 28 } as const;

export const Font = Platform.select({
  web: 'var(--font-display)',
  default: undefined,
});

export const rub = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
export const kmf = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' км';

export const MaxContentWidth = 640;
export const MaxGridWidth = 1180;
