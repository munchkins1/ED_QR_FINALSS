import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import AnimatedPressable from '@/components/AnimatedPressable';
import FieldWithIcon from '@/components/FieldWithIcon';
import { useToast } from '@/components/CampusToast';
import { COLORS, SPACING, RADIUS, BTN } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  listAppealableEvents,
  listOwnAppeals,
  listStaffQueue,
  reviewAppeal,
  submitAppeal,
  type AppealRow,
  type AppealStatus,
  type AppealableEvent,
} from '@/lib/campusqr/appeals';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { useCampusRole } from '@/lib/campusqr/roles';

type Filter = 'all' | AppealStatus;

export default function AppealsPanel({ showTitle = true }: { showTitle?: boolean } = {}) {
  const { user } = useAuth();
  const { role, isStudent, isStaff, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const onStatus = useRealtimeStatusToast(toast);
  const params = useLocalSearchParams<{ eventId?: string; attendanceId?: string }>();

  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<AppealRow[]>([]);
  const [appealable, setAppealable] = useState<AppealableEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const canSubmit = !roleLoading && (isStudent || role === null);
  const canReview = !roleLoading && isStaff;

  const load = useCallback(async () => {
    if (!user?.id || roleLoading) return;
    if (canSubmit) {
      setRows(await listOwnAppeals(user.id));
      setAppealable(await listAppealableEvents(user.id));
    } else if (isStaff) {
      setRows(await listStaffQueue(user.id, role!));
    }
  }, [user?.id, roleLoading, canSubmit, isStaff, role]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useCampusRealtime(
    (change) => {
      if (
        change.table === 'appeals' ||
        change.table === 'attendance' ||
        change.table === 'events'
      ) {
        load();
      }
    },
    onStatus
  );

  useEffect(() => {
    if (!params.eventId) return;
    if (appealable.some((event) => event.event_id === params.eventId)) {
      setSelectedEvent(params.eventId);
    }
  }, [params.eventId, appealable]);

  const counts = {
    pending: rows.filter((a) => a.status === 'pending').length,
    approved: rows.filter((a) => a.status === 'approved').length,
    rejected: rows.filter((a) => a.status === 'rejected').length,
  };
  const visible = filter === 'all' ? rows : rows.filter((a) => a.status === filter);
  /** Appeal status → semantic tone (fg = text, bg = pill fill, border = hairline). */
  const APPEAL_TONE: Record<AppealStatus, { fg: string; bg: string; border: string }> = {
    pending: { fg: '#EA580C', bg: COLORS.tone.warning.bg, border: COLORS.tone.warning.border },
    approved: { fg: COLORS.success, bg: COLORS.tone.success.bg, border: COLORS.tone.success.border },
    rejected: { fg: COLORS.danger, bg: COLORS.tone.danger.bg, border: COLORS.tone.danger.border },
  };
  const statusColor = (s: AppealStatus) => APPEAL_TONE[s].fg;

  const handleSubmit = async () => {
    if (!user?.id) return;
    const pick = appealable.find((event) => event.event_id === selectedEvent);
    if (!pick) { toast.error('Choose an absent event first.'); return; }
    if (!reason.trim()) { toast.error('Please explain your appeal.'); return; }
    setSubmitting(true);
    try {
      const { error } = await submitAppeal({
        studentId: user.id,
        eventId: pick.event_id,
        attendanceId: pick.attendance_id,
        reason,
      });
      if (error) { toast.error(error); return; }
      toast.success('Appeal submitted.');
      setReason(''); setSelectedEvent(''); load();
    } finally { setSubmitting(false); }
  };

  const handleReview = (item: AppealRow, approved: boolean) => {
    const note = (feedback[item.id] ?? '').trim();
    Alert.alert(
      approved ? 'Approve appeal' : 'Decline appeal',
      approved
        ? `Mark ${item.student?.full_name ?? 'this student'} as Excused for "${item.event?.name ?? 'this event'}"?`
        : `Keep the Absent mark for ${item.student?.full_name ?? 'this student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approved ? 'Approve' : 'Reject',
          style: approved ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await reviewAppeal(
              item.id,
              approved ? 'approved' : 'rejected',
              note || null,
              item.attendance_id
            );
            if (error) { toast.error(error); return; }
            toast.success(
              approved
                ? 'Appeal approved - record is now Excused.'
                : 'Appeal declined - record stays Absent.'
            );
            load();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {showTitle ? <Text style={styles.title}>Appeals</Text> : null}
      {canSubmit && (
        <AnimatedPressable style={styles.submit} accessibilityRole="button" accessibilityLabel="Submit New Appeal" onPress={handleSubmit} disabled={submitting} glowColor={COLORS.primary}>
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : '+ Submit New Appeal'}</Text>
        </AnimatedPressable>
      )}
      {canSubmit && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Absent event</Text>
          {appealable.length === 0 ? (
            <Text style={styles.emptyHint}>
              You have no absent records to appeal. Only closed events where
              you were marked Absent can be appealed — once per event.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>
              {appealable.map((event) => (
                <AnimatedPressable key={event.event_id} style={[styles.eventChip, selectedEvent === event.event_id && styles.eventChipActive]} onPress={() => setSelectedEvent(event.event_id)} accessibilityRole="button" accessibilityLabel={event.name} glowColor={COLORS.accent}>
                  <Text style={[styles.eventChipText, selectedEvent === event.event_id && styles.eventChipTextActive]} numberOfLines={1}>{event.name}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          )}
          <Text style={styles.formLabel}>Explanation</Text>
          <FieldWithIcon
            icon="chatbox-ellipses-outline"
            containerStyle={styles.reasonInput}
            inputStyle={styles.reasonText}
            iconColor={COLORS.textPlaceholder}
            value={reason}
            onChangeText={setReason}
            placeholder="Why were you marked absent in error?"
            placeholderTextColor={COLORS.textPlaceholder}
            multiline
          />
        </View>
      )}

      {/* Tightly grouped metrics & filters container */}
      <View style={styles.filterSection}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#EA580C' }]}>{counts.pending}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{counts.approved}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>{counts.rejected}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Rejected</Text>
          </View>
        </View>

        {/* Horizontal Scrollable Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((option) => {
            const active = filter === option;
            const glow = option === 'all' ? COLORS.primary : APPEAL_TONE[option].fg;
            return (
              <AnimatedPressable key={option} style={[styles.pill, active && { backgroundColor: glow, borderColor: glow }]} onPress={() => setFilter(option)} accessibilityRole="button" accessibilityLabel={option} glowColor={glow}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{option === 'all' ? 'All' : option}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {visible.length === 0 ? (
        <View style={styles.emptyArea}>
          <Text style={[styles.emptyHint, styles.emptyHintCenter]}>
            {canSubmit
              ? 'Your submitted appeals will appear here.'
              : 'No appeals match this filter.'}
          </Text>
        </View>
      ) : (
      <ScrollView style={styles.flex} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visible.map((item) => {
          const color = statusColor(item.status);
          const tone = APPEAL_TONE[item.status];
          // Name and reason are kept strictly separate: the name gets its
          // own line and the reason renders in a labeled block below it, so
          // the two can never visually merge into one awkward string.
          const studentName = (
            item.student?.full_name ||
            item.student?.email ||
            ''
          ).trim();
          const trimmedReason = (item.reason ?? '').trim();
          return (
            <View key={item.id} style={styles.appealCard}>
              <View style={styles.appealHeader}>
                <Text style={styles.appealTitle}>{item.event?.name ?? 'Event'}</Text>
                <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[styles.badgeText, { color }]}>{item.status}</Text>
                </View>
              </View>
              {studentName ? (
                <Text style={styles.studentName} numberOfLines={1}>
                  {studentName}
                </Text>
              ) : null}
              {/* Student explanation: its own labeled block so the reason
                  can never run into or read as part of the name. */}
              <View style={styles.reasonBlock}>
                <Text style={styles.reasonLabel}>
                  {canReview ? "Student's reason" : 'Your reason'}
                </Text>
                <Text
                  style={[
                    styles.reasonValue,
                    trimmedReason ? null : styles.reasonEmpty,
                  ]}
                >
                  {trimmedReason || 'No reason provided.'}
                </Text>
              </View>
              {item.feedback ? (
                <View style={styles.feedback}>
                  <Text style={styles.feedbackLabel}>Staff Feedback</Text>
                  <Text style={styles.feedbackText}>{item.feedback}</Text>
                </View>
              ) : null}
              {canReview && item.status === 'pending' && (
                <View style={styles.reviewBox}>
                  <FieldWithIcon
                    icon="chatbubble-outline"
                    containerStyle={styles.feedbackInput}
                    iconColor={COLORS.textPlaceholder}
                    value={feedback[item.id] ?? ''}
                    onChangeText={(v) => setFeedback((p) => ({ ...p, [item.id]: v }))}
                    placeholder="Optional note back to student..."
                    placeholderTextColor={COLORS.textPlaceholder}
                  />
                  <View style={styles.reviewRow}>
                    <AnimatedPressable style={[styles.reviewBtn, styles.acceptBtn]} onPress={() => handleReview(item, true)} accessibilityRole="button" accessibilityLabel="Approve appeal" glowColor={COLORS.success}>
                      <Text style={styles.reviewText}>Approve</Text>
                    </AnimatedPressable>
                    <AnimatedPressable style={[styles.reviewBtn, styles.rejectBtn]} onPress={() => handleReview(item, false)} accessibilityRole="button" accessibilityLabel="Decline appeal" glowColor={COLORS.danger}>\n                      <Text style={styles.reviewText}>Reject</Text>
                    </AnimatedPressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textHeading, textAlign: 'center', paddingTop: 12, paddingBottom: 8 },
  submit: { backgroundColor: COLORS.primary, borderRadius: 12, marginHorizontal: 16, paddingVertical: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: COLORS.textOnPrimary, fontSize: 15, fontWeight: '700' },
  
  filterSection: { marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.card, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  
  pills: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4, alignItems: 'center' },
  pill: { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, backgroundColor: COLORS.card, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  pillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'capitalize' },
  pillTextActive: { color: COLORS.textOnPrimary },

  list: { paddingHorizontal: 16, paddingTop: SPACING.listTop, paddingBottom: 24, gap: 12 },
  appealCard: { backgroundColor: COLORS.card, borderRadius: 16, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, padding: 16 },
  appealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  appealTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textHeading, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  studentName: { fontSize: 13, fontWeight: '600', color: COLORS.textStrong, marginTop: 6 },
  reasonBlock: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.borderSoft,
    padding: 10,
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  reasonValue: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  reasonEmpty: { color: COLORS.textPlaceholder, fontStyle: 'italic' },
  feedback: { marginTop: 8, backgroundColor: COLORS.bgBase, borderRadius: 12, padding: 10, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  feedbackLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  feedbackText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  formCard: {
    backgroundColor: COLORS.card, borderRadius: 16, marginHorizontal: 16,
    marginTop: 10, padding: 16, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, paddingVertical: 6 },
  emptyHintCenter: { textAlign: 'center' },
  
  emptyArea: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  
  eventRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  eventChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  eventChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  eventChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 160 },
  eventChipTextActive: { color: COLORS.textOnPrimary },
  reasonInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 72,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textSecondary, textAlignVertical: 'top',
  },
  reasonText: { textAlignVertical: 'top' },
  reviewBox: { marginTop: 12, gap: 10 },
  feedbackInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: COLORS.textSecondary,
    minHeight: 44,
  },
  reviewRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 4,
  },
  reviewBtn: { 
    flex: 1, 
    height: 46, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Deep tone shades so the white button labels keep AA contrast.
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  reviewText: { color: COLORS.textOnPrimary, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
















