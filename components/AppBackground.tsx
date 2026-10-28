import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  children: React.ReactNode;
};

/**
 * Global canvas background (styling-only): solid off-white #F8FAFC field.
 * No gradient, no glass — clean canvas so white cards pop with soft shadows.
 */
export default function AppBackground({ children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
});

