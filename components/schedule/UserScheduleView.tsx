
import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Cleaner } from '../../hooks/useClientData';
import { useVacationCheck } from '../../hooks/useVacationCheck';
import { formatTimeRange } from '../../utils/timeFormatter';

interface UserScheduleViewProps {
  cleaners: Cleaner[];
  schedule: ScheduleEntry[];
  onTaskPress?: (entry: ScheduleEntry) => void;
  onAddShiftToCleaner?: (cleaner: Cleaner, day: string) => void;
  currentWeekId?: string; // NEW: Pass current week ID to trigger recalculation
}

const UserScheduleView = memo(({
  cleaners = [],
  schedule = [],
  onTaskPress,
  onAddShiftToCleaner,
  currentWeekId, // NEW: Receive current week ID
}: UserScheduleViewProps) => {
  console.log('UserScheduleView rendered with', cleaners.length, 'cleaners and', schedule.length, 'schedule entries');
  console.log('Current week ID:', currentWeekId);

  const [searchQuery, setSearchQuery] = useState('');
  const { isCleanerOnVacation, loadVacations } = useVacationCheck();

  // Reload vacations when component mounts
  useEffect(() => {
    loadVacations();
  }, [loadVacations]);

  // FIXED: Calculate the current week's dates based on currentWeekId or current date
  // This will recalculate whenever currentWeekId changes
  const days = useMemo(() => {
    console.log('Recalculating week dates for week ID:', currentWeekId);
    
    let monday: Date;
    
    if (currentWeekId) {
      // Parse week ID (format: YYYY-MM-DD, which is the Monday of the week)
      const [year, month, day] = currentWeekId.split('-').map(Number);
      monday = new Date(year, month - 1, day);
      console.log('Using week ID date:', monday.toISOString());
    } else {
      // Fall back to current week
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      console.log('Using current week date:', monday.toISOString());
    }

    const weekDays = [];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayShorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      weekDays.push({
        key: dayNames[i],
        short: dayShorts[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: date,
      });
    }

    console.log('Week dates calculated:', weekDays.map(d => `${d.short} ${d.date}`).join(', '));
    return weekDays;
  }, [currentWeekId]); // FIXED: Recalculate when currentWeekId changes

  // Group schedule entries by cleaner
  const scheduleByUser = useMemo(() => {
    const grouped = new Map<string, ScheduleEntry[]>();
    
    for (const entry of schedule) {
      if (!entry) continue;
      
      const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
        ? entry.cleanerNames 
        : (entry.cleanerName ? [entry.cleanerName] : []);
      
      for (const cleanerName of entryCleaners) {
        if (!grouped.has(cleanerName)) {
          grouped.set(cleanerName, []);
        }
        grouped.get(cleanerName)!.push(entry);
      }
    }
    
    return grouped;
  }, [schedule]);

  // Filter cleaners based on search
  const filteredCleaners = useMemo(() => {
    if (!searchQuery.trim()) {
      return cleaners;
    }
    
    const query = searchQuery.toLowerCase();
    return cleaners.filter(cleaner => 
      cleaner.name.toLowerCase().includes(query)
    );
  }, [cleaners, searchQuery]);

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { hours: number; tasks: number }>();
    
    for (const day of days) {
      totals.set(day.key, { hours: 0, tasks: 0 });
    }
    
    for (const entry of schedule) {
      if (!entry) continue;
      
      const dayKey = entry.day.toLowerCase();
      const current = totals.get(dayKey) || { hours: 0, tasks: 0 };
      current.hours += entry.hours || 0;
      current.tasks += 1;
      totals.set(dayKey, current);
    }
    
    return totals;
  }, [schedule, days]);

  // Get entries for a specific cleaner and day
  const getCleanerDayEntries = useCallback((cleanerName: string, day: string): ScheduleEntry[] => {
    const userEntries = scheduleByUser.get(cleanerName) || [];
    return userEntries.filter(entry => entry.day.toLowerCase() === day.toLowerCase());
  }, [scheduleByUser]);

  // Calculate cleaner totals
  const getCleanerTotals = useCallback((cleanerName: string) => {
    const userEntries = scheduleByUser.get(cleanerName) || [];
    const totalHours = userEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    const totalTasks = userEntries.length;
    return { hours: totalHours, tasks: totalTasks };
  }, [scheduleByUser]);

  // Get status color
  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.border;
    }
  }, []);

  // Render task block
  const renderTaskBlock = useCallback((entry: ScheduleEntry) => {
    const statusColor = getStatusColor(entry.status);
    const isCompleted = entry.status === 'completed';
    
    return (
      <TouchableOpacity
        key={entry.id}
        style={[
          styles.taskBlock,
          { 
            backgroundColor: statusColor + '15',
            borderLeftColor: statusColor,
          }
        ]}
        onPress={() => onTaskPress && onTaskPress(entry)}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTime, { color: statusColor }]} numberOfLines={1}>
            {formatTimeRange(entry.startTime || '09:00', entry.endTime || '17:00')}
          </Text>
          {isCompleted && (
            <Icon name="checkmark-circle" size={14} style={{ color: colors.success }} />
          )}
        </View>
        <Text style={styles.taskClient} numberOfLines={1}>
          {entry.clientName}
        </Text>
        <Text style={styles.taskBuilding} numberOfLines={1}>
          {entry.buildingName}
        </Text>
        <View style={styles.taskFooter}>
          <Text style={styles.taskHours}>{entry.hours}h</Text>
          {entry.notes && (
            <Icon name="document-text-outline" size={12} style={{ color: colors.textSecondary }} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getStatusColor, onTaskPress]);

  // Handle add shift button press
  const handleAddShift = useCallback((cleaner: Cleaner, day: string) => {
    console.log('Add shift requested for:', cleaner.name, 'on', day);
    if (onAddShiftToCleaner) {
      onAddShiftToCleaner(cleaner, day);
    }
  }, [onAddShiftToCleaner]);

  // Render cleaner row
  const renderCleanerRow = useCallback((cleaner: Cleaner) => {
    const totals = getCleanerTotals(cleaner.name);
    
    return (
      <View key={cleaner.id} style={styles.cleanerRow}>
        {/* Cleaner info column */}
        <View style={styles.cleanerInfoColumn}>
          <View style={styles.cleanerAvatar}>
            <Text style={styles.cleanerInitials}>
              {cleaner.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cleanerDetails}>
            <Text style={styles.cleanerName} numberOfLines={1}>
              {cleaner.name}
            </Text>
            <View style={styles.cleanerStats}>
              <View style={styles.statItem}>
                <Icon name="time-outline" size={12} style={{ color: colors.textSecondary }} />
                <Text style={styles.statText}>{totals.hours}h</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="briefcase-outline" size={12} style={{ color: colors.textSecondary }} />
                <Text style={styles.statText}>{totals.tasks}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Day columns */}
        {days.map(day => {
          const entries = getCleanerDayEntries(cleaner.name, day.key);
          const vacation = isCleanerOnVacation(cleaner.name, day.fullDate);
          const isOnVacation = vacation !== null;
          
          return (
            <View key={day.key} style={styles.dayColumn}>
              {isOnVacation ? (
                <View style={styles.vacationDay}>
                  <Icon name="airplane" size={20} style={{ color: colors.warning }} />
                  <Text style={styles.vacationText}>On Vacation</Text>
                  {vacation.reason && (
                    <Text style={styles.vacationReason} numberOfLines={1}>
                      {vacation.reason}
                    </Text>
                  )}
                </View>
              ) : entries.length > 0 ? (
                <View style={styles.tasksContainer}>
                  {entries.map(entry => renderTaskBlock(entry))}
                  {onAddShiftToCleaner && (
                    <TouchableOpacity
                      style={styles.addShiftButton}
                      onPress={() => handleAddShift(cleaner, day.key)}
                      activeOpacity={0.7}
                    >
                      <Icon name="add-circle-outline" size={16} style={{ color: colors.primary }} />
                      <Text style={styles.addShiftButtonText}>Add Shift</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.emptyDay}>
                  {onAddShiftToCleaner ? (
                    <TouchableOpacity
                      style={styles.emptyDayAddButton}
                      onPress={() => handleAddShift(cleaner, day.key)}
                      activeOpacity={0.7}
                    >
                      <Icon name="add-circle" size={24} style={{ color: colors.primary }} />
                      <Text style={styles.emptyDayAddText}>Add Shift</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.emptyDayText}>-</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }, [days, getCleanerTotals, getCleanerDayEntries, renderTaskBlock, handleAddShift, onAddShiftToCleaner, isCleanerOnVacation]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} style={{ color: colors.textSecondary }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Schedule grid */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
        bounces={false}
      >
        <View style={styles.scheduleGrid}>
          {/* Header row with daily totals */}
          <View style={styles.headerRow}>
            <View style={styles.cleanerHeaderColumn}>
              <Text style={styles.headerText}>Team Members</Text>
              <Text style={styles.headerSubtext}>
                {filteredCleaners.length} {filteredCleaners.length === 1 ? 'person' : 'people'}
              </Text>
            </View>
            {days.map(day => {
              const totals = dailyTotals.get(day.key) || { hours: 0, tasks: 0 };
              
              return (
                <View key={day.key} style={styles.dayHeaderColumn}>
                  <Text style={styles.dayHeaderText}>{day.short} {day.date}</Text>
                  <View style={styles.dayTotals}>
                    <View style={styles.totalItem}>
                      <Icon name="time-outline" size={12} style={{ color: colors.primary }} />
                      <Text style={styles.totalText}>{totals.hours}</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Icon name="briefcase-outline" size={12} style={{ color: colors.primary }} />
                      <Text style={styles.totalText}>{totals.tasks}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Cleaner rows */}
          <ScrollView 
            style={styles.verticalScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {filteredCleaners.length > 0 ? (
              filteredCleaners.map(cleaner => renderCleanerRow(cleaner))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="person-outline" size={48} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyStateText}>
                  {searchQuery ? 'No users found' : 'No team members available'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
});

const CLEANER_COLUMN_WIDTH = 200;
const DAY_COLUMN_WIDTH = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  horizontalScroll: {
    flex: 1,
  },
  scheduleGrid: {
    minWidth: CLEANER_COLUMN_WIDTH + (DAY_COLUMN_WIDTH * 7),
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  cleanerHeaderColumn: {
    width: CLEANER_COLUMN_WIDTH,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtext: {
    ...typography.small,
    color: colors.textSecondary,
  },
  dayHeaderColumn: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeaderText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dayTotals: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  totalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  verticalScroll: {
    flex: 1,
  },
  cleanerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 100,
  },
  cleanerInfoColumn: {
    width: CLEANER_COLUMN_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    gap: spacing.sm,
  },
  cleanerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanerInitials: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  cleanerDetails: {
    flex: 1,
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  cleanerStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  dayColumn: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tasksContainer: {
    gap: spacing.xs,
  },
  taskBlock: {
    padding: spacing.sm,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: spacing.xs,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTime: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  taskClient: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskBuilding: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskHours: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  vacationDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.warning + '15',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderStyle: 'dashed',
  },
  vacationText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  vacationReason: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyDayText: {
    ...typography.body,
    color: colors.textSecondary,
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  addShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '10',
    gap: spacing.xs,
  },
  addShiftButtonText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  emptyDayAddButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary + '10',
    gap: spacing.xs,
  },
  emptyDayAddText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
});

UserScheduleView.displayName = 'UserScheduleView';

export default UserScheduleView;
