import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import AttendanceRecords from '@/components/AttendanceRecords';
import Dropdown from '@/components/Dropdown';
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
 * Correct Records (admin, spec Phase 5): correct/delete attendance for
 * ANY event. Same shared records UI as Monitor; admins see all events.
 */
export default function CorrectRecordsScreen() {
  const { user } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const onStatus = useRealtimeStatusToast(toast);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState<EventAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (!roleLoading && !isAdmin) {
    return <LockedView message="Only administrators can correct records." />;
  }

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Correct Reports</Text>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Admin Manual Override Mode</Text>
        </View>
        {loading ? (
          <Text style={styles.hint}>Loading events...</Text>
        ) : events.length === 0 ? (
          <Text style={styles.hint}>No events to correct yet.</Text>
        ) : (
          <>
            <View style={styles.selectorCard}>
              <Text style={styles.selectorTitle} numberOfLines={1}>
                {events.find((e) => e.id === selectedId)?.name ?? 'Select event'}
              </Text>
            </View>
            <Dropdown
              label="Event"
              value={selectedId}
              options={events.map((event) => ({ label: `${event.name} (${event.status})`, value: event.id }))}
              onChange={setSelectedId}
            />
            <AttendanceRecords records={records} loading={false} canEdit={false} overrideMode onChanged={loadRecords} />
          </>
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  hint: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  banner: {
    backgroundColor: COLORS.tone.warning.bg, borderWidth: 1, borderColor: COLORS.tone.warning.border,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, alignItems: 'center',
  },
  bannerText: { color: COLORS.tone.warning.fg, fontWeight: '700', fontSize: 13 },
  selectorCard: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 14, marginBottom: 10,
  },
  selectorTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
});



