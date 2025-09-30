
import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Cleaner } from '../../hooks/useClientData';

interface BulkActionsBottomSheetProps {
  visible: boolean;
  selectedCount: number;
  onClose: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkUpdate: (updates: any) => Promise<void>;
}

const BulkActionsBottomSheet = memo(({
  visible,
  selectedCount,
  onClose,
  onBulkDelete,
  onBulkUpdate,
}: BulkActionsBottomSheetProps) => {
  console.log('BulkActionsBottomSheet rendered with', selectedCount, 'selected entries');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleBulkDelete = useCallback(async () => {
    try {
      setIsDeleting(true);
      await onBulkDelete();
      onClose();
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [onBulkDelete, onClose]);

  const handleBulkUpdate = useCallback(async (updates: any) => {
    try {
      setIsUpdating(true);
      await onBulkUpdate(updates);
      onClose();
    } catch (error) {
      console.error('Error in bulk update:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [onBulkUpdate, onClose]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.text;
    }
  };

  if (!visible || selectedCount === 0) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Icon name="checkmark-circle" size={24} style={{ color: colors.primary }} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Bulk Actions</Text>
              <Text style={styles.subtitle}>
                {selectedCount} entries selected
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.quickAction} 
              onPress={() => handleBulkUpdate({ status: 'completed' })}
              disabled={isUpdating}
            >
              <Icon name="checkmark" size={20} style={{ color: colors.success }} />
              <Text style={[styles.quickActionText, { color: colors.success }]}>
                {isUpdating ? 'Updating...' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction} 
              onPress={handleBulkDelete}
              disabled={isDeleting}
            >
              <Icon name="trash" size={20} style={{ color: colors.danger }} />
              <Text style={[styles.quickActionText, { color: colors.danger }]}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Apply Actions */}
        <View style={styles.actionButtons}>
          <Button
            text="Cancel"
            onPress={onClose}
            variant="secondary"
            style={styles.actionButton}
            disabled={isDeleting || isUpdating}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
