import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import BusyButton from '@/components/BusyButton';
import Dropdown from '@/components/Dropdown';
import FieldWithIcon from '@/components/FieldWithIcon';
import EducationFields from '@/components/EducationFields';
import EmptyState from '@/components/EmptyState';
import LockedView from '@/components/LockedView';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS, SPACING, RADIUS, BTN } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  deleteUser,
  listUsers,
  setActive,
  setRole,
  updateUser,
} from '@/lib/campusqr/admin';
import {
  EMPTY_EDUCATION,
  educationFromProfile,
  validateLevelFields,
  type EducationValues,
} from '@/lib/campusqr/education';
import { buildProfilePatch } from '@/lib/campusqr/profiles';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { useCampusRole } from '@/lib/campusqr/roles';
import type { Profile, UserRole } from '@/types/database';

const ROLE_ACTIONS: UserRole[] = ['student', 'teacher', 'admin'];
void ROLE_ACTIONS;

type EditState = {
  target: Profile;
  fullName: string;
  phone: string;
  studentNo: string;
  title: string;
  education: EducationValues;
  saving: boolean;
};

/**
 * Manage Users (admin, spec Phase 6): searchable table with role badge
 * and active/inactive state; Edit modal with Personal + Educational
 * blocks; role/activation/deletion through the admin RPCs.
 */
export default function ManageUsersScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const onStatus = useRealtimeStatusToast(toast);

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('All');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await listUsers();
    setUsers(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useCampusRealtime(
    (change) => {
      if (change.table === 'profiles') load();
    },
    onStatus
  );

  if (!roleLoading && role !== 'admin') {
    return <LockedView message="Only administrators can manage users." />;
  }

  const filtered = users.filter((row) => {
    if (userFilter === 'Students' && row.role !== 'student') return false;
    if (userFilter === 'Teachers' && row.role !== 'teacher') return false;
    if (userFilter === 'Admins' && row.role !== 'admin') return false;
    if (userFilter === 'Pending' && row.is_active) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      row.email.toLowerCase().includes(query) ||
      row.full_name.toLowerCase().includes(query) ||
      (row.student_no ?? '').toLowerCase().includes(query)
    );
  });

  const roleBadgeColor = (r: string) =>
    r === 'student' ? COLORS.primaryDeep : r === 'teacher' ? COLORS.success : '#F59E0B';

  const openEdit = (target: Profile) => {
    setEdit({
      target,
      fullName: target.full_name,
      phone: target.phone ?? '',
      studentNo: target.student_no ?? '',
      title: target.title ?? '',
      education: educationFromProfile(target),
      saving: false,
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!edit) return;
    setEditError(null);
    const errors = validateLevelFields(edit.education);
    const firstError =
      errors.course ?? errors.year_level ?? errors.block ?? errors.section;
    if (firstError) {
      setEditError(firstError);
      return;
    }
    const patch = buildProfilePatch({
      full_name: edit.fullName,
      phone: edit.phone,
      student_no: edit.studentNo,
      title: edit.title,
      education: edit.education,
    });
    setEdit({ ...edit, saving: true });
    try {
      const { error, refused } = await updateUser(edit.target.id, patch);
      if (error) {
        setEditError(
          refused.length > 0
            ? `${error} Refused fields: ${refused.join(', ')}.`
            : error
        );
        toast.error(error);
        return;
      }
      toast.success(
        refused.length > 0
          ? `Saved with warnings. Refused fields: ${refused.join(', ')}.`
          : 'User updated.'
      );
      setEdit(null);
      load();
    } finally {
      setEdit((prev) => (prev ? { ...prev, saving: false } : prev));
    }
  };

  const handleRole = (target: Profile, next: UserRole) => {
    if (target.role === next) return;
    Alert.alert('Change role', `Set ${target.email} to ${next}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          const outcome = await setRole(target.id, next);
          if (outcome.result === 'error') {
            toast.error(outcome.message);
            return;
          }
          toast.success(outcome.message || 'Role updated.');
          load();
        },
      },
    ]);
  };

  const handleToggleActive = (target: Profile) => {
    const next = !target.is_active;
    Alert.alert(
      next ? 'Activate user' : 'Deactivate user',
      `${next ? 'Activate' : 'Deactivate'} ${target.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            const outcome = await setActive(target.id, next);
            if (outcome.result === 'error') {
              toast.error(outcome.message);
              return;
            }
            toast.success(outcome.message || 'User updated.');
            load();
          },
        },
      ]
    );
  };

  const handleDelete = (target: Profile) => {
    if (target.id === user?.id) {
      toast.error('You cannot delete your own account.');
      return;
    }
    Alert.alert('Delete user', `Delete ${target.email}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const outcome = await deleteUser(target.id);
          if (outcome.result === 'error') {
            toast.error(outcome.message);
            return;
          }
          toast.success(outcome.message || 'User deleted.');
          load();
        },
      },
    ]);
  };

  if (roleLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.hint}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <Text style={styles.title}>Manage Users</Text>
      <FieldWithIcon icon="search-outline" containerStyle={styles.searchWrap} inputStyle={styles.search}
        iconColor={COLORS.textSecondary} value={search} onChangeText={setSearch}
        placeholder="Search name, email, or ID..." placeholderTextColor={COLORS.textSecondary} />
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContainer}
        >
          {['All', 'Students', 'Teachers', 'Admins', 'Pending'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, userFilter === option && styles.activeFilterButton]}
              onPress={() => setUserFilter(option)}
              accessibilityRole="button"
            >
              <Text style={[styles.filterText, userFilter === option && styles.activeFilterText]}>{option}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState icon="people-outline" title="No users found..."
            message="Try a different search." />
        ) : (
          filtered.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{row.full_name || row.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: `${roleBadgeColor(row.role)}22`, borderColor: `${roleBadgeColor(row.role)}55` }]}>
                  <Text style={[styles.roleText, { color: roleBadgeColor(row.role) }]}>{row.role}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{row.email}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: row.is_active ? COLORS.success : COLORS.neutral }]} />
                <Text style={[styles.meta, row.is_active ? styles.active : styles.inactive]}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.actions}>
                <AnimatedPressable glowColor={COLORS.primary} style={[styles.actionButton, styles.editBtn]} onPress={() => openEdit(row)} accessibilityRole="button">
                  <Ionicons name="create-outline" size={16} color={COLORS.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Edit Role</Text>
                </AnimatedPressable>
                <AnimatedPressable glowColor={COLORS.warning} style={[styles.actionButton, styles.deactBtn]} onPress={() => handleToggleActive(row)} accessibilityRole="button">
                  <Ionicons
                    name={row.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={16}
                    color={COLORS.textOnPrimary}
                  />
                  <Text style={styles.actionBtnText}>{row.is_active ? 'Deactivate' : 'Activate'}</Text>
                </AnimatedPressable>
                <AnimatedPressable glowColor={COLORS.danger} style={[styles.actionButton, styles.delBtn]} onPress={() => handleDelete(row)} accessibilityRole="button">
                  <Ionicons name="trash-outline" size={16} color={COLORS.textOnPrimary} />
                  <Text style={styles.actionBtnText}>Delete</Text>
                </AnimatedPressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={edit !== null} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Edit user</Text>
              {edit && (
                <>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <Text style={styles.label}>Email (read-only)</Text>
                  <FieldWithIcon icon="mail-outline" containerStyle={[styles.input, styles.readonly]}
                    value={edit.target.email} editable={false} />
                  <Text style={styles.label}>Full name</Text>
                  <FieldWithIcon icon="person-outline" containerStyle={styles.input} value={edit.fullName}
                    onChangeText={(fullName) => setEdit({ ...edit, fullName })}
                    placeholder="Full name" placeholderTextColor={COLORS.textSecondary} />
                  <Text style={styles.label}>Phone</Text>
                  <FieldWithIcon icon="call-outline" containerStyle={styles.input} value={edit.phone}
                    onChangeText={(phone) => setEdit({ ...edit, phone })}
                    placeholder="Phone" placeholderTextColor={COLORS.textSecondary} />
                  <Text style={styles.label}>Student number</Text>
                  <FieldWithIcon icon="id-card-outline" containerStyle={styles.input} value={edit.studentNo}
                    onChangeText={(studentNo) => setEdit({ ...edit, studentNo })}
                    placeholder="Student number" placeholderTextColor={COLORS.textSecondary} />
                  <Text style={styles.label}>Title</Text>
                  <FieldWithIcon icon="briefcase-outline" containerStyle={styles.input} value={edit.title}
                    onChangeText={(title) => setEdit({ ...edit, title })}
                    placeholder="Title" placeholderTextColor={COLORS.textSecondary} />
                  <Text style={styles.sectionTitle}>Educational Information</Text>
                  <EducationFields
                    value={edit.education}
                    onChange={(education) => setEdit({ ...edit, education })}
                  />
                  <Dropdown label="Role" value={edit.target.role}
                    options={ROLE_ACTIONS.map((r) => ({ label: r, value: r }))}
                    onChange={(value) => handleRole(edit.target, value as UserRole)} />
                  {editError && <Text style={styles.error}>{editError}</Text>}
                  <BusyButton title="Save Changes" loadingTitle="Saving..."
                    icon="checkmark-outline" onPress={handleSaveEdit} loading={edit.saving} />
                  <AnimatedPressable glowColor={COLORS.accent} style={styles.closeButton} onPress={() => setEdit(null)}>
                    <Text style={styles.closeText}>Close</Text>
                  </AnimatedPressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 10 },
  hint: { fontSize: 14, color: 'COLORS.textSecondary' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginHorizontal: 16, marginBottom: 12, textAlign: 'center', paddingTop: 12 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 12, minHeight: 48,
  },
  search: { flex: 1, fontSize: 15, color: COLORS.textPrimary, minHeight: 44 },
  filterWrapper: {
    marginVertical: 8,
  },
  filterScrollContainer: {
    paddingHorizontal: 16,
    gap: 8,                    // Creates clean, uniform spacing between buttons
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#1e3a8a', // Match your primary theme color
    borderColor: '#1e3a8a',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  list: { paddingHorizontal: 16, paddingTop: SPACING.listTop, paddingBottom: 40, gap: SPACING.cardGap },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  active: { color: COLORS.success, fontWeight: '600' },
  inactive: { color: COLORS.danger, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8 },
  actionButton: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  actionButtonText: { fontSize: 11, fontWeight: '600', color: '#ffffff', marginTop: 4 },
  editBtn: { backgroundColor: COLORS.primary },
  deactBtn: { backgroundColor: 'rgba(245,158,11,0.85)' },
  delBtn: { backgroundColor: 'rgba(239,68,68,0.85)' },
  actionBtnText: { color: COLORS.textOnPrimary },
  backdrop: { flex: 1, backgroundColor: COLORS.scrim, justifyContent: 'center', paddingHorizontal: 20 },
  sheet: {
    backgroundColor: COLORS.card, borderRadius: 20, maxHeight: '88%',
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    shadowColor: COLORS.shadow, shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  sheetScroll: { padding: 18, paddingBottom: 28 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.accent, marginTop: 12, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16, color: COLORS.textPrimary,
  },
  readonly: { opacity: 0.7 },
  error: { fontSize: 14, color: COLORS.danger, textAlign: 'center', marginTop: 10 },
  closeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  closeText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
});




