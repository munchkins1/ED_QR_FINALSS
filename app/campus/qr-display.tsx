import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AnimatedPressable from '@/components/AnimatedPressable';
import QRDisplay from '@/components/QRDisplay';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/CampusToast';
import { COLORS, NEUMO } from '@/constants/colors';
import { getEventById, qrPayload, setEventStatus } from '@/lib/campusqr/events';
import { formatDateTime } from '@/lib/campusqr/format';
import type { EventRow } from '@/types/database';

/** CampusQR QR display (spec Phase 3): fullscreen-friendly code + copy fallback. */
export default function CampusQrDisplayScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    const row = await getEventById(eventId);
    setEvent(row);
    setLoading(false);
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCopy = () => {
    if (!event) return;
    // No new clipboard dependency: the QRDisplay caption already shows the
    // full CAMPUSQR:<token> payload, which students type into the scan
    // screen's manual-code input.
    toast.info('Type the code shown under the QR into the Scan screen.');
  };

  const handleToggle = async () => {
    if (!event) return;
    setBusy(true);
    try {
      const next = event.status === 'open' ? 'closed' : 'open';
      const { error } = await setEventStatus(event.id, next);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(next === 'open' ? 'Event opened.' : 'Event closed.');
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.hint}>Loading event...</Text>
          </View>
        ) : !event ? (
          <View style={styles.center}>
            <Text style={styles.title}>Event not found</Text>
            <AnimatedPressable style={styles.secondaryButton} onPress={() => router.back()}>
              <Text style={styles.secondaryText}>Go back</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{event.name}</Text>
              <StatusPill
                label={event.status}
                tone={
                  event.status === 'open'
                    ? 'success'
                    : event.status === 'closed'
                    ? 'danger'
                    : 'warning'
                }
              />
            </View>
            <Text style={styles.meta}>{formatDateTime(event.start_datetime)}</Text>
            {event.venue ? <Text style={styles.meta}>{event.venue}</Text> : null}
            {event.status === 'closed' && (
              <View style={styles.closedNotice}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.closedNoticeText}>
                  This event is closed — students can no longer check in.
                </Text>
              </View>
            )}
            <View style={styles.qrWrap}>
              <QRDisplay value={qrPayload(event)} size={264} caption={qrPayload(event)} />
            </View>
            <AnimatedPressable style={styles.secondaryButton} onPress={handleCopy}>
              <View style={styles.secondaryIcon}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.secondaryText}>How do students check in?</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.secondaryButton} onPress={handleToggle} disabled={busy}>
              <View style={styles.secondaryIcon}>
                <Ionicons
                  name={event.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
                  size={18}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.secondaryText}>
                {busy ? 'Working...' : event.status === 'open' ? 'Close event' : 'Open event'}
              </Text>
            </AnimatedPressable>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, width: '100%' },
  title: { fontSize: 22, fontWeight: '800', color: NEUMO.title, letterSpacing: -0.3, flex: 1 },
  meta: { fontSize: 13, color: COLORS.textSecondary, width: '100%', marginBottom: 2 },
  hint: { fontSize: 14, color: COLORS.textSecondary },
  qrWrap: { marginVertical: 24, width: '100%' },
  closedNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: 'rgba(220, 38, 38, 0.10)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.30)',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  closedNoticeText: { flex: 1, fontSize: 13, color: COLORS.danger, fontWeight: '700', lineHeight: 18 },
  // Soft-glass action rows — same extruded recipe as the fields.
  secondaryButton: {
    minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEUMO.surface, borderRadius: NEUMO.inputRadius,
    borderWidth: 0, borderTopWidth: 1, borderTopColor: NEUMO.highlight,
    marginBottom: 10, position: 'relative',
    shadowColor: NEUMO.darkShadow, shadowOffset: NEUMO.extrudeOffset,
    shadowOpacity: NEUMO.extrudeOpacity, shadowRadius: NEUMO.extrudeRadius, elevation: 3,
  },
  secondaryIcon: { position: 'absolute', left: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.primary, textAlign: 'center', paddingHorizontal: 32 },
});
