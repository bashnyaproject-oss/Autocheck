import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { C } from '@/constants/theme';
import { AppStateProvider } from '@/state/app-state';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.ink, text: C.ink } };

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <ThemeProvider value={theme}>
      <AppStateProvider>
        <Stack screenOptions={{ headerTintColor: C.ink, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="car/[id]" options={{ title: '', headerTransparent: false }} />
          <Stack.Screen name="pass" options={{ presentation: 'modal', title: 'Пропуск покупателя' }} />
        </Stack>
      </AppStateProvider>
    </ThemeProvider>
  );
}
