
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Button from './Button';
import Icon from './Icon';
import DateInput from './DateInput';
import type { ScheduleEntry } from '../hooks/useScheduleStorage';
import * as Haptics from 'expo-haptics';

interface TimeOffRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (requestData: TimeOffRequestData) => Promise<void>;
  cleanerId: string;
  cleanerName: string;
  recurringShifts?: RecurringShiftInfo[];
  themeColor: string;
}

interface RecurringShiftInfo {
  id: string;
  building_name: string;
  client_name: string;
  days_of_week?: number[];
  pattern_type: string;
  start_time?: string;
  hours: number;
}

export interface TimeOffRequestData {
  requestType: 'single_shift' | 'date_range' | 'recurring_instances';
  shiftId?: string;
  shiftDate?: string;
  startDate?: string;
  endDate?: string;
  recurringShiftId?: string;
  requestedDates?: string[];
  reason: string;
  notes?: string;
}

const TimeOffRequestModal = memo<TimeOffRequestModalProps>(({ 
  visible, 
  onClose, 
  onSubmit, 
  cleanerId, 
  cleanerName,
  recurringShifts = [],
  themeColor 
}) => {
  const [requestType, setRequestType] = useState<'single_shift' | 'date_range' | 'recurring_instances'>('date_range');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRecurringShift, setSelectedRecurringShift] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecurringDropdown, setShowRecurringDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | 'add'>('start');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    if (!visible) {
      // Reset form when modal closes
      setRequestType('date_range');
      setStartDate('');
      setEndDate('');
      setSelectedRecurringShift('');
      setSelectedDates([]);
      setReason('');
      setNotes('');
      setShowRecurringDropdown(false);
      setShowSuccessModal(false);
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    // Validation
    if (requestType === 'date_range') {
      if (!startDate || !endDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Please select start and end dates');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'End date must be after start date');
        return;
      }
    } else if (requestType === 'recurring_instances') {
      if (!selectedRecurringShift) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Please select a recurring shift');
        return;
      }
      if (selectedDates.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Please select at least one date');
        return;
      }
    }

    if (!reason.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please provide a reason for your time off request');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: TimeOffRequestData = {
        requestType,
        reason: reason.trim(),
        notes: notes.trim(),
      };

      if (requestType === 'date_range') {
        requestData.startDate = startDate;
        requestData.endDate = endDate;
      } else if (requestType === 'recurring_instances') {
        requestData.recurringShiftId = selectedRecurringShift;
        requestData.requestedDates = selectedDates;
      }

      console.log('Submitting time off request:', requestData);
      await onSubmit(requestData);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
      
      // Auto-close success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        setIsSubmitting(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting time off request:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to submit time off request. Please try again.');
      setIsSubmitting(false);
    }
  };

  const addDateToSelection = (date: string) => {
    if (!selectedDates.includes(date)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDates([...selectedDates, date].sort());
    }
  };

  const removeDateFromSelection = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDates(selectedDates.filter(d => d !== date));
  };

  const getRecurringShiftDisplay = (shift: RecurringShiftInfo) => {
    const dayNames = shift.days_of_week?.map(d => daysOfWeek[d]).join(', ') || 'Custom';
    return `${shift.client_name} - ${shift.building_name} (${dayNames})`;
  };

  const selectedShift = recurringShifts.find(s => s.id === selectedRecurringShift);

  // Success Modal
  if (showSuccessModal) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSuccessModal(false);
          setIsSubmitting(false);
          onClose();
        }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={[styles.successIconContainer, { backgroundColor: colors.success + '20' }]}>
              <Icon name="checkmark-circle" size={64} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successMessage}>
              Your time off request has been submitted successfully and is pending supervisor approval.
            </Text>
            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Icon name="calendar" size={20} color={colors.textSecondary} />
                <Text style={styles.successDetailText}>
                  {requestType === 'date_range' && startDate && endDate
                    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Icon name="document-text" size={20} color={colors.textSecondary} />
                <Text style={styles.successDetailText}>{reason}</Text>
              </View>
            </View>
            <ActivityIndicator size="small" color={themeColor} style={styles.successSpinner} />
            <Text style={styles.successClosingText}>Closing...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: themeColor }]}>
            <Text style={styles.modalTitle}>Request Time Off</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSubmitting}>
              <Icon name="close" size={24} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          {isSubmitting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={styles.loadingText}>Submitting your request...</Text>
              <Text style={styles.loadingSubtext}>Please wait</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.modalBody}>
                {/* Request Type Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Request Type</Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      requestType === 'date_range' && { borderColor: themeColor, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRequestType('date_range');
                    }}
                  >
                    <View style={styles.radioButton}>
                      {requestType === 'date_range' && (
                        <View style={[styles.radioButtonInner, { backgroundColor: themeColor }]} />
                      )}
                    </View>
                    <View style={styles.radioContent}>
                      <Text style={styles.radioTitle}>Date Range</Text>
                      <Text style={styles.radioDescription}>
                        Request time off for a specific date range
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      requestType === 'recurring_instances' && { borderColor: themeColor, borderWidth: 2 }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRequestType('recurring_instances');
                    }}
                  >
                    <View style={styles.radioButton}>
                      {requestType === 'recurring_instances' && (
                        <View style={[styles.radioButtonInner, { backgroundColor: themeColor }]} />
                      )}
                    </View>
                    <View style={styles.radioContent}>
                      <Text style={styles.radioTitle}>Specific Recurring Shifts</Text>
                      <Text style={styles.radioDescription}>
                        Request time off for specific instances of a recurring shift
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Date Range Selection */}
                {requestType === 'date_range' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Dates</Text>
                    
                    <View style={styles.dateRow}>
                      <View style={styles.dateField}>
                        <Text style={styles.label}>Start Date</Text>
                        <DateInput
                          value={startDate}
                          onChangeText={setStartDate}
                          placeholder="Select start date"
                          themeColor={themeColor}
                        />
                      </View>
                      
                      <View style={styles.dateField}>
                        <Text style={styles.label}>End Date</Text>
                        <DateInput
                          value={endDate}
                          onChangeText={setEndDate}
                          placeholder="Select end date"
                          themeColor={themeColor}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Recurring Shift Selection */}
                {requestType === 'recurring_instances' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Recurring Shift</Text>
                    
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowRecurringDropdown(!showRecurringDropdown);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {selectedShift ? getRecurringShiftDisplay(selectedShift) : 'Select a recurring shift'}
                      </Text>
                      <Icon name="chevron-down" size={20} color={colors.text} />
                    </TouchableOpacity>

                    {showRecurringDropdown && (
                      <View style={styles.dropdownMenu}>
                        {recurringShifts.length === 0 ? (
                          <Text style={styles.emptyText}>No recurring shifts found</Text>
                        ) : (
                          recurringShifts.map(shift => (
                            <TouchableOpacity
                              key={shift.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedRecurringShift(shift.id);
                                setShowRecurringDropdown(false);
                                setSelectedDates([]);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>
                                {getRecurringShiftDisplay(shift)}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}

                    {selectedRecurringShift && (
                      <View style={styles.dateSelectionSection}>
                        <Text style={styles.label}>Select Specific Dates</Text>
                        <Text style={styles.helperText}>
                          Choose which specific dates you want to request off
                        </Text>
                        
                        <DateInput
                          value=""
                          onChangeText={(date) => {
                            if (date) {
                              addDateToSelection(date);
                            }
                          }}
                          placeholder="Add a date"
                          themeColor={themeColor}
                        />

                        {selectedDates.length > 0 && (
                          <View style={styles.selectedDatesContainer}>
                            {selectedDates.map(date => (
                              <View key={date} style={[styles.dateChip, { backgroundColor: themeColor + '20' }]}>
                                <Text style={[styles.dateChipText, { color: themeColor }]}>
                                  {new Date(date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </Text>
                                <TouchableOpacity onPress={() => removeDateFromSelection(date)}>
                                  <Icon name="close-circle" size={18} color={themeColor} />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Reason */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Reason *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g., Personal appointment, Family emergency, Vacation"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Notes */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any additional information..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.footerButton}
                />
                <Button
                  title="Submit Request"
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={[styles.footerButton, { backgroundColor: themeColor }]}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

TimeOffRequestModal.displayName = 'TimeOffRequestModal';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundAlt,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  radioDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateField: {
    flex: 1,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  helperText: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  dropdownText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  dateSelectionSection: {
    marginTop: spacing.md,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
  },
  dateChipText: {
    ...typography.small,
    fontWeight: '600',
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl * 2,
  },
  loadingText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.xxl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  successDetails: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  successDetailText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  successSpinner: {
    marginBottom: spacing.md,
  },
  successClosingText: {
    ...typography.small,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});

export default TimeOffRequestModal;
