import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AnimatedLogo from '@/components/AnimatedLogo';
import AnimatedPressable from '@/components/AnimatedPressable';
import { BTN, COLORS, RADIUS } from '@/constants/colors';
import { SHADOWS } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { defaultTabFor, useCampusRole } from '@/lib/campusqr/roles';

/**
 * Landing splash — press the pill button to go to Log In (tapping elsewhere does nothing).
 * Layout: 20%-larger mark centered top-middle, bold title + secondary
 * subtitle, high-contrast pill button near the bottom. On tap the brand
 * + pill glide up + fade while login fades in (campus/_layout `fade`)
 * for one smooth handoff.
 *
 * Already-signed-in users never see the pill: the splash instantly
 * forwards them to their default tab (covers cold starts with a
 * persisted session and the login->tabs replace race).
 */
export default function CampusLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { role, loading: roleLoading } = useCampusRole();
  const navigating = useRef(false);
  const didLeave = useRef(false);
  const forwarded = useRef(false);

  // Authed users skip the splash entirely: forward to the default tab as
  // soon as the session (and role) is ready. Guards the login->tabs
  // replace race and cold starts with a persisted session.
  useEffect(() => {
    if (forwarded.current || !session || roleLoading) return;
    forwarded.current = true;
    navigating.current = true;
    didLeave.current = true;
    router.replace(defaultTabFor(role));
  }, [session, role, roleLoading, router]);

  // 0 -> 1 on mount (staggered entrance), 0 -> 1 on tap (exit).
  const intro = useRef(new Animated.Value(0)).current;
  const pillIntro = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  // Subtle breathing scale on the pill so it reads as tappable.
  const pillPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(pillIntro, {
      toValue: 1,
      duration: 500,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pillPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pillPulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [intro, pillIntro, pillPulse]);

  // If the user backs out of login, restore the splash visible state.
  // Skipped after an authed auto-forward (forwarded stays latched) so the
  // pill can't re-arm while signed in.
  useFocusEffect(
    useCallback(() => {
      if (forwarded.current) return undefined;
      if (didLeave.current) {
        didLeave.current = false;
        navigating.current = false;
        enter.setValue(0);
        intro.setValue(1);
        pillIntro.setValue(1);
      }
      return undefined;
    }, [enter, intro, pillIntro])
  );

  // Tap to continue: navigate WITH the fade (not after it) so the splash
  // exit overlaps login's entrance — no blank frame between screens.
  // The exit is short (~180ms); the pill pulse is frozen on tap so the
  // button can't jump a frame before leaving.
  const handleEnter = () => {
    if (navigating.current) return;
    navigating.current = true;
    didLeave.current = true;
    pillPulse.stopAnimation();
    pillPulse.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    router.push('/campus/login');
  };

  // Entrance: rise -> 0. Exit: rise 0 -> -36. Added together.
  const introY = intro.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const pillIntroY = pillIntro.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const exitY = enter.interpolate({ inputRange: [0, 1], outputRange: [0, -36] });
  const headerY = Animated.add(introY, exitY);
  const footerY = Animated.add(pillIntroY, exitY);

  // Entrance: 0 -> 1. Exit: 1 -> 0. Multiplied together.
  const exitOpacity = enter.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const headerOpacity = Animated.multiply(intro, exitOpacity);
  const footerOpacity = Animated.multiply(pillIntro, exitOpacity);
  const exitScale = enter.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const pulseScale = pillPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const headerScale = exitScale;
  const footerScale = Animated.multiply(exitScale, pulseScale);

  return (
    <View style={styles.root}>
      <View style={[styles.column, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo (20% larger) + bold title + secondary subtitle, top-middle. */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerY }, { scale: headerScale }],
            },
          ]}
        >
          <AnimatedLogo size={115} iconSize={58} />
          <Text style={styles.appName}>School Attendance System</Text>
          <Text style={styles.tagline}>Fast &amp; Easy Attendance</Text>
        </Animated.View>

        {/* High-contrast pill inside a rounded white sheet (spec). */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: footerOpacity,
              transform: [{ translateY: footerY }, { scale: footerScale }],
            },
          ]}
        >
          <AnimatedPressable
            style={styles.pillButton}
            onPress={handleEnter}
            glowColor={COLORS.accent}
            accessibilityRole="button"
            accessibilityLabel="Tap to Continue to Log In"
          >
            <Text style={styles.pillText}>Tap to Continue</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary, // Deep Navy background
  },
  column: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  header: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 24,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  pillButton: {
    borderRadius: RADIUS.pill,
    minHeight: BTN.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent, // Emerald green
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  pillText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});


