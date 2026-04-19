import { TextStyle } from 'react-native';
import { colors } from './tokens';

export const fontFamily = {
  regular: 'Syne_400Regular',
  medium: 'Syne_500Medium',
  bold: 'Syne_800ExtraBold',
} as const;

// Typography scale. Apply these to <Text style={type.*}>. Do NOT reinvent
// fontSize / fontFamily / letterSpacing inline anywhere else.
export const type = {
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 26,
    color: colors.textPrimary,
  } as TextStyle,

  onboardingHeadline: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
    color: colors.textPrimary,
  } as TextStyle,

  greeting: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
    color: colors.textPrimary,
  } as TextStyle,

  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 21,
    color: colors.textPrimary,
  } as TextStyle,

  cardTitleSmall: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 19,
    color: colors.textPrimary,
  } as TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  } as TextStyle,

  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  } as TextStyle,

  rowText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
  } as TextStyle,

  lessonTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  } as TextStyle,

  // Section label — 1px letter-spacing uppercase (MELDINGER, MIN SIDE, DIN AKTIVITET, etc.)
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  } as TextStyle,

  // Small label — 0.5px letter-spacing uppercase (STEG 1 AV 1, AKTIVE, FULLFØRT, NESTE · 5 MIN, etc.)
  smallLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  } as TextStyle,

  // Status pill on lesson cards (NESTE · 5 MIN, LÅST · 7 MIN, FULLFØRT) — 10px
  statusPill: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  meta: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  } as TextStyle,

  metaSmall: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  } as TextStyle,

  statNumber: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 20,
    color: colors.textPrimary,
  } as TextStyle,

  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
  } as TextStyle,

  badge: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
  } as TextStyle,

  logo: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  } as TextStyle,

  link: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.accentGreen,
  } as TextStyle,

  linkMuted: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  } as TextStyle,

  // Used inside the primary Button (large variant)
  buttonLarge: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.bgPrimary,
  } as TextStyle,

  // Used inside the primary Button (small variant — Meldinger +Ny forespørsel)
  buttonSmall: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.bgPrimary,
  } as TextStyle,

  // AI-skolen progress count on Min side ("3 / 12") — 12px weight 500
  progressCount: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.accentGreen,
  } as TextStyle,
} as const;
