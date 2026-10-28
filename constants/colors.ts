import { THEME } from './theme';

/**
 * CampusQR Attend design tokens — cohesive modern UI.
 *
 * Single source of truth for the app palette. Every screen reads from COLORS /
 * SLATE / GRADIENTS / GLASS / DEPTH / NEUMO / SHEET so the visual language is
 * applied in one place.
 *
 * All values derive from constants/theme.ts (presentation layer only):
 *   Deep Navy     #1E3A8A → primary headers, active tabs, CTA buttons
 *   Emerald Green #059669 → high-priority CTAs (Scan QR, Approve, Present)
 *   Off-White     #F8FAFC → main background canvas
 *   White         #FFFFFF → surface containers / cards / inputs
 *   Off-Black     #0F172A → heading text (WCAG AAA contrast)
 *   Slate         #475569 → body / secondary text
 *   Placeholder   #94A3B8 → input placeholder text
 */

export const COLORS = {
  // ---- Brand / Accents ------------------------------------------------
  primary: THEME.primary, // Deep navy — brand, CTA buttons, active tabs, links
  primaryDeep: THEME.primaryDeep, // Deeper shade for pressed states
  primaryLight: THEME.primaryLight, // Lighter navy for hover/gradients

  /** Emerald green — high-priority CTAs (Scan QR, Approve, Present). */
  accent: THEME.accent,
  accentDeep: THEME.accentDeep, // Deeper emerald for accent borders
  blue: THEME.accent, // gradient partner / info glow

  // ---- Surfaces ------------------------------------------------------
  /** Off-white canvas background (#F8FAFC). */
  background: THEME.background,
  /** Base fill using off-white canvas. */
  bgBase: THEME.background,
  /** Solid white card surface — primary card fill. */
  card: THEME.card,
  /** Softer surface for subtle containers. */
  surface: THEME.surface,
  /** Solid Deep Navy — nav bars, dark panels, header bar. */
  dark: THEME.primary,
  /** Opaque overlay for modals + dropdown menus. */
  modal: THEME.modal,
  /** Scrim dimming content behind open modal/menu. */
  scrim: THEME.scrim,
  /** Elevated surface for forms/tables/modals. */
  frosted: THEME.frosted,

  // ---- Text -----------------------------------------------------------
  textPrimary: THEME.headingText, // Off-black — primary text
  textSecondary: THEME.bodyText, // Slate for secondary text
  textMuted: THEME.textMuted, // Muted text for light backgrounds
  textOnPrimary: '#FFFFFF', // White text on navy CTA buttons
  textOnLight: THEME.headingText, // Off-black text on light panels
  textPlaceholder: THEME.textPlaceholder, // Placeholder text color for light mode inputs
  textHeading: THEME.textHeading, // Heading text
  textStrong: THEME.textStrong, // Strong text on light surface

  // ---- Lines / depth --------------------------------------------------
  border: THEME.border, // Grey hairline border
  borderSoft: THEME.borderSoft,
  borderDark: 'rgba(255, 255, 255, 0.16)',
  shadow: THEME.shadow,

  // ---- Status ---------------------------------------------------------
  success: '#059669', // emerald — success / present / open
  warning: '#DC2626', // red — late / warning
  danger: '#DC2626', // red — errors / destructive / absent
  info: '#1E3A8A', // deep navy — info toasts
  neutral: '#64748B', // muted slate — closed / draft / neutral
  sky: '#3B82F6', // blue — excused

  /** Tone → { bg: 20% tint background, border: hairline border } */
  tone: {
    success: { fg: '#065F46', bg: 'rgba(5, 150, 105, 0.20)', border: 'rgba(5, 150, 105, 0.30)' },
    warning: { fg: '#991B1B', bg: 'rgba(239, 68, 68, 0.20)', border: 'rgba(239, 68, 68, 0.30)' },
    danger: { fg: '#991B1B', bg: 'rgba(220, 38, 38, 0.20)', border: 'rgba(220, 38, 38, 0.30)' },
    info: { fg: '#1E3A8A', bg: 'rgba(30, 58, 138, 0.20)', border: 'rgba(30, 58, 138, 0.30)' },
    neutral: { fg: '#334155', bg: 'rgba(100, 116, 139, 0.20)', border: 'rgba(100, 116, 139, 0.30)' },
    sky: { fg: '#1D4ED8', bg: 'rgba(59, 130, 246, 0.20)', border: 'rgba(59, 130, 246, 0.30)' },
  },

  // ---- Toast solid backgrounds (600 shades for contrast) --------------
  toastSuccess: '#059669',
  toastError: '#DC2626',
  toastInfo: '#1E3A8A',
  toastWarning: '#DC2626',

  /** QR dark modules — QR always renders dark-on-white. */
  qrInk: '#0f172a',
} as const;

/** Cohesive modern UI (new visual language). Cards use white surfaces with grey hairline borders; nav/header use Deep Navy. */
export const SLATE = {
  base: THEME.primary,
  card: THEME.card,
  cardSolid: THEME.surface,
  landingCard: '#FFFFFF',
  tabBar: THEME.tabBar,
  border: THEME.border,
  indigo: THEME.primary,
  indigoLight: THEME.primaryLight,
  cyan: THEME.accent,
  emerald: '#059669',
  emeraldLight: '#34D399',
  amber: '#DC2626',
  rose: '#DC2626',
  muted: THEME.bodyText,
} as const;

/** Brand gradients (Deep Navy + Emerald). */
export const GRADIENTS = {
  /** Logo / app mark (Deep Navy → Emerald). */
  brand: [THEME.primary, THEME.accent] as const,
  /** Personnel (teacher/admin) buttons (deep navy). */
  personnel: [THEME.primary, THEME.primaryDeep] as const,
  /** Student buttons (emerald family, on-palette). */
  student: [THEME.accent, THEME.primary] as const,
  /** Header (deep navy → lighter navy). Styling-only. */
  header: [THEME.primary, THEME.primaryLight] as const,
  /** Scan FAB (emerald family). Styling-only. */
  scanFab: [THEME.accent, THEME.accentDeep] as const,
  /** Soft-glass primary pill (deep navy). Styling-only. */
  primary: [THEME.primary, THEME.primaryLight] as const,
} as const;

/** The exact CSS radial gradient used on web (Off-White canvas). */
export const WEB_BACKGROUND_CSS = 'radial-gradient(ellipse 80% 60% at 50% 30%, #FFFFFF 0%, #F8FAFC 100%)';

/** Glassmorphism recipes (white glass, grey hairlines, soft navy shadows). */
export const GLASS = {
  card: {
    overlay: 'rgba(255, 255, 255, 0.88)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    intensity: 40,
    radius: 16,
  },
  soft: {
    overlay: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    intensity: 30,
    radius: 16,
  },
  dark: {
    overlay: 'rgba(30, 58, 138, 0.94)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    intensity: 34,
    radius: 16,
  },
} as const;

export type GlassVariant = keyof typeof GLASS;

/** Returns `#rrggbb` with the given alpha (0..1) as an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 3D depth layer (UI/UX polish). Built ONLY from white/navy overlays and
 * the palette colors already defined above — no new hues, no token values
 * changed. Used by button glow shadows to give surfaces a subtle depth.
 */
export const DEPTH = {
  /** Specular highlight on the top of a glass/button surface. */
  specularTop: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] as const,
  /** Softer sheen for the header / smaller marks. */
  sheenSoft: ['rgba(255,255,255,0.40)', 'rgba(255,255,255,0)'] as const,
  /** Inner shading along the bottom of a glass pane (thickness). */
  innerBottom: ['rgba(30,58,138,0)', 'rgba(30,58,138,0.10)'] as const,
  /** Beveled edge: lighter top hairline than the sides. */
  bevelTop: 'rgba(255,255,255,0.55)',

  /** Button glow shadows — tinted to navy/emerald, not pure black. */
  glowPersonnel: THEME.primary,
  glowStudent: THEME.accent,
} as const;

/**
 * Soft Glass / Neumorphic tokens (styling-only): ultra-soft cool-grey
 * field with smooth extruded surfaces. RN renders one shadow set per
 * View, so the "dual" look = dark soft shadow + a 1px light top hairline
 * (see usage comments). No logic reads these — presentation only.
 */
export const NEUMO = {
  background: THEME.background,
  surface: THEME.surface,
  darkShadow: THEME.neumorphicShadow,
  lightShadow: '#FFFFFF',
  title: THEME.headingText,
  inputRadius: 20,
  cardRadius: 20,
  pillRadius: 999,
  extrudeOffset: { width: 3, height: 3 },
  extrudeOpacity: 0.15,
  extrudeRadius: 8,
  extrudeElevation: 4,
  highlight: 'rgba(255, 255, 255, 0.7)',
} as const;

/**
 * Fintech white-sheet tokens (styling-only): clean white container sheets
 * with soft drop shadows that tuck under the gradient header curve.
 * Rounded 32pt top corners (spec). No logic reads these — presentation only.
 */
export const SHEET = {
  background: THEME.surface,
  radius: 32,
  overlap: -12,
  padding: 16,
  shadowColor: THEME.primaryDeep,
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.1,
  shadowRadius: 16,
  elevation: 8,
} as const;

/**
 * Shared spacing / radius / button-size tokens so every screen lays out its
 * buttons and cards with one rhythm (instead of ad-hoc 6/8/10pt gaps and
 * 44/48pt heights drifting per file).
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  /** Gap between sibling buttons inside an action row. */
  buttonGap: 8,
  /** Gap between list cards. */
  cardGap: 12,
  /** Top inset before a list that sits below a control bar (Create/filters). */
  listTop: 12,
} as const;

export const RADIUS = {
  button: 12,
  card: 16,
  pill: 999,
  /** Bottom-nav active button surface. */
  nav: 14,
} as const;

export const BTN = {
  /** Primary / full-width CTA touch height. */
  primary: 48,
  /** Secondary / inline action touch height. */
  secondary: 44,
} as const;
