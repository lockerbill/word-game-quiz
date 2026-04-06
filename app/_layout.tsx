import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useUserStore } from '../src/store/userStore';
import { useVoiceStore } from '../src/store/voiceStore';
import { Colors } from '../src/theme/theme';

export default function RootLayout() {
  const initAuth = useUserStore(s => s.initAuth);
  const loadVoiceSettings = useVoiceStore(s => s.loadSettings);

  useEffect(() => {
    initAuth();
    loadVoiceSettings();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/[mode]"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="game/results"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="version"
          options={{
            headerShown: true,
            title: 'Version Info',
            headerStyle: { backgroundColor: Colors.backgroundSecondary },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
    </>
  );
}
