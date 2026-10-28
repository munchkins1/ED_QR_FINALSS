import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AnimatedPressable from '@/components/AnimatedPressable';
import BusyButton from '@/components/BusyButton';
import FieldWithIcon from '@/components/FieldWithIcon';
import LockedView from '@/components/LockedView';
import ResultPanel, { type ResultTone } from '@/components/ResultPanel';
import SafeCameraView, { useCameraPermissions } from '@/components/SafeCamera';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS } from '@/constants/colors';
import { SHADOWS } from '@/constants/theme';
import { checkIn } from '@/lib/campusqr/attendance';
import { useCampusRole } from '@/lib/campusqr/roles';
import type { CheckInResult, CheckInResultType } from '@/types/database';

const RESULT_TONE: Record<CheckInResultType, ResultTone> = {
  success: 'success',
  duplicate: 'warning',
  closed: 'neutral',
  invalid: 'error',
  unauthorized: 'error',
};

/** Minimum gap between accepted scans — prevents rapid duplicate frames. */
const SCAN_COOLDOWN_MS = 2000;

/** Vertical travel (px) of the animated scan bar inside the reticle frame. */
const SCAN_BAR_TRAVEL = 260;

const RESULT_TITLE: Record<CheckInResultType, string> = {
  success: 'Check-in complete',
  duplicate: 'Already checked in',
  closed: 'Event closed',
  invalid: 'Invalid QR code',
  unauthorized: 'Not allowed',
};

type Phase = 'camera' | 'manual';

export default function CampusScanScreen() {
  const { role, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('camera');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [busy, setBusy] = useState(false);
  const handlingRef = useRef(false);
  const cooldownRef = useRef(0);
  const scanBarY = useRef(new Animated.Value(0)).current;

  // Laser-sweep animation: the bar glides down the reticle and back up
  // while the camera is live. The native driver keeps it at 60fps next to
  // the camera feed; it stops whenever the camera view unmounts.
  useEffect(() => {
    if (phase !== 'camera' || result) {
      scanBarY.stopAnimation();
      return;
    }
    scanBarY.setValue(0);
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(scanBarY, {
          toValue: SCAN_BAR_TRAVEL,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanBarY, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    sweep.start();
    return () => sweep.stop();
  }, [phase, result, scanBarY]);

  useFocusEffect(useCallback(() => {
    handlingRef.current = false;
    cooldownRef.current = 0;
  }, []));

  const handleRawScan = async (raw: string) => {
    if (handlingRef.current || busy) return;
    const now = Date.now();
    if (now < cooldownRef.current) return;
    cooldownRef.current = now + SCAN_COOLDOWN_MS;
    handlingRef.current = true;
    setBusy(true);
    try {
      const outcome = await checkIn(raw);
      setResult(outcome);
      const kind =
        outcome.result === 'success' ? 'success'
        : outcome.result === 'duplicate' || outcome.result === 'closed'
          ? 'warning' : 'error';
      toast.show(kind, outcome.message);
    } finally {
      setBusy(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setManualCode('');
    handlingRef.current = false;
  };

  // Instant fill from the clipboard (RN core Clipboard - no new native dep,
  // so it works in the existing dev build). Never throws: failures are toasts.
  const handlePaste = async () => {
    try {
      const code = (await Clipboard.getString() ?? '').trim();
      if (code) {
        setManualCode(code);
        toast.success('Pasted from clipboard.');
      } else {
        toast.info('Clipboard is empty.');
      }
    } catch {
      toast.error('Could not read the clipboard.');
    }
  };

  if (!roleLoading && role !== null && role !== 'student') {
    return <LockedView message="Only student accounts can record attendance." />;
  }

  if (!roleLoading && permission && !permission.granted && phase === 'camera') {
    return (
      <View style={styles.container}>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.title}>Camera Permission Needed</Text>
          <Text style={styles.subtitle}>We need access to your camera to scan QR codes. You can also enter the event code manually.</Text>
          <BusyButton title="Grant Permission" loadingTitle="Requesting..." icon="camera-outline" onPress={() => requestPermission()} loading={false} />
          <AnimatedPressable style={styles.linkButton} onPress={() => setPhase('manual')}>
            <Text style={styles.linkText}>Enter event code manually</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  const scannerStopped = result !== null;

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Scan QR</Text>
          <View style={styles.segment}>
            <AnimatedPressable
              style={[styles.segmentButton, phase === 'camera' && styles.segmentActive]}
              outerStyle={styles.segmentOuter}
              onPress={() => { setPhase('camera'); handleScanAgain(); }}>
              <Text style={[styles.segmentText, phase === 'camera' && styles.segmentTextActive]}>Camera</Text>
            </AnimatedPressable>
            <AnimatedPressable
              style={[styles.segmentButton, phase === 'manual' && styles.segmentActive]}
              outerStyle={styles.segmentOuter}
              onPress={() => { setPhase('manual'); handleScanAgain(); }}>
              <Text style={[styles.segmentText, phase === 'manual' && styles.segmentTextActive]}>Manual code</Text>
            </AnimatedPressable>
          </View>
          {phase === 'camera' ? (
            <View style={styles.cameraBox}>
              {!scannerStopped ? (
                <View style={styles.cameraFrame}>
                  <SafeCameraView style={styles.camera} facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => handleRawScan(data)} />
                  <View pointerEvents="none" style={styles.reticle}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    <Animated.View style={[styles.scanBar, { transform: [{ translateY: scanBarY }] }]} />
                  </View>
                </View>
              ) : (
                <View style={styles.cameraPaused}>
                  <Ionicons name="pause-circle-outline" size={44} color={COLORS.textSecondary} />
                  <Text style={styles.hint}>Scanner paused — see your result below.</Text>
                </View>
              )}
              <Text style={styles.helper}>Align QR code within frame to check in</Text>
            </View>
          ) : (
            <View style={styles.manualBox}>
              <Text style={styles.label}>Event code</Text>
              <View style={styles.inputRow}>
                <FieldWithIcon icon="qr-code-outline" containerStyle={[styles.input, styles.inputFlex]} value={manualCode} onChangeText={setManualCode}
                  placeholder="Paste your code here"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none" editable={!busy && !scannerStopped} />
                <AnimatedPressable
                  style={styles.pasteButton}
                  onPress={handlePaste}
                  glowColor={COLORS.accent}
                  accessibilityRole="button"
                  accessibilityLabel="Paste event code from clipboard"
                  hitSlop={8}
                >
                  <Ionicons name="clipboard-outline" size={20} color="THEME.primaryDeep" />
                </AnimatedPressable>
              </View>
              <BusyButton title="Check In" loadingTitle="Checking In..." icon="checkmark-outline"
                onPress={() => manualCode.trim() && handleRawScan(manualCode)}
                loading={busy} disabled={!manualCode.trim() || scannerStopped}
                style={manualCode.trim() && !scannerStopped ? styles.checkInActive : styles.checkInIdle} />
            </View>
          )}
          {busy && !result && <Text style={styles.hint}>Recording attendance...</Text>}
          {result && (
            <View style={styles.resultWrap}>
              <ResultPanel tone={RESULT_TONE[result.result]} title={RESULT_TITLE[result.result]} message={result.message}>
                <AnimatedPressable style={styles.secondaryButton} onPress={handleScanAgain}>
                  <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.secondaryText}>Scan again</Text>
                </AnimatedPressable>
              </ResultPanel>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </ScreenTransition>
      </ScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'flex-start' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center', paddingTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  permissionBox: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, alignItems: 'center', gap: 12 },
  linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  linkText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  segment: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 4, marginBottom: 16,
  },
  segmentButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  // The outer Pressable must also flex so both segments split the row 50/50
  // (inner `style` alone would shrink-wrap each to its text width).
  segmentOuter: { flex: 1 },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.textOnPrimary },
  cameraBox: { alignItems: 'center', gap: 10, marginBottom: 16 },
  cameraFrame: { width: '100%', height: 320, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  camera: { width: '100%', height: 320, borderRadius: 16, overflow: 'hidden' },
  reticle: { position: 'absolute', left: 24, right: 24, top: 24, bottom: 24 },
  corner: {
    position: 'absolute', width: 34, height: 34, borderColor: COLORS.primary,
    // Contrast on bright camera feeds: dark shadow (iOS) + elevation (Android);
    // the near-invisible fill gives Android an outline to draw the shadow from.
    backgroundColor: 'rgba(15, 23, 42, 0.01)',
    shadowColor: COLORS.textPrimary, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5, shadowRadius: 3, elevation: 4,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  scanBar: {
    position: 'absolute', left: 8, right: 8, top: 0, height: 3,
    backgroundColor: 'rgba(56,189,248,0.9)', borderRadius: 3,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 6,
  },
  helper: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  cameraPaused: {
    width: '100%', height: 320, borderRadius: 18, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    ...SHADOWS.card,
  },
  hint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  manualBox: { width: '100%', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: 0.3, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 0, borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 15, color: COLORS.textPrimary, marginBottom: 12,
    ...SHADOWS.card,
  },
  resultWrap: { width: '100%', marginTop: 8 },
  secondaryButton: {
    minHeight: 44, marginTop: 12, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  secondaryText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  // Manual tab: input + icon-only paste button share one row.
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inputFlex: { flex: 1 },
  pasteButton: {
    width: 48, height: 48, minHeight: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0,
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
  },
  // Check In: muted until a valid code is entered, vibrant blue after.
  checkInIdle: { backgroundColor: COLORS.textSecondary, borderColor: COLORS.border },
  checkInActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primaryDeep,
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 14, elevation: 8,
  },
});





