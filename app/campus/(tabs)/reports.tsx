import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import EmptyState from '@/components/EmptyState';
import LockedView from '@/components/LockedView';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  PERIOD_OPTIONS,
  fetchAuditLog,
  fetchSummaries,
  summariesToCsv,
  type AuditLogEntry,
  type EventSummary,
  type Period,
} from '@/lib/campusqr/reports';
import { formatDate, formatDateTime, formatNumber } from '@/lib/campusqr/format';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { useCampusRole } from '@/lib/campusqr/roles';
import type { AttendanceStatus } from '@/types/database';

const STATUS_ORDER: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

/**
 * System Reports (admin, spec Phase 6): attendance counts per
 * event/period/status, CSV export via the Share sheet, and the
 * System Activity Log (audit_logs). Live-refreshes on realtime changes.
 */
export default function SystemReportsScreen() {
  const { user } = useAuth();
  const { role, isAdmin, isStaff, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const onStatus = useRealtimeStatusToast(toast);

  const [period, setPeriod] = useState<Period>('all');
  const [summaries, setSummaries] = useState<EventSummary[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchSummaries(role, user?.id ?? null, period);
      setSummaries(rows);
      if (isAdmin) {
        const log = await fetchAuditLog(100);
        setAudit(log);
      } else {
        setAudit([]);
      }
    } finally {
      setLoading(false);
    }
  }, [role, user?.id, period, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useCampusRealtime(
    (change) => {
      if (change.table === 'attendance' || change.table === 'events') load();
      if (change.table === 'audit_logs' && isAdmin) {
        fetchAuditLog(100).then(setAudit).catch(() => {});
      }
    },
    onStatus
  );

  if (!roleLoading && !isStaff) {
    return <LockedView message="Only teachers and administrators can view summaries." />;
  }

  const handleShare = async () => {
    if (summaries.length === 0) {
      toast.info('There is nothing to export yet.');
      return;
    }
    setSharing(true);
    try {
      await Share.share({
        title: 'School Attendance System report',
        message: summariesToCsv(summaries),
      });
    } catch {
      toast.error('Could not open the share sheet.');
    } finally {
      setSharing(false);
    }
  };

  const handleExportEvent = async (summary: EventSummary) => {
    setExportingId(summary.eventId);
    try {
      await Share.share({
        title: `${summary.name} — attendance report`,
        message: summariesToCsv([summary]),
      });
    } catch {
      toast.error('Could not open the share sheet.');
    } finally {
      setExportingId(null);
    }
  };

  const totals = summaries.reduce(
    (acc, s) => {
      acc.total += s.total;
      for (const status of STATUS_ORDER) acc.counts[status] += s.counts[status];
      return acc;
    },
    { total: 0, counts: { present: 0, late: 0, absent: 0, excused: 0 } as Record<AttendanceStatus, number> }
  );
  const [mode, setMode] = useState<'reports' | 'audit'>('reports');
  const gridColor = (s: AttendanceStatus) =>
    s === 'present' ? COLORS.success : s === 'late' ? '#EA580C' : s === 'absent' ? COLORS.danger : COLORS.primary;
  const rate = totals.total > 0 ? Math.round(((totals.counts.present + totals.counts.late) / totals.total) * 100) : 0;
  const title = isAdmin ? 'System Reports' : 'Summaries';

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{title}</Text>
          {isAdmin ? (
            <View style={styles.segment}>
              <AnimatedPressable
                style={[styles.segBtn, mode === 'reports' && styles.segActive]}
                outerStyle={styles.segOuterBtn}
                onPress={() => setMode('reports')}
                accessibilityRole="button"
              >
                <Text style={[styles.segText, mode === 'reports' && styles.segTextActive]}>Attendance Reports</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.segBtn, mode === 'audit' && styles.segActive]}
                outerStyle={styles.segOuterBtn}
                onPress={() => setMode('audit')}
                accessibilityRole="button"
              >
                <Text style={[styles.segText, mode === 'audit' && styles.segTextActive]}>Audit Logs</Text>
              </AnimatedPressable>
            </View>
          ) : null}
          {(!isAdmin || mode === 'reports') ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
                {PERIOD_OPTIONS.map((option) => {
                  const active = period === option.value;
                  return (
                    <AnimatedPressable
                      key={option.value}
                      style={[styles.periodChip, active && styles.periodChipActive]}
                      onPress={() => setPeriod(option.value)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.periodText, active && styles.periodTextActive]}>
                        {option.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>{isAdmin ? 'Overall System Metrics' : 'Overall Overview'}</Text>
                <AnimatedPressable
                  style={[styles.shareButton, sharing && styles.disabled]}
                  onPress={handleShare}
                  disabled={sharing}
                  accessibilityRole="button"
                >
                  <Text style={styles.shareText}>{sharing ? 'Sharing...' : 'Export CSV'}</Text>
                </AnimatedPressable>
              </View>
              <View style={styles.totalsCard}>
                <Text style={styles.cardTitle}>Total check-ins: {formatNumber(totals.total)} ({rate}% attendance rate)</Text>
                <View style={styles.grid4}>
                  {STATUS_ORDER.map((status) => (
                    <View key={status} style={styles.gridCell}>
                      <Text style={[styles.gridNum, { color: gridColor(status) }]}>{totals.counts[status]}</Text>
                      <Text style={styles.gridLabel}>{status}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {<Text style={styles.sectionTitle}>Event Breakdown</Text>}
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.hint}>Loading reports...</Text>
                </View>
              ) : summaries.length === 0 ? (
                <EmptyState
                  icon="bar-chart-outline"
                  title="No attendance data yet."
                  message="Check-ins will appear here once students start scanning."
                />
              ) : (
                <>
                  {summaries.map((summary) => (
                    <View key={summary.eventId} style={styles.card}>
                      <Text style={styles.cardTitle}>{summary.name}</Text>
                      <Text style={styles.hint}>{formatDate(summary.start)}</Text>
                      <View style={styles.grid4}>
                        {STATUS_ORDER.map((status) => (
                          <View key={status} style={styles.gridCell}>
                            <Text style={[styles.gridNum, { color: gridColor(status) }]}>{summary.counts[status]}</Text>
                            <Text style={styles.gridLabel}>{status}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.total}>Total: {formatNumber(summary.total)}</Text>
                        <AnimatedPressable
                          style={[styles.exportBtn, exportingId === summary.eventId && styles.disabled]}
                          onPress={() => handleExportEvent(summary)}
                          disabled={exportingId === summary.eventId}
                          accessibilityRole="button"
                          accessibilityLabel={`Export ${summary.name} as CSV`}
                        >
                          <Ionicons name="download-outline" size={16} color="THEME.onAccent" />
                          <Text style={styles.exportText}>
                            {exportingId === summary.eventId ? 'Exporting...' : 'Export CSV'}
                          </Text>
                        </AnimatedPressable>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : null}
          {isAdmin && mode === 'audit' ? (
            <>
              <Text style={styles.sectionTitle}>System Activity Log</Text>
              {audit.length === 0 ? (
                <Text style={styles.hint}>No audit activity yet.</Text>
              ) : (
                audit.map((entry) => (
                  <View key={entry.id} style={styles.logCard}>
                    <Text style={styles.logAction}>{entry.action ?? '(no action)'}</Text>
                    <Text style={styles.hint}>
                      {entry.actor ? `${entry.actor.full_name} (${entry.actor.email})` : 'System'} • {entry.entity ?? 'event'}
                    </Text>
                    <Text style={styles.hint}>{formatDateTime(entry.created_at)}</Text>
                  </View>
                ))
              )}
            </>
          ) : null}
        </ScrollView>
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  
  // Segment Switcher Container (Matches Monitor Attendance)
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: COLORS.borderSoft,
    padding: 4,
    marginHorizontal: 0,
  },
  segOuterBtn: {
    flex: 1,
  },
  segBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 10, // 👈 Changed from 999 to 10 for squarish shape
  },
  segActive: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 10,
  },
  segText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segTextActive: { color: COLORS.textOnPrimary, fontWeight: '700' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: 16, justifyContent: 'center',
    borderRadius: 12, backgroundColor: COLORS.textPrimary,
  },
  shareText: { fontSize: 13, fontWeight: '700', color: COLORS.textOnPrimary },
  disabled: { opacity: 0.6 },
  periodRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  periodChip: {
    minHeight: 40, paddingHorizontal: 14, justifyContent: 'center',
    borderRadius: 999, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
  },
  periodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.textOnPrimary },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  hint: { fontSize: 13, color: COLORS.textSecondary },
  totalsCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 16, gap: 12,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 16, gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  grid4: { flexDirection: 'row', gap: 8 },
  gridCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  gridNum: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  gridLabel: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  total: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: 40, paddingHorizontal: 14, justifyContent: 'center',
    borderRadius: 12, backgroundColor: COLORS.textPrimary,
  },
  exportText: { fontSize: 13, fontWeight: '700', color: COLORS.textOnPrimary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  logCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 16, gap: 4,
  },
  logAction: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
});





