import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Disable the entrance animation (reduced-motion / tests). */
  animated?: boolean;
  /** Stagger the entrance (ms) — useful when stacked above a header. */
  delay?: number;
};

/**
 * Shared screen entrance — ONE motion per screen (all other nested
 * entrances were removed): fades in and rises 12px over 300ms with an
 * ease-out cubic. The 90ms default delay overlaps the 250ms Stack fade
 * (starts mid-handoff) instead of stepping after it — same motion, no
 * double-step ghosting on tab switches.
 *
 * Built with core `Animated` (no new deps, native driver). Interpolations
 * are memoized so parent re-renders don't rebuild the animated nodes.
 */
function ScreenTransitionInner({
  children,
  style,
  animated = true,
  delay = 90,
}: Props) {
  const progress = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const t = setTimeout(() => anim.start(), delay);
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [animated, delay, progress]);

  const opacity = progress;
  const translateY = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
      }),
    [progress]
  );

  return (
    <Animated.View style={[style, { opacity }, { transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const ScreenTransition = memo(ScreenTransitionInner);

export default ScreenTransition;
