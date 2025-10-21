
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeContext, useThemeManager } from '../hooks/useTheme';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const themeManager = useThemeManager();

  useEffect(() => {
    if (!themeManager.isLoading) {
      SplashScreen.hideAsync();
    }
  }, [themeManager.isLoading]);

  return (
    <ThemeContext.Provider value={themeManager}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/cleaner-signin" />
          <Stack.Screen name="auth/cleaner-signup" />
          <Stack.Screen name="supervisor" />
          <Stack.Screen name="cleaner" />
        </Stack>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}

export default function RootLayout() {
  return <RootLayoutContent />;
}
