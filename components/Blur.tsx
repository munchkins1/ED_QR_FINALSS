import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Minimal shape of `expo-blur`'s BlurView that we rely on, defined locally so
 * the optional native module needs no `any`.
 */
type BlurViewComponent = React.ComponentType<{
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;

/**
 * Load expo-blur defensively. It is a native module, so a build compiled
 * before it was added (e.g. an older development build) throws on require.
 * Catching that lets glass surfaces fall back to a plain translucent View
 * instead of crashing the whole app at startup. In Expo Go it always loads.
 */
let BlurView: BlurViewComponent | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-blur') as { BlurView?: BlurViewComponent };
  BlurView = mod.BlurView ?? null;
} catch {
  BlurView = null;
}

export const hasBlur = BlurView !== null;

type Props = {
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Blur surface that mirrors expo-blur's API but renders a plain View when the
 * native module is unavailable. Callers layer a translucent overlay + border
 * on top, so the fallback still reads as frosted glass.
 */
export default function Blur({ intensity, tint, style, children }: Props) {
  if (BlurView) {
    const BV = BlurView;
    return (
      <BV intensity={intensity} tint={tint ?? 'dark'} style={style}>
        {children}
      </BV>
    );
  }
  return <View style={style}>{children}</View>;
}
