import '@/global.css';

import { Platform } from 'react-native';

/** Single light look, same palette as the website: ink, red brand, green money actions, grade scale. */
export const C = {
  bg: '#FFFFFF',
  fill: '#F1F2F4',
  fill2: '#E5E7EA',
  line: '#EBECEF',
  ink: '#141414',
  ink2: '#3A3A3F',
  muted: '#8B8C92',
  brand: '#DB3727',
  green: '#11A548',
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

export const MaxContentWidth = 560;
