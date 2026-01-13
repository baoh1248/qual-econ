import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import {
  fetchRecentChanges,
  fetchChangesByDateRange,
  initializeChangeLogsTable,
  testChangeLogsTable,
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
  const [testResult, setTestResult] = useState<any>(null);

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

  const runDatabaseTest = useCallback(async () => {
    console.log('Running database test...');
    const result = await testChangeLogsTable();
    setTestResult(result);
    console.log('Test result:', result);

    // After test, reload changes
    if (result.success) {
      await loadChanges();
    }
  }, [loadChanges]);

  useEffect(() => {
    if (visible) {
      // Initialize table on first load
      initializeChangeLogsTable();
      // Run test automatically
      runDatabaseTest();
    }
  }, [visible, runDatabaseTest]);

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

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);

    // Format time as "1:00 PM"
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Format date as "Jan 13th 2026"
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
                  : day === 2 || day === 22 ? 'nd'
                  : day === 3 || day === 23 ? 'rd'
                  : 'th';

    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).replace(/(\d+),/, `$1${suffix},`);

    return `${time} ${dateStr}`;
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
              {formatTimestamp(change.created_at)}
            </Text>
            {change.shift_date && (
              <>
                <Text style={styles.changeMetaText}> • </Text>
                <Text style={styles.changeMetaText}>
                  Shift: {formatDate(change.shift_date)}
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

          {/* Database Test Result */}
          {testResult && (
            <View style={[styles.testResult, {
              backgroundColor: testResult.success ? colors.success + '20' : colors.danger + '20',
              borderColor: testResult.success ? colors.success : colors.danger
            }]}>
              <Icon
                name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                style={{ color: testResult.success ? colors.success : colors.danger }}
              />
              <Text style={[styles.testResultText, {
                color: testResult.success ? colors.success : colors.danger
              }]}>
                {testResult.success
                  ? `✅ Database OK - ${testResult.recordCount} records found`
                  : `❌ ${testResult.error} (${testResult.step})`
                }
              </Text>
              <TouchableOpacity onPress={runDatabaseTest} style={styles.testButton}>
                <Text style={styles.testButtonText}>Test Again</Text>
              </TouchableOpacity>
            </View>
          )}

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
  testResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  testResultText: {
    ...typography.small,
    flex: 1,
    fontWeight: '600',
  },
  testButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  testButtonText: {
    ...typography.small,
    color: colors.textInverse,
    fontWeight: '600',
  },
});

export default ScheduleChangeNotifications;
