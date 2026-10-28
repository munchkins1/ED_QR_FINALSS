import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import type { AttendanceStatus, EventStatus, UserRole } from '@/types/database';

/**
 * Status pill badges shared by every CampusQR screen.
 * Visual language (spec B2): colored text on a ~20% tint with a matching
 * hairline border, uppercase + tracking — always readable on dark glass.
 */

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'sky';

/** Tone → { fg: label color, bg: tint fill, border: hairline } from the theme. */
const TONE_STYLE: Record<PillTone, { fg: string; bg: string; border: string }> = {
  success: { fg: COLORS.success, bg: COLORS.tone.success.bg, border: COLORS.tone.success.border },
  warning: { fg: COLORS.warning, bg: COLORS.tone.warning.bg, border: COLORS.tone.warning.border },
  danger: { fg: COLORS.danger, bg: COLORS.tone.danger.bg, border: COLORS.tone.danger.border },
  info: { fg: COLORS.textSecondary, bg: '#F8FAFF', border: 'rgba(100, 116, 139, 0.20)' },
  neutral: { fg: COLORS.textSecondary, bg: '#FFFFFF', border: 'rgba(101, 131, 168, 0.20)' },
  /** "Excused" reads as the info (sky) tone. */
  sky: { fg: COLORS.textSecondary, bg: '#F8FAFF', border: 'rgba(100, 116, 139, 0.20)' },
};

export function eventStatusTone(status: EventStatus): PillTone {
  switch (status) {
    case 'open':
      return 'success';
    case 'draft':
      return 'warning';
    case 'closed':
      return 'neutral';
  }
}

export function attendanceStatusTone(status: AttendanceStatus): PillTone {
  switch (status) {
    case 'present':
      return 'success';
    case 'late':
      return 'warning';
    case 'absent':
      return 'danger';
    case 'excused':
      return 'sky';
  }
}

export function roleTone(role: UserRole): PillTone {
  switch (role) {
    case 'admin':
      return 'danger';
    case 'teacher':
      return 'info';
    case 'student':
      return 'warning';
  }
}

type Props = {
  label: string;
  tone?: PillTone;
};

export default function StatusPill({ label, tone = 'neutral' }: Props) {
  const t = TONE_STYLE[tone];
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 999,
    // Soft tone-tinted glow so the badge lifts off the card.
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
