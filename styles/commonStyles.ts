
import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';

// Premium color palette inspired by modern SaaS applications
export const colors = {
  // Primary Blues - Professional and trustworthy
  primary: '#2563EB',          // Modern Blue (Tailwind Blue-600)
  primaryDark: '#1E40AF',      // Darker Blue (Tailwind Blue-700)
  primaryLight: '#60A5FA',     // Lighter Blue (Tailwind Blue-400)
  primaryPale: '#DBEAFE',      // Very light blue (Tailwind Blue-100)

  // Secondary Colors
  secondary: '#7C3AED',        // Purple accent (Tailwind Violet-600)
  accent: '#06B6D4',           // Cyan for highlights (Tailwind Cyan-500)

  // Status Colors
  success: '#10B981',          // Modern Green (Tailwind Emerald-500)
  successLight: '#D1FAE5',     // Light green background (Tailwind Emerald-100)
  successDark: '#059669',      // Dark green (Tailwind Emerald-600)
  warning: '#F59E0B',          // Warm Amber (Tailwind Amber-500)
  warningLight: '#FEF3C7',     // Light amber background (Tailwind Amber-100)
  warningDark: '#D97706',      // Dark amber (Tailwind Amber-600)
  danger: '#EF4444',           // Modern Red (Tailwind Red-500)
  dangerLight: '#FEE2E2',      // Light red background (Tailwind Red-100)
  dangerDark: '#DC2626',       // Dark red (Tailwind Red-600)
  info: '#3B82F6',             // Info Blue (Tailwind Blue-500)
  infoLight: '#DBEAFE',        // Light blue background (Tailwind Blue-100)
  error: '#EF4444',            // Error Red (alias for danger)

  // Neutral Colors - Premium Slate palette
  background: '#F8FAFC',       // Slate 50 - Off-white background
  backgroundAlt: '#F1F5F9',    // Slate 100 - Slightly darker background
  card: '#FFFFFF',             // Pure white for cards
  surface: '#FFFFFF',          // Surface color
  surfaceHover: '#F8FAFC',     // Subtle hover state

  // Text Colors - Slate palette for readability
  text: '#0F172A',             // Slate 900 - Primary text
  textSecondary: '#475569',    // Slate 600 - Secondary text
  textTertiary: '#94A3B8',     // Slate 400 - Tertiary text
  textInverse: '#FFFFFF',      // White text for dark backgrounds
  textMuted: '#CBD5E1',        // Slate 300 - Very light text

  // Border Colors
  border: '#E2E8F0',           // Slate 200 - Light border
  borderLight: '#F1F5F9',      // Slate 100 - Very light border
  borderDark: '#CBD5E1',       // Slate 300 - Darker border for emphasis

  // Shadow Colors
  shadow: 'rgba(15, 23, 42, 0.1)',      // Slate 900 at 10%
  shadowLight: 'rgba(15, 23, 42, 0.05)', // Slate 900 at 5%
  shadowDark: 'rgba(15, 23, 42, 0.2)',   // Slate 900 at 20%

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.6)',     // Slate 900 at 60%
  overlayLight: 'rgba(15, 23, 42, 0.3)', // Slate 900 at 30%
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

export const typography = {
  // Size scale
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  // Weight scale
  weights: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Predefined text styles
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.15,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  smallMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
};

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

// Helper function to get contrasting color
export const getContrastColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? colors.text : colors.textInverse;
};

// Premium shadow system with platform-specific optimizations
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
    web: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  }),
  '2xl': Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
    web: {
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
  }),
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(shadows.md as any),
  },
  secondary: {
    backgroundColor: colors.card,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(shadows.xs as any),
  },
  success: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(shadows.md as any),
  },
  danger: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(shadows.md as any),
  },
  warning: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...(shadows.md as any),
  },
  outline: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  floating: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.xl as any),
  },
  iconButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.xs as any),
  },
  iconButtonPrimary: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    ...(shadows.md as any),
  },
  iconButtonDanger: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    ...(shadows.md as any),
  },
  iconButtonSuccess: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    ...(shadows.md as any),
  },
  iconButtonWarning: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    ...(shadows.md as any),
  },
  backButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.xs as any),
  },
  smallActionButton: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    ...(shadows.sm as any),
  },
  smallActionButtonDanger: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    ...(shadows.sm as any),
  },
  smallActionButtonSuccess: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    ...(shadows.sm as any),
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(shadows.xs as any),
  },
  filterButtonActive: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...(shadows.md as any),
  },
  quickSelectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...(shadows.xs as any),
  },
  quickSelectButtonActive: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...(shadows.md as any),
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webModalOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: colors.overlay,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  webModalContainer: {
    zIndex: 10000,
    position: 'relative' as any,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xxl,
    maxHeight: '92vh',
    maxWidth: '92vw',
    overflow: 'hidden',
    ...(shadows['2xl'] as any),
  },
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  contentPadded: {
    flex: 1,
    padding: spacing.xl + spacing.sm,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    backgroundColor: colors.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...(shadows.sm as any),
  },
  cardElevated: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginVertical: spacing.md,
    ...(shadows.lg as any),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
    minHeight: 48,
    ...(shadows.xs as any),
  },
  textInputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    ...(shadows.sm as any),
  },
  badge: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.round,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xl,
  },
  dividerLight: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  shadow: shadows.md as any,
  shadowSm: shadows.sm as any,
  shadowLg: shadows.lg as any,
  shadowXl: shadows.xl as any,
});

export const statusColors = {
  pending: {
    bg: colors.warningLight,
    text: colors.warningDark,
    border: colors.warning
  },
  'in-progress': {
    bg: colors.infoLight,
    text: colors.primaryDark,
    border: colors.info
  },
  completed: {
    bg: colors.successLight,
    text: colors.successDark,
    border: colors.success
  },
  overdue: {
    bg: colors.dangerLight,
    text: colors.dangerDark,
    border: colors.danger
  },
  emergency: {
    bg: colors.dangerLight,
    text: colors.dangerDark,
    border: colors.danger
  },
  scheduled: {
    bg: colors.primaryPale,
    text: colors.primaryDark,
    border: colors.primary
  },
  cancelled: {
    bg: colors.backgroundAlt,
    text: colors.textSecondary,
    border: colors.borderDark
  },
};
