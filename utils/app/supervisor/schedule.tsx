
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Animated, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';

// Components
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import DragDropScheduleGrid from '../../components/schedule/DragDropScheduleGrid';
import Toast from '../../components/Toast';
import ScheduleModal from '../../components/schedule/ScheduleModal';
import ErrorBoundary from '../../components/ErrorBoundary';
import BulkActionsBottomSheet from '../../components/schedule/BulkActionsBottomSheet';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';

// Hooks and utilities
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';

type ModalType = 'add' | 'edit' | 'add-client' | 'add-building' | 'add-cleaner' | 'details' | 'edit-client' | 'edit-building' | null;
type ViewType = 'daily' | 'weekly' | 'monthly';
type ScheduleViewMode = 'building' | 'user';

const ScheduleView = () => {
  console.log('ScheduleView component rendered');

  // Hooks
  const { 
    clients = [], 
    clientBuildings = [], 
    cleaners = [], 
    addClient, 
    addClientBuilding, 
    addCleaner,
    updateClient,
    updateClientBuilding,
    isLoading: clientDataLoading 
  } = useClientData();
  
  const {
    getWeekSchedule,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    getCurrentWeekId,
    getWeekIdFromDate,
    isLoading: scheduleLoading,
    clearCaches
  } = useScheduleStorage();

  const { showToast } = useToast();

  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [scheduleViewMode, setScheduleViewMode] = useState<ScheduleViewMode>('building');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientBuilding, setSelectedClientBuilding] = useState<ClientBuilding | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('monday');

  // Form states
  const [cleanerName, setCleanerName] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientSecurity, setNewClientSecurity] = useState('');
  const [newClientSecurityLevel, setNewClientSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingSecurity, setNewBuildingSecurity] = useState('');
  const [newBuildingSecurityLevel, setNewBuildingSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedClientForBuilding, setSelectedClientForBuilding] = useState('');
  const [newCleanerName, setNewCleanerName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCleanerDropdown, setShowCleanerDropdown] = useState(false);
  const [showSecurityLevelDropdown, setShowSecurityLevelDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);

  // FIXED: Get current week ID based on currentDate
  const currentWeekId = getWeekIdFromDate(currentDate);
  const currentWeekSchedule = getWeekSchedule(currentWeekId);

  console.log('Current date:', currentDate.toISOString());
  console.log('Current week ID:', currentWeekId);
  console.log('Current week schedule entries:', currentWeekSchedule.length);

  // Force refresh schedule grid with better state management
  const forceRefreshSchedule = useCallback(() => {
    console.log('=== FORCING SCHEDULE REFRESH ===');
    clearCaches();
  }, [clearCaches]);

  // Load current week schedule on mount and when date changes
  const loadCurrentWeekSchedule = useCallback(() => {
    try {
      const weekId = getWeekIdFromDate(currentDate);
      console.log('Loading schedule for week:', weekId);
      // The schedule will be loaded automatically by the hook
    } catch (error) {
      console.error('Error loading current week schedule:', error);
      showToast('Failed to load schedule', 'error');
    }
  }, [currentDate, getWeekIdFromDate, showToast]);

  useEffect(() => {
    loadCurrentWeekSchedule();
  }, [loadCurrentWeekSchedule]);

  // Helper functions
  const resetFormStates = useCallback(() => {
    console.log('Resetting form states');
    setCleanerName('');
    setSelectedCleaners([]);
    setHours('');
    setStartTime('');
    setNewClientName('');
    setNewClientSecurity('');
    setNewClientSecurityLevel('medium');
    setNewBuildingName('');
    setNewBuildingSecurity('');
    setNewBuildingSecurityLevel('medium');
    setSelectedClientForBuilding('');
    setNewCleanerName('');
    setShowClientDropdown(false);
    setShowCleanerDropdown(false);
    setShowSecurityLevelDropdown(false);
    setShowBuildingDropdown(false);
    setSelectedDay('monday');
  }, []);

  const closeModal = useCallback(() => {
    console.log('Closing modal and resetting states');
    setModalType(null);
    setSelectedEntry(null);
    setSelectedClient(null);
    setSelectedClientBuilding(null);
    resetFormStates();
  }, [resetFormStates]);

  // Enhanced form population for edit mode
  const populateFormForEdit = useCallback((entry: ScheduleEntry) => {
    console.log('=== POPULATING FORM FOR EDIT ===');
    console.log('Entry to populate:', {
      id: entry.id,
      cleanerName: entry.cleanerName,
      cleanerNames: entry.cleanerNames,
      hours: entry.hours,
      startTime: entry.startTime
    });

    // Get cleaners for this entry (handle both old and new format)
    const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
      ? entry.cleanerNames 
      : (entry.cleanerName ? [entry.cleanerName] : []);
    
    console.log('Setting cleaners:', entryCleaners);
    setSelectedCleaners([...entryCleaners]);
    
    // Set other form fields
    setHours(entry.hours.toString());
    setStartTime(entry.startTime || '09:00');
    
    // Also set the legacy cleanerName field for backward compatibility
    setCleanerName(entryCleaners[0] || '');
    
    console.log('Form populated with:', {
      selectedCleaners: entryCleaners,
      hours: entry.hours.toString(),
      startTime: entry.startTime || '09:00'
    });
    console.log('=== FORM POPULATION COMPLETED ===');
  }, []);

  // Enhanced save handler with proper async handling and refresh
  const handleSave = useCallback(async () => {
    try {
      console.log('=== STARTING ENHANCED SAVE OPERATION ===');
      console.log('Modal type:', modalType);
      console.log('Selected cleaners:', selectedCleaners);
      console.log('Hours:', hours);
      console.log('Start time:', startTime);
      console.log('Selected entry:', selectedEntry?.id);
      console.log('Selected building:', selectedClientBuilding?.buildingName);
      console.log('Selected day:', selectedDay);

      if (!selectedClientBuilding) {
        showToast('Please select a building', 'error');
        return;
      }

      if (selectedCleaners.length === 0) {
        showToast('Please select at least one cleaner', 'error');
        return;
      }

      if (!hours || parseFloat(hours) <= 0) {
        showToast('Please enter valid hours', 'error');
        return;
      }

      const weekId = currentWeekId;
      const parsedHours = parseFloat(hours);

      if (modalType === 'add') {
        console.log('Adding new schedule entry...');
        
        const newEntry: ScheduleEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientName: selectedClientBuilding.clientName,
          buildingName: selectedClientBuilding.buildingName,
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          hours: parsedHours,
          day: selectedDay.toLowerCase() as any,
          date: weekId,
          startTime: startTime || '09:00',
          endTime: startTime ? addHoursToTime(startTime, parsedHours) : '17:00',
          status: 'scheduled' as const,
          weekId,
          notes: '',
          priority: 'medium' as const,
        };

        console.log('New entry to add:', newEntry);
        await addScheduleEntry(weekId, newEntry);
        console.log('New entry added successfully');
        showToast('Schedule entry added successfully', 'success');
        
      } else if (modalType === 'edit' && selectedEntry) {
        console.log('Updating existing schedule entry...');
        
        const updates: Partial<ScheduleEntry> = {
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          hours: parsedHours,
          startTime: startTime || selectedEntry.startTime,
          endTime: startTime ? addHoursToTime(startTime, parsedHours) : selectedEntry.endTime,
        };

        console.log('Updates to apply:', updates);
        await updateScheduleEntry(weekId, selectedEntry.id, updates);
        console.log('Entry updated successfully');
        showToast('Schedule entry updated successfully', 'success');
      }

      // Force refresh the schedule grid to show changes immediately
      console.log('Forcing schedule refresh after save...');
      forceRefreshSchedule();
      
      // Close modal after successful save
      closeModal();
      
      console.log('=== ENHANCED SAVE OPERATION COMPLETED ===');
    } catch (error) {
      console.error('=== ENHANCED SAVE OPERATION FAILED ===');
      console.error('Error saving schedule entry:', error);
      showToast('Failed to save schedule entry', 'error');
      throw error;
    }
  }, [
    modalType,
    selectedClientBuilding,
    selectedCleaners,
    hours,
    startTime,
    selectedEntry,
    selectedDay,
    currentWeekId,
    addScheduleEntry,
    updateScheduleEntry,
    showToast,
    forceRefreshSchedule,
    closeModal
  ]);

  const handleDelete = useCallback(async () => {
    try {
      console.log('=== STARTING DELETE OPERATION ===');
      console.log('Deleting entry:', selectedEntry?.id);
      
      if (!selectedEntry) {
        console.error('No entry selected for deletion');
        showToast('No entry selected', 'error');
        return;
      }

      const weekId = currentWeekId;
      console.log('Deleting from week:', weekId);
      
      await deleteScheduleEntry(weekId, selectedEntry.id);
      console.log('Entry deleted successfully');
      
      showToast('Schedule entry deleted successfully', 'success');
      
      // Force refresh the schedule grid to show changes immediately
      console.log('Forcing schedule refresh after delete...');
      forceRefreshSchedule();
      
      closeModal();
      
      console.log('=== DELETE OPERATION COMPLETED ===');
    } catch (error) {
      console.error('=== DELETE OPERATION FAILED ===');
      console.error('Error deleting schedule entry:', error);
      showToast('Failed to delete schedule entry', 'error');
    }
  }, [selectedEntry, currentWeekId, deleteScheduleEntry, showToast, forceRefreshSchedule, closeModal]);

  // Helper function to add hours to time
  const addHoursToTime = (time: string, hours: number): string => {
    try {
      const [hourStr, minuteStr] = time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      
      const totalMinutes = hour * 60 + minute + hours * 60;
      const newHour = Math.floor(totalMinutes / 60) % 24;
      const newMinute = totalMinutes % 60;
      
      return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error adding hours to time:', error);
      return time;
    }
  };

  // Recurring task handlers
  const handleOpenRecurringModal = useCallback(() => {
    console.log('Opening recurring task modal');
    setShowRecurringModal(true);
  }, []);

  const handleCloseRecurringModal = useCallback(() => {
    console.log('Closing recurring task modal');
    setShowRecurringModal(false);
  }, []);

  const handleSaveRecurringTask = useCallback(async (taskData: any) => {
    try {
      console.log('=== SAVING RECURRING TASK ===');
      console.log('Task data:', taskData);

      const { clientBuilding, cleanerNames, hours, startTime, pattern, notes } = taskData;
      const weekId = currentWeekId;

      // Generate recurring entries based on pattern
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const recurringId = `recurring-${Date.now()}`;

      if (pattern.type === 'weekly' && pattern.daysOfWeek) {
        // Create entries for each selected day of the week
        for (const dayIndex of pattern.daysOfWeek) {
          const dayName = daysOfWeek[dayIndex];
          
          const newEntry: ScheduleEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientName: clientBuilding.clientName,
            buildingName: clientBuilding.buildingName,
            cleanerName: cleanerNames[0],
            cleanerNames: cleanerNames,
            hours: hours,
            day: dayName as any,
            date: weekId,
            startTime: startTime || '09:00',
            endTime: startTime ? addHoursToTime(startTime, hours) : '17:00',
            status: 'scheduled' as const,
            weekId,
            notes: notes || '',
            priority: 'medium' as const,
            isRecurring: true,
            recurringId: recurringId,
          };

          await addScheduleEntry(weekId, newEntry);
        }
      } else if (pattern.type === 'daily') {
        // Create entries for all weekdays
        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        for (const dayName of weekdays) {
          const newEntry: ScheduleEntry = {
            id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientName: clientBuilding.clientName,
            buildingName: clientBuilding.buildingName,
            cleanerName: cleanerNames[0],
            cleanerNames: cleanerNames,
            hours: hours,
            day: dayName as any,
            date: weekId,
            startTime: startTime || '09:00',
            endTime: startTime ? addHoursToTime(startTime, hours) : '17:00',
            status: 'scheduled' as const,
            weekId,
            notes: notes || '',
            priority: 'medium' as const,
            isRecurring: true,
            recurringId: recurringId,
          };

          await addScheduleEntry(weekId, newEntry);
        }
      }

      showToast('Recurring task created successfully', 'success');
      forceRefreshSchedule();
      handleCloseRecurringModal();
      
      console.log('=== RECURRING TASK SAVED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== RECURRING TASK SAVE FAILED ===');
      console.error('Error saving recurring task:', error);
      showToast('Failed to create recurring task', 'error');
    }
  }, [currentWeekId, addScheduleEntry, showToast, forceRefreshSchedule, handleCloseRecurringModal]);

  // Cell press handlers
  const handleCellPress = useCallback((clientBuilding: ClientBuilding, day: string) => {
    console.log('Cell pressed:', clientBuilding.buildingName, day);
    
    const weekId = currentWeekId;
    const existingEntry = currentWeekSchedule.find(entry => 
      entry.buildingName === clientBuilding.buildingName && 
      entry.day.toLowerCase() === day.toLowerCase()
    );

    if (existingEntry) {
      console.log('Existing entry found, showing details');
      setSelectedEntry(existingEntry);
      setSelectedClientBuilding(clientBuilding);
      setModalType('details');
    } else {
      console.log('No existing entry, opening add modal');
      setSelectedClientBuilding(clientBuilding);
      setSelectedCleaners([]);
      setHours('8');
      setStartTime('09:00');
      setSelectedDay(day.toLowerCase());
      setModalType('add');
    }
  }, [currentWeekId, currentWeekSchedule]);

  // NEW: Handle add shift to cleaner from user view
  const handleAddShiftToCleaner = useCallback((cleaner: Cleaner, day: string) => {
    console.log('Adding shift to cleaner:', cleaner.name, 'on', day);
    
    // Pre-select the cleaner
    setSelectedCleaners([cleaner.name]);
    setCleanerName(cleaner.name);
    
    // Set default values
    setHours('8');
    setStartTime('09:00');
    setSelectedDay(day.toLowerCase());
    
    // Don't pre-select a building - user needs to choose
    setSelectedClientBuilding(null);
    setShowBuildingDropdown(false);
    setModalType('add');
    
    showToast(`Adding shift for ${cleaner.name} on ${day}`, 'info');
  }, [showToast]);

  const handleCellLongPress = useCallback((clientBuilding: ClientBuilding, day: string) => {
    console.log('Cell long pressed:', clientBuilding.buildingName, day);
  }, []);

  const handleClientLongPress = useCallback((client: Client) => {
    console.log('Client long pressed:', client.name);
    setSelectedClient(client);
    setNewClientName(client.name);
    setNewClientSecurity(client.security || '');
    setNewClientSecurityLevel(client.securityLevel || 'medium');
    setModalType('edit-client');
  }, []);

  const handleBuildingLongPress = useCallback((building: ClientBuilding) => {
    console.log('Building long pressed:', building.buildingName);
    setSelectedClientBuilding(building);
    setNewBuildingName(building.buildingName);
    setNewBuildingSecurity(building.security || '');
    setNewBuildingSecurityLevel(building.securityLevel || 'medium');
    setModalType('edit-building');
  }, []);

  const handleMoveEntry = useCallback(async (entryId: string, newBuilding: ClientBuilding, newDay: string) => {
    try {
      console.log('Moving entry:', entryId, 'to', newBuilding.buildingName, newDay);
      
      const weekId = currentWeekId;
      const updates: Partial<ScheduleEntry> = {
        clientName: newBuilding.clientName,
        buildingName: newBuilding.buildingName,
        day: newDay.toLowerCase() as any,
      };

      await updateScheduleEntry(weekId, entryId, updates);
      showToast('Entry moved successfully', 'success');
      
      // Force refresh after move
      forceRefreshSchedule();
    } catch (error) {
      console.error('Error moving entry:', error);
      showToast('Failed to move entry', 'error');
    }
  }, [currentWeekId, updateScheduleEntry, showToast, forceRefreshSchedule]);

  const handleBulkSelect = useCallback((entries: ScheduleEntry[]) => {
    console.log('Bulk select:', entries.length, 'entries');
    setSelectedEntries(entries.map(e => e.id));
  }, []);

  // Enhanced switch to edit with proper form population
  const handleSwitchToEdit = useCallback(() => {
    try {
      console.log('=== SWITCHING TO EDIT MODE ===');
      console.log('Selected entry:', selectedEntry?.id);
      
      if (!selectedEntry) {
        console.error('No entry selected for editing');
        showToast('No entry selected for editing', 'error');
        return;
      }

      // Populate form with existing entry data
      populateFormForEdit(selectedEntry);
      
      // Switch to edit mode
      setModalType('edit');
      
      console.log('=== SWITCHED TO EDIT MODE ===');
    } catch (error) {
      console.error('Error switching to edit mode:', error);
      showToast('Failed to switch to edit mode', 'error');
    }
  }, [selectedEntry, populateFormForEdit, showToast]);

  // Add handlers for client/building/cleaner operations
  const handleAddClient = useCallback(async () => {
    try {
      console.log('Adding new client:', newClientName);
      
      if (!newClientName.trim()) {
        showToast('Please enter a client name', 'error');
        return;
      }

      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: newClientName.trim(),
        securityLevel: newClientSecurityLevel,
        security: newClientSecurity.trim(),
        isActive: true,
        color: '#3B82F6'
      };

      await addClient(newClient);
      showToast('Client added successfully', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding client:', error);
      showToast('Failed to add client', 'error');
    }
  }, [newClientName, newClientSecurityLevel, newClientSecurity, addClient, showToast, closeModal]);

  const handleAddBuilding = useCallback(async () => {
    try {
      console.log('Adding new building:', newBuildingName, 'for client:', selectedClientForBuilding);
      
      if (!newBuildingName.trim() || !selectedClientForBuilding) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      const newBuilding: ClientBuilding = {
        id: `building-${Date.now()}`,
        clientName: selectedClientForBuilding,
        buildingName: newBuildingName.trim(),
        securityLevel: newBuildingSecurityLevel,
        security: newBuildingSecurity.trim(),
        address: ''
      };

      await addClientBuilding(newBuilding);
      showToast('Building added successfully', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding building:', error);
      showToast('Failed to add building', 'error');
    }
  }, [newBuildingName, selectedClientForBuilding, newBuildingSecurityLevel, newBuildingSecurity, addClientBuilding, showToast, closeModal]);

  const handleAddCleaner = useCallback(async () => {
    try {
      console.log('Adding new cleaner:', newCleanerName);
      
      if (!newCleanerName.trim()) {
        showToast('Please enter a cleaner name', 'error');
        return;
      }

      const newCleanerData: Cleaner = {
        id: `cleaner-${Date.now()}`,
        name: newCleanerName.trim(),
        employeeId: `EMP-${Date.now()}`,
        securityLevel: 'low',
        phoneNumber: '',
        email: '',
        specialties: [],
        hireDate: new Date().toISOString().split('T')[0],
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        },
        isActive: true
      };

      await addCleaner(newCleanerData);
      showToast('Cleaner added successfully', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding cleaner:', error);
      showToast('Failed to add cleaner', 'error');
    }
  }, [newCleanerName, addCleaner, showToast, closeModal]);

  const handleEditClient = useCallback(async () => {
    try {
      console.log('Editing client:', selectedClient?.id);
      
      if (!selectedClient || !newClientName.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      const updates = {
        name: newClientName.trim(),
        securityLevel: newClientSecurityLevel,
        security: newClientSecurity.trim()
      };

      await updateClient(selectedClient.id, updates);
      showToast('Client updated successfully', 'success');
      closeModal();
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Failed to update client', 'error');
    }
  }, [selectedClient, newClientName, newClientSecurityLevel, newClientSecurity, updateClient, showToast, closeModal]);

  const handleEditBuilding = useCallback(async () => {
    try {
      console.log('Editing building:', selectedClientBuilding?.id);
      
      if (!selectedClientBuilding || !newBuildingName.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      const updates = {
        buildingName: newBuildingName.trim(),
        securityLevel: newBuildingSecurityLevel,
        security: newBuildingSecurity.trim()
      };

      await updateClientBuilding(selectedClientBuilding.id, updates);
      showToast('Building updated successfully', 'success');
      closeModal();
    } catch (error) {
      console.error('Error updating building:', error);
      showToast('Failed to update building', 'error');
    }
  }, [selectedClientBuilding, newBuildingName, newBuildingSecurityLevel, newBuildingSecurity, updateClientBuilding, showToast, closeModal]);

  // Date navigation
  const changeDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (viewType === 'daily') {
      newDate.setDate(newDate.getDate() + amount);
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + (amount * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + amount);
    }
    setCurrentDate(newDate);
  };

  const getHeaderText = () => {
    const options: Intl.DateTimeFormatOptions = viewType === 'monthly' 
      ? { year: 'numeric', month: 'long' }
      : { year: 'numeric', month: 'long', day: 'numeric' };
    
    if (viewType === 'weekly') {
      const weekStart = new Date(currentDate);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  // Check if we're viewing the current period (week/month/day)
  const isViewingCurrentPeriod = () => {
    const today = new Date();
    
    if (viewType === 'daily') {
      return currentDate.toDateString() === today.toDateString();
    } else if (viewType === 'weekly') {
      const weekStart = new Date(currentDate);
      const dayOfWeek = weekStart.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const todayTime = today.getTime();
      return todayTime >= weekStart.getTime() && todayTime <= weekEnd.getTime();
    } else if (viewType === 'monthly') {
      return currentDate.getMonth() === today.getMonth() && 
             currentDate.getFullYear() === today.getFullYear();
    }
    
    return false;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  // FIXED: Render daily view with actual schedule data
  const renderDailyView = () => {
    // Get the day name for the current date
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[currentDate.getDay()];
    
    // Filter schedule for the current day
    const dailySchedule = currentWeekSchedule.filter(entry => 
      entry.day.toLowerCase() === dayName.toLowerCase()
    );

    console.log('Daily view for:', dayName, 'entries:', dailySchedule.length);

    return (
      <ScrollView style={styles.dailyView}>
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyHeaderText}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
          <Text style={styles.dailyHeaderSubtext}>
            {dailySchedule.length} {dailySchedule.length === 1 ? 'shift' : 'shifts'} scheduled
          </Text>
        </View>

        {dailySchedule.length > 0 ? (
          <View style={styles.dailyScheduleList}>
            {dailySchedule.map(entry => {
              const statusColor = entry.status === 'completed' ? colors.success :
                                 entry.status === 'in-progress' ? colors.warning :
                                 entry.status === 'cancelled' ? colors.danger :
                                 colors.primary;
              
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.dailyEntryCard, { borderLeftColor: statusColor }]}
                  onPress={() => {
                    const building = clientBuildings.find(b => b.buildingName === entry.buildingName);
                    if (building) {
                      handleCellPress(building, dayName);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.dailyEntryHeader}>
                    <View style={styles.dailyEntryTime}>
                      <Icon name="time-outline" size={20} style={{ color: statusColor }} />
                      <Text style={[styles.dailyEntryTimeText, { color: statusColor }]}>
                        {entry.startTime || '09:00'} - {entry.endTime || '17:00'}
                      </Text>
                    </View>
                    <View style={[styles.dailyEntryStatus, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.dailyEntryStatusText, { color: statusColor }]}>
                        {entry.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.dailyEntryClient}>{entry.clientName}</Text>
                  <Text style={styles.dailyEntryBuilding}>{entry.buildingName}</Text>

                  <View style={styles.dailyEntryFooter}>
                    <View style={styles.dailyEntryCleaners}>
                      <Icon name="people-outline" size={16} style={{ color: colors.textSecondary }} />
                      <Text style={styles.dailyEntryCleanersText}>
                        {entry.cleanerNames && entry.cleanerNames.length > 0 
                          ? entry.cleanerNames.join(', ')
                          : entry.cleanerName
                        }
                      </Text>
                    </View>
                    <View style={styles.dailyEntryHours}>
                      <Icon name="time-outline" size={16} style={{ color: colors.textSecondary }} />
                      <Text style={styles.dailyEntryHoursText}>{entry.hours}h</Text>
                    </View>
                  </View>

                  {entry.notes && (
                    <View style={styles.dailyEntryNotes}>
                      <Icon name="document-text-outline" size={14} style={{ color: colors.textSecondary }} />
                      <Text style={styles.dailyEntryNotesText} numberOfLines={2}>{entry.notes}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.dailyEmptyState}>
            <Icon name="calendar-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.dailyEmptyStateText}>No shifts scheduled for this day</Text>
            <TouchableOpacity
              style={styles.dailyEmptyStateButton}
              onPress={() => setModalType('add')}
            >
              <Icon name="add-circle-outline" size={20} style={{ color: colors.primary }} />
              <Text style={styles.dailyEmptyStateButtonText}>Add Shift</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderWeeklyView = () => {
    try {
      if (!Array.isArray(clientBuildings) || !Array.isArray(clients) || !Array.isArray(cleaners) || !Array.isArray(currentWeekSchedule)) {
        console.log('Data not ready for weekly view:', {
          clientBuildings: Array.isArray(clientBuildings) ? clientBuildings.length : 'not array',
          clients: Array.isArray(clients) ? clients.length : 'not array',
          cleaners: Array.isArray(cleaners) ? cleaners.length : 'not array',
          currentWeekSchedule: Array.isArray(currentWeekSchedule) ? currentWeekSchedule.length : 'not array'
        });
        return <LoadingSpinner message="Loading schedule data..." />;
      }

      return (
        <DragDropScheduleGrid
          clientBuildings={clientBuildings}
          clients={clients}
          cleaners={cleaners}
          schedule={currentWeekSchedule}
          currentWeekId={currentWeekId}
          onCellPress={handleCellPress}
          onCellLongPress={handleCellLongPress}
          onClientLongPress={handleClientLongPress}
          onBuildingLongPress={handleBuildingLongPress}
          onMoveEntry={handleMoveEntry}
          onBulkSelect={handleBulkSelect}
          bulkMode={bulkMode}
          selectedEntries={selectedEntries}
          viewMode={scheduleViewMode}
          onAddShiftToCleaner={handleAddShiftToCleaner}
        />
      );
    } catch (error) {
      console.error('Error rendering weekly view:', error);
      return (
        <View style={styles.errorView}>
          <Text style={styles.errorText}>Error loading schedule</Text>
          <TouchableOpacity onPress={forceRefreshSchedule} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderMonthlyView = () => (
    <View style={styles.monthlyView}>
      <Calendar
        current={currentDate.toISOString().split('T')[0]}
        onDayPress={(day) => {
          setCurrentDate(new Date(day.dateString));
          setViewType('daily');
        }}
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
        }}
      />
    </View>
  );

  const renderMainContent = () => {
    try {
      if (clientDataLoading || scheduleLoading) {
        return <LoadingSpinner message="Loading schedule..." />;
      }

      switch (viewType) {
        case 'daily':
          return renderDailyView();
        case 'weekly':
          return renderWeeklyView();
        case 'monthly':
          return renderMonthlyView();
        default:
          return renderWeeklyView();
      }
    } catch (error) {
      console.error('Error rendering main content:', error);
      return (
        <View style={styles.errorView}>
          <Text style={styles.errorText}>Error loading schedule</Text>
          <TouchableOpacity onPress={() => window.location.reload()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Refresh Page</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <CompanyLogo />
            <View style={styles.headerCenter}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text style={styles.headerTitle}>{getHeaderText()}</Text>
              </TouchableOpacity>
              <View style={styles.viewToggle}>
                {(['daily', 'weekly', 'monthly'] as ViewType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.viewButton, viewType === type && styles.viewButtonActive]}
                    onPress={() => setViewType(type)}
                  >
                    <Text style={[styles.viewButtonText, viewType === type && styles.viewButtonTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                icon="repeat"
                onPress={handleOpenRecurringModal}
                size={24}
                color={colors.text}
              />
              <IconButton
                icon="add"
                onPress={() => setModalType('add-client')}
                size={24}
                color={colors.text}
              />
              <IconButton
                icon="business"
                onPress={() => setModalType('add-building')}
                size={24}
                color={colors.text}
              />
            </View>
          </View>

          {/* Date Navigation */}
          <View style={styles.dateNavigation}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navButton}>
              <Icon name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setCurrentDate(new Date())} 
              style={[styles.todayButton, isViewingCurrentPeriod() && styles.todayButtonActive]}
            >
              <Text style={[styles.todayButtonText, isViewingCurrentPeriod() && styles.todayButtonTextActive]}>
                {isViewingCurrentPeriod() ? 'Today' : 'Go to Today'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.navButton}>
              <Icon name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* View Mode Toggle */}
          {viewType === 'weekly' && (
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[styles.viewModeButton, scheduleViewMode === 'building' && styles.viewModeButtonActive]}
                onPress={() => setScheduleViewMode('building')}
              >
                <Icon 
                  name="business" 
                  size={18} 
                  style={{ color: scheduleViewMode === 'building' ? colors.background : colors.text }} 
                />
                <Text style={[styles.viewModeButtonText, scheduleViewMode === 'building' && styles.viewModeButtonTextActive]}>
                  Building View
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewModeButton, scheduleViewMode === 'user' && styles.viewModeButtonActive]}
                onPress={() => setScheduleViewMode('user')}
              >
                <Icon 
                  name="person" 
                  size={18} 
                  style={{ color: scheduleViewMode === 'user' ? colors.background : colors.text }} 
                />
                <Text style={[styles.viewModeButtonText, scheduleViewMode === 'user' && styles.viewModeButtonTextActive]}>
                  User View
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Content */}
          <View style={styles.content}>
            {renderMainContent()}
          </View>

          {/* Schedule Modal */}
          <ScheduleModal
            visible={modalType !== null}
            modalType={modalType}
            selectedEntry={selectedEntry}
            selectedClient={selectedClient}
            selectedClientBuilding={selectedClientBuilding}
            cleaners={cleaners}
            clients={clients}
            clientBuildings={clientBuildings}
            cleanerName={cleanerName}
            selectedCleaners={selectedCleaners}
            hours={hours}
            startTime={startTime}
            newClientName={newClientName}
            newClientSecurity={newClientSecurity}
            newClientSecurityLevel={newClientSecurityLevel}
            newBuildingName={newBuildingName}
            newBuildingSecurity={newBuildingSecurity}
            newBuildingSecurityLevel={newBuildingSecurityLevel}
            selectedClientForBuilding={selectedClientForBuilding}
            newCleanerName={newCleanerName}
            showClientDropdown={showClientDropdown}
            showCleanerDropdown={showCleanerDropdown}
            showSecurityLevelDropdown={showSecurityLevelDropdown}
            showBuildingDropdown={showBuildingDropdown}
            setCleanerName={setCleanerName}
            setSelectedCleaners={setSelectedCleaners}
            setHours={setHours}
            setStartTime={setStartTime}
            setNewClientName={setNewClientName}
            setNewClientSecurity={setNewClientSecurity}
            setNewClientSecurityLevel={setNewClientSecurityLevel}
            setNewBuildingName={setNewBuildingName}
            setNewBuildingSecurity={setNewBuildingSecurity}
            setNewBuildingSecurityLevel={setNewBuildingSecurityLevel}
            setSelectedClientForBuilding={setSelectedClientForBuilding}
            setNewCleanerName={setNewCleanerName}
            setShowClientDropdown={setShowClientDropdown}
            setShowCleanerDropdown={setShowCleanerDropdown}
            setShowSecurityLevelDropdown={setShowSecurityLevelDropdown}
            setShowBuildingDropdown={setShowBuildingDropdown}
            setSelectedClientBuilding={setSelectedClientBuilding}
            onClose={closeModal}
            onSave={handleSave}
            onDelete={handleDelete}
            onAddClient={handleAddClient}
            onAddBuilding={handleAddBuilding}
            onAddCleaner={handleAddCleaner}
            onEditClient={handleEditClient}
            onEditBuilding={handleEditBuilding}
            onSwitchToEdit={handleSwitchToEdit}
          />

          {/* Recurring Task Modal */}
          <RecurringTaskModal
            visible={showRecurringModal}
            clientBuildings={clientBuildings}
            cleaners={cleaners}
            onClose={handleCloseRecurringModal}
            onSave={handleSaveRecurringTask}
          />

          {/* Bulk Actions Bottom Sheet */}
          {bulkMode && selectedEntries.length > 0 && (
            <BulkActionsBottomSheet
              visible={bulkMode && selectedEntries.length > 0}
              selectedCount={selectedEntries.length}
              onClose={() => {
                setBulkMode(false);
                setSelectedEntries([]);
              }}
              onBulkDelete={async () => {
                console.log('Bulk deleting entries:', selectedEntries);
              }}
              onBulkUpdate={async (updates) => {
                console.log('Bulk updating entries:', selectedEntries, updates);
              }}
            />
          )}

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={currentDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          <Toast />
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: colors.primary,
  },
  viewButtonText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  navButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
  },
  todayButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  todayButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  todayButtonTextActive: {
    color: colors.background,
  },
  viewModeToggle: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    gap: spacing.xs,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  viewModeButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  viewModeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  dailyView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dailyHeader: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dailyHeaderText: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dailyHeaderSubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dailyScheduleList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  dailyEntryCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    ...commonStyles.shadow,
  },
  dailyEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dailyEntryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyEntryTimeText: {
    ...typography.body,
    fontWeight: '600',
  },
  dailyEntryStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  dailyEntryStatusText: {
    ...typography.small,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dailyEntryClient: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  dailyEntryBuilding: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  dailyEntryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dailyEntryCleaners: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  dailyEntryCleanersText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  dailyEntryHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyEntryHoursText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  dailyEntryNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dailyEntryNotesText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  dailyEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  dailyEmptyStateText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  dailyEmptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dailyEmptyStateButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  monthlyView: {
    flex: 1,
    padding: spacing.md,
  },
  comingSoon: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.h3,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});

export default ScheduleView;
