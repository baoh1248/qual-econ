
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Professional color palette inspired by enterprise tools
export const colors = {
  // Primary Blues - Professional and trustworthy
  primary: '#0066FF',          // Vibrant Blue
  primaryDark: '#0052CC',      // Darker Blue for hover/active states
  primaryLight: '#4D94FF',     // Lighter Blue for backgrounds
  primaryPale: '#E6F0FF',      // Very light blue for subtle backgrounds
  
  // Secondary Colors
  secondary: '#5243AA',        // Purple accent
  accent: '#00B8D9',           // Cyan for highlights
  
  // Status Colors
  success: '#00875A',          // Professional Green
  successLight: '#E3FCEF',     // Light green background
  warning: '#FF991F',          // Warm Orange
  warningLight: '#FFF4E6',     // Light orange background
  danger: '#DE350B',           // Strong Red
  dangerLight: '#FFEBE6',      // Light red background
  info: '#0065FF',             // Info Blue
  infoLight: '#DEEBFF',        // Light blue background
  error: '#DE350B',            // Error Red (alias for danger)
  
  // Neutral Colors
  background: '#FAFBFC',       // Off-white background
  backgroundAlt: '#F4F5F7',    // Slightly darker background
  card: '#FFFFFF',             // Pure white for cards
  surface: '#FFFFFF',          // Surface color
  
  // Text Colors
  text: '#172B4D',             // Dark blue-gray for primary text
  textSecondary: '#5E6C84',    // Medium gray for secondary text
  textTertiary: '#8993A4',     // Light gray for tertiary text
  textInverse: '#FFFFFF',      // White text for dark backgrounds
  
  // Border Colors
  border: '#DFE1E6',           // Light border
  borderLight: '#EBECF0',      // Very light border
  borderDark: '#C1C7D0',       // Darker border for emphasis
  
  // Shadow Colors
  shadow: 'rgba(9, 30, 66, 0.25)',
  shadowLight: 'rgba(9, 30, 66, 0.08)',
  shadowDark: 'rgba(9, 30, 66, 0.31)',
  
  // Overlay
  overlay: 'rgba(9, 30, 66, 0.54)',
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

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.sm,
  },
  secondary: {
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  success: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.sm,
  },
  danger: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.sm,
  },
  warning: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...shadows.sm,
  },
  outline: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  floating: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  iconButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  iconButtonPrimary: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    ...shadows.sm,
  },
  iconButtonDanger: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    ...shadows.sm,
  },
  iconButtonSuccess: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    ...shadows.sm,
  },
  iconButtonWarning: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  smallActionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  smallActionButtonDanger: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  smallActionButtonSuccess: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...shadows.sm,
  },
  quickSelectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSelectButtonActive: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...shadows.sm,
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
  },
  webModalContainer: {
    zIndex: 10000,
    position: 'relative' as any,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    maxHeight: '90vh',
    maxWidth: '90vw',
    overflow: 'hidden',
    ...shadows.xl,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  contentPadded: {
    flex: 1,
    padding: spacing.xl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  header: {
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardElevated: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    ...shadows.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  textInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
    minHeight: 44,
  },
  textInputFocused: {
    borderColor: colors.primary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    minWidth: 80,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  dividerLight: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  shadow: shadows.md,
  shadowSm: shadows.sm,
  shadowLg: shadows.lg,
  shadowXl: shadows.xl,
});

export const statusColors = {
  pending: { 
    bg: colors.warningLight, 
    text: '#974F0C', 
    border: colors.warning 
  },
  'in-progress': { 
    bg: colors.infoLight, 
    text: '#0747A6', 
    border: colors.info 
  },
  completed: { 
    bg: colors.successLight, 
    text: '#006644', 
    border: colors.success 
  },
  overdue: { 
    bg: colors.dangerLight, 
    text: '#BF2600', 
    border: colors.danger 
  },
  emergency: { 
    bg: colors.dangerLight, 
    text: '#BF2600', 
    border: colors.danger 
  },
  scheduled: { 
    bg: colors.primaryPale, 
    text: '#0052CC', 
    border: colors.primary 
  },
  cancelled: { 
    bg: colors.backgroundAlt, 
    text: colors.textSecondary, 
    border: colors.border 
  },
};
