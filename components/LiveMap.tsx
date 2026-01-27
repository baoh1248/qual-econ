
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import AnimatedCard from './AnimatedCard';
import { useCleanerTracking, TrackedCleaner, CleanerTrackingStatus } from '../hooks/useCleanerTracking';
import { formatDistance } from '../utils/geofence';

type SortOption = 'name' | 'time' | 'status' | 'distance';
type FilterOption = 'all' | 'on-duty' | 'break' | 'traveling';

interface LiveMapProps {
  onCleanerPress?: (cleaner: TrackedCleaner) => void;
  showFilters?: boolean;
  compactMode?: boolean;
}

const LiveMap: React.FC<LiveMapProps> = ({
  onCleanerPress,
  showFilters = true,
  compactMode = false,
}) => {
  const {
    trackedCleaners,
    stats,
    isLoading,
    error,
    isConnected,
    lastRefresh,
    refresh
  } = useCleanerTracking({ autoRefresh: true, refreshInterval: 15000 });

  const [selectedCleaner, setSelectedCleaner] = useState<TrackedCleaner | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Sort and filter cleaners
  const displayCleaners = React.useMemo(() => {
    let filtered = [...trackedCleaners];

    // Apply filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(c => c.status === filterBy);
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'time':
          return b.elapsedMinutes - a.elapsedMinutes;
        case 'status':
          const statusOrder = { 'on-duty': 0, 'traveling': 1, 'break': 2, 'off-duty': 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'distance':
          return (a.distanceFromSite || 0) - (b.distanceFromSite || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [trackedCleaners, sortBy, filterBy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCleanerPress = (cleaner: TrackedCleaner) => {
    setSelectedCleaner(cleaner);
    onCleanerPress?.(cleaner);
  };

  const getStatusColor = (status: CleanerTrackingStatus) => {
    switch (status) {
      case 'on-duty':
        return colors.success;
      case 'traveling':
        return '#3B82F6'; // Blue for traveling
      case 'break':
        return colors.warning;
      case 'off-duty':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: CleanerTrackingStatus) => {
    switch (status) {
      case 'on-duty':
        return 'checkmark-circle';
      case 'traveling':
        return 'car';
      case 'break':
        return 'cafe';
      case 'off-duty':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const formatLastRefreshTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Connection Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <Icon name="pulse" size={20} style={{ color: isConnected ? colors.success : colors.danger }} />
            <Text style={styles.headerTitle}>Live Tracking</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {isConnected ? 'Real-time updates active' : 'Connecting...'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.connectionDot, { backgroundColor: isConnected ? colors.success : colors.danger }]} />
          <Text style={styles.lastUpdateText}>
            Updated {formatLastRefreshTime(lastRefresh)}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStat}>
          <Text style={[styles.quickStatValue, { color: colors.success }]}>{stats.onDuty}</Text>
          <Text style={styles.quickStatLabel}>On Duty</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={[styles.quickStatValue, { color: '#3B82F6' }]}>{stats.traveling}</Text>
          <Text style={styles.quickStatLabel}>Traveling</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={[styles.quickStatValue, { color: colors.warning }]}>{stats.onBreak}</Text>
          <Text style={styles.quickStatLabel}>On Break</Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <Text style={[styles.quickStatValue, { color: colors.primary }]}>{stats.totalHoursToday.toFixed(1)}h</Text>
          <Text style={styles.quickStatLabel}>Total Time</Text>
        </View>
      </View>

      {/* Filter & Sort Controls */}
      {showFilters && (
        <View style={styles.controls}>
          <View style={styles.filterRow}>
            <Text style={styles.controlLabel}>Filter:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'on-duty', 'traveling', 'break'] as FilterOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, filterBy === option && styles.filterChipActive]}
                  onPress={() => setFilterBy(option)}
                >
                  <Text style={[styles.filterChipText, filterBy === option && styles.filterChipTextActive]}>
                    {option === 'all' ? 'All' : option.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.sortRow}>
            <Text style={styles.controlLabel}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
              {(['time', 'name', 'status', 'distance'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
                  onPress={() => setSortBy(option)}
                >
                  <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle" size={16} style={{ color: colors.danger }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {isLoading && trackedCleaners.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading cleaner data...</Text>
        </View>
      )}

      {/* Cleaner List */}
      <ScrollView
        style={styles.cleanerList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={styles.sectionTitle}>
          Active Cleaners ({displayCleaners.length})
        </Text>

        {displayCleaners.map((cleaner) => (
          <TouchableOpacity
            key={cleaner.id}
            onPress={() => handleCleanerPress(cleaner)}
            activeOpacity={0.7}
          >
            <AnimatedCard
              style={[
                styles.cleanerCard,
                selectedCleaner?.id === cleaner.id && styles.cleanerCardSelected,
              ]}
            >
              <View style={styles.cleanerHeader}>
                <View style={styles.cleanerInfo}>
                  <View style={styles.cleanerNameRow}>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(cleaner.status) }]}>
                      <Icon name={getStatusIcon(cleaner.status)} size={12} style={{ color: '#FFFFFF' }} />
                    </View>
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cleaner.status) }]}>
                    <Text style={styles.statusText}>{cleaner.status.replace('-', ' ')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cleanerDetails}>
                <View style={styles.detailRow}>
                  <Icon name="business" size={14} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText} numberOfLines={1}>{cleaner.currentTask}</Text>
                </View>

                {/* Elapsed Time - Prominent Display */}
                <View style={styles.elapsedTimeRow}>
                  <Icon name="timer" size={16} style={{ color: colors.primary }} />
                  <Text style={styles.elapsedTimeText}>{cleaner.elapsedTime}</Text>
                  <Text style={styles.elapsedTimeLabel}>elapsed</Text>
                </View>

                {/* Distance from site */}
                {cleaner.distanceFromSite !== null && (
                  <View style={styles.detailRow}>
                    <Icon
                      name={cleaner.isWithinGeofence ? 'checkmark-circle' : 'navigate'}
                      size={14}
                      style={{ color: cleaner.isWithinGeofence ? colors.success : colors.warning }}
                    />
                    <Text style={[
                      styles.detailText,
                      { color: cleaner.isWithinGeofence ? colors.success : colors.warning }
                    ]}>
                      {cleaner.isWithinGeofence
                        ? `Within geofence (${formatDistance(cleaner.distanceFromSite)})`
                        : `${formatDistance(cleaner.distanceFromSite)} from site`
                      }
                    </Text>
                  </View>
                )}

                {/* Location coordinates */}
                {cleaner.latitude && cleaner.longitude && !compactMode && (
                  <View style={styles.detailRow}>
                    <Icon name="location" size={14} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>
                      {cleaner.latitude.toFixed(5)}, {cleaner.longitude.toFixed(5)}
                    </Text>
                  </View>
                )}

                {/* Last update */}
                <View style={styles.detailRow}>
                  <Icon name="time" size={14} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>
                    Updated {formatLastUpdate(cleaner.lastUpdate)}
                  </Text>
                </View>
              </View>

              {selectedCleaner?.id === cleaner.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="chevron-forward" size={16} style={{ color: colors.primary }} />
                  <Text style={styles.selectedText}>View Details</Text>
                </View>
              )}
            </AnimatedCard>
          </TouchableOpacity>
        ))}

        {displayCleaners.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateTitle}>No Active Cleaners</Text>
            <Text style={styles.emptyStateText}>
              {filterBy !== 'all'
                ? `No cleaners with "${filterBy.replace('-', ' ')}" status`
                : 'No cleaners are currently clocked in'
              }
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Icon name="refresh" size={16} style={{ color: colors.primary }} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding for scroll */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status Legend</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>On Duty</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Traveling</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Break</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
            <Text style={styles.legendText}>Off Duty</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastUpdateText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  controls: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    width: 50,
  },
  filterScroll: {
    flex: 1,
  },
  sortScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.small,
    color: colors.text,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    ...typography.small,
    color: colors.text,
    fontSize: 11,
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.danger + '15',
    gap: spacing.xs,
  },
  errorText: {
    ...typography.small,
    color: colors.danger,
    flex: 1,
  },
  retryText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  cleanerList: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  cleanerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cleanerCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cleanerHeader: {
    marginBottom: spacing.sm,
  },
  cleanerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleanerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  cleanerDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  elapsedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  elapsedTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  elapsedTimeLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'flex-end',
  },
  selectedText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
  },
  refreshButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  legend: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  legendTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
});

export default LiveMap;
