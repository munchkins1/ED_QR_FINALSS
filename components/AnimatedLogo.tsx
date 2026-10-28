import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Gradient from '@/components/Gradient';
import { DEPTH, GRADIENTS, NEUMO } from '@/constants/colors';

type Props = {
  size?: number;
  iconSize?: number;
  /** Disable the motion (e.g. reduced-motion / tests) — renders a static mark. */
  animated?: boolean;
};

/**
 * The app mark: a QR glyph inside a **rounded-square** (squircle) gradient
 * tile with the spec's motion (UI/UX §4) — it floats ±8px over 4s, pulses a
 * navy/powder-blue glow (~2.4s), and a light band sweeps across every 2.8s,
 * all clipped inside the rounded square. Built with core `Animated` (no new
 * deps). Motion stops on unmount; `animated={false}` renders the static tile.
 */
export default function AnimatedLogo({
  size = 88,
  iconSize = 44,
  animated = true,
}: Props) {
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 2800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    floatLoop.start();
    pulseLoop.start();
    // Small delay so the first sweep doesn't fire on mount.
    const t = setTimeout(() => sweepLoop.start(), 600);

    return () => {
      clearTimeout(t);
      floatLoop.stop();
      pulseLoop.stop();
      sweepLoop.stop();
    };
  }, [animated, float, pulse, sweep]);

  // Rounded-square corner radius (a squircle — ~26% of the size).
  const radius = Math.round(size * 0.26);
  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const shadowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.62],
  });
  const shadowRadius = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 26],
  });
  // Sweep travels from just off the left edge to just off the right edge.
  const sweepX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 1.3, size * 1.3],
  });

  return (
    <Animated.View
      style={[
        styles.glow,
        { borderRadius: radius + 4, transform: [{ translateY }] },
        animated && { shadowOpacity, shadowRadius },
      ]}
    >
      <Gradient
        colors={[...GRADIENTS.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.tile,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <Ionicons name="qr-code" size={iconSize} color="#FFFFFF" />
        {/* Specular sheen across the top of the tile (raised glass). */}
        <Gradient
          colors={DEPTH.sheenSoft}
          locations={[0, 0.6]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Moving light band — clipped to the rounded square. */}
        {animated && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: sweepX }, { skewX: '-18deg' }] },
            ]}
          >
            <Gradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sweepBand}
            />
          </Animated.View>
        )}
      </Gradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: NEUMO.title,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sweepBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 60,
  },
});

