
import React, { memo, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Cleaner } from '../../hooks/useClientData';

interface BulkEditModalProps {
  visible: boolean;
  onClose: () => void;
  selectedEntries: ScheduleEntry[];
  cleaners: Cleaner[];
  onBulkUpdate: (updates: Partial<ScheduleEntry>) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onBulkCopy: (targetDay: string) => Promise<void>;
  themeColor: string;
}

const BulkEditModal = memo<BulkEditModalProps>(({
  visible,
  onClose,
  selectedEntries,
  cleaners,
  onBulkUpdate,
  onBulkDelete,
  onBulkCopy,
  themeColor,
}) => {
  const [selectedAction, setSelectedAction] = useState<'status' | 'cleaner' | 'copy' | 'delete' | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('scheduled');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('monday');

  const handleApply = async () => {
    try {
      if (selectedAction === 'status') {
        await onBulkUpdate({ status: selectedStatus });
      } else if (selectedAction === 'cleaner' && selectedCleaner) {
        await onBulkUpdate({ 
          cleanerName: selectedCleaner,
          cleanerNames: [selectedCleaner]
        });
      } else if (selectedAction === 'copy') {
        await onBulkCopy(selectedDay);
      } else if (selectedAction === 'delete') {
        Alert.alert(
          'Confirm Delete',
          `Are you sure you want to delete ${selectedEntries.length} shift${selectedEntries.length > 1 ? 's' : ''}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await onBulkDelete();
                onClose();
              },
            },
          ]
        );
        return;
      }
      onClose();
    } catch (error) {
      console.error('Error applying bulk action:', error);
      Alert.alert('Error', 'Failed to apply bulk action');
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const statuses: Array<'scheduled' | 'in-progress' | 'completed' | 'cancelled'> = ['scheduled', 'in-progress', 'completed', 'cancelled'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <Icon name="create" size={24} color={colors.textInverse} />
            <Text style={styles.headerTitle}>Bulk Edit</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{selectedEntries.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Action</Text>
            
            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'status' && { borderColor: themeColor, borderWidth: 2 }
              ]}
              onPress={() => setSelectedAction('status')}
            >
              <Icon name="flag" size={24} color={themeColor} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Change Status</Text>
                <Text style={styles.actionDescription}>
                  Update the status of all selected shifts
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'cleaner' && { borderColor: themeColor, borderWidth: 2 }
              ]}
              onPress={() => setSelectedAction('cleaner')}
            >
              <Icon name="person" size={24} color={themeColor} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Reassign Cleaner</Text>
                <Text style={styles.actionDescription}>
                  Assign a different cleaner to all selected shifts
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'copy' && { borderColor: themeColor, borderWidth: 2 }
              ]}
              onPress={() => setSelectedAction('copy')}
            >
              <Icon name="copy" size={24} color={themeColor} />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Copy to Day</Text>
                <Text style={styles.actionDescription}>
                  Duplicate all selected shifts to another day
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                selectedAction === 'delete' && { borderColor: colors.danger, borderWidth: 2 }
              ]}
              onPress={() => setSelectedAction('delete')}
            >
              <Icon name="trash" size={24} color={colors.danger} />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.danger }]}>Delete Shifts</Text>
                <Text style={styles.actionDescription}>
                  Permanently remove all selected shifts
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {selectedAction === 'status' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select New Status</Text>
              <View style={styles.optionsGrid}>
                {statuses.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.optionButton,
                      selectedStatus === status && { 
                        backgroundColor: `${themeColor}20`,
                        borderColor: themeColor,
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedStatus === status && { color: themeColor, fontWeight: '700' }
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedAction === 'cleaner' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Cleaner</Text>
              <ScrollView style={styles.cleanersList}>
                {cleaners.map(cleaner => (
                  <TouchableOpacity
                    key={cleaner.id}
                    style={[
                      styles.cleanerOption,
                      selectedCleaner === cleaner.name && {
                        backgroundColor: `${themeColor}20`,
                        borderColor: themeColor,
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setSelectedCleaner(cleaner.name)}
                  >
                    <Icon name="person-circle" size={20} color={themeColor} />
                    <Text style={[
                      styles.cleanerName,
                      selectedCleaner === cleaner.name && { color: themeColor, fontWeight: '700' }
                    ]}>
                      {cleaner.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {selectedAction === 'copy' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Target Day</Text>
              <View style={styles.optionsGrid}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.optionButton,
                      selectedDay === day && {
                        backgroundColor: `${themeColor}20`,
                        borderColor: themeColor,
                        borderWidth: 2
                      }
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedDay === day && { color: themeColor, fontWeight: '700' }
                    ]}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {selectedAction === 'delete' && (
            <View style={styles.warningSection}>
              <Icon name="warning" size={48} color={colors.danger} />
              <Text style={styles.warningTitle}>Warning</Text>
              <Text style={styles.warningText}>
                This action cannot be undone. {selectedEntries.length} shift{selectedEntries.length > 1 ? 's' : ''} will be permanently deleted.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="secondary"
            style={styles.footerButton}
          />
          <Button
            title={selectedAction === 'delete' ? 'Delete' : 'Apply'}
            onPress={handleApply}
            disabled={!selectedAction || (selectedAction === 'cleaner' && !selectedCleaner)}
            style={[
              styles.footerButton,
              { backgroundColor: selectedAction === 'delete' ? colors.danger : themeColor }
            ]}
          />
        </View>
      </View>
    </Modal>
  );
});

BulkEditModal.displayName = 'BulkEditModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    ...typography.small,
    fontSize: 12,
    color: colors.textInverse,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    marginBottom: spacing.sm,
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  actionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  cleanersList: {
    maxHeight: 300,
  },
  cleanerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    marginBottom: spacing.sm,
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  warningSection: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: `${colors.danger}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  warningTitle: {
    ...typography.h3,
    color: colors.danger,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 10 : spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButton: {
    flex: 1,
  },
});

export default BulkEditModal;
