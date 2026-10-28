import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import AnimatedPressable from '@/components/AnimatedPressable';
import AppealsPanel from '@/components/AppealsPanel';
import AttendanceRecords from '@/components/AttendanceRecords';
import Dropdown from '@/components/Dropdown';
import EmptyState from '@/components/EmptyState';
import LockedView from '@/components/LockedView';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  fetchEventRecords,
  type EventAttendanceRecord,
} from '@/lib/campusqr/attendance';
import { listVisibleEvents } from '@/lib/campusqr/events';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { useCampusRole } from '@/lib/campusqr/roles';
import type { EventRow } from '@/types/database';

/**
 * Monitor Attendance (staff, spec Phase 5): per-event records with
 * status pills, filters, and per-row Correct Records actions.
 * Live-refreshes with echo suppression after local mutations.
 */
export default function MonitorAttendanceScreen() {
  const { user } = useAuth();
  const { role, isStaff, isAdmin, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const onStatus = useRealtimeStatusToast(toast);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState<EventAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Monitor | Appeals segment — "Appeals" renders the shared AppealsPanel
  // (staff review queue) that previously lived in its own tab.
  const [section, setSection] = useState<'monitor' | 'appeals'>('monitor');

  const loadEvents = useCallback(async () => {
    const rows = await listVisibleEvents(role, user?.id ?? null);
    setEvents(rows);
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    setLoading(false);
  }, [role, user?.id, selectedId]);

  const loadRecords = useCallback(async () => {
    if (!selectedId) return;
    const rows = await fetchEventRecords(selectedId);
    setRecords(rows);
  }, [selectedId]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  useCampusRealtime(
    (change) => {
      if (change.table === 'attendance') loadRecords();
      if (change.table === 'events') loadEvents();
    },
    onStatus
  );

  if (!roleLoading && !isStaff) {
    return <LockedView message="Only teachers and administrators can monitor attendance." />;
  }

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
        <Text style={styles.title}>{isAdmin ? 'Overall Attendance' : 'Monitor Attendance'}</Text>
        
        {/* Balanced 50/50 Segment Control Wrapper */}
        <View style={styles.segment}>
          <AnimatedPressable
            style={[styles.segBtn, section === 'monitor' && styles.segActive]}
            outerStyle={styles.segOuterBtn}
            onPress={() => setSection('monitor')}
            accessibilityRole="button"
            accessibilityLabel="Monitor attendance"
          >
            <Text style={[styles.segText, section === 'monitor' && styles.segTextActive]}>Monitor</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.segBtn, section === 'appeals' && styles.segActive]}
            outerStyle={styles.segOuterBtn}
            onPress={() => setSection('appeals')}
            accessibilityRole="button"
            accessibilityLabel="Appeals queue"
          >
            <Text style={[styles.segText, section === 'appeals' && styles.segTextActive]}>Appeals</Text>
          </AnimatedPressable>
        </View>

        {section === 'appeals' ? (
          <AppealsPanel showTitle={false} />
        ) : loading ? (
          <View style={styles.emptyArea}>
            <Text style={styles.hint}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyArea}>
            <EmptyState
              icon="people-outline"
              title="No events to monitor yet."
              message="Create an event to start tracking attendance and check-ins."
            />
          </View>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <>
              <View style={styles.selectorCard}>
                <Text style={styles.selectorTitle} numberOfLines={1}>
                  {events.find((e) => e.id === selectedId)?.name ?? 'Select event'}
                </Text>
                {(() => {
                  const s = events.find((e) => e.id === selectedId)?.status;
                  const open = s === 'open';
                  return (
                    <View style={[styles.badge, open ? styles.badgeOpen : styles.badgeClosed]}>
                      <Text style={[styles.badgeText, open ? styles.badgeOpenText : styles.badgeClosedText]}>{s ?? ''}</Text>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.liveCard}>
                <Text style={styles.liveTitle}>
                  Live Check-ins: {records.length}
                </Text>
                <View style={styles.liveRow}>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.success }]}>
                      {records.filter((r) => r.status === 'present').length}
                    </Text>
                    <Text style={styles.liveLabel}>Present</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: '#EA580C' }]}>
                      {records.filter((r) => r.status === 'late').length}
                    </Text>
                    <Text style={styles.liveLabel}>Late</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.danger }]}>
                      {records.filter((r) => r.status === 'absent').length}
                    </Text>
                    <Text style={styles.liveLabel}>Absent</Text>
                  </View>
                  <View style={styles.liveCell}>
                    <Text style={[styles.liveNum, { color: COLORS.primary }]}>
                      {records.filter((r) => r.status === 'excused').length}
                    </Text>
                    <Text style={styles.liveLabel}>Excused</Text>
                  </View>
                </View>
              </View>
              <Dropdown
                label="Event"
                value={selectedId}
                options={events.map((event) => ({ label: `${event.name} (${event.status})`, value: event.id }))}
                onChange={setSelectedId}
              />
              <AttendanceRecords
                records={records}
                loading={false}
                canEdit={!isAdmin}
                readOnly={isAdmin}
                compactFilters
                onChanged={loadRecords}
              />
            </>
          </ScrollView>
        )}
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, paddingTop: 12, marginBottom: 8, textAlign: 'center' },
  
  // Segment Container
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  
  // Outer pressable container guarantees equal 50/50 flex column split
  segOuterBtn: {
    flex: 1,
  },
  
  // Inner button styles stretch to 100% of the half provided by segOuterBtn
  segBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 10,
  },
  
  segActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  segTextActive: { color: COLORS.textOnPrimary, fontWeight: '700' },
  
  hint: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  emptyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 48 },
  selectorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 16, marginBottom: 12,
  },
  selectorTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeOpen: { backgroundColor: COLORS.tone.success.bg, borderColor: COLORS.tone.success.border },
  badgeClosed: { backgroundColor: COLORS.tone.danger.bg, borderColor: COLORS.tone.danger.border },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgeOpenText: { color: COLORS.tone.success.fg },
  badgeClosedText: { color: COLORS.tone.danger.fg },
  liveCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 16, marginTop: 12, gap: 12,
  },
  liveTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  liveRow: { flexDirection: 'row', gap: 8 },
  liveCell: { flex: 1, alignItems: 'center' },
  liveNum: { fontSize: 20, fontWeight: '700' },
  liveLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});








