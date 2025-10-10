
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';

interface VacationConflict {
  cleanerName: string;
  vacation: {
    start_date: string;
    end_date: string;
    reason?: string;
  };
}

interface VacationWarningProps {
  conflicts: VacationConflict[];
}

const VacationWarning = memo(({ conflicts }: VacationWarningProps) => {
  if (conflicts.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="warning" size={20} style={{ color: colors.warning }} />
        <Text style={styles.headerText}>Vacation Conflict</Text>
      </View>
      
      {conflicts.map((conflict, index) => (
        <View key={index} style={styles.conflictItem}>
          <Text style={styles.cleanerName}>{conflict.cleanerName}</Text>
          <Text style={styles.dateRange}>
            On vacation: {formatDate(conflict.vacation.start_date)} - {formatDate(conflict.vacation.end_date)}
          </Text>
          {conflict.vacation.reason && (
            <Text style={styles.reason}>Reason: {conflict.vacation.reason}</Text>
          )}
        </View>
      ))}
      
      <Text style={styles.warningText}>
        {conflicts.length === 1 
          ? 'This cleaner is on vacation during this shift. Consider assigning someone else.'
          : 'These cleaners are on vacation during this shift. Consider assigning someone else.'
        }
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning + '15',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerText: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '600',
  },
  conflictItem: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '30',
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dateRange: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  reason: {
    ...typography.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  warningText: {
    ...typography.small,
    color: colors.text,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

VacationWarning.displayName = 'VacationWarning';

export default VacationWarning;
