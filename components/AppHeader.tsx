import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Gradient from '@/components/Gradient';
import { COLORS, GRADIENTS } from '@/constants/colors';

/**
 * Shared header for every CampusQR tab (styling-only refresh): vibrant
 * blue pill gradient bar + soft-extrude logo tile. No logic or routing.
 */
export default function AppHeader() {
  const insets = useSafeAreaInsets();

  return (
    <Gradient
      colors={GRADIENTS.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.bar, { paddingTop: insets.top }]}
    >
      <View style={styles.inner}>
        <View style={styles.logo}>
          <Ionicons name="qr-code" size={22} color={COLORS.textOnPrimary} />
        </View>
        <Text style={styles.appName} numberOfLines={1}>
          School Attendance System
        </Text>
      </View>
    </Gradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  appName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
  },
});





