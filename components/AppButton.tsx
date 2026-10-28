import { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';

import AnimatedPressable from '@/components/AnimatedPressable';
import Gradient from '@/components/Gradient';
import { COLORS, DEPTH, GRADIENTS } from '@/constants/colors';
import { THEME } from '@/constants/theme';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

export default memo(function AppButton({
  title,
  icon,
  theme,
  onPress,
  disabled = false,
}: Props) {
  const primary = theme === 'primary';
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      glowColor={primary ? COLORS.primary : COLORS.accent}
      pressScale={primary ? 0.97 : 0.98}
      accessibilityLabel={title}
      style={[
        styles.buttonInner,
        primary ? styles.primaryFill : styles.secondaryFill,
        disabled && styles.disabled,
      ]}
    >
      {primary ? (
        <>
          {/* Vibrant gradient surface + specular sheen (styling-only). */}
          <Gradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          />
          <Gradient
            colors={DEPTH.specularTop}
            locations={[0, 0.5]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.sheen}
          />
        </>
      ) : null}
      <Ionicons
        name={icon}
        size={22}
        color={primary ? COLORS.textOnPrimary : COLORS.primary}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          primary ? styles.primaryLabel : styles.secondaryLabel,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  buttonInner: {
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 14,
    position: 'relative',
  },
  primaryFill: {
    backgroundColor: COLORS.primary,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  gradientFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { paddingRight: 10 },
  label: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3, zIndex: 1 },
  primaryLabel: { fontWeight: '700', color: COLORS.textOnPrimary },
  secondaryLabel: { color: COLORS.primary },
  disabled: { opacity: 0.55 },
  // Interaction states
  primaryHover: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  secondaryHover: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  primaryActive: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    transform: [{ scale: 0.96 }],
    backgroundColor: COLORS.primary,
  },
  secondaryActive: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    transform: [{ scale: 0.96 }],
    backgroundColor: COLORS.surface,
  },
  btnDisabled: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    opacity: 0.5,
  },
});