import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import AnimatedLogo from '@/components/AnimatedLogo';
import BusyButton from '@/components/BusyButton';
import FieldWithIcon from '@/components/FieldWithIcon';
import EducationFields from '@/components/EducationFields';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { BTN, COLORS, NEUMO } from '@/constants/colors';
import { SHADOWS, THEME, TYPOGRAPHY } from '@/constants/theme';
import { signUp } from '@/lib/campusqr/auth';
import {
  EMPTY_EDUCATION,
  validateLevelFields,
  type EducationErrors,
  type EducationValues,
} from '@/lib/campusqr/education';

/**
 * CampusQR Register (spec Phase 2): full name, phone, student number and
 * the Educational Level dropdown that conditionally reveals fields per
 * level. Signup metadata NEVER carries role or is_active — the database
 * trigger hardcodes student.
 *
 * Republic Act No. 10173 (Data Privacy Act of 2012): a mandatory consent
 * checkbox gates submission — the notice states what is collected, why, and
 * the user's access / correction / objection / erasure rights.
 */
export default function CampusRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [education, setEducation] = useState<EducationValues>({
    ...EMPTY_EDUCATION,
  });
  const [levelErrors, setLevelErrors] = useState<EducationErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setLevelErrors({});

    if (
      !fullName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !studentNo.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const errors = validateLevelFields(education);
    if (Object.keys(errors).length > 0) {
      setLevelErrors(errors);
      setError('Please complete your educational information.');
      return;
    }

    if (!consent) {
      setError('You must agree to the Data Privacy Notice to create an account.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await signUp(email.trim(), password, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        student_no: studentNo.trim(),
        educational_level: education.educational_level ?? undefined,
        course: education.course.trim() || undefined,
        year_level: education.year_level.trim() || undefined,
        block: education.block.trim() || undefined,
        section: education.section.trim() || undefined,
        // NOTE: no role / is_active — public signups are always students.
      });

      if (authError) {
        setError(authError.message);
        toast.error(authError.message);
        return;
      }

      if (data.session) {
        toast.success('Account created. Please sign in.');
      } else {
        toast.success('Account created. Check your email to confirm, then sign in.');
      }
      router.replace('/campus/login');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenTransition style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* App mark centered at top */}
              <View style={styles.markWrap}>
                <AnimatedLogo size={76} iconSize={38} />
              </View>

              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Sign up to get started with School Attendance System
              </Text>
              <Text style={styles.accountNote}>
                New accounts start as Student — personnel roles are assigned by an administrator.
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>Full Name</Text>
                <FieldWithIcon
                  icon="person-outline"
                  containerStyle={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Juan Dela Cruz"
                  placeholderTextColor={COLORS.textSecondary}
                  editable={!loading}
                />

                <Text style={styles.label}>Email</Text>
                <FieldWithIcon
                  icon="mail-outline"
                  containerStyle={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />

                <Text style={styles.label}>Phone</Text>
                <FieldWithIcon
                  icon="call-outline"
                  containerStyle={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="09XXXXXXXXX"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  editable={!loading}
                />

                <Text style={styles.label}>Student Number</Text>
                <FieldWithIcon
                  icon="id-card-outline"
                  containerStyle={styles.input}
                  value={studentNo}
                  onChangeText={setStudentNo}
                  placeholder="e.g. 2026-000123"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="characters"
                  editable={!loading}
                />

                <View style={styles.educationSection}>
                  <EducationFields
                    value={education}
                    onChange={(next) => {
                      setEducation(next);
                      setLevelErrors({});
                    }}
                    errors={levelErrors}
                    disabled={loading}
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <FieldWithIcon
                  icon="lock-closed-outline"
                  containerStyle={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  editable={!loading}
                />

                <Text style={styles.label}>Confirm Password</Text>
                <FieldWithIcon
                  icon="shield-checkmark-outline"
                  containerStyle={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  editable={!loading}
                />

                <View style={styles.consentSection}>
                  <Text style={styles.consentTitle}>Data Privacy Notice</Text>
                  <Text style={styles.consentText}>
                    Republic Act No. 10173 (Data Privacy Act of 2012). Your personal and
                    attendance data is used solely for school purposes. 
                  </Text>

                  <AnimatedPressable
                    style={styles.consentRow}
                    onPress={() => setConsent(!consent)}
                    disabled={loading}
                    glowColor={COLORS.primary}
                    accessibilityRole="button"
                    accessibilityState={{ selected: consent }}
                    accessibilityLabel="I have read and agree to the Data Privacy Notice"
                  >
                    <View style={[styles.consentBox, consent && styles.consentBoxChecked]}>
                      {consent && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.consentLabel}>
                      I have read and agree to the Data Privacy Notice.
                    </Text>
                  </AnimatedPressable>
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.actionContainer}>
                  <BusyButton
                    title="Sign Up"
                    loadingTitle="Creating Account..."
                    icon="person-add-outline"
                    onPress={handleRegister}
                    loading={loading}
                  />
                </View>
              </View>

            <Link href="/campus/login" style={styles.link}>
              Already have an account? Sign In
            </Link>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenTransition>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  markWrap: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  accountNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  consentSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 64, 175, 0.10)',
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NEUMO.title,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  consentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 8,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: BTN.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: NEUMO.surface,
    borderRadius: NEUMO.inputRadius,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: NEUMO.highlight,
    shadowColor: NEUMO.darkShadow,
    shadowOffset: NEUMO.extrudeOffset,
    shadowOpacity: NEUMO.extrudeOpacity,
    shadowRadius: NEUMO.extrudeRadius,
    elevation: 3,
  },
  consentBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(30, 64, 175, 0.30)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentBoxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  consentLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: NEUMO.title,
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  educationSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 64, 175, 0.10)',
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textHeading,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 10,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor: THEME.input,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    borderTopColor: THEME.borderAccentFaint,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    fontSize: 16,
    color: THEME.textHeading,
    textAlign: 'left',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
  },
  error: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 24,
    width: '100%',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: NEUMO.surface,
    borderRadius: NEUMO.cardRadius,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: NEUMO.highlight,
    shadowColor: NEUMO.darkShadow,
    shadowOffset: NEUMO.extrudeOffset,
    shadowOpacity: NEUMO.extrudeOpacity,
    shadowRadius: NEUMO.extrudeRadius,
    elevation: 3,
    width: '100%',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NEUMO.title,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 8,
  },
});
