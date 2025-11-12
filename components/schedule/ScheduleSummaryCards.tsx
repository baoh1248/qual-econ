
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';

interface ScheduleSummaryCardsProps {
  schedule: ScheduleEntry[];
  themeColor: string;
}

const ScheduleSummaryCards = memo<ScheduleSummaryCardsProps>(({ schedule, themeColor }) => {
  const stats = useMemo(() => {
    const totalShifts = schedule.length;
    const totalHours = schedule.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    
    const statusCounts = schedule.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cleanersSet = new Set<string>();
    schedule.forEach(entry => {
      if (entry.cleanerNames) {
        entry.cleanerNames.forEach(name => cleanersSet.add(name));
      } else {
        cleanersSet.add(entry.cleanerName);
      }
    });

    const buildingsSet = new Set(schedule.map(entry => entry.buildingName));
    const projectShifts = schedule.filter(entry => entry.isProject).length;
    const regularShifts = totalShifts - projectShifts;

    const completionRate = totalShifts > 0 
      ? ((statusCounts.completed || 0) / totalShifts * 100).toFixed(0)
      : '0';

    return {
      totalShifts,
      totalHours,
      scheduled: statusCounts.scheduled || 0,
      inProgress: statusCounts['in-progress'] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
      totalCleaners: cleanersSet.size,
      totalBuildings: buildingsSet.size,
      projectShifts,
      regularShifts,
      completionRate,
    };
  }, [schedule]);

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Total Shifts Card */}
      <View style={[styles.card, { borderLeftColor: themeColor }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${themeColor}20` }]}>
          <Icon name="calendar" size={24} color={themeColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{stats.totalShifts}</Text>
          <Text style={styles.cardLabel}>Total Shifts</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>
              {stats.regularShifts} regular • {stats.projectShifts} projects
            </Text>
          </View>
        </View>
      </View>

      {/* Total Hours Card */}
      <View style={[styles.card, { borderLeftColor: '#8B5CF6' }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
          <Icon name="time" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{stats.totalHours}h</Text>
          <Text style={styles.cardLabel}>Total Hours</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>
              Avg {stats.totalShifts > 0 ? (stats.totalHours / stats.totalShifts).toFixed(1) : 0}h per shift
            </Text>
          </View>
        </View>
      </View>

      {/* Completion Rate Card */}
      <View style={[styles.card, { borderLeftColor: '#10B981' }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
          <Icon name="checkmark-circle" size={24} color="#10B981" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{stats.completionRate}%</Text>
          <Text style={styles.cardLabel}>Completion Rate</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>
              {stats.completed} of {stats.totalShifts} completed
            </Text>
          </View>
        </View>
      </View>

      {/* Status Breakdown Card */}
      <View style={[styles.card, { borderLeftColor: '#F59E0B' }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
          <Icon name="stats-chart" size={24} color="#F59E0B" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{stats.scheduled}</Text>
          <Text style={styles.cardLabel}>Scheduled</Text>
          <View style={styles.statusBreakdown}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.statusText}>{stats.inProgress} in progress</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.statusText}>{stats.cancelled} cancelled</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Resources Card */}
      <View style={[styles.card, { borderLeftColor: '#3B82F6' }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
          <Icon name="people" size={24} color="#3B82F6" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardValue}>{stats.totalCleaners}</Text>
          <Text style={styles.cardLabel}>Active Cleaners</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>
              {stats.totalBuildings} buildings
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

ScheduleSummaryCards.displayName = 'ScheduleSummaryCards';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardMeta: {
    marginTop: spacing.xs,
  },
  cardMetaText: {
    ...typography.small,
    color: colors.textTertiary,
    fontSize: 11,
  },
  statusBreakdown: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
});

export default ScheduleSummaryCards;
