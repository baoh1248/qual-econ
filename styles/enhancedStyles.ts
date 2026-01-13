import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from './commonStyles';

/**
 * Enhanced Design System for Modern UI
 * Use these styles across all screens for consistent, professional design
 */

export const enhancedStyles = StyleSheet.create({
  // ============ CONTAINERS ============
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  scrollContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 80,
  },

  // ============ HEADERS ============
  modernHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.xl,
    elevation: 8,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },

  // ============ SEARCH ============
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },

  // ============ FILTERS ============
  filtersContainer: {
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },

  filterScrollView: {
    flexGrow: 0,
  },

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E6ED',
    ...shadows.sm,
    elevation: 2,
  },

  filterChipActive: {
    elevation: 4,
  },

  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ============ STATS CARDS ============
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.md,
    elevation: 3,
    borderLeftWidth: 4,
  },

  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  statValue: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },

  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ============ CARDS ============
  modernCard: {
    marginBottom: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.md,
    elevation: 4,
  },

  cardHeader: {
    padding: spacing.md,
    borderLeftWidth: 4,
  },

  cardBody: {
    padding: spacing.md,
  },

  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F3F7',
    backgroundColor: '#FAFBFC',
  },

  // ============ BADGES & CHIPS ============
  statusBadgeModern: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },

  detailChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },

  // ============ BUTTONS ============
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: '#F0F3F7',
  },

  actionButtonLast: {
    borderRightWidth: 0,
  },

  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
    elevation: 8,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  // ============ EMPTY STATES ============
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },

  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // ============ SECTION HEADERS ============
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },

  sectionHeaderLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },

  // ============ LISTS ============
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
    elevation: 2,
  },

  listItemPressed: {
    opacity: 0.7,
  },

  // ============ GRIDS ============
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  // ============ ROWS ============
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  // ============ TEXT STYLES ============
  titleText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },

  subtitleText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  captionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

/**
 * Helper function to create themed header background
 */
export const createHeaderBackground = (themeColor: string) => ({
  backgroundColor: themeColor,
});

/**
 * Helper function to create themed elements
 */
export const createThemedStyle = (themeColor: string) => ({
  iconContainer: {
    backgroundColor: themeColor + '15',
  },
  borderAccent: {
    borderLeftColor: themeColor,
  },
  chipActive: {
    backgroundColor: themeColor,
    borderColor: themeColor,
  },
  fab: {
    backgroundColor: themeColor,
    shadowColor: themeColor,
  },
});
