
import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Cleaner } from '../../hooks/useClientData';

interface BulkActionsBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  selectedEntries: ScheduleEntry[];
  cleaners: Cleaner[];
  onReassignCleaner: (cleanerName: string) => void;
  onChangeStatus: (status: string) => void;
  onMoveToDay: (day: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const BulkActionsBottomSheet = memo(({
  bottomSheetRef,
  selectedEntries,
  cleaners,
  onReassignCleaner,
  onChangeStatus,
  onMoveToDay,
  onDuplicate,
  onDelete,
  onClose,
}: BulkActionsBottomSheetProps) => {
  console.log('BulkActionsBottomSheet rendered with', selectedEntries.length, 'selected entries');

  const snapPoints = useMemo(() => ['25%', '50%', '75%'], []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const statuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];

  const totalHours = useMemo(() => {
    return selectedEntries.reduce((sum, entry) => sum + entry.hours, 0);
  }, [selectedEntries]);

  const uniqueCleaners = useMemo(() => {
    const cleanerNames = new Set(selectedEntries.map(entry => entry.cleanerName));
    return Array.from(cleanerNames);
  }, [selectedEntries]);

  const uniqueClients = useMemo(() => {
    const clientNames = new Set(selectedEntries.map(entry => entry.clientName));
    return Array.from(clientNames);
  }, [selectedEntries]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.text;
    }
  };

  if (selectedEntries.length === 0) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Icon name="checkmark-circle" size={24} style={{ color: colors.primary }} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Bulk Actions</Text>
              <Text style={styles.subtitle}>
                {selectedEntries.length} entries selected • {totalHours}h total
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Selection Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Selection Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cleaners</Text>
              <Text style={styles.summaryValue}>{uniqueCleaners.join(', ')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Clients</Text>
              <Text style={styles.summaryValue}>{uniqueClients.join(', ')}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.quickAction} onPress={onDuplicate}>
              <Icon name="copy" size={20} style={{ color: colors.primary }} />
              <Text style={styles.quickActionText}>Duplicate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction} onPress={onDelete}>
              <Icon name="trash" size={20} style={{ color: colors.danger }} />
              <Text style={[styles.quickActionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reassign Cleaner */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reassign Cleaner</Text>
          <View style={styles.cleanerGrid}>
            {cleaners.filter(c => c.isActive).slice(0, 6).map(cleaner => (
              <TouchableOpacity
                key={cleaner.id}
                style={[
                  styles.cleanerButton,
                  uniqueCleaners.includes(cleaner.name) && styles.cleanerButtonActive
                ]}
                onPress={() => onReassignCleaner(cleaner.name)}
              >
                <Text style={[
                  styles.cleanerButtonText,
                  uniqueCleaners.includes(cleaner.name) && styles.cleanerButtonTextActive
                ]}>
                  {cleaner.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Change Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Status</Text>
          <View style={styles.statusGrid}>
            {statuses.map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.statusButton, { borderColor: getStatusColor(status) }]}
                onPress={() => onChangeStatus(status)}
              >
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
                <Text style={styles.statusButtonText}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Move to Day */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Move to Day</Text>
          <View style={styles.dayGrid}>
            {days.map(day => (
              <TouchableOpacity
                key={day}
                style={styles.dayButton}
                onPress={() => onMoveToDay(day.toLowerCase())}
              >
                <Text style={styles.dayButtonText}>{day.substring(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Apply Actions */}
        <View style={styles.actionButtons}>
          <Button
            text="Cancel"
            onPress={onClose}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            text={`Apply to ${selectedEntries.length} entries`}
            onPress={onClose}
            variant="primary"
            style={styles.actionButton}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  summarySection: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    gap: spacing.sm,
  },
  quickActionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  cleanerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cleanerButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanerButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  cleanerButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  cleanerButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  statusGrid: {
    gap: spacing.sm,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  dayGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
  },
});

BulkActionsBottomSheet.displayName = 'BulkActionsBottomSheet';

export default BulkActionsBottomSheet;
