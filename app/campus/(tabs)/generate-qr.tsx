import { useCallback, useState } from 'react';
import {
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';

import AnimatedPressable from '@/components/AnimatedPressable';
import Dropdown from '@/components/Dropdown';
import EmptyState from '@/components/EmptyState';
import ScreenSheet from '@/components/ScreenSheet';
import ScreenTransition from '@/components/ScreenTransition';
import { useToast } from '@/components/CampusToast';
import { COLORS, SPACING } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { listVisibleEvents, qrPayload } from '@/lib/campusqr/events';
import { formatDateTime } from '@/lib/campusqr/format';
import {
  useCampusRealtime,
  useRealtimeStatusToast,
} from '@/lib/campusqr/realtime';
import { useCampusRole } from '@/lib/campusqr/roles';
import type { EventRow } from '@/types/database';

/**
 * Generate QR (teacher, spec Phase 4): pick one of your events and project
 * its QR code (CAMPUSQR:<token>) for students to scan. Only `open` events
 * accept check-ins, so non-open events show a friendly guard note.
 * Live-refreshes with the shared realtime channel.
 */
export default function GenerateQrScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useCampusRole();
  const toast = useToast();
  const router = useRouter();
  const onStatus = useRealtimeStatusToast(toast);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const rows = await listVisibleEvents(role, user?.id ?? null);
    setEvents(rows);
    setSelectedId((current) =>
      current && rows.some((event) => event.id === current)
        ? current
        : (rows[0]?.id ?? '')
    );
    setLoading(false);
  }, [role, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useCampusRealtime(
    (change) => {
      if (change.table === 'events') load();
    },
    onStatus
  );

  const selected = events.find((event) => event.id === selectedId) ?? null;

  return (
    <View style={styles.container}>
      <ScreenSheet>
      <ScreenTransition style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Generate QR</Text>

        {loading ? (
          <Text style={styles.hint}>Loading events...</Text>
        ) : events.length === 0 ? (
          <EmptyState
            icon="qr-code-outline"
            title="No events yet"
            message="Create an event first, then open it to generate its QR code."
          />
        ) : (
          <>
            <Dropdown
              label="Event"
              value={selectedId}
              options={events.map((event) => ({
                label: `${event.name} (${event.status})`,
                value: event.id,
              }))}
              onChange={setSelectedId}
            />

            {selected ? (
              <>
                <View style={styles.mainCard}>
                  <Text style={styles.eventName}>{selected.name}</Text>
                  <Text style={styles.meta}>{formatDateTime(selected.start_datetime)}</Text>
                  {selected.venue ? <Text style={styles.meta}>{selected.venue}</Text> : null}
                  {selected.status !== 'open' ? (
                    <View style={styles.guard}>
                      <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                      <Text style={styles.guardText}>
                        Open the event first — students can only check in while it is open.
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.qrPad}>
                    <QRCode
                      value={qrPayload(selected)}
                      size={230}
                      backgroundColor={COLORS.textOnPrimary}
                      color={COLORS.textPrimary}
                      quietZone={8}
                      ecl="H"
                    />
                  </View>
                  <View style={styles.codePill}>
                    <Text style={styles.codeText}>{qrPayload(selected).replace('CAMPUSQR:', '')}</Text>
                  </View>
                  <View style={styles.qrMetaRow}>
                    <View style={styles.tipRow}>
                      <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.tipText}>Project this code for students to scan while the event is open</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <AnimatedPressable
                    style={[styles.actionBtn]}
                    outerStyle={styles.actionBtnOuter}
                    onPress={() => router.push(`/campus/qr-display?id=${selected.id}`)}
                    glowColor={COLORS.primary}
                    accessibilityRole="button"
                    accessibilityLabel="Fullscreen"
                  >
                    <Ionicons name="expand-outline" size={18} color={COLORS.textOnPrimary} />
                    <Text style={styles.actionBtnText}>Fullscreen</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.actionBtn]}
                    outerStyle={styles.actionBtnOuter}
                    onPress={() => {
                      Clipboard.setString(qrPayload(selected).replace('CAMPUSQR:', ''));
                      toast.success('Code copied to clipboard');
                    }}
                    glowColor={COLORS.primary}
                    accessibilityRole="button"
                    accessibilityLabel="Copy Code"
                  >
                    <Ionicons name="copy-outline" size={18} color={COLORS.textOnPrimary} />
                    <Text style={styles.actionBtnText}>Copy Code</Text>
                  </AnimatedPressable>
                </View>
              </>
            ) : null}
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
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, alignItems: 'stretch' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  hint: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  selectorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft, padding: 14, marginBottom: 12,
  },
  selectorTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeOpen: { backgroundColor: COLORS.tone.success.bg, borderColor: COLORS.tone.success.border },
  badgeClosed: { backgroundColor: COLORS.tone.danger.bg, borderColor: COLORS.tone.danger.border },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  badgeOpenText: { color: COLORS.tone.success.fg },
  badgeClosedText: { color: COLORS.tone.danger.fg },
  mainCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, alignItems: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  eventName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'center' },
  guard: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderSoft, borderTopColor: COLORS.borderSoft,
    paddingHorizontal: 12, paddingVertical: 10, width: '100%',
  },
  guardText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  qrPad: {
    marginTop: 16, backgroundColor: COLORS.textOnPrimary, padding: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.borderSoft,
  },
  codePill: {
    marginTop: 14, backgroundColor: '#F8FAFC', padding: 10,
    borderRadius: 10,
    width: '100%',
  },
  codeText: { color: COLORS.textPrimary, fontWeight: '700', textAlign: 'center', fontSize: 13, fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', gap: SPACING.buttonGap, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 13, minHeight: 48,
    backgroundColor: '#1E3A8A',
  },
  // The outer Pressable must also flex so both buttons split the full row width.
  actionBtnOuter: { flex: 1 },
  actionBtnText: { color: COLORS.textOnPrimary, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  qrMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Keeps the icon aligned with the first line of text,
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'left',       // Changes text alignment to left-aligned,
    lineHeight: 18,
    flex: 1,                 // Allows the text to wrap properly next to the icon,
  },
});

