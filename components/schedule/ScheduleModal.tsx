
import React, { memo, useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert, Switch } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import DateInput from '../DateInput';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Client, ClientBuilding, Cleaner } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';

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
  
  // Form states
  cleanerName: string;
  selectedCleaners: string[];
  hours: string;
  startTime: string;
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

  // Setters
  setCleanerName: (value: string) => void;
  setSelectedCleaners: (value: string[]) => void;
  setHours: (value: string) => void;
  setStartTime: (value: string) => void;
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
  onSave: () => Promise<void>;
  onDelete: () => void;
  onAddClient: () => void;
  onAddBuilding: () => void;
  onAddCleaner: () => void;
  onEditClient: () => void;
  onEditBuilding: () => void;
  onSwitchToEdit: () => void;
  onOpenRecurringModal?: () => void; // NEW: Callback to open recurring modal
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
  cleanerName,
  selectedCleaners = [],
  hours,
  startTime,
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
  setCleanerName,
  setSelectedCleaners,
  setHours,
  setStartTime,
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
  onOpenRecurringModal, // NEW
}: ScheduleModalProps) => {
  console.log('ScheduleModal rendered with type:', modalType, 'visible:', visible);

  const { themeColor } = useTheme();

  // Local state for cleaner search
  const [cleanerSearchQuery, setCleanerSearchQuery] = useState('');
  
  // Local state for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Local state for save loading
  const [isSaving, setIsSaving] = useState(false);

  // NEW: Date and recurring shift fields - Initialize with proper date format
  const [scheduleDate, setScheduleDate] = useState(() => {
    try {
      if (selectedEntry?.date) {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = selectedEntry.date.split('T')[0];
        return dateStr;
      }
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error initializing schedule date:', error);
      return new Date().toISOString().split('T')[0];
    }
  });
  
  const [isRecurring, setIsRecurring] = useState(() => {
    try {
      return selectedEntry?.is_recurring || false;
    } catch (error) {
      console.error('Error initializing recurring state:', error);
      return false;
    }
  });

  // Update scheduleDate when selectedEntry changes
  useEffect(() => {
    if (selectedEntry?.date) {
      const dateStr = selectedEntry.date.split('T')[0];
      setScheduleDate(dateStr);
    } else {
      setScheduleDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedEntry]);

  // Payment-related state
  const [paymentType, setPaymentType] = useState<'hourly' | 'flat_rate'>(() => {
    try {
      return selectedEntry?.payment_type || 'hourly';
    } catch (error) {
      console.error('Error initializing payment type:', error);
      return 'hourly';
    }
  });
  const [flatRateAmount, setFlatRateAmount] = useState(() => {
    try {
      return selectedEntry?.flat_rate_amount?.toString() || '100';
    } catch (error) {
      console.error('Error initializing flat rate amount:', error);
      return '100';
    }
  });

  // Calculate estimated payment based on selected cleaners and their hourly rates
  const estimatedPayment = useMemo(() => {
    const hoursNum = parseFloat(hours) || 0;
    
    if (paymentType === 'flat_rate') {
      return parseFloat(flatRateAmount) || 0;
    } else {
      // For hourly rate, calculate based on selected cleaners' rates
      if (selectedCleaners && selectedCleaners.length > 0) {
        let totalPayment = 0;
        
        for (const cleanerName of selectedCleaners) {
          const cleaner = cleaners.find(c => c.name === cleanerName);
          const rate = cleaner?.defaultHourlyRate || 15;
          totalPayment += hoursNum * rate;
        }
        
        return totalPayment;
      }
      
      // Default calculation if no cleaners selected
      return hoursNum * 15;
    }
  }, [hours, paymentType, flatRateAmount, selectedCleaners, cleaners]);

  // Get breakdown of payment per cleaner
  const paymentBreakdown = useMemo(() => {
    if (paymentType === 'flat_rate' || !selectedCleaners || selectedCleaners.length === 0) {
      return [];
    }
    
    const hoursNum = parseFloat(hours) || 0;
    return selectedCleaners.map(cleanerName => {
      const cleaner = cleaners.find(c => c.name === cleanerName);
      const rate = cleaner?.defaultHourlyRate || 15;
      return {
        name: cleanerName,
        rate,
        payment: hoursNum * rate
      };
    });
  }, [hours, paymentType, selectedCleaners, cleaners]);

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
    console.log('Delete button pressed, platform:', Platform.OS);
    console.log('Selected entry:', selectedEntry?.id, selectedEntry?.cleanerName, selectedEntry?.buildingName);
    
    if (Platform.OS === 'web') {
      console.log('Web platform detected, showing custom confirmation modal');
      setShowDeleteConfirm(true);
    } else {
      console.log('Mobile platform detected, showing native Alert confirmation');
      Alert.alert(
        'Delete Shift',
        `Are you sure you want to delete the shift for ${selectedEntry?.cleanerName} at ${selectedEntry?.buildingName}? This action cannot be undone.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('Delete cancelled by user')
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: confirmDelete
          }
        ]
      );
    }
  };

  const confirmDelete = async () => {
    console.log('Confirming delete operation...');
    console.log('About to call onDelete function for entry:', selectedEntry?.id);
    
    try {
      setShowDeleteConfirm(false);
      console.log('Calling onDelete function...');
      await onDelete();
      console.log('Delete operation completed successfully');
    } catch (error) {
      console.error('Error during delete confirmation:', error);
      setShowDeleteConfirm(false);
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
        isRecurring,
        paymentType,
        flatRateAmount,
        estimatedPayment,
        selectedEntry: selectedEntry?.id,
        isSaving
      });
      
      setIsSaving(true);
      
      console.log('Calling parent onSave function...');
      await onSave();
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
                    {selectedEntry.is_recurring ? 'Yes' : 'No'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Type:</Text>
                  <View style={[styles.paymentTypeBadge, { 
                    backgroundColor: selectedEntry.payment_type === 'flat_rate' ? colors.success + '20' : themeColor + '20' 
                  }]}>
                    <Icon 
                      name={selectedEntry.payment_type === 'flat_rate' ? 'cash' : 'time'} 
                      size={12} 
                      style={{ 
                        color: selectedEntry.payment_type === 'flat_rate' ? colors.success : themeColor,
                        marginRight: spacing.xs 
                      }} 
                    />
                    <Text style={[styles.paymentTypeText, { 
                      color: selectedEntry.payment_type === 'flat_rate' ? colors.success : themeColor 
                    }]}>
                      {selectedEntry.payment_type === 'flat_rate' ? 'Flat Rate' : 'Hourly'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Amount:</Text>
                  <Text style={[styles.detailValue, { color: colors.success, fontWeight: 'bold' }]}>
                    ${selectedEntry.payment_type === 'flat_rate' 
                      ? (selectedEntry.flat_rate_amount || 0).toFixed(2)
                      : ((selectedEntry.hourly_rate || 15) * selectedEntry.hours).toFixed(2)
                    }
                  </Text>
                </View>
                
                {selectedEntry.payment_type === 'hourly' && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hourly Rate:</Text>
                    <Text style={styles.detailValue}>${(selectedEntry.hourly_rate || 15).toFixed(2)}/hr</Text>
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
            <View style={styles.formContainer}>
              {/* Building Selection */}
              {modalType === 'add' && !selectedClientBuilding && (
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
                        {clientBuildings.length === 0 ? (
                          <View style={styles.noResultsContainer}>
                            <Icon name="business-outline" size={24} style={styles.noResultsIcon} />
                            <Text style={styles.noResultsText}>No buildings available</Text>
                          </View>
                        ) : (
                          clientBuildings.map((building, index) => (
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

              {/* Show selected building info */}
              {selectedClientBuilding && (
                <View style={[styles.selectedBuildingInfo, { backgroundColor: themeColor + '10' }]}>
                  <Icon name="business" size={16} style={{ color: themeColor }} />
                  <View style={styles.selectedBuildingText}>
                    <Text style={styles.selectedBuildingName}>{selectedClientBuilding.buildingName}</Text>
                    <Text style={styles.selectedBuildingClient}>{selectedClientBuilding.clientName}</Text>
                  </View>
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
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dropdownItem, 
                              isSelected && { backgroundColor: themeColor },
                              !canAccess && styles.dropdownItemDisabled
                            ]}
                            onPress={() => {
                              if (canAccess) {
                                toggleCleanerSelection(cleaner.name);
                              }
                            }}
                            disabled={!canAccess}
                          >
                            <View style={styles.cleanerDropdownRow}>
                              <View style={styles.cleanerInfo}>
                                <Text style={[
                                  styles.dropdownText, 
                                  isSelected && styles.dropdownTextSelected,
                                  !canAccess && styles.dropdownTextDisabled
                                ]}>
                                  {cleaner.name}
                                </Text>
                                <View style={styles.cleanerMetadata}>
                                  <Text style={[
                                    styles.cleanerMetadataText,
                                    isSelected && styles.cleanerMetadataTextSelected,
                                    !canAccess && styles.cleanerMetadataTextDisabled
                                  ]}>
                                    ID: {employeeId} • {securityLevel.toUpperCase()} Security
                                    {cleaner.defaultHourlyRate && ` • $${cleaner.defaultHourlyRate.toFixed(2)}/hr`}
                                  </Text>
                                  {!canAccess && selectedClientBuilding && (
                                    <Text style={styles.accessDeniedText}>
                                      Cannot access {selectedClientBuilding.securityLevel.toUpperCase()} security jobs
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.cleanerActions}>
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
                                <Icon 
                                  name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                                  size={20} 
                                  style={{ 
                                    color: isSelected ? colors.background : 
                                           !canAccess ? colors.textSecondary + '50' : colors.textSecondary 
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
              
              <Text style={styles.inputLabel}>Hours *</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
              
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                value={startTime}
                onChangeText={setStartTime}
              />

              {/* NEW: Recurring Shift Section with Customize Button */}
              <View style={styles.recurringSection}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Recurring Shift</Text>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: colors.border, true: themeColor }}
                    thumbColor={colors.background}
                  />
                </View>
                
                {isRecurring && onOpenRecurringModal && (
                  <TouchableOpacity
                    style={[styles.customizeRecurringButton, { backgroundColor: themeColor + '10', borderColor: themeColor }]}
                    onPress={() => {
                      console.log('Opening recurring task customization modal');
                      onOpenRecurringModal();
                    }}
                  >
                    <Icon name="settings" size={20} style={{ color: themeColor, marginRight: spacing.sm }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customizeRecurringButtonText, { color: themeColor }]}>
                        Customize Recurring Pattern
                      </Text>
                      <Text style={[styles.customizeRecurringButtonSubtext, { color: themeColor }]}>
                        Set frequency, days, end date, and more
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={20} style={{ color: themeColor }} />
                  </TouchableOpacity>
                )}
                
                {isRecurring && !onOpenRecurringModal && (
                  <View style={[styles.recurringNote, { backgroundColor: colors.warning + '10' }]}>
                    <Icon name="information-circle" size={16} style={{ color: colors.warning }} />
                    <Text style={[styles.recurringNoteText, { color: colors.warning }]}>
                      Recurring shift customization is available. Contact support for advanced options.
                    </Text>
                  </View>
                )}
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
                            {hours || '0'} hrs × ${item.rate.toFixed(2)}/hr = ${item.payment.toFixed(2)}
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
  cleanerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityIndicator: {
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  recurringSection: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customizeRecurringButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  customizeRecurringButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  customizeRecurringButtonSubtext: {
    ...typography.small,
    marginTop: 2,
  },
  recurringNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  recurringNoteText: {
    ...typography.caption,
    fontWeight: '500',
    flex: 1,
  },
});

ScheduleModal.displayName = 'ScheduleModal';

export default ScheduleModal;
