import { StyleSheet, View } from 'react-native';

import AppealsPanel from '@/components/AppealsPanel';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { COLORS } from '@/constants/colors';

/**
 * Appeals route — thin host around the shared AppealsPanel.
 *
 * Kept (hidden from every tab bar) so the student deep link from
 * My Attendance — the "Appeal" button on an absent row — keeps working:
 *   /campus/(tabs)/appeals?eventId=...&attendanceId=...
 * Staff reach the very same panel through the "Appeals" segment on the
 * Monitor tab instead of a dedicated tab.
 */
export default function AppealsScreen() {
  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
        <AppealsPanel />
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
});
