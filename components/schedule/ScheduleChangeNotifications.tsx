import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import {
  fetchRecentChanges,
  fetchChangesByDateRange,
  initializeChangeLogsTable,
  type ScheduleChangeLog,
  type ChangeType,
} from '../../utils/scheduleChangeLogger';

interface ScheduleChangeNotificationsProps {
  visible: boolean;
  onClose: () => void;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const ScheduleChangeNotifications: React.FC<ScheduleChangeNotificationsProps> = ({
  visible,
  onClose,
  dateRange,
}) => {
  const [changes, setChanges] = useState<ScheduleChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChanges = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 Loading schedule changes...');

      let fetchedChanges: ScheduleChangeLog[];
      if (dateRange) {
        console.log('Fetching changes for date range:', dateRange);
        fetchedChanges = await fetchChangesByDateRange(
          dateRange.startDate,
          dateRange.endDate
        );
      } else {
        console.log('Fetching recent 50 changes');
        fetchedChanges = await fetchRecentChanges(50);
      }

      console.log('✅ Fetched', fetchedChanges.length, 'changes');
      setChanges(fetchedChanges);
    } catch (error: any) {
      console.error('❌ Error loading schedule changes:', error);

      // Check if it's a table not found error
      if (error?.message?.includes('does not exist') ||
          error?.code === '42P01' ||
          error?.message?.includes('relation') ||
          error?.message?.includes('schedule_change_logs')) {
        setError('Database table not created yet. Please run the SQL migration first.');
      } else {
        setError('Failed to load activity log. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChanges();
    setIsRefreshing(false);
  }, [loadChanges]);

  useEffect(() => {
    if (visible) {
      // Initialize table on first load
      initializeChangeLogsTable();
      loadChanges();
    }
  }, [visible, loadChanges]);

  const getChangeIcon = (changeType: ChangeType): string => {
    switch (changeType) {
      case 'shift_created':
        return 'add-circle';
      case 'shift_edited':
        return 'create';
      case 'shift_deleted':
        return 'trash';
      case 'shift_unassigned_timeoff':
        return 'calendar';
      case 'shift_assigned':
        return 'person-add';
      case 'cleaner_added':
        return 'person-add';
      case 'cleaner_removed':
        return 'person-remove';
      case 'shift_status_changed':
        return 'swap-horizontal';
      default:
        return 'information-circle';
    }
  };

  const getChangeColor = (changeType: ChangeType): string => {
    switch (changeType) {
      case 'shift_created':
      case 'shift_assigned':
      case 'cleaner_added':
        return colors.success;
      case 'shift_deleted':
      case 'cleaner_removed':
        return colors.danger;
      case 'shift_unassigned_timeoff':
        return colors.warning;
      case 'shift_edited':
      case 'shift_status_changed':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMins > 0) {
      return `${diffMins}m ago`;
    } else {
      return 'Just now';
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderChangeItem = (change: ScheduleChangeLog) => {
    const changeColor = getChangeColor(change.change_type);
    const changeIcon = getChangeIcon(change.change_type);

    return (
      <View key={change.id} style={styles.changeItem}>
        <View style={[styles.iconContainer, { backgroundColor: changeColor + '20' }]}>
          <Icon name={changeIcon} size={20} style={{ color: changeColor }} />
        </View>

        <View style={styles.changeContent}>
          <Text style={styles.changeDescription}>{change.description}</Text>

          <View style={styles.changeMeta}>
            <Text style={styles.changeMetaText}>
              {change.changed_by}
            </Text>
            <Text style={styles.changeMetaText}> • </Text>
            <Text style={styles.changeMetaText}>
              {formatTimeAgo(change.created_at)}
            </Text>
            {change.shift_date && (
              <>
                <Text style={styles.changeMetaText}> • </Text>
                <Text style={styles.changeMetaText}>
                  {formatDate(change.shift_date)}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="time" size={24} style={{ color: colors.primary }} />
              <Text style={styles.headerTitle}>Schedule Activity</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} style={{ color: colors.text }} />
            </TouchableOpacity>
          </View>

          {/* Changes List */}
          <ScrollView
            style={styles.changesList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            {error ? (
              <View style={styles.emptyState}>
                <Icon name="alert-circle" size={48} style={{ color: colors.danger }} />
                <Text style={[styles.emptyStateText, { color: colors.danger, fontWeight: '600' }]}>
                  {error}
                </Text>
                {error.includes('SQL migration') && (
                  <Text style={[styles.emptyStateText, { marginTop: spacing.md, fontSize: 12 }]}>
                    Run the SQL script from:{'\n'}
                    supabase/migrations/create_schedule_change_logs.sql
                  </Text>
                )}
              </View>
            ) : isLoading && changes.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="time-outline" size={48} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyStateText}>Loading activity...</Text>
              </View>
            ) : changes.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="time-outline" size={48} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyStateText}>No recent activity</Text>
                <Text style={[styles.emptyStateText, { marginTop: spacing.sm, fontSize: 12 }]}>
                  Activity will appear here after approving time off{'\n'}
                  or making schedule changes
                </Text>
              </View>
            ) : (
              changes.map(renderChangeItem)
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  changesList: {
    flex: 1,
  },
  changeItem: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeContent: {
    flex: 1,
    gap: spacing.xs,
  },
  changeDescription: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  changeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  changeMetaText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
    minHeight: 300,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ScheduleChangeNotifications;
