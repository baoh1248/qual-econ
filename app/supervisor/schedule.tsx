
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
import Toast from '../../components/Toast';
import DragDropScheduleGrid from '../../components/schedule/DragDropScheduleGrid';
import ScheduleModal from '../../components/schedule/ScheduleModal';
import SmartSchedulingSuggestions from '../../components/schedule/SmartSchedulingSuggestions';
// import ConflictResolutionPanel from '../../components/schedule/ConflictResolutionPanel';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import BulkActionsBottomSheet from '../../components/schedule/BulkActionsBottomSheet';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';
// import { useConflictDetection } from '../../hooks/useConflictDetection';
import { useToast } from '../../hooks/useToast';

type ModalType = 'add' | 'edit' | 'add-client' | 'add-building' | 'add-cleaner' | 'details' | 'edit-client' | 'edit-building' | null;
type ViewType = 'daily' | 'weekly' | 'monthly';

const ScheduleView = () => {
  console.log('Enhanced ScheduleView rendered with conflict resolution');

  // Refs
  const bulkActionsBottomSheetRef = useRef<BottomSheet>(null);

  // Toast hook
  const { toast, showToast, hideToast } = useToast();

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
    // Multiple cleaners operations
    getEntryCleaners,
    addCleanerToEntry,
    removeCleanerFromEntry,
    updateEntryCleaners,
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
  const [showConflictPanel, setShowConflictPanel] = useState(false);
  const [recurringTaskModalVisible, setRecurringTaskModalVisible] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  // Enhanced conflict detection
  // const { 
  //   conflicts, 
  //   conflictSummary, 
  //   validateScheduleChange,
  //   hasConflicts,
  //   hasCriticalConflicts,
  //   hasHighPriorityConflicts 
  // } = useConflictDetection(schedule, cleaners || []);
  
  // Temporary placeholders
  const conflicts: any[] = [];
  const conflictSummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
  const validateScheduleChange = (entry: any, existingId?: string) => ({ hasConflicts: false, conflicts: [], canProceed: true, warnings: [] });
  const hasConflicts = false;
  const hasCriticalConflicts = false;
  const hasHighPriorityConflicts = false;

  // Form states with proper initialization
  const [cleanerName, setCleanerName] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]); // New state for multiple cleaners
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

  // Helper functions for consistent date handling (same as payroll)
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

  // Helper function to create date from string without timezone issues (consistent with payroll)
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

  // Clear caches function
  const clearCaches = useCallback(() => {
    console.log('Clearing all caches...');
    // Reset all data
    setSchedule([]);
    setCurrentWeekId('');
  }, []);

  // Load schedule for current week with improved error handling
  const loadCurrentWeekSchedule = useCallback(async (forceRefresh: boolean = false) => {
    try {
      console.log('Loading schedule for selected date:', formatDateString(selectedDate), 'forceRefresh:', forceRefresh);
      
      if (!getWeekIdFromDate) {
        console.error('getWeekIdFromDate function not available');
        return;
      }

      const weekId = getWeekIdFromDate(selectedDate);
      console.log('Calculated week ID:', weekId);
      
      // Always reload if weekId changed OR if forced reload
      const shouldReload = weekId !== currentWeekId || forceRefresh;
      
      if (shouldReload) {
        console.log('Reloading schedule data for week:', weekId, 'force:', forceRefresh);
        setCurrentWeekId(weekId);
        
        if (getWeekSchedule) {
          // Force clear cache before getting fresh data if requested
          if (forceRefresh) {
            console.log('Force clearing cache before reload');
            if (clearCaches) {
              clearCaches();
            }
          }
          
          const weekSchedule = getWeekSchedule(weekId, forceRefresh);
          console.log('Loaded schedule entries for week', weekId, ':', weekSchedule?.length || 0);
          console.log('Schedule entries details:', weekSchedule?.map(e => ({
            id: e.id,
            cleanerName: e.cleanerName,
            cleanerNames: e.cleanerNames,
            hours: e.hours,
            buildingName: e.buildingName
          })));
          setSchedule(weekSchedule || []);
        } else {
          console.error('getWeekSchedule function not available');
          setSchedule([]);
        }
      } else {
        console.log('Week ID unchanged and no force refresh, skipping reload');
      }
    } catch (error) {
      console.error('Error loading current week schedule:', error);
      setSchedule([]);
    }
  }, [selectedDate, currentWeekId, getWeekIdFromDate, getWeekSchedule, formatDateString, clearCaches]);

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

  // Helper function to generate recurring schedule entries
  const generateRecurringEntries = useCallback((taskData: any): ScheduleEntry[] => {
    try {
      console.log('Generating recurring entries for task:', taskData);
      
      const entries: ScheduleEntry[] = [];
      const { clientBuilding, cleanerName, cleanerNames, hours, startTime, pattern, notes } = taskData;
      
      // Use multiple cleaners if available, otherwise fall back to single cleaner
      const cleanersToUse = cleanerNames && cleanerNames.length > 0 ? cleanerNames : (cleanerName ? [cleanerName] : []);
      
      if (!clientBuilding || cleanersToUse.length === 0 || !hours || !pattern) {
        console.error('Missing required data for recurring task');
        return [];
      }

      const recurringId = String(Date.now() + Math.random());
      const startDate = new Date();
      let currentDate = new Date(startDate);
      let occurrenceCount = 0;
      const maxOccurrences = pattern.maxOccurrences || 52; // Default to 1 year
      const endDate = pattern.endDate ? new Date(pattern.endDate) : null;

      console.log('Pattern:', pattern);
      console.log('Start date:', formatDateString(startDate));
      console.log('Max occurrences:', maxOccurrences);
      console.log('End date:', endDate ? formatDateString(endDate) : 'None');

      while (occurrenceCount < maxOccurrences) {
        // Check if we've reached the end date
        if (endDate && currentDate > endDate) {
          console.log('Reached end date, stopping generation');
          break;
        }

        let shouldCreateEntry = false;
        let entryDate = new Date(currentDate);

        switch (pattern.type) {
          case 'daily':
            shouldCreateEntry = true;
            break;
            
          case 'weekly':
            const dayOfWeek = currentDate.getDay();
            // Convert Sunday (0) to 7 for easier comparison
            const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
            // pattern.daysOfWeek uses 0=Sunday, 1=Monday, etc.
            const patternDays = pattern.daysOfWeek || [1]; // Default to Monday
            
            // Convert pattern days to match our adjusted system
            const adjustedPatternDays = patternDays.map((day: number) => day === 0 ? 7 : day);
            shouldCreateEntry = adjustedPatternDays.includes(adjustedDayOfWeek);
            break;
            
          case 'monthly':
            const dayOfMonth = currentDate.getDate();
            shouldCreateEntry = dayOfMonth === (pattern.dayOfMonth || 1);
            break;
        }

        if (shouldCreateEntry) {
          const weekId = getWeekIdFromDate(entryDate);
          const dayName = getDayOfWeekName(entryDate.getDay() === 0 ? 6 : entryDate.getDay() - 1);
          
          const entry: ScheduleEntry = {
            id: `${recurringId}-${occurrenceCount}`,
            clientName: clientBuilding.clientName,
            buildingName: clientBuilding.buildingName,
            cleanerName: cleanersToUse[0], // Keep backward compatibility
            cleanerNames: cleanersToUse, // New field for multiple cleaners
            cleanerIds: cleanersToUse.map(name => cleaners?.find(c => c.name === name)?.id).filter(Boolean) as string[],
            hours,
            day: dayName as any,
            date: formatDateString(entryDate),
            startTime: startTime || undefined,
            status: 'scheduled',
            weekId,
            notes: notes || undefined,
            isRecurring: true,
            recurringId,
          };

          entries.push(entry);
          console.log(`Generated entry ${occurrenceCount + 1}:`, {
            date: entry.date,
            day: entry.day,
            building: entry.buildingName,
            cleaner: entry.cleanerName
          });
          
          occurrenceCount++;
        }

        // Advance the date based on pattern
        switch (pattern.type) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + (pattern.interval || 1));
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'monthly':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
        }

        // Safety check to prevent infinite loops
        if (currentDate.getFullYear() > startDate.getFullYear() + 2) {
          console.log('Safety break: reached 2 years in the future');
          break;
        }
      }

      console.log(`Generated ${entries.length} recurring entries`);
      return entries;
    } catch (error) {
      console.error('Error generating recurring entries:', error);
      return [];
    }
  }, [getWeekIdFromDate, getDayOfWeekName, formatDateString]);

  // Enhanced recurring task handler
  const handleSaveRecurringTask = useCallback(async (taskData: any) => {
    try {
      console.log('Saving recurring task:', taskData);
      
      if (!taskData || !taskData.clientBuilding || !taskData.cleanerName || !taskData.hours || !taskData.pattern) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      // Generate all recurring entries
      const recurringEntries = generateRecurringEntries(taskData);
      
      if (recurringEntries.length === 0) {
        showToast('No recurring entries could be generated. Please check your pattern settings.', 'error');
        return;
      }

      // Group entries by week and save them
      const entriesByWeek = new Map<string, ScheduleEntry[]>();
      
      recurringEntries.forEach(entry => {
        const weekId = entry.weekId;
        if (!entriesByWeek.has(weekId)) {
          entriesByWeek.set(weekId, []);
        }
        entriesByWeek.get(weekId)!.push(entry);
      });

      console.log(`Saving recurring entries across ${entriesByWeek.size} weeks`);

      // Save entries week by week
      let savedCount = 0;
      for (const [weekId, weekEntries] of entriesByWeek) {
        try {
          const existingWeekSchedule = getWeekSchedule(weekId);
          const updatedWeekSchedule = [...existingWeekSchedule, ...weekEntries];
          await updateWeekSchedule(weekId, updatedWeekSchedule);
          savedCount += weekEntries.length;
          
          // If this is the current week, update the local schedule state
          if (weekId === currentWeekId) {
            setSchedule(prev => [...prev, ...weekEntries]);
          }
        } catch (error) {
          console.error(`Error saving entries for week ${weekId}:`, error);
        }
      }

      if (savedCount > 0) {
        showToast(`Successfully created ${savedCount} recurring schedule entries!`, 'success');
        setRecurringTaskModalVisible(false);
        
        // Reload current week schedule to show any new entries
        await loadCurrentWeekSchedule();
      } else {
        showToast('Failed to create recurring entries. Please try again.', 'error');
      }
      
    } catch (error) {
      console.error('Error saving recurring task:', error);
      showToast('Failed to create recurring task. Please try again.', 'error');
    }
  }, [generateRecurringEntries, getWeekSchedule, updateWeekSchedule, currentWeekId, showToast, loadCurrentWeekSchedule]);

  // Form and modal handlers with error handling
  const resetForm = useCallback(() => {
    try {
      console.log('Resetting form...');
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
      
      showToast('Schedule entry moved successfully!', 'success');
    } catch (error) {
      console.error('Error performing move:', error);
      showToast('Failed to move schedule entry', 'error');
    }
  }, [updateScheduleEntry, currentWeekId, showToast]);

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

  // Auto-show conflict panel when critical conflicts are detected
  useEffect(() => {
    if (hasCriticalConflicts && !showConflictPanel) {
      console.log('Critical conflicts detected, showing conflict panel');
      setShowConflictPanel(true);
    }
  }, [hasCriticalConflicts, showConflictPanel]);

  // Enhanced event handlers with conflict validation
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
        console.log('Found entry for details:', {
          id: entry.id,
          cleanerName: entry.cleanerName,
          cleanerNames: entry.cleanerNames,
          hours: entry.hours,
          startTime: entry.startTime
        });
        
        setSelectedEntry(entry);
        setCleanerName(entry.cleanerName || '');
        
        // Set multiple cleaners if available, otherwise use single cleaner for backward compatibility
        const entryCleaners = getEntryCleaners ? getEntryCleaners(entry) : (entry.cleanerName ? [entry.cleanerName] : []);
        console.log('Setting selected cleaners for details:', entryCleaners);
        setSelectedCleaners(entryCleaners);
        
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
        console.log('Opening edit modal for entry:', {
          id: entry.id,
          cleanerName: entry.cleanerName,
          cleanerNames: entry.cleanerNames,
          hours: entry.hours,
          startTime: entry.startTime
        });
        
        setSelectedEntry(entry);
        setCleanerName(entry.cleanerName || '');
        
        // Set multiple cleaners if available, otherwise use single cleaner for backward compatibility
        const entryCleaners = getEntryCleaners ? getEntryCleaners(entry) : (entry.cleanerName ? [entry.cleanerName] : []);
        console.log('Setting selected cleaners for edit:', entryCleaners);
        setSelectedCleaners(entryCleaners);
        
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

  // Enhanced drag and drop handler with conflict validation
  const handleMoveEntry = useCallback(async (entryId: string, newBuilding: ClientBuilding, newDay: string) => {
    try {
      console.log('Moving entry with conflict validation:', entryId, 'to', newBuilding?.buildingName, newDay);
      
      if (!entryId || !newBuilding || !newDay) {
        console.error('Invalid parameters for move entry');
        return;
      }

      const entry = schedule.find(e => e?.id === entryId);
      if (!entry) {
        console.error('Entry not found:', entryId);
        return;
      }

      // Enhanced conflict validation
      const tempEntry = {
        ...entry,
        clientName: newBuilding.clientName,
        buildingName: newBuilding.buildingName,
        day: newDay.toLowerCase() as any
      };

      const validation = validateScheduleChange(tempEntry, entryId);
      
      if (validation.hasConflicts && !validation.canProceed) {
        const conflictMessages = validation.conflicts.map(c => c.description).join('\n');
        Alert.alert(
          'Critical Conflict Detected',
          `Moving this entry will create critical conflicts:\n\n${conflictMessages}\n\nThis move is not recommended. Would you like to see resolution suggestions instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Show Conflicts', 
              onPress: () => setShowConflictPanel(true)
            },
            { 
              text: 'Force Move', 
              style: 'destructive',
              onPress: () => performMove(entry, newBuilding, newDay)
            }
          ]
        );
      } else if (validation.warnings.length > 0) {
        Alert.alert(
          'Schedule Warning',
          validation.warnings.join('\n') + '\n\nDo you want to continue?',
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
      showToast('Failed to move schedule entry', 'error');
    }
  }, [schedule, validateScheduleChange, performMove, showToast]);

  // Enhanced suggestion handlers
  const handleApplySuggestion = useCallback(async (suggestion: any) => {
    try {
      console.log('Applying suggestion:', suggestion.id);
      
      for (const change of suggestion.suggestedChanges) {
        if (change.entryId) {
          const updates: Partial<ScheduleEntry> = {};
          
          if (change.newCleaner) updates.cleanerName = change.newCleaner;
          if (change.newDay) updates.day = change.newDay.toLowerCase() as any;
          if (change.newTime) updates.startTime = change.newTime;
          if (change.newHours) updates.hours = change.newHours;
          
          if (Object.keys(updates).length > 0) {
            await updateScheduleEntry(currentWeekId, change.entryId, updates);
            setSchedule(prev => prev.map(entry =>
              entry.id === change.entryId ? { ...entry, ...updates } : entry
            ));
          }
        }
      }
      
      showToast('Suggestion applied successfully!', 'success');
      
      // If this was a conflict resolution, hide the conflict panel
      if (suggestion.type === 'conflict_resolution') {
        setShowConflictPanel(false);
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      showToast('Failed to apply suggestion', 'error');
    }
  }, [updateScheduleEntry, currentWeekId, showToast]);

  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => [...prev, suggestionId]);
  }, []);

  // Enhanced conflict resolution handlers
  const handleApplyResolution = useCallback(async (conflictId: string, resolution: any) => {
    try {
      console.log('Applying conflict resolution:', conflictId, resolution.id);
      
      for (const change of resolution.changes) {
        if (change.entryId) {
          const updates: Partial<ScheduleEntry> = {};
          
          if (change.newCleaner) updates.cleanerName = change.newCleaner;
          if (change.newDay) updates.day = change.newDay.toLowerCase() as any;
          if (change.newTime) updates.startTime = change.newTime;
          if (change.newHours) updates.hours = change.newHours;
          
          if (Object.keys(updates).length > 0) {
            await updateScheduleEntry(currentWeekId, change.entryId, updates);
            setSchedule(prev => prev.map(entry =>
              entry.id === change.entryId ? { ...entry, ...updates } : entry
            ));
          }
        }
      }
      
      showToast('Conflict resolved successfully!', 'success');
    } catch (error) {
      console.error('Error applying resolution:', error);
      showToast('Failed to apply resolution', 'error');
    }
  }, [updateScheduleEntry, currentWeekId, showToast]);

  const handleDismissConflict = useCallback((conflictId: string) => {
    console.log('Dismissing conflict:', conflictId);
    // In a real app, you might want to store dismissed conflicts
  }, []);



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
        showToast('Client name cannot be empty', 'error');
        return;
      }
      
      if (!clients || !addClientData) {
        console.error('Clients data or add function not available');
        showToast('Unable to add client at this time', 'error');
        return;
      }

      const existingClient = clients.find(c => c?.name?.toLowerCase() === newClientName.toLowerCase());
      if (existingClient) {
        showToast('A client with this name already exists', 'error');
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
      showToast('Client added successfully!', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding client:', error);
      showToast('Failed to add client. Please try again.', 'error');
    }
  }, [newClientName, newClientSecurity, newClientSecurityLevel, clients, addClientData, closeModal, showToast]);

  const addBuilding = useCallback(async () => {
    try {
      console.log('Adding building:', newBuildingName, 'for client:', selectedClientForBuilding);
      
      if (!newBuildingName?.trim()) {
        showToast('Building name cannot be empty', 'error');
        return;
      }
      
      if (!selectedClientForBuilding?.trim()) {
        showToast('Please select a client for this building', 'error');
        return;
      }
      
      if (!addBuildingData) {
        console.error('Add building function not available');
        showToast('Unable to add building at this time', 'error');
        return;
      }

      const existingBuilding = clientBuildings?.find(b => 
        b?.buildingName?.toLowerCase() === newBuildingName.toLowerCase() &&
        b?.clientName?.toLowerCase() === selectedClientForBuilding.toLowerCase()
      );
      
      if (existingBuilding) {
        showToast('A building with this name already exists for this client', 'error');
        return;
      }

      const newBuilding: ClientBuilding = {
        id: String(Date.now()),
        clientName: selectedClientForBuilding.trim(),
        buildingName: newBuildingName.trim(),
        isActive: true,
        security: newBuildingSecurity.trim() || undefined,
        securityLevel: newBuildingSecurityLevel,
        priority: newBuildingPriority
      };
      
      await addBuildingData(newBuilding);
      console.log('Building added successfully:', newBuilding);
      showToast('Building added successfully!', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding building:', error);
      showToast('Failed to add building. Please try again.', 'error');
    }
  }, [newBuildingName, selectedClientForBuilding, newBuildingSecurity, newBuildingSecurityLevel, newBuildingPriority, clientBuildings, addBuildingData, closeModal, showToast]);

  const addCleaner = useCallback(async () => {
    try {
      console.log('Adding cleaner:', newCleanerName);
      
      if (!newCleanerName?.trim()) {
        showToast('Cleaner name cannot be empty', 'error');
        return;
      }
      
      if (!addCleanerData) {
        console.error('Add cleaner function not available');
        showToast('Unable to add cleaner at this time', 'error');
        return;
      }

      const existingCleaner = cleaners?.find(c => c?.name?.toLowerCase() === newCleanerName.toLowerCase());
      if (existingCleaner) {
        showToast('A cleaner with this name already exists', 'error');
        return;
      }

      const newCleaner: Cleaner = {
        id: String(Date.now()),
        name: newCleanerName.trim(),
        isActive: true,
        email: '',
        phone: '',
        specialties: ['General Cleaning']
      };
      
      await addCleanerData(newCleaner);
      console.log('Cleaner added successfully:', newCleaner);
      showToast('Cleaner added successfully!', 'success');
      closeModal();
    } catch (error) {
      console.error('Error adding cleaner:', error);
      showToast('Failed to add cleaner. Please try again.', 'error');
    }
  }, [newCleanerName, cleaners, addCleanerData, closeModal, showToast]);

  const editClient = useCallback(async () => {
    try {
      console.log('Editing client:', selectedClient?.id, 'with name:', newClientName);
      
      if (!selectedClient?.id) {
        showToast('No client selected for editing', 'error');
        return;
      }
      
      if (!newClientName?.trim()) {
        showToast('Client name cannot be empty', 'error');
        return;
      }
      
      if (!updateClient) {
        console.error('Update client function not available');
        showToast('Unable to update client at this time', 'error');
        return;
      }

      const updates = {
        name: newClientName.trim(),
        security: newClientSecurity.trim() || undefined,
        securityLevel: newClientSecurityLevel
      };
      
      await updateClient(selectedClient.id, updates);
      console.log('Client updated successfully:', selectedClient.id);
      showToast('Client updated successfully!', 'success');
      closeModal();
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Failed to update client. Please try again.', 'error');
    }
  }, [selectedClient, newClientName, newClientSecurity, newClientSecurityLevel, updateClient, closeModal, showToast]);

  const editBuilding = useCallback(async () => {
    try {
      console.log('Editing building:', selectedClientBuilding?.id, 'with name:', newBuildingName);
      
      if (!selectedClientBuilding?.id) {
        showToast('No building selected for editing', 'error');
        return;
      }
      
      if (!newBuildingName?.trim()) {
        showToast('Building name cannot be empty', 'error');
        return;
      }
      
      if (!updateBuilding) {
        console.error('Update building function not available');
        showToast('Unable to update building at this time', 'error');
        return;
      }

      const updates = {
        buildingName: newBuildingName.trim(),
        security: newBuildingSecurity.trim() || undefined,
        securityLevel: newBuildingSecurityLevel,
        priority: newBuildingPriority
      };
      
      await updateBuilding(selectedClientBuilding.id, updates);
      console.log('Building updated successfully:', selectedClientBuilding.id);
      showToast('Building updated successfully!', 'success');
      closeModal();
    } catch (error) {
      console.error('Error updating building:', error);
      showToast('Failed to update building. Please try again.', 'error');
    }
  }, [selectedClientBuilding, newBuildingName, newBuildingSecurity, newBuildingSecurityLevel, newBuildingPriority, updateBuilding, closeModal, showToast]);

  const deleteEntry = useCallback(async () => {
    try {
      console.log('Delete entry called with:', {
        selectedEntry: selectedEntry?.id,
        currentWeekId,
        deleteScheduleEntry: !!deleteScheduleEntry
      });
      
      if (!selectedEntry?.id || !currentWeekId) {
        console.error('Missing required data for deletion:', {
          entryId: selectedEntry?.id,
          weekId: currentWeekId
        });
        showToast('No entry selected for deletion', 'error');
        return;
      }
      
      if (!deleteScheduleEntry) {
        console.error('Delete function not available');
        showToast('Unable to delete entry at this time', 'error');
        return;
      }

      Alert.alert(
        'Delete Shift',
        `Are you sure you want to delete the shift for ${selectedEntry.cleanerName} at ${selectedEntry.buildingName}? This action cannot be undone.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('Delete cancelled by user')
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('User confirmed deletion, proceeding...');
                console.log('Deleting entry:', selectedEntry.id, 'from week:', currentWeekId);
                
                // Call the delete function
                await deleteScheduleEntry(currentWeekId, selectedEntry.id);
                
                // Update local state immediately for better UX
                console.log('Updating local schedule state...');
                setSchedule(prev => {
                  const updated = prev.filter(e => e.id !== selectedEntry.id);
                  console.log('Local schedule updated, entries remaining:', updated.length);
                  return updated;
                });
                
                console.log('Entry deleted successfully:', selectedEntry.id);
                showToast('Shift deleted successfully!', 'success');
                closeModal();
                
                // Force reload the schedule to ensure consistency
                setTimeout(() => {
                  console.log('Reloading schedule after delete...');
                  loadCurrentWeekSchedule(true); // Force refresh
                }, 100);
                
              } catch (error) {
                console.error('Error during deletion process:', error);
                showToast('Failed to delete shift. Please try again.', 'error');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in deleteEntry function:', error);
      showToast('Failed to delete shift', 'error');
    }
  }, [selectedEntry, currentWeekId, deleteScheduleEntry, closeModal, showToast, loadCurrentWeekSchedule]);

  // Enhanced save entry with conflict validation
  const saveEntry = useCallback(async () => {
    try {
      console.log('Saving entry for week:', currentWeekId);
      console.log('Modal type:', modalType);
      console.log('Form data:', { cleanerName, hours, startTime });
      console.log('Selected building:', selectedClientBuilding);
      console.log('Selected day:', selectedDay);
      
      // Validation - check for multiple cleaners or single cleaner
      const cleanersToUse = selectedCleaners.length > 0 ? selectedCleaners : (cleanerName?.trim() ? [cleanerName.trim()] : []);
      
      if (cleanersToUse.length === 0) {
        showToast('Please select at least one cleaner', 'error');
        return;
      }

      if (!hours?.trim()) {
        showToast('Please enter the number of hours', 'error');
        return;
      }

      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        showToast('Please enter a valid number of hours', 'error');
        return;
      }

      if (!addScheduleEntry || !updateScheduleEntry || !currentWeekId) {
        console.error('Schedule functions or week ID not available');
        showToast('Unable to save entry at this time', 'error');
        return;
      }

      if (modalType === 'add') {
        if (!selectedClientBuilding || !selectedDay) {
          showToast('Missing building or day information', 'error');
          return;
        }

        const startOfWeek = getStartOfWeek(selectedDate);
        const dayIndex = getDayIndexFromName(selectedDay);
        
        // Create the entry date more carefully to avoid timezone issues
        const entryDate = new Date(startOfWeek);
        entryDate.setDate(entryDate.getDate() + dayIndex);
        entryDate.setHours(0, 0, 0, 0); // Ensure we're at start of day
        const entryDateString = formatDateString(entryDate);
        
        console.log(`Creating entry for ${selectedDay} (day index: ${dayIndex})`);
        console.log(`Week start: ${formatDateString(startOfWeek)}, Entry date: ${entryDateString}`);
        
        const newEntry: ScheduleEntry = {
          id: String(Date.now() + Math.random()),
          clientName: selectedClientBuilding.clientName,
          buildingName: selectedClientBuilding.buildingName,
          cleanerName: cleanersToUse[0], // Keep backward compatibility
          cleanerNames: cleanersToUse, // New field for multiple cleaners
          cleanerIds: cleanersToUse.map(name => cleaners?.find(c => c.name === name)?.id).filter(Boolean) as string[],
          hours: hoursNum,
          day: selectedDay.toLowerCase() as any,
          date: entryDateString,
          startTime: startTime.trim() || undefined,
          status: 'scheduled',
          weekId: currentWeekId
        };

        // Enhanced conflict validation before saving
        const validation = validateScheduleChange(newEntry);
        
        if (validation.hasConflicts && !validation.canProceed) {
          const conflictMessages = validation.conflicts.map(c => c.description).join('\n');
          Alert.alert(
            'Critical Conflict Detected',
            `Adding this entry will create critical conflicts:\n\n${conflictMessages}\n\nWould you like to see resolution suggestions?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Show Conflicts', 
                onPress: () => {
                  setShowConflictPanel(true);
                  closeModal();
                }
              },
              { 
                text: 'Add Anyway', 
                style: 'destructive',
                onPress: async () => {
                  console.log('Adding new entry despite conflicts:', newEntry);
                  await addScheduleEntry(currentWeekId, newEntry);
                  setSchedule(prev => [...prev, newEntry]);
                  console.log('New entry added for week:', currentWeekId);
                  showToast('Schedule entry added with conflicts!', 'warning');
                  closeModal();
                }
              }
            ]
          );
          return;
        } else if (validation.warnings.length > 0) {
          Alert.alert(
            'Schedule Warning',
            validation.warnings.join('\n') + '\n\nDo you want to continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Continue', 
                onPress: async () => {
                  console.log('Adding new entry:', newEntry);
                  await addScheduleEntry(currentWeekId, newEntry);
                  setSchedule(prev => [...prev, newEntry]);
                  console.log('New entry added for week:', currentWeekId);
                  showToast('Schedule entry added successfully!', 'success');
                  closeModal();
                }
              }
            ]
          );
          return;
        }
        
        console.log('Adding new entry:', newEntry);
        await addScheduleEntry(currentWeekId, newEntry);
        setSchedule(prev => [...prev, newEntry]);
        console.log('New entry added for week:', currentWeekId);
        showToast('Schedule entry added successfully!', 'success');
        
      } else if (modalType === 'edit' && selectedEntry) {
        console.log('Editing entry - current state:', {
          selectedEntry: {
            id: selectedEntry.id,
            cleanerName: selectedEntry.cleanerName,
            cleanerNames: selectedEntry.cleanerNames,
            hours: selectedEntry.hours,
            startTime: selectedEntry.startTime
          },
          formData: {
            cleanersToUse,
            hoursNum,
            startTime: startTime.trim() || undefined
          }
        });

        const updates: Partial<ScheduleEntry> = {
          cleanerName: cleanersToUse[0], // Keep backward compatibility
          cleanerNames: cleanersToUse, // New field for multiple cleaners
          cleanerIds: cleanersToUse.map(name => cleaners?.find(c => c.name === name)?.id).filter(Boolean) as string[],
          hours: hoursNum,
          startTime: startTime.trim() || undefined
        };

        console.log('Prepared updates object:', JSON.stringify(updates));

        // Check if there are actual changes to prevent unnecessary updates
        const hasChanges = (
          JSON.stringify(selectedEntry.cleanerNames || [selectedEntry.cleanerName].filter(Boolean)) !== JSON.stringify(cleanersToUse) ||
          selectedEntry.hours !== hoursNum ||
          (selectedEntry.startTime || '') !== (startTime.trim() || '')
        );

        console.log('Has changes detected:', hasChanges);

        if (!hasChanges) {
          console.log('No changes detected, closing modal without update');
          showToast('No changes to save', 'warning');
          closeModal();
          return;
        }

        // Validate updates
        const tempEntry = { ...selectedEntry, ...updates };
        const validation = validateScheduleChange(tempEntry, selectedEntry.id);
        
        if (validation.hasConflicts && !validation.canProceed) {
          const conflictMessages = validation.conflicts.map(c => c.description).join('\n');
          Alert.alert(
            'Critical Conflict Detected',
            `Updating this entry will create critical conflicts:\n\n${conflictMessages}\n\nWould you like to see resolution suggestions?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Show Conflicts', 
                onPress: () => {
                  setShowConflictPanel(true);
                  closeModal();
                }
              },
              { 
                text: 'Update Anyway', 
                style: 'destructive',
                onPress: async () => {
                  console.log('Force updating entry:', selectedEntry.id, 'with:', JSON.stringify(updates));
                  await updateScheduleEntry(currentWeekId, selectedEntry.id, updates);
                  setSchedule(prev => prev.map(entry =>
                    entry.id === selectedEntry.id ? { ...entry, ...updates } : entry
                  ));
                  console.log('Entry force updated for week:', currentWeekId, selectedEntry.id);
                  showToast('Schedule entry updated with conflicts!', 'warning');
                  closeModal();
                }
              }
            ]
          );
          return;
        }
        
        console.log('Proceeding with entry update:', selectedEntry.id, 'with:', JSON.stringify(updates));
        await updateScheduleEntry(currentWeekId, selectedEntry.id, updates);
        
        // Update local state immediately for better UX
        setSchedule(prev => {
          const updated = prev.map(entry =>
            entry.id === selectedEntry.id ? { ...entry, ...updates } : entry
          );
          console.log('Local schedule state updated for entry:', selectedEntry.id);
          return updated;
        });
        
        console.log('Entry successfully updated for week:', currentWeekId, selectedEntry.id);
        showToast('Schedule entry updated successfully!', 'success');
        
        // Force reload the schedule to ensure consistency
        setTimeout(() => {
          console.log('Reloading schedule after update to ensure consistency...');
          loadCurrentWeekSchedule(true); // Force refresh
        }, 100);
      }
      
      closeModal();
    } catch (error) {
      console.error('Error saving entry:', error);
      showToast('Failed to save schedule entry. Please try again.', 'error');
    }
  }, [
    modalType, 
    selectedClientBuilding, 
    selectedDay, 
    selectedEntry, 
    cleanerName, 
    hours, 
    startTime, 
    currentWeekId, 
    getStartOfWeek, 
    selectedDate, 
    addScheduleEntry, 
    updateScheduleEntry, 
    closeModal, 
    getDayIndexFromName, 
    formatDateString, 
    showToast,
    validateScheduleChange
  ]);

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
                            {(() => {
                              const entryCleaners = getEntryCleaners ? getEntryCleaners(entry) : (entry.cleanerName ? [entry.cleanerName] : []);
                              if (entryCleaners.length === 1) {
                                return `Cleaner: ${entryCleaners[0]}`;
                              } else if (entryCleaners.length > 1) {
                                return `Cleaners: ${entryCleaners.join(', ')}`;
                              } else {
                                return 'Cleaner: Unknown';
                              }
                            })()}
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

  // Enhanced weekly view with conflict indicators
  const renderWeeklyView = () => {
    try {
      console.log('Rendering enhanced weekly view with:', {
        clientBuildings: clientBuildings?.length || 0,
        clients: clients?.length || 0,
        schedule: schedule?.length || 0,
        currentWeekId,
        isCurrentWeek: isCurrentWeek(),
        bulkMode,
        selectedEntries: selectedEntries?.length || 0,
        conflicts: conflicts?.length || 0,
        hasConflicts
      });

      return (
        <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
          {/* Enhanced Conflict Panel */}
          {hasConflicts && showConflictPanel && (
            {/* <ConflictResolutionPanel
              conflicts={conflicts}
              onApplyResolution={handleApplyResolution}
              onDismissConflict={handleDismissConflict}
            /> */}
          )}

          {/* Smart Suggestions */}
          {showSuggestions && (
            <SmartSchedulingSuggestions
              schedule={schedule || []}
              cleaners={cleaners || []}
              clientBuildings={clientBuildings || []}
              clients={clients || []}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={handleDismissSuggestion}
            />
          )}

          <View style={styles.weekInfoHeader}>
            <Text style={styles.weekInfoText}>
              Week of {getHeaderText()} • {schedule?.length || 0} scheduled jobs
            </Text>
            {hasConflicts && (
              <Text style={styles.conflictWarningText}>
                ⚠️ {conflictSummary.total} conflicts detected • {conflictSummary.critical + conflictSummary.high} high priority
              </Text>
            )}
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
              style={[styles.actionButton, hasConflicts && styles.actionButtonWarning]}
              onPress={() => setShowConflictPanel(!showConflictPanel)}
            >
              <Icon name={hasConflicts ? "warning" : "shield-checkmark"} size={16} style={{ color: hasConflicts ? colors.danger : colors.success }} />
              <Text style={[styles.actionButtonText, hasConflicts && styles.actionButtonTextWarning]}>
                {hasConflicts ? `Conflicts (${conflictSummary.total})` : 'No Conflicts'}
              </Text>
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

  // Render monthly view with calendar
  const renderMonthlyView = () => {
    try {
      console.log('Rendering monthly view for selected date:', formatDateString(selectedDate));
      
      // Create marked dates for the calendar
      const markedDates: any = {};
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
                          <Text style={styles.dayEntryCleaner}>
                            {(() => {
                              const entryCleaners = getEntryCleaners ? getEntryCleaners(entry) : (entry.cleanerName ? [entry.cleanerName] : []);
                              if (entryCleaners.length === 1) {
                                return `Cleaner: ${entryCleaners[0]}`;
                              } else if (entryCleaners.length > 1) {
                                return `Cleaners: ${entryCleaners.join(', ')}`;
                              } else {
                                return 'Cleaner: Unknown';
                              }
                            })()}
                          </Text>
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
          {/* Enhanced Header with conflict indicator */}
          <View style={[styles.header, hasConflicts && styles.headerWithConflicts]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} style={{ color: colors.text }} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Schedule</Text>
              {hasConflicts && (
                <View style={styles.headerConflictBadge}>
                  <Icon name="warning" size={16} style={{ color: colors.background }} />
                  <Text style={styles.headerConflictText}>{conflictSummary.total}</Text>
                </View>
              )}
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

          {/* Toast */}
          <Toast
            message={toast.message}
            type={toast.type}
            visible={toast.visible}
            onHide={hideToast}
          />

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
            selectedCleaners={selectedCleaners}
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
            setSelectedCleaners={setSelectedCleaners}
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
            onDelete={deleteEntry}
            onAddClient={addClient}
            onAddBuilding={addBuilding}
            onAddCleaner={addCleaner}
            onEditClient={editClient}
            onEditBuilding={editBuilding}
            onSwitchToEdit={() => {
              console.log('Switching to edit mode for entry:', selectedEntry?.id);
              console.log('Current form state before switch:', {
                cleanerName,
                selectedCleaners,
                hours,
                startTime
              });
              setModalType('edit');
            }}
          />

          <RecurringTaskModal
            visible={recurringTaskModalVisible}
            clientBuildings={clientBuildings || []}
            cleaners={cleaners || []}
            onClose={() => setRecurringTaskModalVisible(false)}
            onSave={handleSaveRecurringTask}
          />

          {/* Bulk Actions Bottom Sheet */}
          <BulkActionsBottomSheet
            bottomSheetRef={bulkActionsBottomSheetRef as any}
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
  headerWithConflicts: {
    borderBottomColor: colors.danger + '30',
    backgroundColor: colors.danger + '05',
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
  headerConflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
    gap: spacing.xs,
  },
  headerConflictText: {
    ...typography.small,
    color: colors.background,
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
  conflictWarningText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
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
  actionButtonWarning: {
    backgroundColor: colors.danger + '10',
    borderColor: colors.danger + '30',
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: colors.background,
  },
  actionButtonTextWarning: {
    color: colors.danger,
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
