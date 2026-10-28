import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SHEET } from '@/constants/colors';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Soft-glass sheet (styling-only): ultra-soft cool-grey container with
 * rounded top corners + soft extruded shadow that tucks under the header.
 * No logic, no role checks — pure presentation wrapper for tab screens.
 */
export default function ScreenSheet({ children, style }: Props) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: SHEET.background,
    borderTopLeftRadius: SHEET.radius,
    borderTopRightRadius: SHEET.radius,
    marginTop: SHEET.overlap,
    paddingHorizontal: SHEET.padding,
    paddingTop: SHEET.padding,
    shadowColor: SHEET.shadowColor,
    shadowOffset: SHEET.shadowOffset,
    shadowOpacity: SHEET.shadowOpacity,
    shadowRadius: SHEET.shadowRadius,
    elevation: SHEET.elevation,
  },
});
