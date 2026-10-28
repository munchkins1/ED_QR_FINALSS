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

import AnimatedLogo from '@/components/AnimatedLogo';
import BusyButton from '@/components/BusyButton';
import FieldWithIcon from '@/components/FieldWithIcon';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS, GRADIENTS } from '@/constants/colors';
import { SHADOWS, TYPOGRAPHY, THEME } from '@/constants/theme';
import { signIn } from '@/lib/campusqr/auth';
import { defaultTabFor, getCurrentProfile } from '@/lib/campusqr/roles';

/** CampusQR Login (spec Phase 2): email + password, session persisted. */
export default function CampusLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(authError.message);
        toast.error(authError.message);
        return;
      }

      const user = data.session?.user;
      const profile = user ? await getCurrentProfile(user.id) : null;
      toast.success('Signed in successfully.');
      router.replace(defaultTabFor(profile?.role ?? null));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unexpected error. Please try again.';
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
                <AnimatedLogo size={96} iconSize={48} />
              </View>

              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>

              <View style={styles.form}>
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

              <Text style={styles.label}>Password</Text>
              <FieldWithIcon
                icon="lock-closed-outline"
                containerStyle={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actionContainer}>
                <BusyButton
                  title="Sign In"
                  loadingTitle="Signing In..."
                  icon="log-in-outline"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>
            </View>

            <Link href="/campus/register" style={styles.link}>
              Don&apos;t have an account? Sign Up
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
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  markWrap: {
    alignItems: 'center',
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
    marginBottom: 30,
  },
  form: {
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
    alignSelf: 'center',
  },
  actionContainer: {
    marginTop: 24,
    width: '100%',
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 8,
    marginTop: 20,
  },
});
