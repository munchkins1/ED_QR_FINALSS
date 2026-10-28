import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Minimal shape of `expo-linear-gradient`'s LinearGradient that we rely on.
 * Defined locally so the optional native module needs no `any`.
 */
type LinearGradientComponent = React.ComponentType<{
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;

/**
 * Load expo-linear-gradient defensively. It is a native module, so a build
 * compiled before it was added (e.g. an older development build) throws on
 * import. Catching that lets the UI fall back to a solid fill instead of
 * crashing the whole app at startup. In Expo Go it is always available.
 */
let LinearGradient: LinearGradientComponent | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-linear-gradient') as {
    LinearGradient?: LinearGradientComponent;
  };
  LinearGradient = mod.LinearGradient ?? null;
} catch {
  LinearGradient = null;
}

export const hasLinearGradient = LinearGradient !== null;

type Props = {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: readonly number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Gradient surface that mirrors expo-linear-gradient's API but renders a
 * solid first-stop fill when the native module is unavailable.
 */
export default function Gradient(props: Props) {
  if (LinearGradient) {
    const LG = LinearGradient;
    return <LG {...props} />;
  }
  return (
    <View style={[props.style, { backgroundColor: props.colors[0] }]}>
      {props.children}
    </View>
  );
}
