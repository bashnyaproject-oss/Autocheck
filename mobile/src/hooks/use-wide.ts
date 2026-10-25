import { Platform, useWindowDimensions } from 'react-native';

/** Desktop browser: top navigation, filter sidebar, wider grid. */
export function useWide() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= 1024;
}
