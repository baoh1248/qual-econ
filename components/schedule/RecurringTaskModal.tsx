
import React, { memo, useState, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Switch, Platform } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import DateInput from '../DateInput';
import type { Client, ClientBuilding, Cleaner } from '../../hooks/useClientData';

interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number; // Every X days/weeks/months
  daysOfWeek?: number[]; // For weekly: 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number; // For monthly: 1-31
  customDays?: number; // For custom: every X days
  endDate?: string;
  maxOccurrences?: number;
  startDate?: string; // When to start the recurrence
}

interface RecurringTaskData {
  clientBuilding: ClientBuilding;
  cleanerName: string; // Keep for backward compatibility
  cleanerNames?: string[]; // New field for multiple cleaners
  hours: number;
  startTime: string;
  pattern: RecurringPattern;
  notes?: string;
}

interface RecurringTaskModalProps {
  visible: boolean;
  clientBuildings: ClientBuilding[];
  clients: Client[];
  cleaners: Cleaner[];
  onClose: () => void;
  onSave: (taskData: RecurringTaskData) => Promise<void>;
}

const RecurringTaskModal = memo(({
  visible,
  clientBuildings,
  clients,
  cleaners,
  onClose,
  onSave,
}: RecurringTaskModalProps) => {
  console.log('RecurringTaskModal rendered');

  // Form state
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<ClientBuilding | null>(null);
  const [cleanerName, setCleanerName] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]); // New state for multiple cleaners
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pattern state
  const [patternType, setPatternType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Default to Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [customDays, setCustomDays] = useState(1); // For custom pattern
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Start date for recurrence
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [hasMaxOccurrences, setHasMaxOccurrences] = useState(false);
  const [maxOccurrences, setMaxOccurrences] = useState('');

  // Dropdown states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showCleanerDropdown, setShowCleanerDropdown] = useState(false);
  const [showHoursDropdown, setShowHoursDropdown] = useState(false);

  // Generate hours options (0.5-12 in 30-minute increments)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => ((i + 1) * 0.5).toString());

  const daysOfWeek = [
    { name: 'Sunday', value: 0 },
    { name: 'Monday', value: 1 },
    { name: 'Tuesday', value: 2 },
    { name: 'Wednesday', value: 3 },
    { name: 'Thursday', value: 4 },
    { name: 'Friday', value: 5 },
    { name: 'Saturday', value: 6 },
  ];

  // Filter buildings based on selected client
  const filteredBuildings = useMemo(() => {
    if (!selectedClient) {
      return clientBuildings;
    }
    return clientBuildings.filter(building => building.clientName === selectedClient);
  }, [selectedClient, clientBuildings]);

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedBuilding(null);
    setCleanerName('');
    setSelectedCleaners([]);
    setHours('');
    setStartTime('');
    setNotes('');
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
    setShowClientDropdown(false);
    setShowBuildingDropdown(false);
    setShowCleanerDropdown(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (isSaving) {
      console.log('Save already in progress, ignoring duplicate call');
      return;
    }

    const cleanersToUse = selectedCleaners.length > 0 ? selectedCleaners : (cleanerName ? [cleanerName] : []);
    
    if (!selectedBuilding || cleanersToUse.length === 0 || !hours) {
      console.log('Validation failed:', { selectedBuilding, cleanersToUse, hours });
      return;
    }

    try {
      console.log('=== SAVING RECURRING TASK ===');
      setIsSaving(true);

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

      const taskData: RecurringTaskData = {
        clientBuilding: selectedBuilding,
        cleanerName: cleanersToUse[0], // Keep backward compatibility
        cleanerNames: cleanersToUse, // New field for multiple cleaners
        hours: parseFloat(hours),
        startTime,
        pattern,
        notes: notes || undefined,
      };

      console.log('Calling onSave with task data:', taskData);
      await onSave(taskData);
      console.log('✅ Recurring task saved successfully');
      
      handleClose();
    } catch (error) {
      console.error('❌ Error saving recurring task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function for multiple cleaner selection
  const toggleCleanerSelection = (cleanerName: string) => {
    const isSelected = selectedCleaners.includes(cleanerName);
    
    if (isSelected) {
      // Don't allow removing the last cleaner
      if (selectedCleaners.length > 1) {
        setSelectedCleaners(selectedCleaners.filter(name => name !== cleanerName));
      }
    } else {
      setSelectedCleaners([...selectedCleaners, cleanerName]);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const renderClientDropdown = () => (
    <View style={styles.dropdownContainer}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled>
        <TouchableOpacity
          style={[styles.dropdownItem, selectedClient === null && styles.dropdownItemSelected]}
          onPress={() => {
            setSelectedClient(null);
            setSelectedBuilding(null);
            setShowClientDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, selectedClient === null && styles.dropdownTextSelected]}>
            All Clients
          </Text>
        </TouchableOpacity>
        {clients.filter(c => c.isActive).map((client, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dropdownItem, selectedClient === client.name && styles.dropdownItemSelected]}
            onPress={() => {
              setSelectedClient(client.name);
              setSelectedBuilding(null);
              setShowClientDropdown(false);
            }}
          >
            <Text style={[styles.dropdownText, selectedClient === client.name && styles.dropdownTextSelected]}>
              {client.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBuildingDropdown = () => (
    <View style={styles.dropdownContainer}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled>
        <TouchableOpacity
          style={[styles.dropdownItem, selectedBuilding === null && styles.dropdownItemSelected]}
          onPress={() => {
            setSelectedBuilding(null);
            setShowBuildingDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, selectedBuilding === null && styles.dropdownTextSelected]}>
            Select building
          </Text>
        </TouchableOpacity>
        {filteredBuildings.map((building, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dropdownItem, selectedBuilding?.id === building.id && styles.dropdownItemSelected]}
            onPress={() => {
              setSelectedBuilding(building);
              setShowBuildingDropdown(false);
            }}
          >
            <Text style={[styles.dropdownText, selectedBuilding?.id === building.id && styles.dropdownTextSelected]}>
              {building.clientName} - {building.buildingName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const getPatternDescription = () => {
    let description = '';
    
    switch (patternType) {
      case 'daily':
        description = interval === 1 ? 'Every day' : `Every ${interval} days`;
        break;
      case 'weekly':
        const dayNames = selectedDays.map(d => daysOfWeek.find(day => day.value === d)?.name).join(', ');
        description = interval === 1 
          ? `Every week on ${dayNames}`
          : `Every ${interval} weeks on ${dayNames}`;
        break;
      case 'monthly':
        description = interval === 1 
          ? `Every month on day ${dayOfMonth}`
          : `Every ${interval} months on day ${dayOfMonth}`;
        break;
      case 'custom':
        description = customDays === 1 ? 'Every day' : `Every ${customDays} days`;
        break;
      default:
        description = '';
    }
    
    // Add start date
    if (startDate) {
      description += `, starting ${new Date(startDate).toLocaleDateString()}`;
    }
    
    // Add end condition
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
                <Icon name="repeat" size={24} style={{ color: colors.primary }} />
                <Text style={styles.modalTitle}>Create Recurring Task</Text>
              </View>

              {/* Basic Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                
                <Text style={styles.inputLabel}>Client *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowClientDropdown(!showClientDropdown)}
                >
                  <Text style={[styles.inputText, !selectedClient && styles.placeholderText]}>
                    {selectedClient || 'All Clients'}
                  </Text>
                  <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                </TouchableOpacity>
                {showClientDropdown && renderClientDropdown()}

                <Text style={styles.inputLabel}>Building *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowBuildingDropdown(!showBuildingDropdown)}
                >
                  <Text style={[styles.inputText, !selectedBuilding && styles.placeholderText]}>
                    {selectedBuilding ? `${selectedBuilding.clientName} - ${selectedBuilding.buildingName}` : 'Select building'}
                  </Text>
                  <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                </TouchableOpacity>
                {showBuildingDropdown && renderBuildingDropdown()}

                {filteredBuildings.length === 0 && selectedClient && (
                  <View style={styles.infoCard}>
                    <Icon name="information-circle" size={20} style={{ color: colors.warning }} />
                    <Text style={[styles.infoText, { color: colors.warning }]}>
                      No buildings available for {selectedClient}. Please select a different client or add buildings first.
                    </Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Cleaners * (Select one or more)</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowCleanerDropdown(!showCleanerDropdown)}
                >
                  <Text style={[styles.inputText, selectedCleaners.length === 0 && styles.placeholderText]}>
                    {selectedCleaners.length > 0 
                      ? `${selectedCleaners.length} cleaner${selectedCleaners.length > 1 ? 's' : ''} selected`
                      : 'Select cleaners'
                    }
                  </Text>
                  <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                </TouchableOpacity>
                
                {/* Selected cleaners display */}
                {selectedCleaners.length > 0 && (
                  <View style={styles.selectedCleanersContainer}>
                    {selectedCleaners.map((cleanerName, index) => (
                      <View key={index} style={styles.selectedCleanerChip}>
                        <Text style={styles.selectedCleanerText}>{cleanerName}</Text>
                        {selectedCleaners.length > 1 && (
                          <TouchableOpacity
                            onPress={() => toggleCleanerSelection(cleanerName)}
                            style={styles.removeSelectedCleanerButton}
                          >
                            <Icon name="close" size={12} style={{ color: colors.background }} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Multi-select cleaner dropdown */}
                {showCleanerDropdown && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView style={styles.dropdown} nestedScrollEnabled>
                      {cleaners.filter(c => c.isActive).map((cleaner, index) => {
                        const isSelected = selectedCleaners.includes(cleaner.name);
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                            onPress={() => toggleCleanerSelection(cleaner.name)}
                          >
                            <View style={styles.cleanerDropdownRow}>
                              <Text style={[styles.dropdownText, isSelected && styles.dropdownTextSelected]}>
                                {cleaner.name}
                              </Text>
                              <Icon 
                                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                                size={20} 
                                style={{ color: isSelected ? colors.background : colors.textSecondary }} 
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.closeDropdownButton}
                      onPress={() => setShowCleanerDropdown(false)}
                    >
                      <Text style={styles.closeDropdownText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.inputLabel}>Hours *</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowHoursDropdown(!showHoursDropdown)}
                >
                  <Text style={[styles.inputText, !hours && styles.placeholderText]}>
                    {hours || '3'}
                  </Text>
                  <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                </TouchableOpacity>
                {showHoursDropdown && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView style={styles.dropdown} nestedScrollEnabled>
                      {hoursOptions.map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[styles.dropdownItem, hours === hour && styles.dropdownItemSelected]}
                          onPress={() => {
                            setHours(hour);
                            setShowHoursDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownText, hours === hour && styles.dropdownTextSelected]}>
                            {hour} {parseFloat(hour) === 1 ? 'hour' : 'hours'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity
                      style={styles.closeDropdownButton}
                      onPress={() => setShowHoursDropdown(false)}
                    >
                      <Text style={styles.closeDropdownText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.inputLabel}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="17:00"
                  value={startTime}
                  onChangeText={setStartTime}
                />

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes or instructions..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
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
                        patternType === type && styles.patternTypeButtonActive
                      ]}
                      onPress={() => setPatternType(type)}
                    >
                      <Text style={[
                        styles.patternTypeText,
                        patternType === type && styles.patternTypeTextActive
                      ]}>
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
                        onChangeText={(text) => setInterval(parseInt(text) || 1)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.intervalLabel}>
                        {patternType === 'daily' ? 'day(s)' : 
                         patternType === 'weekly' ? 'week(s)' : 'month(s)'}
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
                        onChangeText={(text) => setCustomDays(parseInt(text) || 1)}
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
                            selectedDays.includes(day.value) && styles.dayButtonActive
                          ]}
                          onPress={() => toggleDay(day.value)}
                        >
                          <Text style={[
                            styles.dayButtonText,
                            selectedDays.includes(day.value) && styles.dayButtonTextActive
                          ]}>
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
                        onChangeText={(text) => {
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
                  themeColor={colors.primary}
                />

                <View style={styles.patternSummary}>
                  <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
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
                    onValueChange={(value) => {
                      setHasEndDate(value);
                      if (value) {
                        setHasMaxOccurrences(false);
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={hasEndDate ? colors.primary : colors.textSecondary}
                  />
                </View>

                {hasEndDate && (
                  <DateInput
                    label="End Date"
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    themeColor={colors.primary}
                  />
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Limit occurrences</Text>
                  <Switch
                    value={hasMaxOccurrences}
                    onValueChange={(value) => {
                      setHasMaxOccurrences(value);
                      if (value) {
                        setHasEndDate(false);
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={hasMaxOccurrences ? colors.primary : colors.textSecondary}
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
                      This recurring task will continue indefinitely until manually stopped.
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
                  disabled={isSaving}
                />
                <Button 
                  text={isSaving ? "Creating..." : "Create Recurring Task"}
                  onPress={handleSave} 
                  variant="primary"
                  style={styles.actionButton}
                  disabled={isSaving}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  dropdownContainer: {
    marginBottom: spacing.md,
  },
  dropdown: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownTextSelected: {
    color: colors.background,
    fontWeight: '600',
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
  selectedCleanersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectedCleanerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  selectedCleanerText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
  removeSelectedCleanerButton: {
    backgroundColor: colors.background + '30',
    borderRadius: 8,
    padding: 2,
  },
  cleanerDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  closeDropdownButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  closeDropdownText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.warning,
    flex: 1,
    lineHeight: 18,
  },
});

RecurringTaskModal.displayName = 'RecurringTaskModal';

export default RecurringTaskModal;
