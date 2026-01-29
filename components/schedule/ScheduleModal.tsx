
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import DateInput from '../DateInput';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Client, ClientBuilding, Cleaner } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';
import { useTimeOffRequests } from '../../hooks/useTimeOffRequests';

type ModalType = 'add' | 'edit' | 'add-client' | 'add-building' | 'add-cleaner' | 'details' | 'edit-client' | 'edit-building' | null;

interface ScheduleModalProps {
  visible: boolean;
  modalType: ModalType;
  selectedEntry: ScheduleEntry | null;
  selectedClient: Client | null;
  selectedClientBuilding: ClientBuilding | null;
  cleaners: Cleaner[];
  clients: Client[];
  clientBuildings: ClientBuilding[];
  selectedDay?: string;
  currentDate?: Date;
  
  // Form states
  cleanerName: string;
  selectedCleaners: string[];
  hours: string;
  cleanerHours: { [cleanerName: string]: string };
  startTime: string;
  shiftNotes: string;
  paymentType: 'hourly' | 'flat_rate';
  flatRateAmount: string;
  newClientName: string;
  newClientSecurity: string;
  newClientSecurityLevel: 'low' | 'medium' | 'high';
  newBuildingName: string;
  newBuildingSecurity: string;
  newBuildingSecurityLevel: 'low' | 'medium' | 'high';
  selectedClientForBuilding: string;
  newCleanerName: string;
  showClientDropdown: boolean;
  showCleanerDropdown: boolean;
  showSecurityLevelDropdown: boolean;
  showBuildingDropdown: boolean;
  isAddingFromGrid?: boolean;

  // Setters
  setCleanerName: (value: string) => void;
  setSelectedCleaners: (value: string[]) => void;
  setHours: (value: string) => void;
  setCleanerHours: (value: { [cleanerName: string]: string }) => void;
  setStartTime: (value: string) => void;
  setShiftNotes: (value: string) => void;
  setPaymentType: (value: 'hourly' | 'flat_rate') => void;
  setFlatRateAmount: (value: string) => void;
  setNewClientName: (value: string) => void;
  setNewClientSecurity: (value: string) => void;
  setNewClientSecurityLevel: (value: 'low' | 'medium' | 'high') => void;
  setNewBuildingName: (value: string) => void;
  setNewBuildingSecurity: (value: string) => void;
  setNewBuildingSecurityLevel: (value: 'low' | 'medium' | 'high') => void;
  setSelectedClientForBuilding: (value: string) => void;
  setNewCleanerName: (value: string) => void;
  setShowClientDropdown: (value: boolean) => void;
  setShowCleanerDropdown: (value: boolean) => void;
  setShowSecurityLevelDropdown: (value: boolean) => void;
  setShowBuildingDropdown: (value: boolean) => void;
  setSelectedClientBuilding: (value: ClientBuilding | null) => void;

  // Actions
  onClose: () => void;
  onSave: (editAllRecurring?: boolean) => Promise<void>;
  onDelete: (deleteType?: 'single' | 'allFuture') => void;
  onAddClient: () => void;
  onAddBuilding: () => void;
  onAddCleaner: () => void;
  onEditClient: () => void;
  onEditBuilding: () => void;
  onSwitchToEdit: () => void;
  onOpenRecurringModal?: () => void;
}

const ScheduleModal = memo(({
  visible,
  modalType,
  selectedEntry,
  selectedClient,
  selectedClientBuilding,
  cleaners,
  clients,
  clientBuildings = [],
  selectedDay,
  currentDate,
  cleanerName,
  selectedCleaners = [],
  hours,
  cleanerHours,
  startTime,
  shiftNotes = '',
  paymentType: propPaymentType,
  flatRateAmount: propFlatRateAmount,
  newClientName,
  newClientSecurity,
  newClientSecurityLevel,
  newBuildingName,
  newBuildingSecurity,
  newBuildingSecurityLevel,
  selectedClientForBuilding,
  newCleanerName,
  showClientDropdown,
  showCleanerDropdown,
  showSecurityLevelDropdown,
  showBuildingDropdown = false,
  isAddingFromGrid = false,
  setCleanerName,
  setSelectedCleaners,
  setHours,
  setCleanerHours,
  setStartTime,
  setShiftNotes,
  setPaymentType: setPropPaymentType,
  setFlatRateAmount: setPropFlatRateAmount,
  setNewClientName,
  setNewClientSecurity,
  setNewClientSecurityLevel,
  setNewBuildingName,
  setNewBuildingSecurity,
  setNewBuildingSecurityLevel,
  setSelectedClientForBuilding,
  setNewCleanerName,
  setShowClientDropdown,
  setShowCleanerDropdown,
  setShowSecurityLevelDropdown,
  setShowBuildingDropdown,
  setSelectedClientBuilding,
  onClose,
  onSave,
  onDelete,
  onAddClient,
  onAddBuilding,
  onAddCleaner,
  onEditClient,
  onEditBuilding,
  onSwitchToEdit,
  onOpenRecurringModal,
}: ScheduleModalProps) => {
  console.log('ScheduleModal rendered with type:', modalType, 'visible:', visible, 'isAddingFromGrid:', isAddingFromGrid);

  const { themeColor } = useTheme();
  const { fetchApprovedTimeOff, isCleanerOnTimeOff, getCleanerTimeOffDetails } = useTimeOffRequests();

  // Local state for cleaner search
  const [cleanerSearchQuery, setCleanerSearchQuery] = useState('');
  
  // Local state for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecurringDeleteOptions, setShowRecurringDeleteOptions] = useState(false);

  // Local state for save loading
  const [isSaving, setIsSaving] = useState(false);

  // Local state for client selection
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [showClientSelectorDropdown, setShowClientSelectorDropdown] = useState(false);

  // Local state for hours and start time dropdowns
  const [showHoursDropdown, setShowHoursDropdown] = useState(false);
  const [showStartTimeDropdown, setShowStartTimeDropdown] = useState(false);
  const [openCleanerHoursDropdown, setOpenCleanerHoursDropdown] = useState<string | null>(null);

  // Local state for editing all recurring shifts
  const [editAllRecurring, setEditAllRecurring] = useState(false);

  // Generate hours options (0.5-12 in 30-minute increments)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => ((i + 1) * 0.5).toString());

  // Generate start time options (6 AM to 11:30 PM in 30-minute intervals)
  const startTimeOptions = useMemo(() => {
    const times: string[] = [];
    for (let hour = 6; hour < 24; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
      times.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return times;
  }, []);

  // Helper function to format date as YYYY-MM-DD using local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper function to calculate date from selected day
  const calculateDateFromDay = (dayName: string, baseDate: Date): string => {
    try {
      const dayMap: { [key: string]: number } = {
        'monday': 0,
        'tuesday': 1,
        'wednesday': 2,
        'thursday': 3,
        'friday': 4,
        'saturday': 5,
        'sunday': 6,
      };

      const targetDayIndex = dayMap[dayName.toLowerCase()];
      if (targetDayIndex === undefined) {
        return formatLocalDate(new Date());
      }

      // Calculate Monday of the current week
      const weekStart = new Date(baseDate);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);

      // Add days to get to the target day
      weekStart.setDate(weekStart.getDate() + targetDayIndex);

      return formatLocalDate(weekStart);
    } catch (error) {
      console.error('Error calculating date from day:', error);
      return formatLocalDate(new Date());
    }
  };

  // Date field - Initialize with proper date format
  // Note: Only initialize with selectedEntry date or default. Let useEffect handle selectedDay calculation
  // to avoid stale closure issues
  const [scheduleDate, setScheduleDate] = useState(() => {
    try {
      if (selectedEntry?.date) {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = selectedEntry.date.split('T')[0];
        return dateStr;
      }
      return formatLocalDate(new Date());
    } catch (error) {
      console.error('Error initializing schedule date:', error);
      return formatLocalDate(new Date());
    }
  });

  // Update scheduleDate when modal opens or selectedEntry/selectedDay changes
  useEffect(() => {
    console.log('📅 Date useEffect triggered:', {
      visible,
      selectedDay,
      hasCurrentDate: !!currentDate,
      hasSelectedEntry: !!selectedEntry,
      selectedEntryDate: selectedEntry?.date
    });

    if (!visible) return;

    if (selectedEntry?.date) {
      const dateStr = selectedEntry.date.split('T')[0];
      console.log('📅 Using selectedEntry date:', dateStr);
      setScheduleDate(dateStr);
    } else if (selectedDay && currentDate) {
      // Calculate date from selected day
      const calculatedDate = calculateDateFromDay(selectedDay, currentDate);
      console.log('📅 Calculating date for day:', selectedDay, '→', calculatedDate);
      setScheduleDate(calculatedDate);
    } else {
      const fallbackDate = formatLocalDate(new Date());
      console.log('📅 Using fallback date (today):', fallbackDate, 'because selectedDay:', selectedDay, 'currentDate:', !!currentDate);
      setScheduleDate(fallbackDate);
    }
  }, [visible, selectedEntry, selectedDay, currentDate]);

  // Reset client selection when modal opens/closes
  useEffect(() => {
    if (visible && modalType === 'add') {
      setSelectedClientName('');
      if (!isAddingFromGrid) {
        setSelectedClientBuilding(null);
      }
    }
  }, [visible, modalType, isAddingFromGrid]);

  // Fetch approved time off requests when modal opens or date changes
  useEffect(() => {
    if (visible && scheduleDate) {
      // Fetch time off for a week range around the selected date for efficiency
      const date = new Date(scheduleDate);
      const startDate = new Date(date);
      startDate.setDate(date.getDate() - 7);
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 7);

      fetchApprovedTimeOff(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    }
  }, [visible, scheduleDate, fetchApprovedTimeOff]);

  // Filter buildings based on selected client
  const filteredBuildings = useMemo(() => {
    if (!selectedClientName) {
      return clientBuildings;
    }
    return clientBuildings.filter(building => building.clientName === selectedClientName);
  }, [selectedClientName, clientBuildings]);

  // Use payment props directly (managed by parent)
  const paymentType = propPaymentType;
  const setPaymentType = setPropPaymentType;
  const flatRateAmount = propFlatRateAmount;
  const setFlatRateAmount = setPropFlatRateAmount;

  // Calculate estimated payment based on selected cleaners and their hourly rates
  const estimatedPayment = useMemo(() => {
    if (paymentType === 'flat_rate') {
      return parseFloat(flatRateAmount) || 0;
    } else {
      // For hourly rate, calculate based on each cleaner's individual hours and rates
      if (selectedCleaners && selectedCleaners.length > 0) {
        let totalPayment = 0;

        for (const cleanerName of selectedCleaners) {
          const cleaner = cleaners.find(c => c.name === cleanerName);
          const rate = cleaner?.defaultHourlyRate || 15;
          const cleanerHoursValue = parseFloat(cleanerHours[cleanerName] || '3') || 0;
          totalPayment += cleanerHoursValue * rate;
        }

        return totalPayment;
      }

      // Default calculation if no cleaners selected
      const hoursNum = parseFloat(hours) || 0;
      return hoursNum * 15;
    }
  }, [hours, cleanerHours, paymentType, flatRateAmount, selectedCleaners, cleaners]);

  // Get breakdown of payment per cleaner
  const paymentBreakdown = useMemo(() => {
    if (paymentType === 'flat_rate' || !selectedCleaners || selectedCleaners.length === 0) {
      return [];
    }

    return selectedCleaners.map(cleanerName => {
      const cleaner = cleaners.find(c => c.name === cleanerName);
      const rate = cleaner?.defaultHourlyRate || 15;
      const cleanerHoursValue = parseFloat(cleanerHours[cleanerName] || '3') || 0;
      return {
        name: cleanerName,
        hours: cleanerHoursValue,
        rate,
        payment: cleanerHoursValue * rate
      };
    });
  }, [cleanerHours, paymentType, selectedCleaners, cleaners]);

  if (!visible) return null;

  // Helper functions for multiple cleaner selection
  const getEntryCleaners = (entry: ScheduleEntry | null): string[] => {
    if (!entry) return [];
    if (entry.cleanerNames && entry.cleanerNames.length > 0) {
      return entry.cleanerNames;
    }
    return entry.cleanerName ? [entry.cleanerName] : [];
  };

  const toggleCleanerSelection = (cleanerName: string) => {
    if (!setSelectedCleaners) return;
    
    const currentCleaners = selectedCleaners || [];
    const isSelected = currentCleaners.includes(cleanerName);
    
    console.log('Toggling cleaner selection:', {
      cleanerName,
      isSelected,
      currentCleaners,
      action: isSelected ? 'remove' : 'add'
    });
    
    if (isSelected) {
      // Don't allow removing the last cleaner
      if (currentCleaners.length > 1) {
        const newCleaners = currentCleaners.filter(name => name !== cleanerName);
        console.log('Removing cleaner, new list:', newCleaners);
        setSelectedCleaners(newCleaners);
      } else {
        console.log('Cannot remove last cleaner');
      }
    } else {
      const newCleaners = [...currentCleaners, cleanerName];
      console.log('Adding cleaner, new list:', newCleaners);
      setSelectedCleaners(newCleaners);
    }
  };

  // Filter cleaners based on search query
  const getFilteredCleaners = () => {
    if (!cleanerSearchQuery.trim()) {
      return cleaners.filter(c => c.isActive);
    }
    
    const query = cleanerSearchQuery.toLowerCase().trim();
    return cleaners.filter(c => 
      c.isActive && (
        c.name.toLowerCase().includes(query) ||
        (c.employeeId && c.employeeId.toLowerCase().includes(query)) ||
        (c.securityLevel && c.securityLevel.toLowerCase().includes(query))
      )
    );
  };

  const securityLevels = ['low', 'medium', 'high'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return themeColor;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.text;
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  };

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return 'shield-checkmark';
      case 'medium': return 'shield-half';
      case 'low': return 'shield-outline';
      default: return 'shield-outline';
    }
  };

  const canAccessJob = (cleanerLevel: string, jobLevel: string): boolean => {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[cleanerLevel as keyof typeof levels] >= levels[jobLevel as keyof typeof levels];
  };

  const handleDeletePress = () => {
    const isRecurring = selectedEntry?.isRecurring && selectedEntry?.recurringId;

    if (Platform.OS === 'web') {
      if (isRecurring) {
        // For recurring shifts on web, show the recurring delete options directly
        setShowRecurringDeleteOptions(true);
      } else {
        setShowDeleteConfirm(true);
      }
    } else {
      if (isRecurring) {
        // For recurring shifts on mobile, use Alert with 3 options
        Alert.alert(
          'Delete Recurring Shift',
          'Do you want to delete only this shift or all future shifts in this pattern?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete This Only',
              onPress: () => onDelete('single'),
            },
            {
              text: 'Delete All Future',
              style: 'destructive',
              onPress: () => onDelete('allFuture'),
            }
          ]
        );
      } else {
        Alert.alert(
          'Delete Shift',
          `Are you sure you want to delete the shift for ${selectedEntry?.cleanerName} at ${selectedEntry?.buildingName}? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => onDelete(),
            }
          ]
        );
      }
    }
  };

  const confirmDelete = async () => {
    try {
      setShowDeleteConfirm(false);
      await onDelete();
    } catch (error) {
      console.error('Error during delete confirmation:', error);
      setShowDeleteConfirm(false);
    }
  };

  const confirmRecurringDelete = async (deleteType: 'single' | 'allFuture') => {
    try {
      setShowRecurringDeleteOptions(false);
      await onDelete(deleteType);
    } catch (error) {
      console.error('Error during recurring delete:', error);
      setShowRecurringDeleteOptions(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      console.log('Save already in progress, ignoring duplicate call');
      return;
    }

    try {
      console.log('=== STARTING SAVE OPERATION WITH PAYMENT INFO ===');
      console.log('ScheduleModal Save button pressed with data:', {
        modalType,
        selectedCleaners,
        hours,
        startTime,
        scheduleDate,
        paymentType,
        flatRateAmount,
        estimatedPayment,
        selectedEntry: selectedEntry?.id,
        selectedBuilding: selectedClientBuilding?.buildingName,
        editAllRecurring,
        isRecurring: selectedEntry?.isRecurring,
        recurringId: selectedEntry?.recurringId,
        isSaving
      });

      setIsSaving(true);

      console.log('Calling parent onSave function with editAllRecurring:', editAllRecurring);
      await onSave(editAllRecurring);
      console.log('Parent onSave completed successfully');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('=== SAVE OPERATION COMPLETED ===');
    } catch (error) {
      console.error('=== SAVE OPERATION FAILED ===');
      console.error('Error during save operation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderDropdown = (items: string[], selectedValue: string, onSelect: (value: string) => void, placeholder: string) => (
    <View style={styles.dropdownContainer}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled>
        <TouchableOpacity
          style={[styles.dropdownItem, selectedValue === '' && { backgroundColor: themeColor }]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.dropdownText, selectedValue === '' && styles.dropdownTextSelected]}>
            {placeholder}
          </Text>
        </TouchableOpacity>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dropdownItem, selectedValue === item && { backgroundColor: themeColor }]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.dropdownText, selectedValue === item && styles.dropdownTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    switch (modalType) {
      case 'details':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Details</Text>
            {selectedEntry && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.clientName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Building:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.buildingName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cleaners:</Text>
                  <View style={styles.cleanersContainer}>
                    {getEntryCleaners(selectedEntry).map((cleanerName, index) => (
                      <View key={index} style={[styles.cleanerChip, { backgroundColor: themeColor }]}>
                        <Text style={styles.cleanerChipText}>{cleanerName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.cleanerManagementNote, { backgroundColor: themeColor + '10' }]}>
                  <Icon name="information-circle-outline" size={16} style={{ color: themeColor }} />
                  <Text style={[styles.cleanerManagementNoteText, { color: themeColor }]}>
                    To add or remove cleaners, use the Edit button below
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.date.split('T')[0]}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hours:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.hours} hrs</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEntry.startTime} - {selectedEntry.endTime}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recurring:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEntry.isRecurring ? 'Yes' : 'No'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Type:</Text>
                  <View style={[styles.paymentTypeBadge, { 
                    backgroundColor: selectedEntry.paymentType === 'flat_rate' ? colors.success + '20' : themeColor + '20' 
                  }]}>
                    <Icon 
                      name={selectedEntry.paymentType === 'flat_rate' ? 'cash' : 'time'} 
                      size={12} 
                      style={{ 
                        color: selectedEntry.paymentType === 'flat_rate' ? colors.success : themeColor,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[styles.paymentTypeText, { 
                      color: selectedEntry.paymentType === 'flat_rate' ? colors.success : themeColor 
                    }]}>
                      {selectedEntry.paymentType === 'flat_rate' ? 'Flat Rate' : 'Hourly'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Amount:</Text>
                  <Text style={[styles.detailValue, { color: colors.success, fontWeight: 'bold' }]}>
                    ${selectedEntry.paymentType === 'flat_rate' 
                      ? (selectedEntry.flatRateAmount || 0).toFixed(2)
                      : ((selectedEntry.hourlyRate || 15) * selectedEntry.hours).toFixed(2)
                    }
                  </Text>
                </View>
                
                {selectedEntry.paymentType === 'hourly' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hourly Rate:</Text>
                    <Text style={styles.detailValue}>${(selectedEntry.hourlyRate || 15).toFixed(2)}/hr</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedEntry.status) }]}>
                    <Text style={styles.statusText}>{selectedEntry.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Week:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.weekId}</Text>
                </View>

                {selectedEntry.notes && (
                  <View style={styles.notesDetailSection}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <View style={styles.notesDetailBox}>
                      <Text style={styles.notesDetailText}>{selectedEntry.notes}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.modalActions}>
                  <Button 
                    text="Edit" 
                    onPress={onSwitchToEdit} 
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  <Button 
                    text="Delete" 
                    onPress={handleDeletePress} 
                    variant="danger"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}
          </View>
        );

      case 'add':
      case 'edit':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'add' ? 'Add New Shift' : 'Edit Shift'}
            </Text>

            {/* Recurring shift edit toggle - Only show in edit mode for recurring shifts */}
            {modalType === 'edit' && selectedEntry?.isRecurring && selectedEntry?.recurringId && (
              <View style={[styles.recurringEditToggle, { backgroundColor: themeColor + '10', borderColor: themeColor + '30' }]}>
                <View style={styles.recurringEditToggleContent}>
                  <View style={styles.recurringEditToggleText}>
                    <Icon name="repeat" size={20} style={{ color: themeColor }} />
                    <View style={styles.recurringEditToggleLabels}>
                      <Text style={[styles.recurringEditToggleTitle, { color: colors.text }]}>
                        Edit All Recurring Shifts
                      </Text>
                      <Text style={[styles.recurringEditToggleSubtitle, { color: colors.textSecondary }]}>
                        {editAllRecurring
                          ? 'Changes will apply to all shifts in this recurring pattern'
                          : 'Changes will only apply to this shift'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.recurringEditToggleSwitch,
                      editAllRecurring && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setEditAllRecurring(!editAllRecurring)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.recurringEditToggleSwitchKnob,
                      editAllRecurring && styles.recurringEditToggleSwitchKnobActive
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.formContainer}>
              {/* Client Selection - Only show for add mode when NOT adding from grid */}
              {modalType === 'add' && !isAddingFromGrid && (
                <>
                  <Text style={styles.inputLabel}>Client *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowClientSelectorDropdown(!showClientSelectorDropdown)}
                  >
                    <Text style={[styles.inputText, !selectedClientName && styles.placeholderText]}>
                      {selectedClientName || 'Select client'}
                    </Text>
                    <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                  </TouchableOpacity>
                  
                  {showClientSelectorDropdown && (
                    <View style={styles.dropdownContainer}>
                      <ScrollView style={styles.dropdown} nestedScrollEnabled>
                        <TouchableOpacity
                          style={[styles.dropdownItem, !selectedClientName && { backgroundColor: themeColor }]}
                          onPress={() => {
                            setSelectedClientName('');
                            setSelectedClientBuilding(null);
                            setShowClientSelectorDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownText, !selectedClientName && styles.dropdownTextSelected]}>
                            All Clients
                          </Text>
                        </TouchableOpacity>
                        {clients.filter(c => c.isActive).length === 0 ? (
                          <View style={styles.noResultsContainer}>
                            <Icon name="business-outline" size={24} style={styles.noResultsIcon} />
                            <Text style={styles.noResultsText}>No clients available</Text>
                          </View>
                        ) : (
                          clients.filter(c => c.isActive).map((client, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.dropdownItem,
                                selectedClientName === client.name && { backgroundColor: themeColor }
                              ]}
                              onPress={() => {
                                setSelectedClientName(client.name);
                                setSelectedClientBuilding(null);
                                setShowClientSelectorDropdown(false);
                              }}
                            >
                              <View style={styles.clientDropdownRow}>
                                <Text style={[
                                  styles.dropdownText,
                                  selectedClientName === client.name && styles.dropdownTextSelected
                                ]}>
                                  {client.name}
                                </Text>
                                <View style={[
                                  styles.securityIndicator,
                                  { backgroundColor: getSecurityLevelColor(client.securityLevel) + '20' }
                                ]}>
                                  <Icon 
                                    name={getSecurityLevelIcon(client.securityLevel)} 
                                    size={12} 
                                    style={{ color: getSecurityLevelColor(client.securityLevel) }} 
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity
                        style={[styles.closeDropdownButton, { backgroundColor: themeColor }]}
                        onPress={() => setShowClientSelectorDropdown(false)}
                      >
                        <Text style={styles.closeDropdownText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Building Selection - Only show when NOT adding from grid */}
              {modalType === 'add' && !isAddingFromGrid && !selectedClientBuilding && (
                <>
                  <Text style={styles.inputLabel}>Building *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowBuildingDropdown(!showBuildingDropdown)}
                  >
                    <Text style={[styles.inputText, !selectedClientBuilding && styles.placeholderText]}>
                      {selectedClientBuilding ? `${selectedClientBuilding.clientName} - ${selectedClientBuilding.buildingName}` : 'Select building'}
                    </Text>
                    <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                  </TouchableOpacity>
                  
                  {showBuildingDropdown && (
                    <View style={styles.dropdownContainer}>
                      <ScrollView style={styles.dropdown} nestedScrollEnabled>
                        {filteredBuildings.length === 0 ? (
                          <View style={styles.noResultsContainer}>
                            <Icon name="business-outline" size={24} style={styles.noResultsIcon} />
                            <Text style={styles.noResultsText}>
                              {selectedClientName 
                                ? `No buildings available for ${selectedClientName}`
                                : 'No buildings available'
                              }
                            </Text>
                          </View>
                        ) : (
                          filteredBuildings.map((building, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSelectedClientBuilding(building);
                                setShowBuildingDropdown(false);
                              }}
                            >
                              <View style={styles.buildingDropdownRow}>
                                <View style={styles.buildingInfo}>
                                  <Text style={styles.dropdownText}>
                                    {building.buildingName}
                                  </Text>
                                  <Text style={styles.buildingClientText}>
                                    {building.clientName}
                                  </Text>
                                </View>
                                <View style={[
                                  styles.securityIndicator,
                                  { backgroundColor: getSecurityLevelColor(building.securityLevel) + '20' }
                                ]}>
                                  <Icon 
                                    name={getSecurityLevelIcon(building.securityLevel)} 
                                    size={12} 
                                    style={{ color: getSecurityLevelColor(building.securityLevel) }} 
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                      <TouchableOpacity
                        style={[styles.closeDropdownButton, { backgroundColor: themeColor }]}
                        onPress={() => setShowBuildingDropdown(false)}
                      >
                        <Text style={styles.closeDropdownText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Show selected building info - Always show when building is selected */}
              {selectedClientBuilding && (
                <View style={[styles.selectedBuildingInfo, { backgroundColor: themeColor + '10' }]}>
                  <Icon name="business" size={16} style={{ color: themeColor }} />
                  <View style={styles.selectedBuildingText}>
                    <Text style={styles.selectedBuildingName}>{selectedClientBuilding.buildingName}</Text>
                    <Text style={styles.selectedBuildingClient}>{selectedClientBuilding.clientName}</Text>
                  </View>
                  {isAddingFromGrid && (
                    <View style={[styles.autoFilledBadge, { backgroundColor: colors.success }]}>
                      <Icon name="checkmark-circle" size={12} style={{ color: colors.background }} />
                      <Text style={styles.autoFilledText}>Auto-filled</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Date Field with Calendar */}
              <DateInput
                label="Date"
                value={scheduleDate}
                onChangeText={setScheduleDate}
                placeholder="YYYY-MM-DD"
                required
                themeColor={themeColor}
              />

              <Text style={styles.inputLabel}>Cleaners * (Select one or more)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  setShowCleanerDropdown(!showCleanerDropdown);
                  if (!showCleanerDropdown) {
                    setCleanerSearchQuery('');
                  }
                }}
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
                    <View key={index} style={[styles.selectedCleanerChip, { backgroundColor: colors.success }]}>
                      <Text style={styles.selectedCleanerText}>{cleanerName}</Text>
                      {selectedCleaners.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            toggleCleanerSelection(cleanerName);
                            // Remove hours for this cleaner
                            const newCleanerHours = { ...cleanerHours };
                            delete newCleanerHours[cleanerName];
                            setCleanerHours(newCleanerHours);
                          }}
                          style={styles.removeSelectedCleanerButton}
                        >
                          <Icon name="close" size={12} style={{ color: colors.background }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
              
              {/* Multi-select cleaner dropdown with search */}
              {showCleanerDropdown && (
                <View style={styles.dropdownContainer}>
                  <View style={styles.searchContainer}>
                    <Icon name="search" size={16} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search cleaners by name, ID, or security level..."
                      value={cleanerSearchQuery}
                      onChangeText={setCleanerSearchQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                    {cleanerSearchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setCleanerSearchQuery('')}
                        style={styles.clearSearchButton}
                      >
                        <Icon name="close-circle" size={16} style={styles.clearSearchIcon} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <ScrollView style={styles.dropdown} nestedScrollEnabled>
                    {getFilteredCleaners().length === 0 ? (
                      <View style={styles.noResultsContainer}>
                        <Icon name="person-outline" size={24} style={styles.noResultsIcon} />
                        <Text style={styles.noResultsText}>
                          {cleanerSearchQuery.trim() 
                            ? `No cleaners found matching "${cleanerSearchQuery}"`
                            : 'No active cleaners available'
                          }
                        </Text>
                      </View>
                    ) : (
                      getFilteredCleaners().map((cleaner, index) => {
                        const isSelected = selectedCleaners.includes(cleaner.name);
                        const securityLevel = cleaner.securityLevel || 'low';
                        const employeeId = cleaner.employeeId || 'N/A';

                        const canAccess = selectedClientBuilding ?
                          canAccessJob(securityLevel, selectedClientBuilding.securityLevel) : true;

                        // Check if cleaner has approved time off for the selected date
                        const isOnTimeOff = scheduleDate ? isCleanerOnTimeOff(cleaner.name, scheduleDate) : false;
                        const timeOffDetails = isOnTimeOff && scheduleDate ? getCleanerTimeOffDetails(cleaner.name, scheduleDate) : null;
                        const canAssign = canAccess && !isOnTimeOff;

                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dropdownItem,
                              isSelected && { backgroundColor: themeColor },
                              !canAssign && styles.dropdownItemDisabled
                            ]}
                            onPress={() => {
                              if (canAssign) {
                                toggleCleanerSelection(cleaner.name);
                              }
                            }}
                            disabled={!canAssign}
                          >
                            <View style={styles.cleanerDropdownRow}>
                              <View style={styles.cleanerInfo}>
                                <Text style={[
                                  styles.dropdownText,
                                  isSelected && styles.dropdownTextSelected,
                                  !canAssign && styles.dropdownTextDisabled
                                ]}>
                                  {cleaner.name}
                                </Text>
                                <View style={styles.cleanerMetadata}>
                                  <Text style={[
                                    styles.cleanerMetadataText,
                                    isSelected && styles.cleanerMetadataTextSelected,
                                    !canAssign && styles.cleanerMetadataTextDisabled
                                  ]}>
                                    ID: {employeeId} • {securityLevel.toUpperCase()} Security
                                    {cleaner.defaultHourlyRate && ` • $${cleaner.defaultHourlyRate.toFixed(2)}/hr`}
                                  </Text>
                                  {!canAccess && selectedClientBuilding && (
                                    <Text style={styles.accessDeniedText}>
                                      Cannot access {selectedClientBuilding.securityLevel.toUpperCase()} security jobs
                                    </Text>
                                  )}
                                  {isOnTimeOff && timeOffDetails && (
                                    <Text style={styles.timeOffText}>
                                      ⛱️ On approved time off - {timeOffDetails.reason}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.cleanerActions}>
                                {isOnTimeOff && (
                                  <View style={[
                                    styles.timeOffIndicator,
                                    { backgroundColor: colors.warning + '20' }
                                  ]}>
                                    <Icon
                                      name="calendar"
                                      size={12}
                                      style={{ color: colors.warning }}
                                    />
                                  </View>
                                )}
                                {!isOnTimeOff && (
                                  <View style={[
                                    styles.securityIndicator,
                                    { backgroundColor: getSecurityLevelColor(securityLevel) + '20' }
                                  ]}>
                                    <Icon
                                      name={getSecurityLevelIcon(securityLevel)}
                                      size={12}
                                      style={{ color: getSecurityLevelColor(securityLevel) }}
                                    />
                                  </View>
                                )}
                                <Icon
                                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                                  size={20}
                                  style={{
                                    color: isSelected ? colors.background :
                                           !canAssign ? colors.textSecondary + '50' : colors.textSecondary
                                  }}
                                />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={[styles.closeDropdownButton, { backgroundColor: themeColor }]}
                    onPress={() => {
                      setShowCleanerDropdown(false);
                      setCleanerSearchQuery('');
                    }}
                  >
                    <Text style={styles.closeDropdownText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Individual hours for each cleaner */}
              {selectedCleaners.length > 0 && (
                <View style={styles.cleanerHoursSection}>
                  <Text style={styles.sectionTitle}>Hours per Cleaner</Text>
                  {selectedCleaners.map((cleanerName, index) => {
                    const cleanerHoursValue = cleanerHours[cleanerName] || '3';
                    const isDropdownOpen = openCleanerHoursDropdown === cleanerName;

                    return (
                      <View key={index} style={styles.cleanerHoursRow}>
                        <Text style={styles.cleanerHoursName}>{cleanerName}</Text>
                        <View style={styles.cleanerHoursInputWrapper}>
                          <TouchableOpacity
                            style={styles.cleanerHoursInput}
                            onPress={() => setOpenCleanerHoursDropdown(isDropdownOpen ? null : cleanerName)}
                          >
                            <Text style={[styles.inputText, !cleanerHoursValue && styles.placeholderText]}>
                              {cleanerHoursValue}
                            </Text>
                            <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                          </TouchableOpacity>
                          {isDropdownOpen && (() => {
                            const selectedIdx = hoursOptions.indexOf(cleanerHoursValue);
                            const rowIdx = Math.floor(selectedIdx / 3);
                            const scrollY = Math.max(0, (rowIdx - 1) * 44);
                            return (
                            <View style={styles.dropdownContainer}>
                              <ScrollView style={styles.gridDropdown} nestedScrollEnabled contentOffset={{ x: 0, y: scrollY }}>
                                <View style={styles.gridDropdownContent}>
                                {hoursOptions.map((hour) => (
                                  <TouchableOpacity
                                    key={hour}
                                    style={[styles.gridDropdownItem, cleanerHoursValue === hour && { backgroundColor: themeColor }]}
                                    onPress={() => {
                                      setCleanerHours({ ...cleanerHours, [cleanerName]: hour });
                                      setOpenCleanerHoursDropdown(null);
                                    }}
                                  >
                                    <Text style={[styles.gridDropdownText, cleanerHoursValue === hour && styles.dropdownTextSelected]}>
                                      {hour} {parseFloat(hour) === 1 ? 'hr' : 'hrs'}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                                </View>
                              </ScrollView>
                              <TouchableOpacity
                                style={[styles.closeDropdownButton, { backgroundColor: themeColor }]}
                                onPress={() => setOpenCleanerHoursDropdown(null)}
                              >
                                <Text style={styles.closeDropdownText}>Close</Text>
                              </TouchableOpacity>
                            </View>
                            );
                          })()}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.inputLabel}>Start Time</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownSelector]}
                onPress={() => setShowStartTimeDropdown(!showStartTimeDropdown)}
              >
                <Text style={[styles.inputText, !startTime && styles.placeholderText]}>
                  {startTime || '09:00'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showStartTimeDropdown && (() => {
                const selectedIdx = startTimeOptions.indexOf(startTime);
                const rowIdx = Math.floor(selectedIdx / 4);
                const scrollY = Math.max(0, (rowIdx - 1) * 44);
                return (
                <View style={styles.dropdownContainer}>
                  <ScrollView style={styles.gridDropdown} nestedScrollEnabled contentOffset={{ x: 0, y: scrollY }}>
                    <View style={styles.gridDropdownContent}>
                    {startTimeOptions.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[styles.gridDropdownItemWide, startTime === time && { backgroundColor: themeColor }]}
                        onPress={() => {
                          setStartTime(time);
                          setShowStartTimeDropdown(false);
                        }}
                      >
                        <Text style={[styles.gridDropdownText, startTime === time && styles.dropdownTextSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    </View>
                  </ScrollView>
                  <TouchableOpacity
                    style={[styles.closeDropdownButton, { backgroundColor: themeColor }]}
                    onPress={() => setShowStartTimeDropdown(false)}
                  >
                    <Text style={styles.closeDropdownText}>Close</Text>
                  </TouchableOpacity>
                </View>
                );
              })()}

              {/* Notes Section */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Shift Notes</Text>
                <Text style={styles.sectionDescription}>
                  Add instructions or notes for the cleaner (e.g., building passcode, specific areas to clean)
                </Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Enter notes for the cleaner..."
                  value={shiftNotes}
                  onChangeText={setShiftNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Payment Configuration Section */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Configuration</Text>
                
                <View style={styles.paymentTypeContainer}>
                  <Text style={styles.inputLabel}>Payment Type *</Text>
                  <View style={styles.paymentTypeToggle}>
                    <TouchableOpacity
                      style={[
                        styles.paymentTypeButton,
                        paymentType === 'hourly' && [styles.paymentTypeButtonActive, { backgroundColor: themeColor }]
                      ]}
                      onPress={() => setPaymentType('hourly')}
                    >
                      <Icon 
                        name="time" 
                        size={16} 
                        style={{ 
                          color: paymentType === 'hourly' ? colors.background : themeColor,
                          marginRight: spacing.xs 
                        }} 
                      />
                      <Text style={[
                        styles.paymentTypeButtonText,
                        paymentType === 'hourly' && styles.paymentTypeButtonTextActive
                      ]}>
                        Hourly Rate
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.paymentTypeButton,
                        paymentType === 'flat_rate' && [styles.paymentTypeButtonActive, { backgroundColor: colors.success }]
                      ]}
                      onPress={() => setPaymentType('flat_rate')}
                    >
                      <Icon 
                        name="cash" 
                        size={16} 
                        style={{ 
                          color: paymentType === 'flat_rate' ? colors.background : colors.success,
                          marginRight: spacing.xs 
                        }} 
                      />
                      <Text style={[
                        styles.paymentTypeButtonText,
                        paymentType === 'flat_rate' && styles.paymentTypeButtonTextActive
                      ]}>
                        Flat Rate
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {paymentType === 'flat_rate' && (
                  <View>
                    <Text style={styles.inputLabel}>Flat Rate Amount ($)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100.00"
                      value={flatRateAmount}
                      onChangeText={setFlatRateAmount}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                {/* Payment Estimate */}
                <View style={styles.paymentEstimate}>
                  <View style={styles.paymentEstimateRow}>
                    <Text style={styles.paymentEstimateLabel}>Estimated Total Payment:</Text>
                    <Text style={styles.paymentEstimateValue}>
                      ${estimatedPayment.toFixed(2)}
                    </Text>
                  </View>
                  
                  {paymentType === 'hourly' && paymentBreakdown.length > 0 && (
                    <View style={styles.paymentBreakdown}>
                      <Text style={styles.paymentBreakdownTitle}>Payment Breakdown:</Text>
                      {paymentBreakdown.map((item, index) => (
                        <View key={index} style={styles.paymentBreakdownItem}>
                          <Text style={styles.paymentBreakdownName}>{item.name}</Text>
                          <Text style={styles.paymentBreakdownAmount}>
                            {item.hours || '0'} hrs × ${item.rate.toFixed(2)}/hr = ${item.payment.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {paymentType === 'flat_rate' && (
                    <Text style={styles.paymentEstimateNote}>
                      Flat rate payment for all selected cleaners
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                  disabled={isSaving}
                />
                <Button 
                  text={isSaving ? "Saving..." : "Save"}
                  onPress={handleSave}
                  variant="primary"
                  style={styles.actionButton}
                  disabled={isSaving}
                />
              </View>
            </View>
          </View>
        );

      case 'add-client':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newClientSecurityLevel) }]}>
                  {newClientSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newClientSecurityLevel,
                (value) => {
                  setNewClientSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Badge required, ID check, etc."
                value={newClientSecurity}
                onChangeText={setNewClientSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Client" 
                  onPress={onAddClient} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'add-building':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Building</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Select Client *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[styles.inputText, !selectedClientForBuilding && styles.placeholderText]}>
                  {selectedClientForBuilding || 'Select client'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showClientDropdown && renderDropdown(
                clients.filter(c => c.isActive).map(c => c.name),
                selectedClientForBuilding,
                (value) => {
                  setSelectedClientForBuilding(value);
                  setShowClientDropdown(false);
                },
                'Select client'
              )}
              
              <Text style={styles.inputLabel}>Building Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter building name"
                value={newBuildingName}
                onChangeText={setNewBuildingName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newBuildingSecurityLevel) }]}>
                  {newBuildingSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newBuildingSecurityLevel,
                (value) => {
                  setNewBuildingSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key code, access requirements, etc."
                value={newBuildingSecurity}
                onChangeText={setNewBuildingSecurity}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Building" 
                  onPress={onAddBuilding} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'add-cleaner':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Cleaner</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Cleaner Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cleaner name"
                value={newCleanerName}
                onChangeText={setNewCleanerName}
              />
              
              <View style={[styles.quickAddNote, { backgroundColor: themeColor + '10' }]}>
                <Icon name="information-circle-outline" size={16} style={{ color: themeColor }} />
                <Text style={[styles.quickAddNoteText, { color: themeColor }]}>
                  This is a quick add. Use the Cleaners section for full details including ID, security level, and contact info.
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Cleaner" 
                  onPress={onAddCleaner} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'edit-client':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Client</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newClientSecurityLevel) }]}>
                  {newClientSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newClientSecurityLevel,
                (value) => {
                  setNewClientSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Badge required, ID check, etc."
                value={newClientSecurity}
                onChangeText={setNewClientSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Save Changes" 
                  onPress={onEditClient} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'edit-building':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Building</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Building Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter building name"
                value={newBuildingName}
                onChangeText={setNewBuildingName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newBuildingSecurityLevel) }]}>
                  {newBuildingSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newBuildingSecurityLevel,
                (value) => {
                  setNewBuildingSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key code, access requirements, etc."
                value={newBuildingSecurity}
                onChangeText={setNewBuildingSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Save Changes" 
                  onPress={onEditBuilding} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={onClose}
          />
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {renderContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalContent}>
              <View style={styles.confirmIconContainer}>
                <Icon name="trash" size={32} style={{ color: colors.danger }} />
              </View>
              <Text style={styles.confirmTitle}>Delete Shift</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to delete the shift for {selectedEntry?.cleanerName} at {selectedEntry?.buildingName}? This action cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    console.log('Delete cancelled by user');
                    setShowDeleteConfirm(false);
                  }}
                  style={styles.confirmButton}
                  variant="secondary"
                />
                <Button
                  text="Delete"
                  onPress={confirmDelete}
                  style={styles.confirmButton}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recurring Delete Options Modal */}
      <Modal
        visible={showRecurringDeleteOptions}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRecurringDeleteOptions(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmModalContent}>
              <View style={styles.confirmIconContainer}>
                <Icon name="trash" size={32} style={{ color: colors.danger }} />
              </View>
              <Text style={styles.confirmTitle}>Delete Recurring Shift</Text>
              <Text style={styles.confirmMessage}>
                This is a recurring shift. How would you like to delete it?
              </Text>
              <View style={styles.recurringDeleteActions}>
                <Button
                  text="Cancel"
                  onPress={() => setShowRecurringDeleteOptions(false)}
                  style={styles.recurringDeleteButton}
                  variant="secondary"
                />
                <Button
                  text="Delete This Only"
                  onPress={() => confirmRecurringDelete('single')}
                  style={styles.recurringDeleteButton}
                  variant="danger"
                />
                <Button
                  text="Delete All Future"
                  onPress={() => confirmRecurringDelete('allFuture')}
                  style={styles.recurringDeleteButton}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    width: '90%',
    maxWidth: 500,
    backgroundColor: colors.background,
    borderRadius: 16,
    ...commonStyles.shadow,
    maxHeight: '85%',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
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
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    backgroundColor: colors.background,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  gridDropdown: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    backgroundColor: colors.background,
  },
  gridDropdownContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridDropdownItem: {
    width: '33.33%',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minHeight: 56,
  },
  gridDropdownItemWide: {
    width: '25%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minHeight: 44,
  },
  gridDropdownText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  detailsContainer: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
  cleanersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  cleanerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  cleanerChipText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
  cleanerManagementNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  cleanerManagementNoteText: {
    ...typography.caption,
    fontWeight: '500',
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
  cleanerInfo: {
    flex: 1,
  },
  cleanerMetadata: {
    marginTop: spacing.xs,
  },
  cleanerMetadataText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  cleanerMetadataTextSelected: {
    color: colors.background + '80',
  },
  cleanerMetadataTextDisabled: {
    color: colors.textSecondary + '50',
  },
  accessDeniedText: {
    ...typography.small,
    color: colors.danger,
    fontStyle: 'italic',
    marginTop: 2,
  },
  timeOffText: {
    ...typography.small,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cleanerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityIndicator: {
    padding: 4,
    borderRadius: 12,
  },
  timeOffIndicator: {
    padding: 4,
    borderRadius: 12,
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownTextDisabled: {
    color: colors.textSecondary + '50',
  },
  closeDropdownButton: {
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
  quickAddNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  quickAddNoteText: {
    ...typography.caption,
    fontWeight: '500',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  clearSearchIcon: {
    color: colors.textSecondary,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  noResultsIcon: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmModalContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmModalContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  confirmMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
  },
  recurringDeleteActions: {
    gap: spacing.sm,
    width: '100%',
  },
  recurringDeleteButton: {
    width: '100%',
  },
  notesSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  notesDetailSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  notesDetailBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesDetailText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontSize: 13,
  },
  paymentSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  paymentTypeContainer: {
    marginBottom: spacing.md,
  },
  paymentTypeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
  },
  paymentTypeButtonActive: {
    // backgroundColor set dynamically
  },
  paymentTypeButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentTypeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  paymentEstimate: {
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  paymentEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  paymentEstimateLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  paymentEstimateValue: {
    ...typography.h3,
    color: colors.success,
    fontWeight: 'bold',
  },
  paymentEstimateNote: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  paymentBreakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.success + '30',
  },
  paymentBreakdownTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  paymentBreakdownItem: {
    marginTop: spacing.xs,
  },
  paymentBreakdownName: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
  },
  paymentBreakdownAmount: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  paymentTypeText: {
    ...typography.small,
    fontWeight: '600',
  },
  selectedBuildingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  selectedBuildingText: {
    flex: 1,
  },
  selectedBuildingName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  selectedBuildingClient: {
    ...typography.small,
    color: colors.textSecondary,
  },
  buildingDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buildingInfo: {
    flex: 1,
  },
  buildingClientText: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  autoFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: 4,
  },
  autoFilledText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  cleanerHoursSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanerHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cleanerHoursName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  cleanerHoursInputWrapper: {
    width: 180,
  },
  cleanerHoursInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  recurringEditToggle: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recurringEditToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurringEditToggleText: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  recurringEditToggleLabels: {
    flex: 1,
  },
  recurringEditToggleTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  recurringEditToggleSubtitle: {
    ...typography.small,
    fontSize: 12,
  },
  recurringEditToggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  recurringEditToggleSwitchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recurringEditToggleSwitchKnobActive: {
    alignSelf: 'flex-end',
  },
});

ScheduleModal.displayName = 'ScheduleModal';

export default ScheduleModal;
