import type { TextStyle, ViewStyle } from 'react-native';

/**
 * CampusQR Attend — Modern Blue design tokens (presentation layer only).
 *
 * Single source of truth for the app palette. `constants/colors.ts` derives
 * its COLORS / SLATE / GRADIENTS / GLASS / DEPTH / NEUMO / SHEET tokens from
 * these values, so the whole app (Student, Teacher, Admin views) picks up the
 * theme in one place. No logic, routing, queries or state reads from here —
 * styling only.
 *
 * Palette (spec):
 *   Deep Royal Blue  #1E40AF  → primary headers, active tabs, CTA buttons
 *   Electric Blue    #3B82F6  → interactive accents, links, secondary accents
 *   Soft Ice Blue    #F0F5FA  → main background field
 *   White            #FFFFFF  → surface containers / cards / inputs
 *   Dark Slate       #0F172A  → heading text
 *   Cool Slate       #334155  → body / secondary text
 *
 * Event status pills stay soft pastel (spec):
 *   OPEN   #D1FAE5 (green)   CLOSED #FEE2E2 (red)   DRAFT #E0F2FE (blue)
 */
export const THEME = {
  // ---- Brand / Accents ------------------------------------------------
  /** Deep navy — primary headers, active tabs, CTAs. */
  primary: '#1E3A8A',
  /** Deeper navy for pressed states / dark gradients. */
  primaryDeep: '#1E293B',
  /** Lighter navy for hover states. */
  primaryLight: '#3B4A8A',
  /** Emerald green — high-priority CTAs (Scan QR, Approve, Present). */
  accent: '#059669',
  /** Deeper emerald for accent borders / pressed states. */
  accentDeep: '#047857',
  /** Contrast text color on accent elements. */
  onAccent: '#FFFFFF',
  /** Softer accent text color for subtle UI. */
  onAccentSoft: '#94A3B8',
  /** Accent border for outlines. */
  onAccentBorder: 'rgba(5, 150, 105, 0.20)',
  /** Subtle accent border for disabled states. */
  onAccentSubtle: 'rgba(5, 150, 105, 0.10)',
  /** Accent rule/border for segmented controls. */
  accentRule: 'rgba(5, 150, 105, 0.30)',

  // ---- Surfaces -------------------------------------------------------
  /** Soft off-white — main app background canvas. */
  background: '#F8FAFC',
  /** Solid white — surface containers, cards, inputs. */
  surface: '#FFFFFF',
  /** Translucent white card fill (glass sheets). */
  card: '#FFFFFF',
  /** Tab bar fill. */
  tabBar: '#FFFFFF',
  /** Opaque overlay for modals + dropdown menus. */
  modal: '#FFFFFF',
  /** Elevated surface for forms/tables/modals. */
  frosted: '#FFFFFF',
  /** Scrim dimming content behind open modal/menu. */
  scrim: 'rgba(15, 23, 42, 0.30)',

  // ---- Text -----------------------------------------------------------
  /** Off-black — headings and titles (WCAG AAA contrast). */
  headingText: '#0F172A',
  /** Dark slate — body / secondary text. */
  bodyText: '#475569',
  /** Spec alias — heading text. */
  textHeading: '#0F172A',
  /** Spec alias — body text. */
  textBody: '#475569',
  /** Muted / secondary text for light backgrounds. */
  textMuted: '#64748B',
  /** Strong text on light surface. */
  textStrong: '#0F172A',
  /** Default input background fill. */
  input: '#FFFFFF',
  /** Placeholder text color for light mode inputs. */
  textPlaceholder: '#94A3B8',
  /** Accent hairline for light mode. */
  borderAccentFaint: 'rgba(5, 150, 105, 0.20)',

  // ---- Lines / depth --------------------------------------------------
  /** Grey hairline border (#CBD5E1). */
  border: '#CBD5E1',
  /** Softer hairline. */
  borderSoft: 'rgba(203, 213, 225, 0.50)',
  /** Page/rimming border color. */
  rim: '#CBD5E1',
  /** QR code paper/background color. */
  qrPaper: '#F8FAFC',
  /** QR code paper edge border color. */
  qrPaperEdge: 'rgba(30, 58, 138, 0.15)',
  /** Neutral shadow tint — soft navy shadow. */
  shadow: '#0F172A',
  /** Cool grey-blue shadow used by soft-extrude surfaces. */
  neumorphicShadow: '#C3D2E3',
  
  // ---- State / appearance variants ----------------------------------------
  /** Light mode state appearance. */
  state: {
    /** Subtle tint for disabled/low-emphasis states. */
    tintSubtle: 'rgba(248, 250, 252, 0.80)',
    /** Faint tint for inactive/placeholder states. */
    tintFaint: 'rgba(248, 250, 252, 0.50)',
    /** Default state tint. */
    tint: 'rgba(248, 250, 252, 0.90)',
  },

  // ---- Event status pills (soft pastel, spec) -------------------------
  status: {
    /** OPEN — emerald pill. */
    openBg: '#D1FAE5',
    openFg: '#065F46',
    /** OPEN border color. */
    openBorder: 'rgba(5, 150, 105, 0.20)',
    /** OPEN bar accent color. */
    openBar: '#059669',
    /** CLOSED — red pill. */
    closedBg: '#FEE2E2',
    closedFg: '#991B1B',
    /** CLOSED border color. */
    closedBorder: 'rgba(239, 68, 68, 0.20)',
    /** CLOSED bar accent color. */
    closedBar: '#DC2626',
    /** DRAFT — blue pill. */
    draftBg: '#E0F2FE',
    draftFg: '#075985',
    /** Draft border color. */
    draftBorder: 'rgba(59, 130, 246, 0.20)',
    /** Draft bar accent color. */
    draftBar: '#3B82F6',
  },
  /** Status pill tone system. */
  tone: {
    neutral: {
      fg: '#64748B',
      bg: '#FFFFFF',
      border: 'rgba(203, 213, 225, 0.30)',
      solid: '#FFFFFF',
    },
    info: {
      fg: '#64748B',
      bg: 'rgba(248, 250, 252, 0.80)',
      border: 'rgba(30, 58, 138, 0.18)',
      solid: 'rgba(248, 250, 252, 0.80)',
    },
    success: {
      fg: '#065F46',
      bg: '#D1FAE5',
      border: 'rgba(5, 150, 105, 0.20)',
      solid: '#D1FAE5',
    },
    warning: {
      fg: '#991B1B',
      bg: '#FEE2E2',
      border: 'rgba(239, 68, 68, 0.20)',
      solid: '#FEE2E2',
    },
    danger: {
      fg: '#075985',
      bg: '#E0F2FE',
      border: 'rgba(59, 130, 246, 0.20)',
      solid: '#E0F2FE',
    },
  },
  /** Success status pill (OPEN - emerald). */
  success: {
    fg: '#065F46',
    bg: '#D1FAE5',
    border: 'rgba(5, 150, 105, 0.20)',
  },
  /** Warning status pill (CLOSED - red). */
  warning: {
    fg: '#991B1B',
    bg: '#FEE2E2',
    border: 'rgba(239, 68, 68, 0.20)',
  },
  /** Draft status pill (DRAFT - blue). */
  danger: {
    fg: '#075985',
    bg: '#E0F2FE',
    border: 'rgba(59, 130, 246, 0.20)',
  },
  /** Chip border accent. */
  borderAccent: 'rgba(5, 150, 105, 0.16)',
  /** Softer chip border accent. */
  borderAccentSoft: 'rgba(5, 150, 105, 0.10)',
  /** Elevated surface variant. */
  surfaceRaised: '#FFFFFF',
  /** Depressed surface variant. */
  surfaceSunken: '#F1F5F9',
} as const;

export type Theme = typeof THEME;

/**
 * Strongly typed typography scale (styling-only). Sizes/weights for the
 * corporate fintech look — headings in dark slate, body in cool slate.
 */
export const TYPOGRAPHY = {
  /** Hero / splash display text. */
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, color: THEME.textHeading },
  /** Screen H1 (e.g. "Welcome Back"). */
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, color: THEME.textHeading },
  /** Section H2. */
  h2: { fontSize: 20, fontWeight: '700', color: THEME.textHeading },
  /** Card / sheet title. */
  title: { fontSize: 17, fontWeight: '700', color: THEME.textHeading },
  /** Primary body copy. */
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21, color: THEME.textBody },
  /** Secondary / meta copy. */
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18, color: THEME.textBody },
  /** Form labels. */
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, color: THEME.textHeading },
  /** Button text (always white on blue). */
  button: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4, color: '#FFFFFF' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof TYPOGRAPHY;

/**
 * Strongly typed shadow recipes (styling-only). Blue-tinted soft drop
 * shadows for the corporate fintech depth language.
 */
export const SHADOWS = {
  /** Barely-there lift for chips / small tiles. */
  soft: {
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  /** Event / content cards on the white sheet. */
  card: {
    shadowColor: THEME.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  /** Rounded white sheet overlays. */
  sheet: {
    shadowColor: THEME.primaryDeep,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
  /** Floating action elements (raised above the tab bar). */
  floating: {
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  /** Scan QR circular FAB. */
  fab: {
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
} as const satisfies Record<string, ViewStyle>;

export type ShadowVariant = keyof typeof SHADOWS;
