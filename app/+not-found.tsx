import { View, StyleSheet, Text } from 'react-native';
import { Link, Stack } from 'expo-router';

import { NEUMO, COLORS } from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.code}>404</Text>
          <Text style={styles.heading}>Page not found</Text>
          <Link href="/" style={styles.button}>
            Go back to Home screen!
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Light soft-glass theme (matches the rest of the app).
  container: {
    flex: 1,
    backgroundColor: NEUMO.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: NEUMO.surface,
    borderRadius: NEUMO.cardRadius,
    borderWidth: 1,
    borderTopColor: NEUMO.highlight,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: NEUMO.darkShadow,
    shadowOffset: NEUMO.extrudeOffset,
    shadowOpacity: NEUMO.extrudeOpacity,
    shadowRadius: NEUMO.extrudeRadius,
    elevation: 4,
  },
  code: {
    fontSize: 48,
    fontWeight: '800',
    color: NEUMO.title,
    letterSpacing: 2,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
    marginBottom: 18,
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
    overflow: 'hidden',
    textAlign: 'center',
  },
});
