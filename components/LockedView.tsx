import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

/**
 * Shown on screens a role cannot access. Combined with hidden tabs this
 * keeps role gating airtight even for deep links (spec section 2).
 */
type Props = {
  title?: string;
  message?: string;
};

export default function LockedView({
  title = 'Access Restricted',
  message = 'Your account does not have access to this screen.',
}: Props) {
  return (
    <View style={styles.container}>
      {/* Soft-glass card with an icon medallion (styling-only). */}
      <View style={styles.card}>
        <View style={styles.iconHalo}>
          <Ionicons name="lock-closed-outline" size={34} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 9,
    elevation: 4,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  iconHalo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
