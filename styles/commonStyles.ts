
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  primary: '#2563EB',      // Professional Blue
  secondary: '#1E40AF',    // Darker Blue
  accent: '#60A5FA',       // Light Blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Orange
  danger: '#EF4444',       // Red
  info: '#06B6D4',         // Cyan
  background: '#FFFFFF',   // Clean White
  backgroundAlt: '#F8FAFC', // Light Gray
  text: '#1F2937',         // Dark Gray
  textSecondary: '#6B7280', // Medium Gray
  border: '#E5E7EB',       // Light Border
  card: '#FFFFFF',         // White Cards
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

// Helper function to get contrasting color
export const getContrastColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? colors.text : colors.background;
};

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary, // Blue background
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: colors.primary, // Blue background for consistency
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  success: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  danger: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  warning: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  floating: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  // Simple icon button styles - blue background with white icons, or white background with black icons
  iconButton: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.background, // White background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  iconButtonPrimary: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.primary, // Blue background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  iconButtonDanger: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.danger, // Red background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  iconButtonSuccess: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.success, // Green background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  iconButtonWarning: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.warning, // Orange background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  // Simple back button style - white background with black icon
  backButton: {
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.background, // White background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  // Simple small action buttons (like +/- in inventory) - blue background with white icons
  smallActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary, // Blue background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  smallActionButtonDanger: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.danger, // Red background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  smallActionButtonSuccess: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.success, // Green background
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  // Simple category/filter buttons - blue background when active, white when inactive
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background, // White background
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  filterButtonActive: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.primary, // Blue background
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  // Simple quick select buttons - blue background when active, white when inactive
  quickSelectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background, // White background
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
  },
  quickSelectButtonActive: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary, // Blue background
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // No borders or outlines - clean simple button
    borderWidth: 0,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webModalContainer: {
    zIndex: 10000,
    position: 'relative' as any,
    backgroundColor: colors.background,
    borderRadius: 16,
    maxHeight: '90vh',
    maxWidth: '90vw',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.background, // White text on blue background
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  shadow: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});

export const statusColors = {
  pending: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  'in-progress': { bg: '#DBEAFE', text: '#1E40AF', border: '#2563EB' },
  completed: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
  overdue: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  emergency: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
};
