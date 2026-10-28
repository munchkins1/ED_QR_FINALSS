import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import FieldWithIcon from '@/components/FieldWithIcon';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';

import { useToast } from '@/components/CampusToast';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { signOut } from '@/lib/campusqr/auth';
import { fetchOwnHistory } from '@/lib/campusqr/attendance';
import {
  EMPTY_EDUCATION,
  LEVEL_OPTIONS,
  educationFromProfile,
  levelFields,
  type EducationValues,
} from '@/lib/campusqr/education';
import { fetchProfile, saveOwnProfile } from '@/lib/campusqr/profiles';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { ROLE_LABEL, useCampusRole } from '@/lib/campusqr/roles';
import type { Profile } from '@/types/database';

/**
 * CampusQR Profile (spec Phase 7): stat cards (role, account created
 * date, events attended) plus an edit form limited to the eleven
 * self-editable columns — never role, is_active or email. The shared
 * buildProfilePatch writes department = course and
 * grade_class = formatGradeClass(...) on every save. Own-row updates
 * arrive live via the shared realtime channel.
 *
 * Students are read-only: personal + educational information is shown
 * for viewing only (inputs disabled, no Save button); only teachers
 * and admins may edit their own profile. Sign-out stays available
 * to every role.
 */
export default function CampusProfileScreen() {
  const { user } = useAuth();
  const { profile: roleProfile, refresh: refreshRole, isStudent, role } = useCampusRole();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const toast = useToast();
  const router = useRouter();
  const onStatus = useRealtimeStatusToast(toast);

  // Every role is read-only now: personal + educational info is shown for
  // viewing only. Staff see the same clean layout as students, minus the
  // student-only bits (Academic info, Phone, Student number, Events attended).
  const readOnly = true;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [attended, setAttended] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [title, setTitle] = useState('');
  const [education, setEducation] = useState<EducationValues>({
    ...EMPTY_EDUCATION,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const [row, history] = await Promise.all([
      fetchProfile(user.id),
      fetchOwnHistory(user.id),
    ]);
    if (row) {
      setProfile(row);
      setFullName(row.full_name);
      setPhone(row.phone ?? '');
      setStudentNo(row.student_no ?? '');
      setTitle(row.title ?? '');
      setEducation(educationFromProfile(row));
    }
    // "Events attended" counts only present + late marks — absents are excluded.
    setAttended(
      history.filter(
        (record) => record.status === 'present' || record.status === 'late'
      ).length
    );
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useCampusRealtime(
    (change) => {
      if (change.table !== 'profiles') return;
      const changedId = (change.new?.id ?? change.old?.id) as
        | string
        | undefined;
      if (changedId && changedId === user?.id) load();
    },
    onStatus
  );

  const handleSave = async () => {
    setError(null);
    if (!user?.id) return;
    // Only students may edit anything in-app, and only their phone number.
    const digits = phone.replace(/\D/g, '');
    if (phone.trim() && digits.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }
    setSaving(true);
    try {
      const { error: saveError } = await saveOwnProfile(user.id, {
        full_name: profile?.full_name ?? fullName,
        phone,
        student_no: profile?.student_no ?? studentNo,
        title: profile?.title ?? title,
        education,
      });
      if (saveError) {
        setError(saveError);
        toast.error(saveError);
        return;
      }
      toast.success('Phone number updated.');
      refreshRole();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/campus/login');
    } finally {
      setSigningOut(false);
    }
  };

  const initials = (profile?.full_name ?? user?.email ?? 'LA')
    .split(' ')
    .map((p) => p.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LA';

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.hint}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  // ---- Student read-only Deep Slate profile ----
  if (readOnly) {
    // Level-aware academic fields, mirroring the Sign Up page's
    // EducationFields: only show the fields the student's education level
    // actually uses (College → course/year/block; Senior High → track/grade/
    // section; Junior High & Elementary → grade/section). Read-only.
    const levelValue = education.educational_level;
    const levelLabel =
      LEVEL_OPTIONS.find((option) => option.value === levelValue)?.label ?? '';
    const fields = levelFields(levelValue);

    // Two-column academic grid:
    //   Left column  → Educational Level, then Course/Strand (moved to the left)
    //   Right column → Year/Grade, then Block/Section (stacked in one column)
    const leftColumn: { label: string; value: string }[] = [
      { label: 'Educational Level', value: levelLabel || '—' },
    ];
    if (fields.needsCourse) {
      leftColumn.push({
        label: fields.courseLabel,
        value: education.course || '—',
      });
    }

    const rightColumn: { label: string; value: string }[] = [];
    if (fields.needsYear) {
      rightColumn.push({
        label: fields.yearLabel,
        value: education.year_level || '—',
      });
    }
    if (fields.needsBlock) {
      rightColumn.push({ label: 'Block', value: education.block || '—' });
    }
    if (fields.needsSection) {
      rightColumn.push({ label: 'Section', value: education.section || '—' });
    }
    return (
      <View style={styles.container}>
        <ScreenSheet>
      <ScreenTransition style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{profile?.full_name ?? (isStudent ? 'Student' : 'Staff')}</Text>
            {isStudent && (
              <View style={styles.idPill}>
                <Text style={styles.idPillText}>{profile?.student_no ?? 'No ID yet'}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.accent }]}>{profile ? ROLE_LABEL[profile.role] : '...'}</Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
            {isStudent && (
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#34D399' }]}>{attended}</Text>
                <Text style={styles.statLabel}>Events attended</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={[styles.sectionTitle, styles.sectionTitleCenter]}>Personal Information</Text>
            <Text style={styles.miniLabel}>Email</Text>
            <Text style={styles.miniValue}>{profile?.email ?? user?.email ?? ''}</Text>

            {isStudent ? (
              <>
                <Text style={styles.miniLabel}>Phone</Text>
                <FieldWithIcon
                  icon="call-outline"
                  containerStyle={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Add your phone number"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  editable={!saving}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <AnimatedPressable
                  style={[styles.savePhone, saving && styles.savePhoneDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Save phone number"
                >
                  <Text style={styles.savePhoneText}>{saving ? 'Saving...' : 'Save Phone'}</Text>
                </AnimatedPressable>
                <Text style={styles.adminNote}>
                  Other details are locked. Visit the administration office to request changes.
                </Text>
              </>
            ) : (
              <>
                {profile?.title ? (
                  <>
                    <Text style={styles.miniLabel}>Title</Text>
                    <Text style={styles.miniValue}>{profile.title}</Text>
                  </>
                ) : null}
              </>
            )}
          </View>

          {isStudent && (
            <View style={styles.infoCard}>
              <Text style={[styles.sectionTitle, styles.sectionTitleCenter, styles.sectionTitleLg]}>Academic Information</Text>
              <View style={styles.academicRow}>
                <View style={styles.academicCell}>
                  {leftColumn.map((field) => (
                    <View key={field.label}>
                      <Text style={[styles.miniLabel, styles.centerText]}>{field.label}</Text>
                      <Text style={[styles.miniValue, styles.centerText]}>{field.value}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.academicCell}>
                  {rightColumn.map((field) => (
                    <View key={field.label}>
                      <Text style={[styles.miniLabel, styles.centerText]}>{field.label}</Text>
                      <Text style={[styles.miniValue, styles.centerText]}>{field.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          <AnimatedPressable
            style={styles.signOutGlass}
            onPress={handleSignOut}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Sign Out"
            glowColor={COLORS.danger}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.signOutGlassText}>{signingOut ? 'Signing out...' : 'Sign Out'}</Text>
          </AnimatedPressable>
        </ScrollView>
        </ScreenTransition>
        </ScreenSheet>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  hint: { fontSize: 14, color: COLORS.textSecondary },
  profileHeader: { alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(30, 64, 175, 0.1)', borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.28)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  idPill: {
    marginTop: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(30, 58, 138, 0.08)', borderWidth: 1, borderColor: COLORS.borderSoft,
  },
  idPillText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  statValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  infoCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    padding: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  sectionTitleCenter: { textAlign: 'center' },
  /** Academic header renders one step larger than the Personal header. */
  sectionTitleLg: { fontSize: 18 },
  miniLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  miniValue: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  /** Centers academic grid text even when the value wraps to multiple lines. */
  centerText: { textAlign: 'center' },
  /** Two-column academic grid: label over value, cells share the width; text centered in each column. */
  academicRow: { flexDirection: 'row', gap: 12 },
  /** flex:1 columns, centered content; gap spaces the stacked field pairs (the 2 grid rows). */
  academicCell: { flex: 1, alignItems: 'center', gap: 16 },
  phoneInput: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 6, minHeight: 48,
    fontSize: 15, color: COLORS.textPrimary,
  },
  savePhone: {
    backgroundColor: COLORS.textPrimary, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 44,
  },
  savePhoneDisabled: { opacity: 0.6 },
  savePhoneText: { color: COLORS.textOnPrimary, fontWeight: '700', fontSize: 14 },
  adminNote: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 17, marginTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 0,
    fontSize: 16, color: COLORS.textPrimary,
  },
  readonlyBox: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, opacity: 0.9,
  },
  readonlyText: { fontSize: 16, color: COLORS.textSecondary },
  error: { fontSize: 14, color: COLORS.danger, textAlign: 'center', marginTop: 12 },
  actions: { marginTop: 24, paddingBottom: 8 },
  signOutGlass: {
    backgroundColor: COLORS.tone.danger.bg,
    borderColor: COLORS.tone.danger.border,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, minHeight: 44,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  signOutGlassText: { fontSize: 15, fontWeight: '600', color: COLORS.danger },
});






