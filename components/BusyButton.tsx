import { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import AnimatedPressable from '@/components/AnimatedPressable';
import Gradient from '@/components/Gradient';
import { COLORS, DEPTH, GRADIENTS } from '@/constants/colors';
import { THEME } from '@/constants/theme';

/**
 * Busy button with spinner label (spec: busy buttons with spinner label).
 * Wraps AnimatedPressable so the press/hover motion matches every other
 * interactive element; shows a spinner while `loading`.
 */
type Props = {
  title: string;
  loadingTitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme?: 'primary' | 'secondary';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Extra style merged LAST (e.g. scan screen idle/active fills). */
  style?: StyleProp<ViewStyle>;
};

export default memo(function BusyButton({
  title,
  loadingTitle,
  icon,
  theme = 'primary',
  onPress,
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const primary = theme === 'primary';
  // A caller-supplied `style` carries its own state fill (e.g. the scan
  // screen's idle/active Check In) — keep the flat fill there so that state
  // colour stays visible. Otherwise the primary CTA gets the vibrant
  // gradient + specular sheen (styling-only).
  const layered = primary && style == null;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      glowColor={primary ? COLORS.primary : COLORS.accent}
      pressScale={primary ? 0.97 : 0.98}
      accessibilityLabel={title}
      style={[
        styles.inner,
        primary ? styles.primaryFill : styles.secondaryFill,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {layered ? (
        <>
          <Gradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          />
          {/* Specular highlight across the top of the pill (raised edge). */}
          <Gradient
            colors={DEPTH.specularTop}
            locations={[0, 0.5]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheen}
          />
        </>
      ) : null}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={primary ? COLORS.textOnPrimary : COLORS.primary}
          style={styles.icon}
        />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={22}
          color={primary ? COLORS.textOnPrimary : COLORS.primary}
          style={styles.icon}
        />
      ) : null}
      <Text
        style={[
          styles.label,
          primary ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {loading ? loadingTitle ?? 'Working...' : title}
      </Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  inner: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  primaryFill: {
    backgroundColor: COLORS.primary,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  /** Absolute vibrant-gradient surface for the layered (no override) CTA. */
  gradientFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  /** Specular top sheen — reads as a raised, glossy pill. */
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '55%',
    borderRadius: 14,
  },
  secondaryFill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
  icon: {
    paddingRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryLabel: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: COLORS.primary,
  },
  disabled: {
    opacity: 0.55,
  },
});
