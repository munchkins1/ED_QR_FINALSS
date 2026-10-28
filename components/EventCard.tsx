import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { formatDateTime } from '@/lib/campusqr/format';
import { COLORS, NEUMO } from '@/constants/colors';
import { SHADOWS } from '@/constants/theme';
import type { EventRow, EventStatus } from '@/types/database';

/**
 * Status pills for the student events list: a tinted pill background + a
 * matching hairline, with the event-status bar color on the card edge. All
 * three come from the shared semantic tokens so the badge stays legible on
 * the navy field (see `THEME.status`).
 */
const BADGE_TONE: Record<EventStatus, { bg: string; fg: string; border: string; bar: string }> = {
  open: { bg: COLORS.tone.success.bg, fg: COLORS.success, border: COLORS.tone.success.border, bar: COLORS.success },
  closed: { bg: COLORS.tone.warning.bg, fg: COLORS.warning, border: COLORS.tone.warning.border, bar: COLORS.warning },
  draft: { bg: COLORS.tone.danger.bg, fg: COLORS.primaryDeep, border: COLORS.tone.danger.border, bar: COLORS.primary },
};

type Props = {
  event: EventRow;
};

/**
 * Student-only event card (spec, `userRole === 'student'`):
 *   - title + pastel status badge top-aligned in the header row,
 *   - location with a pin icon (row hidden when no venue),
 *   - date/time with a calendar icon (falls back to "Not set"),
 *   - description at the bottom of the card.
 * Teacher/admin keep the legacy inline card in events.tsx.
 *
 * Memoized: the student list re-renders on filter and realtime ticks;
 * unchanged rows skip re-rendering because the `event` prop identity is
 * preserved for untouched records between loads.
 */
function EventCardInner({ event }: Props) {
  const tone = BADGE_TONE[event.status] ?? BADGE_TONE.draft;
  return (
    <View style={styles.card}>
      {/* Left status indicator (spec): colored bar keyed to event status. */}
      <View style={[styles.statusBar, { backgroundColor: tone.bar }]} />
      <View style={styles.body}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.name}</Text>
        <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.badgeText, { color: tone.fg }]}>{event.status}</Text>
        </View>
      </View>

      {event.venue ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
        <Text style={styles.meta}>{formatDateTime(event.start_datetime)}</Text>
      </View>

      {event.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {event.description}
        </Text>
      ) : null}
      </View>
    </View>
  );
}

const EventCard = memo(EventCardInner);

export default EventCard;

const styles = StyleSheet.create({
  // Raised slate card on the navy field: translucent surface, soft drop
  // shadow, rounded corners, with a status-colored left indicator bar.
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: NEUMO.cardRadius,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  /** Left status indicator — 5pt bar keyed to the event status. */
  statusBar: {
    width: 5,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  /** Title left + badge right, both pinned to the TOP even when wrapped. */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    shadowColor: SHADOWS.soft.shadowColor,
    shadowOffset: SHADOWS.soft.shadowOffset,
    shadowOpacity: SHADOWS.soft.shadowOpacity,
    shadowRadius: SHADOWS.soft.shadowRadius,
    marginTop: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meta: { fontSize: 13, color: COLORS.textSecondary, flexShrink: 1 },
  description: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
});