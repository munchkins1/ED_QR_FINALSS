import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppBackground from '@/components/AppBackground';
import { COLORS } from '@/constants/colors';
import { installHarmlessErrorFilter } from '@/lib/errors';

// Swallow the dev-only "Unable to activate keep awake" rejection from Expo Go
// before the first screen mounts (see lib/errors.ts).
installHarmlessErrorFilter();

/**
 * Root layout. School Attendance System is the entire app now — the legacy
 * `(tabs)` home and the old root `login`/`register` screens have been
 * removed. The root route (`index`) forwards into the campus portal,
 * and all auth/role routing lives inside the `campus` area.
 *
 * `SafeAreaProvider` is mounted here so `useSafeAreaInsets()` returns real
 * values on native (notches, home indicators); without it every inset is 0
 * and content renders under the status bar.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppBackground>
        <Stack
          screenOptions={{
            headerShown: false,
            // Opaque base (matches AppBackground) so fades cross-dissolve
            // without flashing through to a transparent frame.
            contentStyle: { backgroundColor: COLORS.bgBase },
            animation: 'fade',
            animationDuration: 250,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="campus" />
        </Stack>
      </AppBackground>
    </SafeAreaProvider>
  );
}
