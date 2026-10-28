import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';

import StatusPill, { attendanceStatusTone } from '@/components/StatusPill';
import AnimatedPressable from '@/components/AnimatedPressable';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { fetchOwnHistory, type OwnAttendanceRecord } from '@/lib/campusqr/attendance';
import { listOwnAppeals, type AppealStatus } from '@/lib/campusqr/appeals';
import { formatDateTime } from '@/lib/campusqr/format';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';

/**
 * My Attendance — the signed-in student's own check-in history
 * (spec Phase 5). Live-refreshes via the shared realtime channel
 * with echo suppression right after a local mutation.
 */
export default function MyAttendanceScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const onStatus = useRealtimeStatusToast(toast);
  const [records, setRecords] = useState<OwnAttendanceRecord[]>([]);
  // One appeal per absent event (unique(student_id, event_id) in the DB):
  // maps event_id -> appeal status so each history row can show Pending /
  // Approved / Declined live instead of offering a second Appeal button.
  const [appealByEvent, setAppealByEvent] = useState<Record<string, AppealStatus>>({});
  const [loading, setLoading] = useState(true);
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const excused = records.filter((r) => r.status === 'excused').length;
  const total = records.length;
  const rate = total > 0 ? Math.round(((present + late + excused) / total) * 100) : 0;

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const rows = await fetchOwnHistory(user.id);
    setRecords(rows);
    // Appeal state per event: drives the per-row status line below and
    // refreshes live via the `appeals` realtime subscription.
    try {
      const appeals = await listOwnAppeals(user.id);
      const byEvent: Record<string, AppealStatus> = {};
      for (const appeal of appeals) {
        // The DB guarantees at most one row per event; newest load wins.
        byEvent[appeal.event_id] = appeal.status;
      }
      setAppealByEvent(byEvent);
    } catch {
      // Appeals table missing (pre-migration): history still renders.
    }
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useCampusRealtime(
    (change) => {
      // `attendance` → own check-in / auto-absent / appeal decision flips.
      // `events` → a teacher closing an event creates the absent row AND
      //   flips the event to closed (both gate the Appeal button).
      // `appeals` → our appeal reviewed / submitted elsewhere.
      if (
        change.table === 'attendance' ||
        change.table === 'events' ||
        change.table === 'appeals'
      ) {
        load();
      }
    },
    onStatus
  );

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Attendance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: 'THEME.danger' }]}>{absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#34D399' }]}>{rate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
        {loading ? (
          <Text style={styles.hint}>Loading your records...</Text>
        ) : records.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={44} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>You have no attendance records yet</Text>
            <Text style={styles.emptySub}>Scan an event QR code to record your first check-in</Text>
          </View>
        ) : (
          records.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.eventName}>{row.event?.name ?? 'Event'}</Text>
                <StatusPill label={row.status} tone={attendanceStatusTone(row.status)} />
              </View>
              <Text style={styles.meta}>{formatDateTime(row.recorded_at)}</Text>
              {row.status === 'absent' && row.event?.status === 'closed' ? (
                appealByEvent[row.event_id] ? (
                  <View
                    style={[
                      styles.appealState,
                      appealByEvent[row.event_id] === 'pending' && styles.appealPending,
                      appealByEvent[row.event_id] === 'approved' && styles.appealApproved,
                      appealByEvent[row.event_id] === 'rejected' && styles.appealRejected,
                    ]}
                    accessibilityRole="text"
                    accessibilityLabel={`Appeal ${appealByEvent[row.event_id]}`}
                  >
                    <Ionicons
                      name={
                        appealByEvent[row.event_id] === 'pending'
                          ? 'time-outline'
                          : appealByEvent[row.event_id] === 'approved'
                            ? 'checkmark-circle-outline'
                            : 'close-circle-outline'
                      }
                      size={16}
                      color={
                        appealByEvent[row.event_id] === 'pending'
                          ? '#B45309'
                          : appealByEvent[row.event_id] === 'approved'
                            ? '#166534'
                            : '#075985'
                      }
                    />
                    <Text
                      style={[
                        styles.appealStateText,
                        appealByEvent[row.event_id] === 'pending' && styles.appealPendingText,
                        appealByEvent[row.event_id] === 'approved' && styles.appealApprovedText,
                        appealByEvent[row.event_id] === 'rejected' && styles.appealRejectedText,
                      ]}
                    >
                      {appealByEvent[row.event_id] === 'pending'
                        ? 'Appeal pending review'
                        : appealByEvent[row.event_id] === 'approved'
                          ? 'Appeal approved — excused'
                          : 'Appeal declined'}
                    </Text>
                  </View>
                ) : (
                  <AnimatedPressable
                    style={styles.appealBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/campus/(tabs)/appeals',
                        params: { eventId: row.event_id, attendanceId: row.id },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Appeal this record"
                  >
                    <Ionicons name="mail-outline" size={16} color={COLORS.primaryDeep} />
                    <Text style={styles.appealText}>Appeal</Text>
                  </AnimatedPressable>
                )
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', paddingTop: 12 },
  hint: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    padding: 28, alignItems: 'center',
  },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.12)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.35)',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    padding: 16, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  eventName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: COLORS.textSecondary },
  appealBtn: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(30, 58, 138, 0.4)',
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
  },
  appealText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  appealState: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12,
  },
  appealPending: { borderColor: COLORS.tone.warning.border, backgroundColor: COLORS.tone.warning.bg },
  appealApproved: { borderColor: COLORS.tone.success.border, backgroundColor: COLORS.tone.success.bg },
  appealRejected: { borderColor: COLORS.tone.danger.border, backgroundColor: COLORS.tone.danger.bg },
  appealStateText: { fontSize: 14, fontWeight: '700' },
  appealPendingText: { color: COLORS.warning },
  appealApprovedText: { color: COLORS.success },
  appealRejectedText: { color: COLORS.danger },
});





