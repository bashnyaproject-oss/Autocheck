import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { C } from '@/constants/theme';
import { AppStateProvider } from '@/state/app-state';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.brand, text: C.ink } };

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync(); }, []);
  return (
    <ThemeProvider value={theme}>
      <AppStateProvider>
        <Stack screenOptions={{ headerTintColor: C.ink, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerTitleStyle: { fontWeight: '800' }, animation: 'slide_from_right', contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="listing/[id]" options={{ title: '' }} />
          <Stack.Screen name="search" options={{ presentation: 'modal', title: 'Фильтры' }} />
          <Stack.Screen name="quiz" options={{ title: 'Подбор машины' }} />
          <Stack.Screen name="picks" options={{ title: 'Ваша подборка' }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal', title: 'Вход' }} />
          <Stack.Screen name="pass" options={{ presentation: 'modal', title: 'Доступ покупателя' }} />
          <Stack.Screen name="book/[id]" options={{ presentation: 'modal', title: 'Запись на просмотр' }} />
          <Stack.Screen name="thread/[id]" options={{ title: 'Сообщения' }} />
          <Stack.Screen name="sell" options={{ title: 'Продать машину' }} />
          <Stack.Screen name="host/[id]" options={{ title: 'Моя машина' }} />
        </Stack>
      </AppStateProvider>
    </ThemeProvider>
  );
}
