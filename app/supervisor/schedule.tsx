
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import DragDropScheduleGrid from '../../components/schedule/DragDropScheduleGrid';
import ScheduleModal from '../../components/schedule/ScheduleModal';
import SmartSchedulingSuggestions from '../../components/schedule/SmartSchedulingSuggestions';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import BulkActionsBottomSheet from '../../components/schedule/BulkActionsBottomSheet';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';

type ModalType = 'add' | 'edit' | 'add-client' | 'add-building' | 'add-cleaner' | 'details' | 'edit-client' | 'edit-building' | null;
type ViewType = 'daily' | 'weekly' | 'monthly';

const ScheduleView = () => {
  console.log('ScheduleView rendered');

  // Refs
  const bulkActionsBottomSheetRef = useRef<BottomSheet>(null);

  // Hooks with error handling
  const {
    weeklySchedules,
    isLoading: scheduleLoading,
    error: scheduleError,
    getWeekSchedule,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    updateWeekSchedule,
    clearWeekSchedule,
    resetAllSchedules,
    clearError: clearScheduleError,
    getCurrentWeekId,
    getWeekIdFromDate,
  } = useScheduleStorage();

  const {
    clients,
    clientBuildings,
    cleaners,
    isLoading: clientLoading,
    error: clientError,
    addClient: addClientData,
    updateClient,
    addBuilding: addBuildingData,
    updateBuilding,
    addCleaner: addCleanerData,
    clearError: clearClientError,
  } = useClientData();

  // State with proper initialization
  const [currentWeekId, setCurrentWeekId] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [selectedClientBuilding, setSelectedClientBuilding] = useState<ClientBuilding | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Enhanced features state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [recurringTaskModalVisible, setRecurringTaskModalVisible] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  // Form states with proper initialization
  const [cleanerName, setCleanerName] = useState('');
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientSecurity, setNewClientSecurity] = useState('');
  const [newClientSecurityLevel, setNewClientSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingSecurity, setNewBuildingSecurity] = useState('');
  const [newBuildingSecurityLevel, setNewBuildingSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [newBuildingPriority, setNewBuildingPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedClientForBuilding, setSelectedClientForBuilding] = useState('');
  const [newCleanerName, setNewCleanerName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCleanerDropdown, setShowCleanerDropdown] = useState(false);
  const [showSecurityLevelDropdown, setShowSecurityLevelDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  // Helper functions for consistent date handling
  const formatDateString = useCallback((date: Date): string => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  const getStartOfWeek = useCallback((date: Date): Date => {
    try {
      const startOfWeek = new Date(date);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    } catch (error) {
      console.error('Error getting start of week:', error);
      return new Date();
    }
  }, []);

  const getDayOfWeekName = useCallback((dayIndex: number): string => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days[dayIndex] || 'monday';
  }, []);

  const getDayIndexFromName = useCallback((dayName: string): number => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const index = days.indexOf(dayName.toLowerCase());
    return index >= 0 ? index : 0;
  }, []);

  // Form and modal handlers with error handling
  const resetForm = useCallback(() => {
    try {
      console.log('Resetting form...');
      setCleanerName('');
      setHours('');
      setStartTime('');
      setNewClientName('');
      setNewClientSecurity('');
      setNewClientSecurityLevel('medium');
      setNewBuildingName('');
      setNewBuildingSecurity('');
      setNewBuildingSecurityLevel('medium');
      setNewBuildingPriority('medium');
      setSelectedClientForBuilding('');
      setNewCleanerName('');
      setShowClientDropdown(false);
      setShowCleanerDropdown(false);
      setShowSecurityLevelDropdown(false);
      setShowPriorityDropdown(false);
    } catch (error) {
      console.error('Error resetting form:', error);
    }
  }, []);

  const performMove = useCallback(async (entry: ScheduleEntry, newBuilding: ClientBuilding, newDay: string) => {
    try {
      if (!updateScheduleEntry || !currentWeekId) {
        console.error('Update function or week ID not available');
        return;
      }

      const updates = {
        clientName: newBuilding.clientName,
        buildingName: newBuilding.buildingName,
        day: newDay.toLowerCase() as any,
      };
      
      await updateScheduleEntry(currentWeekId, entry.id, updates);
      setSchedule(prev => prev.map(e =>
        e.id === entry.id ? { ...e, ...updates } : e
      ));
      
      Alert.alert('Success', 'Schedule entry moved successfully!');
    } catch (error) {
      console.error('Error performing move:', error);
      Alert.alert('Error', 'Failed to move schedule entry.');
    }
  }, [updateScheduleEntry, currentWeekId]);

  // Load schedule for current week with improved error handling
  const loadCurrentWeekSchedule = useCallback(async () => {
    try {
      console.log('Loading schedule for selected date:', formatDateString(selectedDate));
      
      if (!getWeekIdFromDate) {
        console.error('getWeekIdFromDate function not available');
        return;
      }

      const weekId = getWeekIdFromDate(selectedDate);
      console.log('Calculated week ID:', weekId);
      
      if (weekId !== currentWeekId) {
        setCurrentWeekId(weekId);
        
        if (getWeekSchedule) {
          const weekSchedule = getWeekSchedule(weekId);
          console.log('Loaded schedule entries for week', weekId, ':', weekSchedule?.length || 0);
          setSchedule(weekSchedule || []);
        } else {
          console.error('getWeekSchedule function not available');
          setSchedule([]);
        }
      }
    } catch (error) {
      console.error('Error loading current week schedule:', error);
      setSchedule([]);
    }
  }, [selectedDate, currentWeekId, getWeekIdFromDate, getWeekSchedule, formatDateString]);

  // Check if current week is the current actual week
  const isCurrentWeek = useCallback(() => {
    try {
      if (!getCurrentWeekId) return false;
      const currentActualWeekId = getCurrentWeekId();
      return currentWeekId === currentActualWeekId;
    } catch (error) {
      console.error('Error checking current week:', error);
      return false;
    }
  }, [currentWeekId, getCurrentWeekId]);

  // Effects with error handling
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadCurrentWeekSchedule();
      } catch (error) {
        console.error('Error in loadCurrentWeekSchedule effect:', error);
      }
    };
    loadData();
  }, [loadCurrentWeekSchedule]);

  // Enhanced event handlers with null checks
  const handleCellPress = useCallback((clientBuilding: ClientBuilding, day: string) => {
    try {
      console.log('Cell pressed:', clientBuilding?.buildingName, day);
      
      if (!clientBuilding || !day) {
        console.error('Invalid parameters for cell press');
        return;
      }

      if (bulkMode) {
        return;
      }

      const entry = schedule.find(entry =>
        entry?.clientName === clientBuilding.clientName &&
        entry?.buildingName === clientBuilding.buildingName &&
        entry?.day?.toLowerCase() === day.toLowerCase()
      );
      
      if (entry) {
        console.log('Found entry for details:', entry.id);
        setSelectedEntry(entry);
        setCleanerName(entry.cleanerName || '');
        setHours(entry.hours?.toString() || '');
        setStartTime(entry.startTime || '');
        setModalType('details');
      } else {
        setSelectedClientBuilding(clientBuilding);
        setSelectedDay(day);
        resetForm();
        setModalType('add');
      }
      setModalVisible(true);
    } catch (error) {
      console.error('Error in handleCellPress:', error);
    }
  }, [schedule, bulkMode, resetForm]);

  const handleCellLongPress = useCallback((clientBuilding: ClientBuilding, day: string) => {
    try {
      console.log('Cell long pressed:', clientBuilding?.buildingName, day);
      
      if (!clientBuilding || !day) {
        console.error('Invalid parameters for cell long press');
        return;
      }

      if (bulkMode) {
        return;
      }

      const entry = schedule.find(entry =>
        entry?.clientName === clientBuilding.clientName &&
        entry?.buildingName === clientBuilding.buildingName &&
        entry?.day?.toLowerCase() === day.toLowerCase()
      );
      
      if (entry) {
        setSelectedEntry(entry);
        setCleanerName(entry.cleanerName || '');
        setHours(entry.hours?.toString() || '');
        setStartTime(entry.startTime || '');
        setModalType('edit');
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error in handleCellLongPress:', error);
    }
  }, [schedule, bulkMode]);

  const handleClientLongPress = useCallback((client: Client) => {
    try {
      console.log('Client long pressed for editing:', client?.name);
      
      if (!client) {
        console.error('Invalid client for long press');
        return;
      }

      setSelectedClient(client);
      setNewClientName(client.name || '');
      setNewClientSecurity(client.security || '');
      setNewClientSecurityLevel(client.securityLevel || 'medium');
      setModalType('edit-client');
      setModalVisible(true);
    } catch (error) {
      console.error('Error in handleClientLongPress:', error);
    }
  }, []);

  const handleBuildingLongPress = useCallback((building: ClientBuilding) => {
    try {
      console.log('Building long pressed for editing:', building?.buildingName);
      
      if (!building) {
        console.error('Invalid building for long press');
        return;
      }

      setSelectedClientBuilding(building);
      setNewBuildingName(building.buildingName || '');
      setNewBuildingSecurity(building.security || '');
      setNewBuildingSecurityLevel(building.securityLevel || 'medium');
      setNewBuildingPriority(building.priority || 'medium');
      setModalType('edit-building');
      setModalVisible(true);
    } catch (error) {
      console.error('Error in handleBuildingLongPress:', error);
    }
  }, []);

  // Enhanced drag and drop handler with error handling
  const handleMoveEntry = useCallback(async (entryId: string, newBuilding: ClientBuilding, newDay: string) => {
    try {
      console.log('Moving entry:', entryId, 'to', newBuilding?.buildingName, newDay);
      
      if (!entryId || !newBuilding || !newDay) {
        console.error('Invalid parameters for move entry');
        return;
      }

      const entry = schedule.find(e => e?.id === entryId);
      if (!entry) {
        console.error('Entry not found:', entryId);
        return;
      }

      // Check for conflicts
      const existingEntry = schedule.find(e =>
        e?.id !== entryId &&
        e?.buildingName === newBuilding.buildingName &&
        e?.day === newDay.toLowerCase() &&
        e?.status !== 'cancelled'
      );

      if (existingEntry) {
        Alert.alert(
          'Conflict Detected',
          `There's already a scheduled task for ${newBuilding.buildingName} on ${newDay}. Do you want to continue?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              onPress: () => performMove(entry, newBuilding, newDay)
            }
          ]
        );
      } else {
        await performMove(entry, newBuilding, newDay);
      }
    } catch (error) {
      console.error('Error moving entry:', error);
      Alert.alert('Error', 'Failed to move schedule entry.');
    }
  }, [schedule, performMove]);

  const closeModal = useCallback(() => {
    try {
      console.log('Closing modal...');
      setModalVisible(false);
      setModalType(null);
      setSelectedEntry(null);
      setSelectedClientBuilding(null);
      setSelectedClient(null);
      setSelectedDay(null);
      resetForm();
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  }, [resetForm]);

  const addClient = useCallback(async () => {
    try {
      console.log('Adding client:', newClientName);
      
      if (!newClientName?.trim()) {
        Alert.alert('Error', 'Client name cannot be empty.');
        return;
      }
      
      if (!clients || !addClientData) {
        console.error('Clients data or add function not available');
        Alert.alert('Error', 'Unable to add client at this time.');
        return;
      }

      const existingClient = clients.find(c => c?.name?.toLowerCase() === newClientName.toLowerCase());
      if (existingClient) {
        Alert.alert('Error', 'A client with this name already exists.');
        return;
      }

      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4'];
      const newClient: Client = { 
        id: String(Date.now()), 
        name: newClientName.trim(), 
        isActive: true,
        color: colors[clients.length % colors.length],
        security: newClientSecurity.trim() || undefined,
        securityLevel: newClientSecurityLevel
      };
      
      await addClientData(newClient);
      console.log('Client added successfully:', newClient);
      Alert.alert('Success', 'Client added successfully!');
      closeModal();
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to add client. Please try again.');
    }
  }, [newClientName, newClientSecurity, newClientSecurityLevel, clients, addClientData, closeModal]);

  const saveEntry = useCallback(async () => {
    try {
      console.log('Saving entry for week:', currentWeekId);
      
      if (!cleanerName?.trim() || !hours?.trim()) {
        Alert.alert('Error', 'Please fill all required fields.');
        return;
      }

      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        Alert.alert('Error', 'Please enter a valid number of hours.');
        return;
      }

      if (!addScheduleEntry || !updateScheduleEntry || !currentWeekId) {
        console.error('Schedule functions or week ID not available');
        Alert.alert('Error', 'Unable to save entry at this time.');
        return;
      }

      if (modalType === 'add' && selectedClientBuilding && selectedDay) {
        const startOfWeek = getStartOfWeek(selectedDate);
        const dayIndex = getDayIndexFromName(selectedDay);
        
        // Create the entry date more carefully to avoid timezone issues
        const entryDate = new Date(startOfWeek);
        entryDate.setDate(entryDate.getDate() + dayIndex);
        entryDate.setHours(0, 0, 0, 0); // Ensure we're at start of day
        const entryDateString = formatDateString(entryDate);
        
        console.log(`Creating entry for ${selectedDay} (day index: ${dayIndex})`);
        console.log(`Week start: ${formatDateString(startOfWeek)}, Entry date: ${entryDateString}`);
        console.log(`Entry date object:`, entryDate);
        
        const newEntry: ScheduleEntry = {
          id: String(Date.now()),
          clientName: selectedClientBuilding.clientName,
          buildingName: selectedClientBuilding.buildingName,
          cleanerName: cleanerName.trim(),
          hours: hoursNum,
          day: selectedDay.toLowerCase() as any,
          date: entryDateString,
          startTime: startTime.trim() || undefined,
          status: 'scheduled',
          weekId: currentWeekId
        };
        
        await addScheduleEntry(currentWeekId, newEntry);
        setSchedule(prev => [...prev, newEntry]);
        console.log('New entry added for week:', currentWeekId, newEntry);
        Alert.alert('Success', 'Schedule entry added successfully!');
      } else if (modalType === 'edit' && selectedEntry) {
        const updates = {
          cleanerName: cleanerName.trim(),
          hours: hoursNum,
          startTime: startTime.trim() || undefined
        };
        
        await updateScheduleEntry(currentWeekId, selectedEntry.id, updates);
        setSchedule(prev => prev.map(entry =>
          entry.id === selectedEntry.id ? { ...entry, ...updates } : entry
        ));
        console.log('Entry updated for week:', currentWeekId, selectedEntry.id);
        Alert.alert('Success', 'Schedule entry updated successfully!');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save schedule entry. Please try again.');
    }
  }, [modalType, selectedClientBuilding, selectedDay, selectedEntry, cleanerName, hours, startTime, currentWeekId, getStartOfWeek, selectedDate, addScheduleEntry, updateScheduleEntry, closeModal, getDayIndexFromName, formatDateString]);

  // Bulk operations handlers with error handling
  const handleBulkSelect = useCallback((entries: ScheduleEntry[]) => {
    try {
      if (!Array.isArray(entries)) {
        console.error('Invalid entries for bulk select');
        return;
      }

      const entryIds = entries.map(e => e?.id).filter(Boolean);
      setSelectedEntries(entryIds);
      
      if (entryIds.length > 0 && bulkActionsBottomSheetRef.current) {
        bulkActionsBottomSheetRef.current.snapToIndex(0);
      }
    } catch (error) {
      console.error('Error in handleBulkSelect:', error);
    }
  }, []);

  const toggleBulkMode = useCallback(() => {
    try {
      setBulkMode(!bulkMode);
      setSelectedEntries([]);
      if (bulkMode && bulkActionsBottomSheetRef.current) {
        bulkActionsBottomSheetRef.current.close();
      }
    } catch (error) {
      console.error('Error toggling bulk mode:', error);
    }
  }, [bulkMode]);

  // Render daily view - Fixed to show only selected date
  const renderDailyView = () => {
    try {
      console.log('Rendering daily view for date:', formatDateString(selectedDate));
      
      const selectedDateString = formatDateString(selectedDate);
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Filter schedule for the selected date only
      const dailyEntries = schedule.filter(entry => {
        // First try to match by exact date
        if (entry?.date === selectedDateString) {
          return true;
        }
        
        // Fallback to matching by day name and week
        if (entry?.day === dayName && getWeekIdFromDate && entry?.weekId === getWeekIdFromDate(selectedDate)) {
          return true;
        }
        
        return false;
      });

      console.log('Daily entries found for', selectedDateString, ':', dailyEntries.length);

      return (
        <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.dailyContainer}>
            <View style={styles.dailyHeader}>
              <Text style={styles.dailyTitle}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={styles.dailySubtitle}>
                {dailyEntries.length} scheduled {dailyEntries.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>

            {dailyEntries.length === 0 ? (
              <View style={styles.emptyDayContainer}>
                <Icon name="calendar-outline" size={64} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyDayTitle}>No tasks scheduled</Text>
                <Text style={styles.emptyDayText}>
                  This day is free. You can add new tasks by switching to weekly view.
                </Text>
              </View>
            ) : (
              <View style={styles.dailyEntriesContainer}>
                {dailyEntries
                  .sort((a, b) => {
                    if (a.startTime && b.startTime) {
                      return a.startTime.localeCompare(b.startTime);
                    }
                    return 0;
                  })
                  .map((entry, index) => (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.dailyEntry,
                        { borderLeftColor: getStatusColor(entry.status) }
                      ]}
                      onPress={() => {
                        setSelectedEntry(entry);
                        setCleanerName(entry.cleanerName || '');
                        setHours(entry.hours?.toString() || '');
                        setStartTime(entry.startTime || '');
                        setModalType('details');
                        setModalVisible(true);
                      }}
                    >
                      <View style={styles.dailyEntryHeader}>
                        <View style={styles.dailyEntryTitleContainer}>
                          <Text style={styles.dailyEntryBuilding}>{entry.buildingName}</Text>
                          <Text style={styles.dailyEntryClient}>{entry.clientName}</Text>
                        </View>
                        <View style={styles.dailyEntryTimeContainer}>
                          <Text style={styles.dailyEntryTime}>
                            {entry.startTime || 'No time set'}
                          </Text>
                          <View style={[
                            styles.dailyEntryStatus,
                            { backgroundColor: getStatusColor(entry.status) }
                          ]}>
                            <Text style={styles.dailyEntryStatusText}>
                              {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.dailyEntryDetails}>
                        <View style={styles.dailyEntryDetailItem}>
                          <Icon name="person" size={16} style={{ color: colors.textSecondary }} />
                          <Text style={styles.dailyEntryDetailText}>
                            Cleaner: {entry.cleanerName}
                          </Text>
                        </View>
                        <View style={styles.dailyEntryDetailItem}>
                          <Icon name="time" size={16} style={{ color: colors.textSecondary }} />
                          <Text style={styles.dailyEntryDetailText}>
                            Duration: {entry.hours}h
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        </ScrollView>
      );
    } catch (error) {
      console.error('Error rendering daily view:', error);
      return (
        <View style={styles.errorContainer}>
          <Icon name="warning-outline" size={48} style={{ color: colors.danger }} />
          <Text style={styles.errorTitle}>Error Rendering Daily View</Text>
          <Text style={styles.errorMessage}>Unable to display the daily schedule. Please try again.</Text>
        </View>
      );
    }
  };

  // Helper function for status colors
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.border;
    }
  }, []);

  // Render weekly view with error handling
  const renderWeeklyView = () => {
    try {
      console.log('Rendering weekly view with:', {
        clientBuildings: clientBuildings?.length || 0,
        clients: clients?.length || 0,
        schedule: schedule?.length || 0,
        currentWeekId,
        isCurrentWeek: isCurrentWeek(),
        bulkMode,
        selectedEntries: selectedEntries?.length || 0
      });

      return (
        <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
          {/* Smart Suggestions */}
          {showSuggestions && (
            <SmartSchedulingSuggestions
              schedule={schedule || []}
              cleaners={cleaners || []}
              clientBuildings={clientBuildings || []}
              clients={clients || []}
              onApplySuggestion={() => {}}
              onDismissSuggestion={() => {}}
            />
          )}

          <View style={styles.weekInfoHeader}>
            <Text style={styles.weekInfoText}>
              Week of {getHeaderText()} • {schedule?.length || 0} scheduled jobs
            </Text>
            {(!schedule || schedule.length === 0) && (
              <Text style={styles.emptyWeekText}>
                This week is empty. Add jobs by tapping on the schedule grid below.
              </Text>
            )}
            {!isCurrentWeek() && (
              <Text style={styles.weekStatusText}>
                {currentWeekId < (getCurrentWeekId?.() || '') ? 'Past Week' : 'Future Week'}
              </Text>
            )}
          </View>

          {/* Enhanced Actions */}
          <View style={styles.enhancedActions}>
            <TouchableOpacity
              style={[styles.actionButton, bulkMode && styles.actionButtonActive]}
              onPress={toggleBulkMode}
            >
              <Icon name={bulkMode ? "checkmark-circle" : "checkmark-circle-outline"} size={16} style={{ color: bulkMode ? colors.background : colors.primary }} />
              <Text style={[styles.actionButtonText, bulkMode && styles.actionButtonTextActive]}>
                {bulkMode ? `Selected (${selectedEntries?.length || 0})` : 'Bulk Select'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setRecurringTaskModalVisible(true)}
            >
              <Icon name="repeat" size={16} style={{ color: colors.primary }} />
              <Text style={styles.actionButtonText}>Recurring</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowSuggestions(!showSuggestions)}
            >
              <Icon name={showSuggestions ? "bulb" : "bulb-outline"} size={16} style={{ color: colors.primary }} />
              <Text style={styles.actionButtonText}>Suggestions</Text>
            </TouchableOpacity>
          </View>
          
          <DragDropScheduleGrid
            clientBuildings={clientBuildings || []}
            clients={clients || []}
            cleaners={cleaners || []}
            schedule={schedule || []}
            onCellPress={handleCellPress}
            onCellLongPress={handleCellLongPress}
            onClientLongPress={handleClientLongPress}
            onBuildingLongPress={handleBuildingLongPress}
            onMoveEntry={handleMoveEntry}
            onBulkSelect={handleBulkSelect}
            bulkMode={bulkMode}
            selectedEntries={selectedEntries || []}
          />
        </ScrollView>
      );
    } catch (error) {
      console.error('Error rendering weekly view:', error);
      return (
        <View style={styles.errorContainer}>
          <Icon name="warning-outline" size={48} style={{ color: colors.danger }} />
          <Text style={styles.errorTitle}>Error Rendering Schedule</Text>
          <Text style={styles.errorMessage}>Unable to display the schedule. Please try again.</Text>
        </View>
      );
    }
  };

  // Helper function to create date from string without timezone issues
  const createDateFromString = useCallback((dateString: string): Date => {
    try {
      // Parse the date string manually to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
    } catch (error) {
      console.error('Error creating date from string:', error);
      return new Date();
    }
  }, []);

  // Render monthly view with calendar
  const renderMonthlyView = () => {
    try {
      console.log('Rendering monthly view for selected date:', formatDateString(selectedDate));
      
      // Create marked dates for the calendar
      const markedDates = {};
      schedule.forEach(entry => {
        if (entry?.date) {
          markedDates[entry.date] = {
            marked: true,
            dotColor: colors.primary,
            selectedColor: colors.primary,
          };
        }
      });

      // Add selected date to marked dates
      const selectedDateString = formatDateString(selectedDate);
      markedDates[selectedDateString] = {
        ...markedDates[selectedDateString],
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: colors.background,
      };

      return (
        <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.monthlyContainer}>
            <Calendar
              current={formatDateString(selectedDate)}
              onDayPress={(day) => {
                console.log('Calendar day pressed:', day.dateString);
                // Use our helper function to avoid timezone issues
                const newDate = createDateFromString(day.dateString);
                console.log('Setting selected date to:', formatDateString(newDate));
                setSelectedDate(newDate);
              }}
              markedDates={markedDates}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: colors.background,
                textSectionTitleColor: colors.text,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.background,
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textSecondary,
                dotColor: colors.primary,
                selectedDotColor: colors.background,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
                indicatorColor: colors.primary,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={styles.calendar}
            />
            
            {/* Daily schedule for selected date */}
            <View style={styles.dailyScheduleContainer}>
              <Text style={styles.dailyScheduleTitle}>
                Schedule for {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              
              {(() => {
                const selectedDateString = formatDateString(selectedDate);
                const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                
                // Filter entries for the selected date
                const filteredEntries = schedule.filter(entry => {
                  // First try to match by exact date
                  if (entry?.date === selectedDateString) {
                    return true;
                  }
                  
                  // Fallback to matching by day name and week
                  if (entry?.day === dayName && getWeekIdFromDate && entry?.weekId === getWeekIdFromDate(selectedDate)) {
                    return true;
                  }
                  
                  return false;
                });

                console.log('Filtered entries for', selectedDateString, ':', filteredEntries.length);
                
                return filteredEntries.length === 0 ? (
                  <View style={styles.emptyDayContainer}>
                    <Icon name="calendar-outline" size={48} style={{ color: colors.textSecondary }} />
                    <Text style={styles.emptyDayText}>No scheduled tasks for this day</Text>
                  </View>
                ) : (
                  <View style={styles.dayEntriesContainer}>
                    {filteredEntries
                      .sort((a, b) => {
                        if (a.startTime && b.startTime) {
                          return a.startTime.localeCompare(b.startTime);
                        }
                        return 0;
                      })
                      .map(entry => (
                        <TouchableOpacity
                          key={entry.id}
                          style={styles.dayEntry}
                          onPress={() => {
                            setSelectedEntry(entry);
                            setCleanerName(entry.cleanerName || '');
                            setHours(entry.hours?.toString() || '');
                            setStartTime(entry.startTime || '');
                            setModalType('details');
                            setModalVisible(true);
                          }}
                        >
                          <View style={styles.dayEntryHeader}>
                            <Text style={styles.dayEntryBuilding}>{entry.buildingName}</Text>
                            <Text style={styles.dayEntryTime}>{entry.startTime || 'No time set'}</Text>
                          </View>
                          <Text style={styles.dayEntryCleaner}>Cleaner: {entry.cleanerName}</Text>
                          <Text style={styles.dayEntryHours}>Duration: {entry.hours}h</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                );
              })()}
            </View>
          </View>
        </ScrollView>
      );
    } catch (error) {
      console.error('Error rendering monthly view:', error);
      return (
        <View style={styles.errorContainer}>
          <Icon name="warning-outline" size={48} style={{ color: colors.danger }} />
          <Text style={styles.errorTitle}>Error Rendering Monthly View</Text>
          <Text style={styles.errorMessage}>Unable to display the monthly calendar. Please try again.</Text>
        </View>
      );
    }
  };

  // Helper functions with error handling
  const changeDate = (amount: number) => {
    try {
      const newDate = new Date(selectedDate);
      switch (viewType) {
        case 'daily':
          newDate.setDate(newDate.getDate() + amount);
          break;
        case 'weekly':
          newDate.setDate(newDate.getDate() + 7 * amount);
          break;
        case 'monthly':
          newDate.setMonth(newDate.getMonth() + amount);
          break;
      }
      console.log('Date changed to:', formatDateString(newDate));
      setSelectedDate(newDate);
    } catch (error) {
      console.error('Error changing date:', error);
    }
  };

  const getHeaderText = () => {
    try {
      switch (viewType) {
        case 'daily':
          return selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'weekly':
          const startOfWeek = getStartOfWeek(selectedDate);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        case 'monthly':
          return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        default:
          return 'Schedule';
      }
    } catch (error) {
      console.error('Error getting header text:', error);
      return 'Schedule';
    }
  };

  const onDateChange = (event: any, newDate?: Date) => {
    try {
      const currentDate = newDate || selectedDate;
      setShowDatePicker(Platform.OS === 'ios');
      console.log('Date picker changed to:', formatDateString(currentDate));
      setSelectedDate(currentDate);
    } catch (error) {
      console.error('Error in date change:', error);
    }
  };

  // Render main content based on view type
  const renderMainContent = () => {
    switch (viewType) {
      case 'daily':
        return renderDailyView();
      case 'monthly':
        return renderMonthlyView();
      case 'weekly':
      default:
        return renderWeeklyView();
    }
  };

  // Handle errors
  const error = scheduleError || clientError;
  if (error) {
    return (
      <View style={commonStyles.container}>
        <View style={styles.errorContainer}>
          <Icon name="warning-outline" size={48} style={{ color: colors.danger }} />
          <Text style={styles.errorTitle}>Error Loading Data</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearScheduleError?.();
              clearClientError?.();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show loading state
  if (scheduleLoading || clientLoading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={commonStyles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Schedule</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={() => { setModalType('add-client'); setModalVisible(true); }}
                style={styles.headerActionButton}
              >
                <Icon name="person-add-outline" size={20} style={{ color: colors.primary }} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { setModalType('add-building'); setModalVisible(true); }}
                style={styles.headerActionButton}
              >
                <Icon name="business-outline" size={20} style={{ color: colors.primary }} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { setModalType('add-cleaner'); setModalVisible(true); }}
                style={styles.headerActionButton}
              >
                <Icon name="people-outline" size={20} style={{ color: colors.primary }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* View Selector - Removed yearly view */}
          <View style={styles.viewSelector}>
            {(['daily', 'weekly', 'monthly'] as ViewType[]).map(view => (
              <TouchableOpacity
                key={view}
                style={[
                  styles.viewSelectorButton,
                  viewType === view && styles.viewSelectorButtonActive
                ]}
                onPress={() => setViewType(view)}
              >
                <Text style={[
                  styles.viewSelectorText,
                  viewType === view && styles.viewSelectorTextActive
                ]}>
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Navigator */}
          <View style={styles.dateNavigator}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
              <Icon name="chevron-back" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
              <Text style={styles.dateHeaderText}>{getHeaderText()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavButton}>
              <Icon name="chevron-forward" size={24} style={{ color: colors.primary }} />
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Main Content */}
          <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
            {renderMainContent()}
          </Animated.View>

          {/* Modals */}
          <ScheduleModal
            visible={modalVisible}
            modalType={modalType}
            selectedEntry={selectedEntry}
            selectedClient={selectedClient}
            selectedClientBuilding={selectedClientBuilding}
            cleaners={cleaners || []}
            clients={clients || []}
            cleanerName={cleanerName}
            hours={hours}
            startTime={startTime}
            newClientName={newClientName}
            newClientSecurity={newClientSecurity}
            newClientSecurityLevel={newClientSecurityLevel}
            newBuildingName={newBuildingName}
            newBuildingSecurity={newBuildingSecurity}
            newBuildingSecurityLevel={newBuildingSecurityLevel}
            newBuildingPriority={newBuildingPriority}
            selectedClientForBuilding={selectedClientForBuilding}
            newCleanerName={newCleanerName}
            showClientDropdown={showClientDropdown}
            showCleanerDropdown={showCleanerDropdown}
            showSecurityLevelDropdown={showSecurityLevelDropdown}
            showPriorityDropdown={showPriorityDropdown}
            setCleanerName={setCleanerName}
            setHours={setHours}
            setStartTime={setStartTime}
            setNewClientName={setNewClientName}
            setNewClientSecurity={setNewClientSecurity}
            setNewClientSecurityLevel={setNewClientSecurityLevel}
            setNewBuildingName={setNewBuildingName}
            setNewBuildingSecurity={setNewBuildingSecurity}
            setNewBuildingSecurityLevel={setNewBuildingSecurityLevel}
            setNewBuildingPriority={setNewBuildingPriority}
            setSelectedClientForBuilding={setSelectedClientForBuilding}
            setNewCleanerName={setNewCleanerName}
            setShowClientDropdown={setShowClientDropdown}
            setShowCleanerDropdown={setShowCleanerDropdown}
            setShowSecurityLevelDropdown={setShowSecurityLevelDropdown}
            setShowPriorityDropdown={setShowPriorityDropdown}
            onClose={closeModal}
            onSave={saveEntry}
            onDelete={() => {}}
            onAddClient={addClient}
            onAddBuilding={() => {}}
            onAddCleaner={() => {}}
            onEditClient={() => {}}
            onEditBuilding={() => {}}
            onSwitchToEdit={() => setModalType('edit')}
          />

          <RecurringTaskModal
            visible={recurringTaskModalVisible}
            clientBuildings={clientBuildings || []}
            cleaners={cleaners || []}
            onClose={() => setRecurringTaskModalVisible(false)}
            onSave={() => {}}
          />

          {/* Bulk Actions Bottom Sheet */}
          <BulkActionsBottomSheet
            bottomSheetRef={bulkActionsBottomSheetRef}
            selectedEntries={(schedule || []).filter(e => selectedEntries.includes(e?.id))}
            cleaners={cleaners || []}
            onReassignCleaner={() => {}}
            onChangeStatus={() => {}}
            onMoveToDay={() => {}}
            onDuplicate={() => {}}
            onDelete={() => {}}
            onClose={() => {
              setSelectedEntries([]);
              setBulkMode(false);
            }}
          />
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    margin: spacing.lg,
    borderRadius: 12,
    padding: spacing.xs,
  },
  viewSelectorButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewSelectorButtonActive: {
    backgroundColor: colors.primary,
  },
  viewSelectorText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewSelectorTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  dateNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateNavButton: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateHeaderText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Daily view styles
  dailyContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  dailyHeader: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  dailyTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dailySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dailyEntriesContainer: {
    gap: spacing.md,
  },
  dailyEntry: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dailyEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dailyEntryTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  dailyEntryBuilding: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dailyEntryClient: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dailyEntryTimeContainer: {
    alignItems: 'flex-end',
  },
  dailyEntryTime: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dailyEntryStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  dailyEntryStatusText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  dailyEntryDetails: {
    gap: spacing.sm,
  },
  dailyEntryDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dailyEntryDetailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyDayContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  emptyDayTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDayText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Weekly view styles
  weekInfoHeader: {
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekInfoText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyWeekText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  weekStatusText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  enhancedActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: colors.background,
  },
  // Monthly view styles
  monthlyContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  calendar: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: spacing.lg,
  },
  dailyScheduleContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
  },
  dailyScheduleTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  dayEntriesContainer: {
    gap: spacing.md,
  },
  dayEntry: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayEntryBuilding: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  dayEntryTime: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  dayEntryCleaner: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dayEntryHours: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});

export default ScheduleView;
