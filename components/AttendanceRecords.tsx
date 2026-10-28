import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import Dropdown, { type DropdownOption } from '@/components/Dropdown';
import FieldWithIcon from '@/components/FieldWithIcon';
import { useToast } from '@/components/CampusToast';
import { COLORS, SPACING } from '@/constants/colors';
import {
  deleteAttendance,
  updateAttendance,
  type EventAttendanceRecord,
} from '@/lib/campusqr/attendance';
import { formatDateTime } from '@/lib/campusqr/format';
import type { AttendanceStatus } from '@/types/database';

export const ATTENDANCE_FILTERS = ['all', 'present', 'late', 'absent', 'excused'] as const;
export type AttendanceFilter = (typeof ATTENDANCE_FILTERS)[number];

const STATUS_EDIT_OPTIONS: DropdownOption[] = [
  { label: 'Present', value: 'present' },
  { label: 'Late', value: 'late' },
  { label: 'Absent', value: 'absent' },
  { label: 'Excused', value: 'excused' },
];

type Props = {
  records: EventAttendanceRecord[];
  loading: boolean;
  /** Set for owners/admins — enables per-row status edit + delete. */
  canEdit?: boolean;
  onChanged?: () => void;
  /** Admin read-only monitor: hides edit controls entirely. */
  readOnly?: boolean;
  /** Admin override tool: full-word status buttons + reason + save. */
  overrideMode?: boolean;
  /** Compact single-row horizontal pills (no wrap). */
  compactFilters?: boolean;
};

/**
 * Shared attendance records list (Phase 5): status pills, status/keyword
 * filters, and per-row Correct Records actions (update status / delete)
 * with re-read verification surfaced through the data layer.
 */
export default function AttendanceRecords({ records, loading, canEdit = false, onChanged, readOnly = false, overrideMode = false, compactFilters = false }: Props) {
  const toast = useToast();
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, AttendanceStatus>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const visible = records.filter((row) => {
    if (filter !== 'all' && row.status !== filter) return false;
    const key = keyword.trim().toLowerCase();
    if (!key) return true;
    const hay = [row.student?.full_name ?? '', row.student?.email ?? '', row.student?.student_no ?? '']
      .join(' ').toLowerCase();
    return hay.includes(key);
  });

  const handleStatusChange = async (id: string, status: AttendanceStatus) => {
    setBusyId(id);
    try {
      const { error } = await updateAttendance(id, status);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Attendance updated.');
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (row: EventAttendanceRecord) => {
    Alert.alert(
      'Delete record',
      `Remove ${row.student?.full_name ?? 'this student'}'s attendance record? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(row.id);
            try {
              const { error } = await deleteAttendance(row.id);
              if (error) {
                toast.error(error);
                return;
              }
              toast.success('Record deleted.');
              onChanged?.();
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  /** Attendance status → semantic tone (fg = text, bg = pill fill, border = hairline). */
  const ATTENDANCE_TONE: Record<string, { fg: string; bg: string; border: string }> = {
    present: { fg: COLORS.tone.success.fg, bg: COLORS.tone.success.bg, border: COLORS.tone.success.border },
    late: { fg: COLORS.tone.warning.fg, bg: COLORS.tone.warning.bg, border: COLORS.tone.warning.border },
    absent: { fg: COLORS.tone.danger.fg, bg: COLORS.tone.danger.bg, border: COLORS.tone.danger.border },
    excused: { fg: COLORS.tone.info.fg, bg: COLORS.tone.info.bg, border: COLORS.tone.info.border },
  };
  const statusColor = (s: string) => ATTENDANCE_TONE[s]?.fg ?? COLORS.tone.neutral.fg;
  const statusTone = (s: string) =>
    ATTENDANCE_TONE[s] ?? { fg: COLORS.tone.neutral.fg, bg: COLORS.tone.neutral.bg, border: COLORS.tone.neutral.border };

  if (loading) {
    return <Text style={styles.hint}>Loading records...</Text>;
  }

  const editable = canEdit && !readOnly && !overrideMode;

  const pills = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={compactFilters ? styles.filterRowSingle : styles.filterRow}>
      {ATTENDANCE_FILTERS.map((option) => {
        const active = filter === option;
        return (
          <AnimatedPressable
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setFilter(option)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View>
      {compactFilters ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowSingle}>
          {ATTENDANCE_FILTERS.map((option) => {
            const active = filter === option;
            return (
              <AnimatedPressable
                key={option}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(option)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      ) : pills}
      <FieldWithIcon
        icon="search-outline"
        containerStyle={styles.searchWrap}
        inputStyle={styles.searchInput}
        iconColor={COLORS.textMuted}
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Search name, email, student no..."
        placeholderTextColor={COLORS.textPlaceholder}
      />
      {visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="list-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No attendance records yet.</Text>
          <Text style={styles.emptySub}>Records will appear here once students check in.</Text>
        </View>
      ) : (
        visible.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={styles.name}>{row.student?.full_name ?? 'Unknown student'}</Text>
              <Text style={styles.meta}>{row.student?.student_no}</Text>
              <Text style={styles.meta}>{row.student?.email}</Text>
              <Text style={styles.meta}>{formatDateTime(row.recorded_at)}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8}}>
              <View style={[styles.statusBadge, { backgroundColor: statusTone(row.status).bg, borderColor: statusTone(row.status).border }]}>
                <Text style={[styles.statusText, { color: statusColor(row.status) }]}>{row.status}</Text>
              </View>
              {canEdit && !overrideMode ? (
                <Dropdown
                  value={pendingStatus[row.id] ?? row.status}
                  options={STATUS_EDIT_OPTIONS}
                  onChange={(val) => {
                    const next = val as AttendanceStatus;
                    setPendingStatus((p) => ({ ...p, [row.id]: next }));
                    handleStatusChange(row.id, next);
                  }}
                />
              ) : null}
              {canEdit ? (
                <AnimatedPressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(row)}
                  disabled={busyId === row.id}
                  accessibilityRole="button"
                  accessibilityLabel="Delete record"
                  glowColor={COLORS.danger}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </AnimatedPressable>
              ) : null}
            </View>
            {overrideMode ? (
              <View style={styles.overrideBox}>
                <Text style={styles.overrideLabel}>Override Status</Text>
                <View style={styles.overrideRow}>
                  {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((s) => {
                    const selected = (pendingStatus[row.id] ?? row.status) === s;
                    return (
                      <AnimatedPressable
                        key={s}
                        style={[styles.overrideBtn, selected && { borderColor: statusColor(s), backgroundColor: `${statusColor(s)}22` }]}
                        onPress={() => setPendingStatus((p) => ({ ...p, [row.id]: s }))}
                        glowColor={statusColor(s)}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                      >
                        <Text style={[styles.overrideText, { color: statusColor(s) }]}>{s === 'present' ? 'Present' : s === 'absent' ? 'Absent' : s === 'late' ? 'Late' : 'Excused'}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
                <FieldWithIcon
                  icon="create-outline"
                  containerStyle={styles.reasonInput}
                  iconColor={COLORS.textMuted}
                  value={reasons[row.id] ?? ''}
                  onChangeText={(v) => setReasons((p) => ({ ...p, [row.id]: v }))}
                  placeholder="Reason for Correction (optional)"
                  placeholderTextColor={COLORS.textPlaceholder}
                />
                <AnimatedPressable
                  style={styles.saveBtn}
                  onPress={() => handleStatusChange(row.id, pendingStatus[row.id] ?? row.status)}
                  disabled={busyId === row.id}
                  glowColor={COLORS.primary}
                  accessibilityRole="button"
                  accessibilityLabel="Save override"
                >
                  <Text style={styles.saveText}>{busyId === row.id ? 'Saving...' : 'Save Override'}</Text>
                </AnimatedPressable>
              </View>
            ) : null}
          </View>))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterRowSingle: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingRight: 8 },
  chip: {
    minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999,
    backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderWidth: 1,
  },
  chipActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
  chipTextActive: { color: '#FFFFFF' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 12, borderColor: '#E2E8F0',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
    paddingHorizontal: 14, minHeight: 48, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textSecondary, minHeight: 44 },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
    padding: 28, alignItems: 'center', gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  editRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  editDropdown: { flex: 1 },
  deleteButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  overrideBox: { marginTop: 10, gap: 8 },
  overrideLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  overrideRow: { flexDirection: 'row', gap: SPACING.buttonGap, flexWrap: 'wrap' },
  overrideBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  overrideText: { fontSize: 13, fontWeight: '700' },
  reasonInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 72,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textSecondary,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  saveText: { color: COLORS.textOnPrimary, fontWeight: '700', fontSize: 14 },
});










