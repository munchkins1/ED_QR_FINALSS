import { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = TextInputProps & {
  /** LeftGlyph shown inside the field (Ionicons name). */
  icon: keyof typeof Ionicons.glyphMap;
  /** Outer pill — carries background / border / radius / padding. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Inner text element — flexes to fill the row. */
  inputStyle?: StyleProp<TextStyle>;
  iconSize?: number;
  iconColor?: string;
};

/**
 * Text field with a leading icon inside the placeholder row.
 * One shared motion language: no animation here (parent screens own the
 * entrance), just a stable row so every `placeholder="..."` input reads
 * the same — icon left, text fills the rest. Memoized so list renders
 * (Manage Users, AttendanceRecords) don't re-render every row on keystroke.
 */
function FieldWithIcon({
  icon,
  containerStyle,
  inputStyle,
  iconSize = 18,
  iconColor = COLORS.textSecondary,
  placeholderTextColor = COLORS.textPlaceholder,
  ...rest
}: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.icon} />
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={placeholderTextColor}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Soft-glass pill input (styling-only): extruded same-as-bg surface,
  // rounded pill border, soft shadow + light top edge for depth.
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 24,
    paddingVertical: 0,
    color: COLORS.textSecondary,
  },
});

export default memo(FieldWithIcon);
