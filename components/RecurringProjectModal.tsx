
import React, { memo, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Platform } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Button from './Button';
import Icon from './Icon';
import DateInput from './DateInput';

interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  customDays?: number;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

interface RecurringProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (pattern: RecurringPattern) => void;
  themeColor: string;
  initialPattern?: RecurringPattern;
}

const RecurringProjectModal = memo(({
  visible,
  onClose,
  onSave,
  themeColor,
  initialPattern,
}: RecurringProjectModalProps) => {
  console.log('RecurringProjectModal rendered');

  // Pattern state
  const [patternType, setPatternType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>(
    initialPattern?.type || 'weekly'
  );
  const [interval, setInterval] = useState(initialPattern?.interval || 1);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialPattern?.daysOfWeek || [1]);
  const [dayOfMonth, setDayOfMonth] = useState(initialPattern?.dayOfMonth || 1);
  const [customDays, setCustomDays] = useState(initialPattern?.customDays || 1);
  const [startDate, setStartDate] = useState(
    initialPattern?.startDate || new Date().toISOString().split('T')[0]
  );
  const [hasEndDate, setHasEndDate] = useState(!!initialPattern?.endDate);
  const [endDate, setEndDate] = useState(initialPattern?.endDate || '');
  const [hasMaxOccurrences, setHasMaxOccurrences] = useState(!!initialPattern?.maxOccurrences);
  const [maxOccurrences, setMaxOccurrences] = useState(
    initialPattern?.maxOccurrences?.toString() || ''
  );

  const daysOfWeek = [
    { name: 'Sunday', value: 0 },
    { name: 'Monday', value: 1 },
    { name: 'Tuesday', value: 2 },
    { name: 'Wednesday', value: 3 },
    { name: 'Thursday', value: 4 },
    { name: 'Friday', value: 5 },
    { name: 'Saturday', value: 6 },
  ];

  const resetForm = () => {
    setPatternType('weekly');
    setInterval(1);
    setSelectedDays([1]);
    setDayOfMonth(1);
    setCustomDays(1);
    setStartDate(new Date().toISOString().split('T')[0]);
    setHasEndDate(false);
    setEndDate('');
    setHasMaxOccurrences(false);
    setMaxOccurrences('');
  };

  const handleClose = () => {
    if (!initialPattern) {
      resetForm();
    }
    onClose();
  };

  const handleSave = () => {
    if (!startDate) {
      return;
    }

    const pattern: RecurringPattern = {
      type: patternType,
      interval,
      ...(patternType === 'weekly' && { daysOfWeek: selectedDays }),
      ...(patternType === 'monthly' && { dayOfMonth }),
      ...(patternType === 'custom' && { customDays }),
      startDate,
      ...(hasEndDate && endDate && { endDate }),
      ...(hasMaxOccurrences && maxOccurrences && { maxOccurrences: parseInt(maxOccurrences) }),
    };

    onSave(pattern);
    handleClose();
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const getPatternDescription = () => {
    let description = '';

    switch (patternType) {
      case 'daily':
        description = interval === 1 ? 'Every day' : `Every ${interval} days`;
        break;
      case 'weekly':
        const dayNames = selectedDays
          .map(d => daysOfWeek.find(day => day.value === d)?.name)
          .join(', ');
        description =
          interval === 1
            ? `Every week on ${dayNames}`
            : `Every ${interval} weeks on ${dayNames}`;
        break;
      case 'monthly':
        description =
          interval === 1
            ? `Every month on day ${dayOfMonth}`
            : `Every ${interval} months on day ${dayOfMonth}`;
        break;
      case 'custom':
        description = customDays === 1 ? 'Every day' : `Every ${customDays} days`;
        break;
      default:
        description = '';
    }

    if (startDate) {
      description += `, starting ${new Date(startDate).toLocaleDateString()}`;
    }

    if (hasEndDate && endDate) {
      description += `, until ${new Date(endDate).toLocaleDateString()}`;
    } else if (hasMaxOccurrences && maxOccurrences) {
      description += `, for ${maxOccurrences} occurrence${maxOccurrences !== '1' ? 's' : ''}`;
    }

    return description;
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Icon name="repeat" size={24} style={{ color: themeColor }} />
                <Text style={styles.modalTitle}>Recurring Project Pattern</Text>
              </View>

              {/* Recurrence Pattern */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recurrence Pattern</Text>

                <Text style={styles.inputLabel}>Repeat Type</Text>
                <View style={styles.patternTypeContainer}>
                  {(['daily', 'weekly', 'monthly', 'custom'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.patternTypeButton,
                        patternType === type && [styles.patternTypeButtonActive, { backgroundColor: themeColor }]
                      ]}
                      onPress={() => setPatternType(type)}
                    >
                      <Text
                        style={[
                          styles.patternTypeText,
                          patternType === type && styles.patternTypeTextActive
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {patternType !== 'custom' && (
                  <>
                    <Text style={styles.inputLabel}>Interval</Text>
                    <View style={styles.intervalContainer}>
                      <Text style={styles.intervalLabel}>Every</Text>
                      <TextInput
                        style={styles.intervalInput}
                        value={interval.toString()}
                        onChangeText={text => setInterval(parseInt(text) || 1)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.intervalLabel}>
                        {patternType === 'daily'
                          ? 'day(s)'
                          : patternType === 'weekly'
                          ? 'week(s)'
                          : 'month(s)'}
                      </Text>
                    </View>
                  </>
                )}

                {patternType === 'custom' && (
                  <>
                    <Text style={styles.inputLabel}>Custom Interval (Days)</Text>
                    <View style={styles.intervalContainer}>
                      <Text style={styles.intervalLabel}>Every</Text>
                      <TextInput
                        style={styles.intervalInput}
                        value={customDays.toString()}
                        onChangeText={text => setCustomDays(parseInt(text) || 1)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.intervalLabel}>day(s)</Text>
                    </View>
                  </>
                )}

                {patternType === 'weekly' && (
                  <View>
                    <Text style={styles.inputLabel}>Days of Week</Text>
                    <View style={styles.daysContainer}>
                      {daysOfWeek.map(day => (
                        <TouchableOpacity
                          key={day.value}
                          style={[
                            styles.dayButton,
                            selectedDays.includes(day.value) && [styles.dayButtonActive, { backgroundColor: themeColor }]
                          ]}
                          onPress={() => toggleDay(day.value)}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              selectedDays.includes(day.value) && styles.dayButtonTextActive
                            ]}
                          >
                            {day.name.substring(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {patternType === 'monthly' && (
                  <View>
                    <Text style={styles.inputLabel}>Day of Month</Text>
                    <View style={styles.intervalContainer}>
                      <Text style={styles.intervalLabel}>Day</Text>
                      <TextInput
                        style={styles.intervalInput}
                        placeholder="1"
                        value={dayOfMonth.toString()}
                        onChangeText={text => {
                          const day = parseInt(text) || 1;
                          setDayOfMonth(Math.min(Math.max(day, 1), 31));
                        }}
                        keyboardType="numeric"
                      />
                      <Text style={styles.intervalLabel}>of the month</Text>
                    </View>
                  </View>
                )}

                {/* Start Date */}
                <DateInput
                  label="Start Date"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  required
                  themeColor={themeColor}
                />

                <View style={[styles.patternSummary, { backgroundColor: themeColor + '10' }]}>
                  <Icon name="information-circle" size={20} style={{ color: themeColor }} />
                  <Text style={styles.patternSummaryText}>{getPatternDescription()}</Text>
                </View>
              </View>

              {/* End Conditions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>End Conditions</Text>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Set end date</Text>
                  <Switch
                    value={hasEndDate}
                    onValueChange={value => {
                      setHasEndDate(value);
                      if (value) {
                        setHasMaxOccurrences(false);
                      }
                    }}
                    trackColor={{ false: colors.border, true: themeColor + '40' }}
                    thumbColor={hasEndDate ? themeColor : colors.textSecondary}
                  />
                </View>

                {hasEndDate && (
                  <DateInput
                    label="End Date"
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    themeColor={themeColor}
                  />
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Limit occurrences</Text>
                  <Switch
                    value={hasMaxOccurrences}
                    onValueChange={value => {
                      setHasMaxOccurrences(value);
                      if (value) {
                        setHasEndDate(false);
                      }
                    }}
                    trackColor={{ false: colors.border, true: themeColor + '40' }}
                    thumbColor={hasMaxOccurrences ? themeColor : colors.textSecondary}
                  />
                </View>

                {hasMaxOccurrences && (
                  <>
                    <Text style={styles.inputLabel}>Number of Occurrences</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 10"
                      value={maxOccurrences}
                      onChangeText={setMaxOccurrences}
                      keyboardType="numeric"
                    />
                  </>
                )}

                {!hasEndDate && !hasMaxOccurrences && (
                  <View style={[styles.patternSummary, { backgroundColor: colors.warning + '10' }]}>
                    <Icon name="alert-circle" size={20} style={{ color: colors.warning }} />
                    <Text style={[styles.patternSummaryText, { color: colors.warning }]}>
                      This recurring project will continue indefinitely until manually stopped.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <Button
                  text="Cancel"
                  onPress={handleClose}
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button
                  text={initialPattern ? 'Update Pattern' : 'Create Recurring Project'}
                  onPress={handleSave}
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '95%',
    maxWidth: 500,
    backgroundColor: colors.background,
    borderRadius: 16,
    ...commonStyles.shadow,
    maxHeight: '90%',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: spacing.md,
  },
  patternTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.xs,
  },
  patternTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  patternTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  patternTypeText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  patternTypeTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  intervalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  intervalLabel: {
    ...typography.body,
    color: colors.text,
    marginHorizontal: spacing.sm,
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    textAlign: 'center',
    minWidth: 60,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dayButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  patternSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  patternSummaryText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: '500',
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

RecurringProjectModal.displayName = 'RecurringProjectModal';

export default RecurringProjectModal;
