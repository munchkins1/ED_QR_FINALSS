import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { SHADOWS } from '@/constants/theme';

export type ResultTone = 'success' | 'error' | 'warning' | 'info' | 'neutral';

/**
 * Tone → color mapping. Backgrounds are the tone at low alpha with a
 * matching border so the panel reads as a frosted glass surface on the
 * dark radial background (spec B2 result panels).
 */
const TONE_STYLE: Record<ResultTone, { fg: string; bg: string; border: string }> = {
  success: { fg: COLORS.tone.success.fg, bg: COLORS.tone.success.bg, border: COLORS.tone.success.border },
  error: { fg: COLORS.tone.danger.fg, bg: COLORS.tone.danger.bg, border: COLORS.tone.danger.border },
  warning: { fg: COLORS.tone.warning.fg, bg: COLORS.tone.warning.bg, border: COLORS.tone.warning.border },
  info: { fg: COLORS.tone.info.fg, bg: COLORS.tone.info.bg, border: COLORS.tone.info.border },
  neutral: { fg: COLORS.tone.neutral.fg, bg: COLORS.tone.neutral.bg, border: COLORS.tone.neutral.border },
};

type Props = {
  tone: ResultTone;
  title?: string;
  message: string;
  children?: React.ReactNode;
};

/**
 * Persistent result panel (spec UX): shown after a scan while the
 * scanner stays stopped; carries the exact result copy plus actions
 * (e.g. the "Scan again" button rendered by the caller).
 */
export default function ResultPanel({ tone, title, message, children }: Props) {
  const t = TONE_STYLE[tone];
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: t.bg, borderColor: t.border },
      ]}
    >
      {title ? (
        <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
      ) : null}
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 20,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    // Frosted lift so the result reads as a glass panel on the sheet.
    ...SHADOWS.card,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
});
