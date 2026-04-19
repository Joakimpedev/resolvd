// Locked design tokens. Every hex, radius, border-width, and spacing value
// used anywhere in the app MUST originate from this file.
// Do NOT change any value without a DECISION entry in ../../../issues-log.md.

export const colors = {
  // Backgrounds
  bgPrimary: '#F5F1E8',       // main app background, status bar, bottom nav
  surface: '#FBF8F1',          // all cards, list items, input containers
  surfaceRaised: '#EDE6D4',    // toggle bg, search input bg, stat-card raised variant

  // Text
  textPrimary: '#1A2420',      // headlines, primary content
  textSecondary: '#6B6558',    // metadata, body text, muted

  // Border
  border: '#E8E2D4',

  // Accents
  accentGreen: '#2D6A4F',
  accentGreenDark: '#1B4332',

  // Status badges
  greenBadgeBg: '#E1F0E8',     // "I arbeid"
  amberBadgeBg: '#F5E8D0',     // "Venter på deg"
  amberBadgeText: '#7A4F0E',
  neutralBadgeBg: '#EDE6D4',   // "Ferdig"
} as const;

export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  section: 20,
  between: 24,
} as const;

export const radii = {
  card: 14,
  listItem: 12,
  toggle: 10,
  pill: 20,
} as const;

export const borders = {
  default: 0.5,
  selected: 1.5,
} as const;

export const layout = {
  screenPaddingH: 20,
  statusBarHeight: 44,
  bottomNavHeight: 72,
  tapTargetMin: 44,
} as const;

export const opacity = {
  read: 0.85,
  locked: 0.6,
  completed: 0.7,
} as const;
