import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useUserStore } from '../src/store/userStore';
import { Colors } from '../src/theme/theme';

export default function RootLayout() {
  const loadData = useUserStore(s => s.loadData);

  useEffect(() => {
    loadData();
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
      </Stack>
    </>
  );
}
