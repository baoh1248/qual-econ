import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useScheduleData, type ScheduleEntry, getWeekIdFromDate as getWeekIdFromDateUtil } from '../../hooks/useScheduleData';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useTimeOffRequests } from '../../hooks/useTimeOffRequests';
import { supabase } from '../integrations/supabase/client';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import { enhancedStyles } from '../../styles/enhancedStyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import ScheduleModal from '../../components/schedule/ScheduleModal';
import ScheduleFiltersModal from '../../components/schedule/ScheduleFiltersModal';
import BuildingGroupScheduleModal from '../../components/schedule/BuildingGroupScheduleModal';
import ScheduleActionButton from '../../components/schedule/ScheduleActionButton';
import Toast from '../../components/Toast';
import ErrorBoundary from '../../components/ErrorBoundary';
import uuid from 'react-native-uuid';
import { Calendar } from 'react-native-calendars';
import Icon from '../../components/Icon';
import DragDropScheduleGrid from '../../components/schedule/DragDropScheduleGrid';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import IconButton from '../../components/IconButton';
import UnassignedShiftNotifications from '../../components/UnassignedShiftNotifications';
import ScheduleChangeNotifications from '../../components/schedule/ScheduleChangeNotifications';
import { projectToScheduleEntry, scheduleEntryExistsForProject } from '../../utils/projectScheduleSync';
import { formatTimeRange } from '../../utils/timeFormatter';
import { logShiftCreated, logShiftEdited, logShiftDeleted } from '../../utils/scheduleChangeLogger';
import type { RecurringShiftPattern } from '../../utils/recurringShiftGenerator';
import { 
  generateOccurrences, 
  patternToScheduleEntries, 
  isPatternActive,
  needsGeneration,
  formatPatternDescription,
  validateRecurringPattern
} from '../../utils/recurringShiftGenerator';

// Add TypeScript declaration for debug window object
declare global {
  interface Window {
    DEBUG_LAST_SAVE?: any;
  }
}

type ModalType = 'add' | 'edit' | 'addClient' | 'addBuilding' | 'addCleaner' | 'editClient' | 'editBuilding' | 'details' | null;
type ViewType = 'daily' | 'weekly' | 'monthly';
type ScheduleViewMode = 'building' | 'user';

interface ScheduleFilters {
  shiftType: 'all' | 'project' | 'regular';
  clientName: string;
  buildingName: string;
  cleanerName: string;
  buildingGroupName: string;
  cleanerGroupName: string;
  status: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  highlight_color?: string;
}

interface CleanerGroup {
  id: string;
  group_name: string;
  description?: string;
  cleaner_ids: string[];
  highlight_color?: string;
}

export default function ScheduleView() {
  const { themeColor } = useTheme();
  const [viewType, setViewType] = useState<ViewType>('weekly');
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('building');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientBuilding, setSelectedClientBuilding] = useState<ClientBuilding | null>(null);
  const [isAddingFromGrid, setIsAddingFromGrid] = useState(false);
  const [cleanerName, setCleanerName] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [hours, setHours] = useState('');
  const [cleanerHours, setCleanerHours] = useState<{ [cleanerName: string]: string }>({});
  const [startTime, setStartTime] = useState('17:00');
  const [paymentType, setPaymentType] = useState<'hourly' | 'flat_rate'>('hourly');
  const [flatRateAmount, setFlatRateAmount] = useState('100');
  const [newClientName, setNewClientName] = useState('');
  const [newClientSecurity, setNewClientSecurity] = useState('');
  const [newClientSecurityLevel, setNewClientSecurityLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingSecurity, setNewBuildingSecurity] = useState('');
  const [newBuildingSecurityLevel, setNewBuildingSecurityLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [selectedClientForBuilding, setSelectedClientForBuilding] = useState('');
  const [newCleanerName, setNewCleanerName] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showCleanerDropdown, setShowCleanerDropdown] = useState(false);
  const [showSecurityLevelDropdown, setShowSecurityLevelDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<ScheduleEntry[]>([]);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [buildingGroupModalVisible, setBuildingGroupModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [buildingGroups, setBuildingGroups] = useState<BuildingGroup[]>([]);
  const [cleanerGroups, setCleanerGroups] = useState<CleanerGroup[]>([]);
  const [scheduleKey, setScheduleKey] = useState(0);
  
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showChangeNotifications, setShowChangeNotifications] = useState(false);
  const [filters, setFilters] = useState<ScheduleFilters>({
    shiftType: 'all',
    clientName: '',
    buildingName: '',
    cleanerName: '',
    buildingGroupName: '',
    cleanerGroupName: '',
    status: 'all',
  });

  // Use refs to prevent unnecessary re-renders
  const loadingInProgressRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);

  const { showToast } = useToast();
  const { executeQuery } = useDatabase();
  const { clients, clientBuildings, cleaners, refreshData, addClient, addClientBuilding, addCleaner, updateClient, updateClientBuilding } = useClientData();
  const { fetchApprovedTimeOff, timeOffRequests, getTimeOffForDate } = useTimeOffRequests();

  // NEW SIMPLIFIED SCHEDULE HOOK - Supabase is the single source of truth
  const {
    entries: scheduleEntries,
    isLoading: isScheduleLoading,
    isSaving: isSyncing,
    error: scheduleError,
    version: scheduleVersion,
    fetchWeekSchedule,
    addEntry: addScheduleEntry,
    updateEntry: updateScheduleEntry,
    deleteEntry: deleteScheduleEntry,
    refresh: refreshSchedule,
    getCurrentWeekId,
    getWeekIdFromDate,
  } = useScheduleData();

  const currentWeekId = useMemo(() => {
    return getWeekIdFromDate(currentDate);
  }, [currentDate, getWeekIdFromDate]);

  // Fetch approved time off for the current week
  useEffect(() => {
    const fetchTimeOff = async () => {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      await fetchApprovedTimeOff(
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );
    };

    fetchTimeOff();
  }, [currentDate, fetchApprovedTimeOff]);

  // Initialize cleanerHours when selectedCleaners changes
  useEffect(() => {
    setCleanerHours(prevCleanerHours => {
      const newCleanerHours: { [cleanerName: string]: string } = {};
      for (const cleanerName of selectedCleaners) {
        // Keep existing hours if cleaner was already selected, otherwise default to 3
        newCleanerHours[cleanerName] = prevCleanerHours[cleanerName] || '3';
      }
      return newCleanerHours;
    });
  }, [selectedCleaners]);

  // Realtime sync with proper error handling and UI refresh
  const { isConnected, lastSyncTime } = useRealtimeSync({
    enabled: true,
    onSyncComplete: useCallback(async () => {
      console.log('✅ Realtime sync completed - refreshing from Supabase');

      try {
        // Simply refetch from Supabase - it's our single source of truth
        const weekId = getWeekIdFromDate(currentDate);
        const freshEntries = await fetchWeekSchedule(weekId);
        setCurrentWeekSchedule(freshEntries);
        setScheduleKey(prev => prev + 1);
        console.log('✅ UI refreshed with', freshEntries.length, 'entries after realtime sync');
      } catch (error) {
        console.error('❌ Error refreshing UI after sync:', error);
      }
    }, [currentDate, getWeekIdFromDate, fetchWeekSchedule]),
    onError: useCallback((error) => {
      console.error('❌ Realtime sync error:', error);
      showToast('Sync error - changes may not be reflected on other devices', 'error');
    }, [showToast]),
  });

  const syncProjectsToSchedule = useCallback(async () => {
    try {
      console.log('=== AUTO-SYNCING PROJECTS TO SCHEDULE ===');

      const projects = await executeQuery<{
        id: string;
        client_name: string;
        building_name?: string;
        project_name: string;
        frequency: string;
        next_scheduled_date?: string;
        status: string;
      }>('select', 'client_projects');

      console.log('Loaded projects:', projects.length);

      const scheduledProjects = projects.filter(p =>
        p.next_scheduled_date &&
        p.status === 'active'
      );

      console.log('Projects with scheduled dates:', scheduledProjects.length);

      // Use currentWeekSchedule which holds current entries
      const currentSchedule = currentWeekSchedule;

      let addedCount = 0;

      for (const project of scheduledProjects) {
        if (!scheduleEntryExistsForProject(currentSchedule, project as any)) {
          const scheduleEntry = projectToScheduleEntry(project as any);

          if (scheduleEntry) {
            const entryWithId = {
              ...scheduleEntry,
              id: uuid.v4() as string,
              weekId: currentWeekId,
            };

            console.log('Adding schedule entry for project:', project.project_name);
            await addScheduleEntry(entryWithId as ScheduleEntry);

            addedCount++;
          }
        }
      }

      console.log('✓ Auto-synced', addedCount, 'projects to schedule');

      if (addedCount > 0) {
        showToast(`Auto-added ${addedCount} scheduled project${addedCount > 1 ? 's' : ''}`, 'success');
      }

      return addedCount;
    } catch (error) {
      console.error('Error syncing projects to schedule:', error);
      return 0;
    }
  }, [executeQuery, currentWeekSchedule, currentWeekId, addScheduleEntry, showToast]);

  // Generate shifts for a SINGLE specific pattern only
  const generateShiftsForPattern = useCallback(async (patternId: string) => {
    try {
      console.log('=== GENERATING SHIFTS FOR PATTERN:', patternId, '===');

      // Fetch just this one pattern
      const { data: patternData, error: fetchError } = await supabase
        .from('recurring_shifts')
        .select('*')
        .eq('id', patternId)
        .single();

      if (fetchError || !patternData) {
        console.error('Error fetching pattern:', fetchError);
        return 0;
      }

      const pattern: RecurringShiftPattern = {
        id: patternData.id,
        building_id: patternData.building_id,
        building_name: patternData.building_name,
        client_name: patternData.client_name,
        cleaner_names: patternData.cleaner_names || [],
        cleaner_ids: patternData.cleaner_ids || [],
        hours: patternData.hours,
        start_time: patternData.start_time,
        notes: patternData.notes,
        pattern_type: patternData.pattern_type,
        interval: patternData.interval,
        days_of_week: patternData.days_of_week,
        day_of_month: patternData.day_of_month,
        custom_days: patternData.custom_days,
        start_date: patternData.start_date,
        end_date: patternData.end_date,
        max_occurrences: patternData.max_occurrences,
        is_active: patternData.is_active,
        last_generated_date: patternData.last_generated_date,
        next_occurrence_date: patternData.next_occurrence_date,
        occurrence_count: patternData.occurrence_count,
        payment_type: patternData.payment_type,
        flat_rate_amount: patternData.flat_rate_amount,
        hourly_rate: patternData.hourly_rate,
      };

      console.log('Pattern loaded:', pattern);

      // Validate pattern
      const validation = validateRecurringPattern(pattern);
      if (!validation.valid) {
        console.warn(`⚠️ Invalid pattern ${pattern.id}:`, validation.errors);
        return 0;
      }

      // Generate occurrences for next 8 weeks
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 56); // 8 weeks
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const startDate = pattern.start_date; // Always start from pattern start date for new patterns
      const occurrences = generateOccurrences(pattern, startDate, futureDateStr, 100);
      console.log('Generated', occurrences.length, 'occurrences');

      const entries = patternToScheduleEntries(pattern, occurrences, getWeekIdFromDate);
      console.log('Created', entries.length, 'schedule entries');

      let totalGenerated = 0;

      for (const entry of entries) {
        try {
          // Check if entry already exists
          const { data: existingEntries, error: checkError } = await supabase
            .from('schedule_entries')
            .select('id')
            .eq('recurring_id', pattern.id)
            .eq('date', entry.date)
            .eq('building_name', entry.buildingName)
            .limit(1);

          if (checkError) {
            console.error('Error checking existing entry:', checkError);
            continue;
          }

          const exists = existingEntries && existingEntries.length > 0;

          if (!exists) {
            await addScheduleEntry(entry);
            totalGenerated++;
          }
        } catch (entryError) {
          console.error(`❌ Error adding entry for ${entry.date}:`, entryError);
        }
      }

      // Update pattern metadata
      await executeQuery('update', 'recurring_shifts', {
        id: pattern.id,
        last_generated_date: futureDateStr,
        occurrence_count: (pattern.occurrence_count || 0) + occurrences.length,
        next_occurrence_date: occurrences.length > 0 ? occurrences[occurrences.length - 1].date : pattern.next_occurrence_date,
      });

      console.log('✅ Generated', totalGenerated, 'new shift entries for pattern', pattern.id);
      return totalGenerated;
    } catch (error) {
      console.error('❌ Error generating shifts for pattern:', error);
      return 0;
    }
  }, [executeQuery, getWeekIdFromDate, addScheduleEntry]);

  const generateRecurringShifts = useCallback(async () => {
    try {
      console.log('=== GENERATING RECURRING SHIFTS ===');

      const patterns = await executeQuery<RecurringShiftPattern>('select', 'recurring_shifts');
      console.log('Loaded recurring patterns:', patterns.length);

      const activePatterns = patterns.filter(p => p.is_active && isPatternActive(p));
      console.log('Active patterns:', activePatterns.length);

      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 28);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      let totalGenerated = 0;
      const updatePromises: Promise<any>[] = [];

      for (const pattern of activePatterns) {
        const validation = validateRecurringPattern(pattern);
        if (!validation.valid) {
          console.warn(`⚠️ Invalid pattern ${pattern.id}:`, validation.errors);
          continue;
        }

        if (!needsGeneration(pattern, 4)) {
          console.log('Pattern does not need generation:', pattern.id);
          continue;
        }

        const startDate = pattern.last_generated_date || pattern.start_date;
        const occurrences = generateOccurrences(pattern, startDate, futureDateStr, 50);
        const entries = patternToScheduleEntries(pattern, occurrences, getWeekIdFromDate);

        for (const entry of entries) {
          try {
            // Check if entry already exists in database (not just current week)
            const { data: existingEntries, error: checkError } = await supabase
              .from('schedule_entries')
              .select('id')
              .eq('recurring_id', pattern.id)
              .eq('date', entry.date)
              .eq('building_name', entry.buildingName)
              .limit(1);

            if (checkError) {
              console.error('Error checking existing entry:', checkError);
              continue;
            }

            const exists = existingEntries && existingEntries.length > 0;

            if (!exists) {
              // Use the new simplified addScheduleEntry - it handles everything
              await addScheduleEntry(entry);
              totalGenerated++;
            }
          } catch (entryError) {
            console.error(`❌ Error adding entry for ${entry.date}:`, entryError);
          }
        }

        updatePromises.push(
          executeQuery('update', 'recurring_shifts', {
            id: pattern.id,
            last_generated_date: futureDateStr,
            occurrence_count: (pattern.occurrence_count || 0) + occurrences.length,
            next_occurrence_date: occurrences.length > 0 ? occurrences[occurrences.length - 1].date : pattern.next_occurrence_date,
          })
        );
      }

      await Promise.all(updatePromises);

      console.log('✅ Generated', totalGenerated, 'recurring shift entries');

      if (totalGenerated > 0) {
        showToast(`Generated ${totalGenerated} recurring shift${totalGenerated > 1 ? 's' : ''}`, 'success');

        // Refresh from Supabase to get updated data
        const weekId = getWeekIdFromDate(currentDate);
        const freshEntries = await fetchWeekSchedule(weekId);
        setCurrentWeekSchedule(freshEntries);
        setScheduleKey(prev => prev + 1);
      }

      console.log('=== RECURRING SHIFT GENERATION COMPLETED ===\n');

      return totalGenerated;
    } catch (error) {
      console.error('❌ Error generating recurring shifts:', error);
      showToast('Failed to generate recurring shifts', 'error');
      return 0;
    }
  }, [executeQuery, getWeekIdFromDate, addScheduleEntry, showToast, fetchWeekSchedule, currentDate]);
  
  const loadCurrentWeekSchedule = useCallback(async () => {
    if (loadingInProgressRef.current) {
      console.log('⏸️ Load already in progress, skipping...');
      return;
    }

    try {
      loadingInProgressRef.current = true;
      console.log('🔄 Loading current week schedule...');

      const weekId = getWeekIdFromDate(currentDate);

      // Fetch directly from Supabase - it's our single source of truth
      const schedule = await fetchWeekSchedule(weekId);
      setCurrentWeekSchedule(schedule);
      console.log('✅ Loaded schedule for week', weekId, ':', schedule.length, 'entries');

      if (!initialLoadCompleteRef.current) {
        // Run initial sync tasks after loading schedule
        await syncProjectsToSchedule();
        // DON'T auto-generate recurring shifts on load - only generate when pattern is created
        // This prevents old deleted patterns from regenerating
        initialLoadCompleteRef.current = true;
      }
    } catch (error) {
      console.error('❌ Error loading schedule:', error);
      showToast('Failed to load schedule', 'error');
    } finally {
      loadingInProgressRef.current = false;
    }
  }, [currentDate, fetchWeekSchedule, getWeekIdFromDate, showToast, syncProjectsToSchedule, generateRecurringShifts]);

  const loadBuildingGroups = useCallback(async () => {
    try {
      console.log('🔄 Loading building groups...');
      setIsLoadingGroups(true);
      
      const [groupsResult, membersResult] = await Promise.all([
        supabase
          .from('building_groups')
          .select('*')
          .order('group_name', { ascending: true }),
        supabase
          .from('building_group_members')
          .select('*')
      ]);

      if (groupsResult.error) {
        console.error('❌ Error loading building groups:', groupsResult.error);
        throw groupsResult.error;
      }

      if (membersResult.error) {
        console.error('❌ Error loading building group members:', membersResult.error);
        throw membersResult.error;
      }

      const groupsData = groupsResult.data || [];
      const membersData = membersResult.data || [];

      console.log(`📦 Loaded ${groupsData.length} building groups and ${membersData.length} members`);

      if (groupsData.length === 0) {
        console.log('ℹ️ No building groups found');
        setBuildingGroups([]);
        return;
      }

      const membersByGroup = new Map<string, string[]>();
      membersData.forEach(member => {
        const existing = membersByGroup.get(member.group_id) || [];
        existing.push(member.building_id);
        membersByGroup.set(member.group_id, existing);
      });

      const groupsWithMembers: BuildingGroup[] = groupsData.map(group => ({
        id: group.id,
        client_name: group.client_name,
        group_name: group.group_name,
        description: group.description,
        building_ids: membersByGroup.get(group.id) || [],
        highlight_color: group.highlight_color || '#3B82F6',
      }));

      console.log(`✅ Successfully loaded ${groupsWithMembers.length} building groups with members`);
      setBuildingGroups(groupsWithMembers);
    } catch (error) {
      console.error('❌ Failed to load building groups:', error);
      setBuildingGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  const loadCleanerGroups = useCallback(async () => {
    try {
      console.log('🔄 Loading cleaner groups...');
      
      const [groupsResult, membersResult] = await Promise.all([
        supabase
          .from('cleaner_groups')
          .select('*')
          .order('group_name', { ascending: true }),
        supabase
          .from('cleaner_group_members')
          .select('*')
      ]);

      if (groupsResult.error) {
        console.error('❌ Error loading cleaner groups:', groupsResult.error);
        throw groupsResult.error;
      }

      if (membersResult.error) {
        console.error('❌ Error loading cleaner group members:', membersResult.error);
        throw membersResult.error;
      }

      const groupsData = groupsResult.data || [];
      const membersData = membersResult.data || [];

      console.log(`📦 Loaded ${groupsData.length} cleaner groups and ${membersData.length} members`);

      if (groupsData.length === 0) {
        console.log('ℹ️ No cleaner groups found');
        setCleanerGroups([]);
        return;
      }

      const membersByGroup = new Map<string, string[]>();
      membersData.forEach(member => {
        const existing = membersByGroup.get(member.group_id) || [];
        existing.push(member.cleaner_id);
        membersByGroup.set(member.group_id, existing);
      });

      const groupsWithMembers: CleanerGroup[] = groupsData.map(group => ({
        id: group.id,
        group_name: group.group_name,
        description: group.description,
        cleaner_ids: membersByGroup.get(group.id) || [],
        highlight_color: group.highlight_color || '#3B82F6',
      }));

      console.log(`✅ Successfully loaded ${groupsWithMembers.length} cleaner groups with members`);
      setCleanerGroups(groupsWithMembers);
    } catch (error) {
      console.error('❌ Failed to load cleaner groups:', error);
      setCleanerGroups([]);
    }
  }, []);

  const uniqueBuildingGroupNames = useMemo(() => {
    return Array.from(new Set(buildingGroups.map(group => group.group_name))).sort();
  }, [buildingGroups]);

  const uniqueCleanerGroupNames = useMemo(() => {
    return Array.from(new Set(cleanerGroups.map(group => group.group_name))).sort();
  }, [cleanerGroups]);

  const uniqueClientNames = useMemo(() => {
    return Array.from(new Set(currentWeekSchedule.map(entry => entry.clientName))).sort();
  }, [currentWeekSchedule]);

  const uniqueBuildingNames = useMemo(() => {
    let entries = currentWeekSchedule;
    if (filters.clientName) {
      entries = entries.filter(entry => entry.clientName === filters.clientName);
    }
    return Array.from(new Set(entries.map(entry => entry.buildingName))).sort();
  }, [currentWeekSchedule, filters.clientName]);

  const uniqueCleanerNames = useMemo(() => {
    const names = new Set<string>();
    currentWeekSchedule.forEach(entry => {
      if (entry.cleanerNames) {
        entry.cleanerNames.forEach(name => names.add(name));
      } else {
        names.add(entry.cleanerName);
      }
    });
    return Array.from(names).sort();
  }, [currentWeekSchedule]);

  // Merge time off entries with schedule
  const scheduleWithTimeOff = useMemo(() => {
    const timeOffEntries: ScheduleEntry[] = [];

    // Ensure timeOffRequests is defined
    if (!timeOffRequests || timeOffRequests.length === 0) {
      return currentWeekSchedule;
    }

    // Transform approved time off requests into schedule-like entries
    timeOffRequests.forEach(request => {
      const dates: string[] = [];

      // Collect all dates for this time off request
      if (request.request_type === 'single_shift' && request.shift_date) {
        dates.push(request.shift_date);
      } else if (request.request_type === 'date_range' && request.start_date && request.end_date) {
        const start = new Date(request.start_date);
        const end = new Date(request.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      } else if (request.request_type === 'recurring_instances' && request.requested_dates) {
        dates.push(...request.requested_dates);
      }

      // Create a time off entry for each date
      dates.forEach(date => {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as any;

        timeOffEntries.push({
          id: `timeoff-${request.id}-${date}`,
          clientName: '⛱️ Time Off',
          buildingName: request.cleaner_name,
          cleanerName: request.cleaner_name,
          cleanerNames: [request.cleaner_name],
          hours: 0,
          day: dayOfWeek,
          date: date,
          status: 'scheduled',
          weekId: getWeekIdFromDate(dateObj),
          notes: `Time off: ${request.reason}`,
          // Mark this as a time off entry so we can style it differently
          isTimeOff: true,
        } as ScheduleEntry & { isTimeOff?: boolean });
      });
    });

    return [...currentWeekSchedule, ...timeOffEntries];
  }, [currentWeekSchedule, timeOffRequests, getWeekIdFromDate]);

  const filteredSchedule = useMemo(() => {
    console.log('🔍 Filtering schedule with filters:', filters);

    if (filters.shiftType === 'all' &&
        !filters.clientName.trim() &&
        !filters.buildingName.trim() &&
        !filters.cleanerName.trim() &&
        !filters.buildingGroupName.trim() &&
        !filters.cleanerGroupName.trim() &&
        filters.status === 'all') {
      console.log('✅ No filters applied, returning all schedule entries (including time off)');
      return scheduleWithTimeOff;
    }

    let filtered = scheduleWithTimeOff;

    if (filters.shiftType !== 'all') {
      filtered = filtered.filter(entry => 
        filters.shiftType === 'project' ? entry.isProject === true : !entry.isProject
      );
      console.log(`🔍 After shift type filter: ${filtered.length} entries`);
    }

    if (filters.clientName.trim()) {
      const clientNameLower = filters.clientName.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.clientName.toLowerCase().includes(clientNameLower)
      );
      console.log(`🔍 After client filter: ${filtered.length} entries`);
    }

    if (filters.buildingName.trim()) {
      const buildingNameLower = filters.buildingName.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.buildingName.toLowerCase().includes(buildingNameLower)
      );
      console.log(`🔍 After building filter: ${filtered.length} entries`);
    }

    if (filters.cleanerName.trim()) {
      const cleanerNameLower = filters.cleanerName.toLowerCase();
      filtered = filtered.filter(entry => {
        const cleanerNames = entry.cleanerNames || [entry.cleanerName];
        return cleanerNames.some(name => 
          name.toLowerCase().includes(cleanerNameLower)
        );
      });
      console.log(`🔍 After cleaner filter: ${filtered.length} entries`);
    }

    if (filters.buildingGroupName.trim()) {
      const selectedGroup = buildingGroups.find(g => 
        g.group_name.toLowerCase().includes(filters.buildingGroupName.toLowerCase())
      );
      
      if (selectedGroup) {
        const groupBuildingIds = new Set(selectedGroup.building_ids);
        const groupBuildingNames = new Set(
          clientBuildings
            .filter(b => groupBuildingIds.has(b.id))
            .map(b => b.buildingName)
        );
        
        filtered = filtered.filter(entry => 
          groupBuildingNames.has(entry.buildingName)
        );
        console.log(`🔍 After building group filter: ${filtered.length} entries`);
      }
    }

    if (filters.cleanerGroupName.trim()) {
      const selectedGroup = cleanerGroups.find(g => 
        g.group_name.toLowerCase().includes(filters.cleanerGroupName.toLowerCase())
      );
      
      if (selectedGroup) {
        const groupCleanerIds = new Set(selectedGroup.cleaner_ids);
        const groupCleanerNames = new Set(
          cleaners
            .filter(c => groupCleanerIds.has(c.id))
            .map(c => c.name)
        );
        
        filtered = filtered.filter(entry => {
          const entryCleanerNames = entry.cleanerNames || [entry.cleanerName];
          return entryCleanerNames.some(name => groupCleanerNames.has(name));
        });
        console.log(`🔍 After cleaner group filter: ${filtered.length} entries`);
      }
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(entry => entry.status === filters.status);
      console.log(`🔍 After status filter: ${filtered.length} entries`);
    }

    console.log(`✅ Final filtered schedule: ${filtered.length} entries`);
    return filtered;
  }, [scheduleWithTimeOff, filters, buildingGroups, clientBuildings, cleanerGroups, cleaners]);

  const filteredClientBuildings = useMemo(() => {
    console.log('🔍 Filtering client buildings based on schedule entries');
    
    if (filters.shiftType === 'all' &&
        !filters.clientName.trim() &&
        !filters.buildingName.trim() &&
        !filters.cleanerName.trim() &&
        !filters.buildingGroupName.trim() &&
        !filters.cleanerGroupName.trim() &&
        filters.status === 'all') {
      console.log('✅ No filters applied, returning all buildings');
      return clientBuildings;
    }

    const buildingNamesWithSchedule = new Set(
      filteredSchedule.map(entry => entry.buildingName)
    );

    console.log(`🔍 Buildings with matching schedule entries: ${buildingNamesWithSchedule.size}`);

    const filtered = clientBuildings.filter(building => 
      buildingNamesWithSchedule.has(building.buildingName)
    );

    console.log(`✅ Filtered buildings: ${filtered.length} out of ${clientBuildings.length}`);
    return filtered;
  }, [clientBuildings, filteredSchedule, filters]);

  const filteredClients = useMemo(() => {
    console.log('🔍 Filtering clients based on filtered buildings');
    
    if (filters.shiftType === 'all' &&
        !filters.clientName.trim() &&
        !filters.buildingName.trim() &&
        !filters.cleanerName.trim() &&
        !filters.buildingGroupName.trim() &&
        !filters.cleanerGroupName.trim() &&
        filters.status === 'all') {
      console.log('✅ No filters applied, returning all clients');
      return clients;
    }

    const clientNamesWithBuildings = new Set(
      filteredClientBuildings.map(building => building.clientName)
    );

    console.log(`🔍 Clients with matching buildings: ${clientNamesWithBuildings.size}`);

    const filtered = clients.filter(client => 
      clientNamesWithBuildings.has(client.name)
    );

    console.log(`✅ Filtered clients: ${filtered.length} out of ${clients.length}`);
    return filtered;
  }, [clients, filteredClientBuildings, filters]);

  const hasActiveFilters = useMemo(() => {
    return filters.shiftType !== 'all' ||
           filters.clientName.trim() !== '' ||
           filters.buildingName.trim() !== '' ||
           filters.cleanerName.trim() !== '' ||
           filters.buildingGroupName.trim() !== '' ||
           filters.cleanerGroupName.trim() !== '' ||
           filters.status !== 'all';
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.shiftType !== 'all') count++;
    if (filters.clientName.trim() !== '') count++;
    if (filters.buildingName.trim() !== '') count++;
    if (filters.cleanerName.trim() !== '') count++;
    if (filters.buildingGroupName.trim() !== '') count++;
    if (filters.cleanerGroupName.trim() !== '') count++;
    if (filters.status !== 'all') count++;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      shiftType: 'all',
      clientName: '',
      buildingName: '',
      cleanerName: '',
      buildingGroupName: '',
      cleanerGroupName: '',
      status: 'all',
    });
  }, []);

  const getClientCount = useCallback((clientName: string) => {
    if (!clientName) return currentWeekSchedule.length;
    return currentWeekSchedule.filter(entry => entry.clientName === clientName).length;
  }, [currentWeekSchedule]);

  const getBuildingCount = useCallback((buildingName: string) => {
    if (!buildingName) return uniqueBuildingNames.length;
    return currentWeekSchedule.filter(entry => entry.buildingName === buildingName).length;
  }, [currentWeekSchedule, uniqueBuildingNames]);

  const getCleanerCount = useCallback((cleanerName: string) => {
    if (!cleanerName) return currentWeekSchedule.length;
    return currentWeekSchedule.filter(entry => {
      const cleanerNames = entry.cleanerNames || [entry.cleanerName];
      return cleanerNames.includes(cleanerName);
    }).length;
  }, [currentWeekSchedule]);

  const getBuildingGroupCount = useCallback((groupName: string) => {
    if (!groupName) return buildingGroups.length;
    const group = buildingGroups.find(g => g.group_name === groupName);
    if (!group) return 0;
    
    const groupBuildingNames = clientBuildings
      .filter(b => group.building_ids.includes(b.id))
      .map(b => b.buildingName);
    
    return currentWeekSchedule.filter(entry => 
      groupBuildingNames.includes(entry.buildingName)
    ).length;
  }, [buildingGroups, clientBuildings, currentWeekSchedule]);

  const getCleanerGroupCount = useCallback((groupName: string) => {
    if (!groupName) return cleanerGroups.length;
    const group = cleanerGroups.find(g => g.group_name === groupName);
    if (!group) return 0;
    
    const groupCleanerNames = cleaners
      .filter(c => group.cleaner_ids.includes(c.id))
      .map(c => c.name);
    
    return currentWeekSchedule.filter(entry => {
      const entryCleanerNames = entry.cleanerNames || [entry.cleanerName];
      return entryCleanerNames.some(name => groupCleanerNames.includes(name));
    }).length;
  }, [cleanerGroups, cleaners, currentWeekSchedule]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log('🔄 Initial data load starting...');
        await Promise.all([
          loadBuildingGroups(),
          loadCleanerGroups()
        ]);
        console.log('✅ Initial data load completed, now loading schedule...');
        await loadCurrentWeekSchedule();
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        showToast('Failed to load schedule data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && initialLoadCompleteRef.current) {
      console.log('🔄 Date changed, reloading schedule for new week');
      loadCurrentWeekSchedule();
    }
  }, [currentDate, isLoading]);

  useFocusEffect(
    useCallback(() => {
      console.log('📱 Schedule screen focused - refreshing data');
      
      if (initialLoadCompleteRef.current && !isLoading) {
        console.log('🔄 Refreshing schedule on focus...');
        loadCurrentWeekSchedule();
      }
      
      return () => {
        console.log('📱 Schedule screen unfocused');
      };
    }, [loadCurrentWeekSchedule, isLoading])
  );

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
    if (viewType === 'daily') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } else if (viewType === 'weekly') {
      // Calculate Monday as start of week (not Sunday)
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = currentDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(currentDate.getDate() + diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const isViewingCurrentPeriod = () => {
    const today = new Date();
    if (viewType === 'daily') {
      return currentDate.toDateString() === today.toDateString();
    } else if (viewType === 'weekly') {
      // Calculate Monday as start of week (not Sunday)
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = currentDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(currentDate.getDate() + diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return today >= startOfWeek && today <= endOfWeek;
    } else {
      return currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  };

  const addHoursToTime = useCallback((time: string, hours: number): string => {
    const [hoursStr, minutesStr] = time.split(':');
    const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + hours * 60;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }, []);

  const handleCellPress = useCallback((building: ClientBuilding, day: string) => {
    console.log('Cell pressed - Auto-filling client and building:', building.buildingName, building.clientName, day);
    setSelectedClientBuilding(building);
    setSelectedDay(day);
    setSelectedCleaners([]);
    setHours('');
    setStartTime('17:00');
    setIsAddingFromGrid(true);
    setModalType('add');
    setModalVisible(true);
  }, []);

  const handleCellLongPress = useCallback((building: ClientBuilding, day: string) => {
    console.log('Cell long pressed:', building.buildingName, day);
  }, []);

  const handleClientLongPress = useCallback((client: Client) => {
    console.log('Client long pressed:', client.name);
    setSelectedClient(client);
    setNewClientName(client.name);
    setNewClientSecurity(client.securityInfo || '');
    setNewClientSecurityLevel(client.securityLevel);
    setModalType('editClient');
    setModalVisible(true);
  }, []);

  const handleBuildingLongPress = useCallback((building: ClientBuilding) => {
    console.log('Building long pressed:', building.buildingName);
    setSelectedClientBuilding(building);
    setNewBuildingName(building.buildingName);
    setNewBuildingSecurity(building.securityInfo || '');
    setNewBuildingSecurityLevel(building.securityLevel);
    setModalType('editBuilding');
    setModalVisible(true);
  }, []);

  const handleMoveEntry = useCallback((entryId: string, newBuilding: ClientBuilding, newDay: string) => {
    console.log('Move entry:', entryId, 'to', newBuilding.buildingName, newDay);
  }, []);

  const handleBulkSelect = useCallback((entries: ScheduleEntry[]) => {
    console.log('Bulk select:', entries.length, 'entries');
  }, []);

  const handleAddShiftToCleaner = useCallback((cleaner: Cleaner, day: string) => {
    console.log('Add shift to cleaner:', cleaner.name, day);
    setSelectedCleaners([cleaner.name]);
    setSelectedDay(day);
    setHours('');
    setStartTime('17:00');
    setIsAddingFromGrid(false);
    setModalType('add');
    setModalVisible(true);
  }, []);

  const handleTaskPress = useCallback((entry: ScheduleEntry) => {
    console.log('Task pressed:', entry.id);
    setSelectedEntry(entry);
    setSelectedClientBuilding(clientBuildings.find(b => b.buildingName === entry.buildingName) || null);
    setSelectedCleaners(entry.cleanerNames || [entry.cleanerName]);
    setHours(entry.hours.toString());
    setStartTime(entry.startTime || '09:00');
    setPaymentType(entry.paymentType || 'hourly');
    setFlatRateAmount(entry.flatRateAmount?.toString() || '100');
    setSelectedDay(entry.day);
    setIsAddingFromGrid(false);
    setModalType('details');
    setModalVisible(true);
  }, [clientBuildings]);

  const handleModalClose = useCallback(() => {
    console.log('Closing modal');
    setModalVisible(false);
    setModalType(null);
    setSelectedEntry(null);
    setSelectedClient(null);
    setSelectedClientBuilding(null);
    setIsAddingFromGrid(false);
    setCleanerName('');
    setSelectedCleaners([]);
    setHours('');
    setStartTime('17:00');
    setPaymentType('hourly');
    setFlatRateAmount('100');
    // Don't reset selectedDay here - let it persist for proper key prop behavior
    setNewClientName('');
    setNewClientSecurity('');
    setNewClientSecurityLevel('low');
    setNewBuildingName('');
    setNewBuildingSecurity('');
    setNewBuildingSecurityLevel('low');
    setSelectedClientForBuilding('');
    setNewCleanerName('');
    setShowClientDropdown(false);
    setShowCleanerDropdown(false);
    setShowSecurityLevelDropdown(false);
    setShowBuildingDropdown(false);
  }, []);

  const handleOpenRecurringModal = useCallback(() => {
    console.log('Opening recurring task modal from schedule modal');
    setModalVisible(false);
    setRecurringModalVisible(true);
  }, []);

  const handleModalSave = useCallback(async (editAllRecurring: boolean = false) => {
    console.log('=== SCHEDULE MODAL SAVE HANDLER (SIMPLIFIED) ===');
    console.log('Edit all recurring:', editAllRecurring);

    try {
      if (modalType === 'add') {
        // Validation
        if (!selectedClientBuilding) {
          showToast('Please select a building', 'error');
          return;
        }
        if (selectedCleaners.length === 0) {
          showToast('Please select at least one cleaner', 'error');
          return;
        }
        // Validate that all selected cleaners have hours assigned
        const hasAllCleanerHours = selectedCleaners.every(cleanerName => {
          const cleanerHoursValue = cleanerHours[cleanerName];
          return cleanerHoursValue && parseFloat(cleanerHoursValue) > 0;
        });
        if (!hasAllCleanerHours) {
          showToast('Please assign hours for all selected cleaners', 'error');
          return;
        }
        if (!selectedDay || !selectedDay.trim()) {
          showToast('Please select a day', 'error');
          return;
        }

        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        if (!validDays.includes(selectedDay.toLowerCase())) {
          showToast('Invalid day selected', 'error');
          return;
        }

        // Calculate entry date and hours
        // Convert cleanerHours to a clean object with number values
        const cleanerHoursObj: { [cleanerName: string]: number } = {};
        let totalHours = 0;
        let maxHours = 0;
        for (const cleanerName of selectedCleaners) {
          const hoursValue = parseFloat(cleanerHours[cleanerName] || '8');
          cleanerHoursObj[cleanerName] = hoursValue;
          totalHours += hoursValue;
          maxHours = Math.max(maxHours, hoursValue);
        }

        const endTime = addHoursToTime(startTime, maxHours);
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);

        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(selectedDay.toLowerCase());
        const entryDate = new Date(weekStart);
        entryDate.setDate(weekStart.getDate() + dayIndex);

        // Create the new entry
        const newEntry: ScheduleEntry = {
          id: uuid.v4() as string,
          clientName: selectedClientBuilding.clientName,
          buildingName: selectedClientBuilding.buildingName,
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          day: selectedDay.toLowerCase() as any,
          date: entryDate.toISOString().split('T')[0],
          hours: maxHours, // Use max hours for backward compatibility
          cleanerHours: cleanerHoursObj, // Individual hours per cleaner
          startTime,
          endTime,
          status: 'scheduled',
          weekId: currentWeekId,
          paymentType: paymentType,
          flatRateAmount: paymentType === 'flat_rate' ? parseFloat(flatRateAmount) : undefined,
          hourlyRate: paymentType === 'hourly' ? 15 : undefined,
          priority: 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log('📝 Adding new schedule entry:', newEntry.buildingName, newEntry.day);

        // Use the simplified hook - it handles Supabase save + refetch
        const savedEntry = await addScheduleEntry(newEntry);

        if (savedEntry) {
          console.log('✅ Entry saved successfully');
          showToast('Shift added successfully', 'success');

          // Log the shift creation
          try {
            console.log('📝 Attempting to log shift creation:', {
              client: savedEntry.clientName,
              building: savedEntry.buildingName,
              cleaners: savedEntry.cleanerNames || [savedEntry.cleanerName],
              date: savedEntry.date,
              hours: savedEntry.hours,
              id: savedEntry.id
            });

            await logShiftCreated({
              clientName: savedEntry.clientName,
              buildingName: savedEntry.buildingName,
              cleanerNames: savedEntry.cleanerNames || [savedEntry.cleanerName],
              shiftDate: savedEntry.date,
              hours: savedEntry.hours,
              shiftId: savedEntry.id,
            });

            console.log('✅ Shift creation logged successfully');
          } catch (logError: any) {
            console.error('❌ Failed to log shift creation:', logError);
            console.error('Error details:', logError.message, logError.code);
          }

          // Explicitly fetch fresh data to update UI
          const freshEntries = await fetchWeekSchedule(currentWeekId);
          setCurrentWeekSchedule(freshEntries);
          setScheduleKey(prev => prev + 1);
          console.log('✅ UI updated with', freshEntries.length, 'entries');
        } else {
          throw new Error('Failed to save entry');
        }

        handleModalClose();

      } else if (modalType === 'edit') {
        if (!selectedEntry) {
          showToast('No entry selected', 'error');
          return;
        }
        if (selectedCleaners.length === 0) {
          showToast('Please select at least one cleaner', 'error');
          return;
        }
        // Validate that all selected cleaners have hours assigned
        const hasAllCleanerHours = selectedCleaners.every(cleanerName => {
          const cleanerHoursValue = cleanerHours[cleanerName];
          return cleanerHoursValue && parseFloat(cleanerHoursValue) > 0;
        });
        if (!hasAllCleanerHours) {
          showToast('Please assign hours for all selected cleaners', 'error');
          return;
        }

        // Convert cleanerHours to a clean object with number values
        const cleanerHoursObj: { [cleanerName: string]: number } = {};
        let maxHours = 0;
        for (const cleanerName of selectedCleaners) {
          const hoursValue = parseFloat(cleanerHours[cleanerName] || '8');
          cleanerHoursObj[cleanerName] = hoursValue;
          maxHours = Math.max(maxHours, hoursValue);
        }

        const endTime = addHoursToTime(startTime, maxHours);

        const updates: Partial<ScheduleEntry> = {
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          hours: maxHours, // Use max hours for backward compatibility
          cleanerHours: cleanerHoursObj, // Individual hours per cleaner
          startTime,
          endTime,
          paymentType: paymentType,
          flatRateAmount: paymentType === 'flat_rate' ? parseFloat(flatRateAmount) : undefined,
          hourlyRate: paymentType === 'hourly' ? 15 : undefined,
        };

        // If edit all recurring is enabled, update ALL entries one by one
        if (editAllRecurring && selectedEntry.isRecurring && selectedEntry.recurringId) {
          try {
            // Fetch ALL entries with the same recurringId
            const { data: allRecurringEntries } = await supabase
              .from('schedule_entries')
              .select('id')
              .eq('recurring_id', selectedEntry.recurringId);

            if (allRecurringEntries && allRecurringEntries.length > 0) {
              let successCount = 0;

              // Update each entry one by one
              for (const entry of allRecurringEntries) {
                const { error: updateError } = await supabase
                  .from('schedule_entries')
                  .update({
                    cleaner_name: selectedCleaners[0],
                    cleaner_names: selectedCleaners,
                    hours: maxHours,
                    cleaner_hours: cleanerHoursObj,
                    start_time: startTime,
                    end_time: endTime,
                    payment_type: paymentType,
                    flat_rate_amount: paymentType === 'flat_rate' ? parseFloat(flatRateAmount) : 0,
                    hourly_rate: paymentType === 'hourly' ? 15 : 0,
                  })
                  .eq('id', entry.id);

                if (!updateError) {
                  successCount++;
                }
              }

              showToast(`Updated ${successCount} recurring shifts`, 'success');

              // Log the edit
              try {
                await logShiftEdited({
                  clientName: selectedEntry.clientName,
                  buildingName: selectedEntry.buildingName,
                  cleanerNames: selectedCleaners,
                  shiftDate: selectedEntry.date,
                  shiftId: selectedEntry.id,
                  changes: ['shift details updated'],
                });
              } catch {
                // Ignore logging errors
              }
            }
          } catch (recurringError) {
            showToast('Failed to update recurring shifts', 'error');
            return;
          }
        } else {
          // Single entry update
          const updatedEntry = await updateScheduleEntry(selectedEntry.id, updates);

          if (!updatedEntry) {
            throw new Error('Failed to update entry');
          }

          showToast('Shift updated successfully', 'success');

          // Log the edit
          try {
            await logShiftEdited({
              clientName: updatedEntry.clientName,
              buildingName: updatedEntry.buildingName,
              cleanerNames: updatedEntry.cleanerNames || [updatedEntry.cleanerName],
              shiftDate: updatedEntry.date,
              shiftId: updatedEntry.id,
              changes: ['shift details updated'],
            });
          } catch {
            // Ignore logging errors
          }
        }

        // Refresh the current week's data
        const freshEntries = await fetchWeekSchedule(currentWeekId);
        setCurrentWeekSchedule(freshEntries);
        setScheduleKey(prev => prev + 1);
        console.log('✅ UI updated with', freshEntries.length, 'entries');

        handleModalClose();
      }
    } catch (error) {
      console.error('❌ Error saving schedule entry:', error);
      showToast('Failed to save shift', 'error');
    }
  }, [modalType, selectedClientBuilding, selectedCleaners, hours, cleanerHours, startTime, selectedDay, currentDate, currentWeekId, selectedEntry, addScheduleEntry, updateScheduleEntry, fetchWeekSchedule, handleModalClose, showToast, addHoursToTime, paymentType, flatRateAmount]);

  // Helper function to refresh schedule after delete
  const refreshAfterDelete = useCallback(async (weekId: string) => {
    try {
      // Log the shift deletion
      try {
        if (selectedEntry) {
          console.log('📝 Attempting to log shift deletion:', {
            client: selectedEntry.clientName,
            building: selectedEntry.buildingName,
            cleaners: selectedEntry.cleanerNames || [selectedEntry.cleanerName],
            date: selectedEntry.date,
            id: selectedEntry.id
          });

          await logShiftDeleted({
            clientName: selectedEntry.clientName,
            buildingName: selectedEntry.buildingName,
            cleanerNames: selectedEntry.cleanerNames || [selectedEntry.cleanerName],
            shiftDate: selectedEntry.date,
            shiftId: selectedEntry.id,
          });

          console.log('✅ Shift deletion logged successfully');
        }
      } catch (logError: any) {
        console.error('❌ Failed to log shift deletion:', logError);
        console.error('Error details:', logError.message, logError.code);
      }

      // Refresh the schedule data
      const { data: freshData, error: fetchError } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('week_id', weekId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!fetchError && freshData) {
        // Convert database format to app format
        const freshEntries = freshData.map((row: any) => ({
          id: row.id,
          clientName: row.client_name || '',
          buildingName: row.building_name || '',
          cleanerName: row.cleaner_name || '',
          cleanerNames: row.cleaner_names || [],
          cleanerIds: row.cleaner_ids || [],
          hours: parseFloat(row.hours) || 0,
          cleanerHours: row.cleaner_hours || undefined,
          day: row.day || 'monday',
          date: row.date || '',
          startTime: row.start_time || null,
          endTime: row.end_time || null,
          status: row.status || 'scheduled',
          weekId: row.week_id || '',
          notes: row.notes || null,
          priority: row.priority || 'medium',
          isRecurring: row.is_recurring || false,
          recurringId: row.recurring_id || null,
          isProject: row.is_project || false,
          projectId: row.project_id || null,
          projectName: row.project_name || null,
          paymentType: row.payment_type || 'hourly',
          flatRateAmount: row.flat_rate_amount || 0,
          hourlyRate: row.hourly_rate || 15,
        })) as ScheduleEntry[];

        setCurrentWeekSchedule(freshEntries);
        setScheduleKey(prev => prev + 1);
      }

      handleModalClose();
    } catch (error) {
      console.error('Error refreshing after delete:', error);
    }
  }, [selectedEntry, handleModalClose]);

  const handleModalDelete = useCallback(async () => {
    if (!selectedEntry) {
      showToast('No shift selected', 'error');
      return;
    }

    // For web and mobile compatibility - just proceed with delete
    // The ScheduleModal already has its own confirmation dialog
    try {
      // Store values before deletion
      const entryId = selectedEntry.id;
      const entryWeekId = selectedEntry.weekId;
      const isRecurring = selectedEntry.isRecurring && selectedEntry.recurringId;

      // If this is a recurring shift, ask if they want to delete the entire pattern
      if (isRecurring) {
        Alert.alert(
          'Delete Recurring Shift',
          'Do you want to delete only this shift or the entire recurring pattern?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Just return without doing anything
                return;
              }
            },
            {
              text: 'Delete This Only',
              onPress: async () => {
                try {
                  // Delete just this shift
                  const { error: deleteError } = await supabase
                    .from('schedule_entries')
                    .delete()
                    .eq('id', entryId);

                  if (deleteError) {
                    throw deleteError;
                  }

                  showToast('Shift deleted', 'success');
                  await refreshAfterDelete(entryWeekId);
                } catch (error) {
                  console.error('Error deleting shift:', error);
                  showToast('Failed to delete shift', 'error');
                }
              }
            },
            {
              text: 'Delete All Future',
              style: 'destructive',
              onPress: async () => {
                try {
                  // Delete this shift and all future shifts in the pattern
                  const { error: deleteError } = await supabase
                    .from('schedule_entries')
                    .delete()
                    .eq('recurring_id', selectedEntry.recurringId!)
                    .gte('date', selectedEntry.date);

                  if (deleteError) {
                    throw deleteError;
                  }

                  // Mark the recurring pattern as inactive
                  await executeQuery('update', 'recurring_shifts', {
                    id: selectedEntry.recurringId!,
                    is_active: false,
                  });

                  showToast('All future recurring shifts deleted', 'success');
                  await refreshAfterDelete(entryWeekId);
                } catch (error) {
                  console.error('Error deleting recurring pattern:', error);
                  showToast('Failed to delete recurring pattern', 'error');
                }
              }
            }
          ]
        );
        return; // Exit early, the alert handlers will do the delete
      }

      // Non-recurring shift - just delete it
      const { error: deleteError } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('id', entryId);

      if (deleteError) {
        throw deleteError;
      }

      // Success! Show toast
      showToast('Shift deleted', 'success');

      // Refresh and close
      await refreshAfterDelete(entryWeekId);
    } catch (error: any) {
      showToast(error.message || 'Failed to delete shift', 'error');
    }
  }, [selectedEntry, executeQuery, refreshAfterDelete, showToast]);

  const handleAddClient = useCallback(async () => {
    console.log('Adding client:', newClientName);
    
    if (!newClientName.trim()) {
      showToast('Please enter a client name', 'error');
      return;
    }

    try {
      await addClient({
        name: newClientName.trim(),
        securityLevel: newClientSecurityLevel,
        securityInfo: newClientSecurity.trim(),
        isActive: true,
      });
      
      showToast('Client added successfully', 'success');
      await refreshData();
      handleModalClose();
    } catch (error) {
      console.error('Error adding client:', error);
      showToast('Failed to add client', 'error');
    }
  }, [newClientName, newClientSecurityLevel, newClientSecurity, addClient, refreshData, handleModalClose, showToast]);

  const handleAddBuilding = useCallback(async () => {
    console.log('Adding building:', newBuildingName);
    
    if (!selectedClientForBuilding) {
      showToast('Please select a client', 'error');
      return;
    }
    if (!newBuildingName.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    try {
      await addClientBuilding({
        clientName: selectedClientForBuilding,
        buildingName: newBuildingName.trim(),
        securityLevel: newBuildingSecurityLevel,
        securityInfo: newBuildingSecurity.trim(),
        priority: 'medium',
        isActive: true,
      });
      
      showToast('Building added successfully', 'success');
      await refreshData();
      handleModalClose();
    } catch (error) {
      console.error('Error adding building:', error);
      showToast('Failed to add building', 'error');
    }
  }, [selectedClientForBuilding, newBuildingName, newBuildingSecurityLevel, newBuildingSecurity, addClientBuilding, refreshData, handleModalClose, showToast]);

  const handleAddCleaner = useCallback(async () => {
    console.log('Adding cleaner:', newCleanerName);
    
    if (!newCleanerName.trim()) {
      showToast('Please enter a cleaner name', 'error');
      return;
    }

    try {
      await addCleaner({
        name: newCleanerName.trim(),
        securityLevel: 'low',
        isActive: true,
        defaultHourlyRate: 15,
      });
      
      showToast('Cleaner added successfully', 'success');
      await refreshData();
      handleModalClose();
    } catch (error) {
      console.error('Error adding cleaner:', error);
      showToast('Failed to add cleaner', 'error');
    }
  }, [newCleanerName, addCleaner, refreshData, handleModalClose, showToast]);

  const handleEditClient = useCallback(async () => {
    console.log('Editing client:', selectedClient);
    
    if (!selectedClient) {
      showToast('No client selected', 'error');
      return;
    }
    if (!newClientName.trim()) {
      showToast('Please enter a client name', 'error');
      return;
    }

    try {
      await updateClient(selectedClient.id, {
        name: newClientName.trim(),
        securityLevel: newClientSecurityLevel,
        securityInfo: newClientSecurity.trim(),
      });
      
      showToast('Client updated successfully', 'success');
      await refreshData();
      handleModalClose();
    } catch (error) {
      console.error('Error updating client:', error);
      showToast('Failed to update client', 'error');
    }
  }, [selectedClient, newClientName, newClientSecurityLevel, newClientSecurity, updateClient, refreshData, handleModalClose, showToast]);

  const handleEditBuilding = useCallback(async () => {
    console.log('Editing building:', selectedClientBuilding);
    
    if (!selectedClientBuilding) {
      showToast('No building selected', 'error');
      return;
    }
    if (!newBuildingName.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    try {
      await updateClientBuilding(selectedClientBuilding.id, {
        buildingName: newBuildingName.trim(),
        securityLevel: newBuildingSecurityLevel,
        securityInfo: newBuildingSecurity.trim(),
      });
      
      showToast('Building updated successfully', 'success');
      await refreshData();
      handleModalClose();
    } catch (error) {
      console.error('Error updating building:', error);
      showToast('Failed to update building', 'error');
    }
  }, [selectedClientBuilding, newBuildingName, newBuildingSecurityLevel, newBuildingSecurity, updateClientBuilding, refreshData, handleModalClose, showToast]);

  const handleSwitchToEdit = useCallback(() => {
    console.log('Switching to edit mode');
    if (selectedEntry) {
      const cleaners = selectedEntry.cleanerNames || [selectedEntry.cleanerName];
      setSelectedCleaners(cleaners);
      setHours(selectedEntry.hours.toString());
      setStartTime(selectedEntry.startTime || '09:00');

      // Initialize cleanerHours from entry or use default
      const initialCleanerHours: { [cleanerName: string]: string } = {};
      if (selectedEntry.cleanerHours) {
        // Use existing cleaner hours
        for (const cleanerName in selectedEntry.cleanerHours) {
          initialCleanerHours[cleanerName] = selectedEntry.cleanerHours[cleanerName].toString();
        }
      } else {
        // Initialize all cleaners with the same hours
        for (const cleanerName of cleaners) {
          initialCleanerHours[cleanerName] = selectedEntry.hours.toString();
        }
      }
      setCleanerHours(initialCleanerHours);

      setModalType('edit');
    }
  }, [selectedEntry]);

  const handleRecurringTaskSave = useCallback(async (taskData: any) => {
    console.log('=== RECURRING TASK SAVE HANDLER ===');
    console.log('Task data:', taskData);

    try {
      const patternId = `recurring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const recurringPattern: RecurringShiftPattern = {
        id: patternId,
        building_id: taskData.clientBuilding.id,
        building_name: taskData.clientBuilding.buildingName,
        client_name: taskData.clientBuilding.clientName,
        cleaner_names: taskData.cleanerNames || [taskData.cleanerName],
        hours: taskData.hours,
        start_time: taskData.startTime,
        notes: taskData.notes,
        pattern_type: taskData.pattern.type,
        interval: taskData.pattern.interval,
        days_of_week: taskData.pattern.daysOfWeek,
        day_of_month: taskData.pattern.dayOfMonth,
        custom_days: taskData.pattern.customDays,
        start_date: taskData.pattern.startDate || new Date().toISOString().split('T')[0],
        end_date: taskData.pattern.endDate,
        max_occurrences: taskData.pattern.maxOccurrences,
        is_active: true,
        payment_type: 'hourly',
        hourly_rate: 15,
      };

      console.log('📝 Inserting recurring pattern to database:', recurringPattern);

      // Insert the pattern directly
      await executeQuery('insert', 'recurring_shifts', recurringPattern);
      console.log('✅ Recurring pattern saved to database');

      // Generate shifts for ONLY this new pattern (not all patterns)
      console.log('🔄 Generating shifts from new pattern only...');
      const generatedCount = await generateShiftsForPattern(patternId);
      console.log('✅ Generated', generatedCount, 'shifts from new pattern');

      if (generatedCount > 0) {
        showToast(`Recurring shift created! Generated ${generatedCount} shifts`, 'success');
      } else {
        showToast('Recurring shift pattern created', 'success');
      }

      // Refresh schedule display
      console.log('🔄 Refreshing schedule display...');
      const freshEntries = await fetchWeekSchedule(currentWeekId);
      setCurrentWeekSchedule(freshEntries);
      setScheduleKey(prev => prev + 1);
      console.log('✅ Schedule display refreshed with', freshEntries.length, 'entries');

      setRecurringModalVisible(false);
    } catch (error) {
      console.error('❌ Error creating recurring task:', error);
      showToast('Failed to create recurring shift', 'error');
    }
  }, [executeQuery, generateShiftsForPattern, fetchWeekSchedule, currentWeekId, showToast]);

  const renderDailyView = () => {
    const daySchedule = filteredSchedule.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === currentDate.toDateString();
    });

    if (daySchedule.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="calendar" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyStateText}>
            {hasActiveFilters ? 'No shifts match your filters' : 'No schedule entries for this day'}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <ScrollView style={styles.content}>
        {daySchedule.map((entry) => (
          <TouchableOpacity
            key={entry.id}
            onPress={() => handleTaskPress(entry)}
            style={[
              styles.dayEntry,
              entry.isRecurring && { borderLeftColor: colors.warning, borderLeftWidth: 6 }
            ]}
          >
            {entry.isRecurring && (
              <View style={styles.recurringBadge}>
                <Icon name="repeat" size={12} color={colors.warning} />
                <Text style={styles.recurringBadgeText}>Recurring</Text>
              </View>
            )}
            <Text style={styles.dayEntryTitle}>{entry.buildingName}</Text>
            <Text style={styles.dayEntrySubtitle}>
              {entry.cleanerNames?.join(', ') || entry.cleanerName}
            </Text>
            <Text style={styles.dayEntryTime}>
              {formatTimeRange(entry.startTime || '09:00', entry.endTime || '17:00')} ({entry.hours}h)
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderWeeklyView = () => {
    if (filteredSchedule.length === 0 && hasActiveFilters) {
      return (
        <View style={styles.emptyState}>
          <Icon name="filter" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyStateText}>No shifts match your filters</Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DragDropScheduleGrid
            key={scheduleKey}
            clientBuildings={filteredClientBuildings}
            clients={filteredClients}
            cleaners={cleaners}
            schedule={filteredSchedule}
            buildingGroups={buildingGroups}
            onCellPress={handleCellPress}
            onCellLongPress={handleCellLongPress}
            onClientLongPress={handleClientLongPress}
            onBuildingLongPress={handleBuildingLongPress}
            onMoveEntry={handleMoveEntry}
            onBulkSelect={handleBulkSelect}
            onTaskPress={handleTaskPress}
            bulkMode={false}
            selectedEntries={[]}
            viewMode={viewMode}
            onAddShiftToCleaner={handleAddShiftToCleaner}
            currentWeekId={currentWeekId}
          />
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  };

  const renderMonthlyView = () => {
    const markedDates: any = {};
    filteredSchedule.forEach(entry => {
      if (!markedDates[entry.date]) {
        markedDates[entry.date] = { marked: true, dotColor: themeColor };
      }
    });

    return (
      <Calendar
        current={currentDate.toISOString().split('T')[0]}
        markedDates={markedDates}
        onDayPress={(day) => {
          setCurrentDate(new Date(day.dateString));
          setViewType('daily');
        }}
        theme={{
          todayTextColor: themeColor,
          selectedDayBackgroundColor: themeColor,
          dotColor: themeColor,
          arrowColor: themeColor,
        }}
      />
    );
  };

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColor} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      );
    }

    switch (viewType) {
      case 'daily':
        return renderDailyView();
      case 'weekly':
        return renderWeeklyView();
      case 'monthly':
        return renderMonthlyView();
      default:
        return null;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F7FA',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    filterButton: {
      position: 'relative',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.danger,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      ...typography.small,
      color: colors.textInverse,
      fontWeight: '700',
      fontSize: 10,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: '#F5F7FA',
      marginTop: -spacing.lg,
    },
    viewToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    viewButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#E0E6ED',
      ...typography.bodyMedium,
    },
    viewButtonActive: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      borderWidth: 2,
      elevation: 4,
    },
    viewButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    viewButtonTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    dateNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    dateText: {
      ...typography.bodyMedium,
      color: colors.text,
      minWidth: 120,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyStateText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    modeToggle: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    modeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#E0E6ED',
    },
    modeButtonActive: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      borderWidth: 2,
      elevation: 3,
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    modeButtonTextActive: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    dayEntry: {
      backgroundColor: colors.backgroundAlt,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: themeColor,
    },
    dayEntryTitle: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    dayEntrySubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    dayEntryTime: {
      ...typography.small,
      color: themeColor,
      fontWeight: '500',
    },
    clearFiltersButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      backgroundColor: colors.danger,
      marginTop: spacing.md,
    },
    clearFiltersButtonText: {
      ...typography.bodyMedium,
      color: colors.textInverse,
      fontWeight: '600',
    },
    syncIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    },
    syncIndicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isConnected ? '#22C55E' : '#EF4444',
    },
    syncIndicatorText: {
      ...typography.small,
      color: isConnected ? '#22C55E' : '#EF4444',
      fontSize: 10,
    },
    recurringBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    recurringBadgeText: {
      ...typography.small,
      color: colors.warning,
      fontWeight: '600',
      fontSize: 10,
    },
  });

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={[enhancedStyles.modernHeader, { backgroundColor: themeColor }]}>
        <View style={enhancedStyles.headerTop}>
          <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
          <View style={enhancedStyles.headerTitleContainer}>
            <Icon name="calendar" size={32} style={{ color: '#FFFFFF' }} />
          </View>
          <View style={styles.headerRight}>
            {isSyncing && (
              <ActivityIndicator size="small" color="#FFFFFF" />
            )}

            <UnassignedShiftNotifications
              themeColor={themeColor}
              onAssignShift={(notification) => {
                console.log('Assign shift from notification:', notification);
                if (notification.shift_date) {
                  setCurrentDate(new Date(notification.shift_date));
                }
              }}
              onRemoveShift={(notification) => {
                console.log('Remove shift from notification:', notification);
              }}
            />

            <TouchableOpacity
              onPress={() => setShowChangeNotifications(true)}
              style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Icon name="time" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowFiltersModal(true)}
              style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)', position: 'relative' }]}
            >
              <Icon name="filter" size={24} color="#FFFFFF" />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <CompanyLogo size={40} />
          </View>
        </View>

        <View>
          <Text style={enhancedStyles.headerTitle}>Schedule</Text>
          <Text style={enhancedStyles.headerSubtitle}>
            {viewType === 'daily' ? 'Daily View' : viewType === 'weekly' ? 'Weekly View' : 'Monthly View'} · {filteredSchedule.length} shifts
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={viewType === 'daily' ? [styles.viewButtonActive, { backgroundColor: themeColor, borderColor: themeColor }] : styles.viewButton}
            onPress={() => setViewType('daily')}
          >
            <Text style={viewType === 'daily' ? styles.viewButtonTextActive : styles.viewButtonText}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={viewType === 'weekly' ? [styles.viewButtonActive, { backgroundColor: themeColor, borderColor: themeColor }] : styles.viewButton}
            onPress={() => setViewType('weekly')}
          >
            <Text style={viewType === 'weekly' ? styles.viewButtonTextActive : styles.viewButtonText}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={viewType === 'monthly' ? [styles.viewButtonActive, { backgroundColor: themeColor, borderColor: themeColor }] : styles.viewButton}
            onPress={() => setViewType('monthly')}
          >
            <Text style={viewType === 'monthly' ? styles.viewButtonTextActive : styles.viewButtonText}>
              Month
            </Text>
          </TouchableOpacity>
        </View>

        {viewType === 'weekly' && (
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={viewMode === 'building' ? [styles.modeButtonActive, { backgroundColor: themeColor, borderColor: themeColor }] : styles.modeButton}
              onPress={() => setViewMode('building')}
            >
              <Text style={viewMode === 'building' ? styles.modeButtonTextActive : styles.modeButtonText}>
                Buildings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={viewMode === 'user' ? [styles.modeButtonActive, { backgroundColor: themeColor, borderColor: themeColor }] : styles.modeButton}
              onPress={() => setViewMode('user')}
            >
              <Text style={viewMode === 'user' ? styles.modeButtonTextActive : styles.modeButtonText}>
                Cleaners
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dateNavigation}>
          <IconButton
            icon="chevron-back"
            onPress={() => changeDate(-1)}
            size={20}
            color={themeColor}
          />
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{getHeaderText()}</Text>
          </TouchableOpacity>
          <IconButton
            icon="chevron-forward"
            onPress={() => changeDate(1)}
            size={20}
            color={themeColor}
          />
          {!isViewingCurrentPeriod() && (
            <IconButton
              icon="today"
              onPress={() => setCurrentDate(new Date())}
              size={20}
              color={themeColor}
            />
          )}
        </View>
      </View>

      {renderMainContent()}

      <ScheduleActionButton
        themeColor={themeColor}
        onAddShift={() => {
          console.log('Add shift pressed from action button');
          setSelectedClientBuilding(null);
          setSelectedCleaners([]);
          setHours('');
          setStartTime('17:00');
          setIsAddingFromGrid(false);
          setModalType('add');
          setModalVisible(true);
        }}
        onCreateRecurringTask={() => {
          console.log('Create recurring task pressed');
          setRecurringModalVisible(true);
        }}
        onScheduleBuildingGroup={() => {
          console.log('Schedule building group pressed');
          setBuildingGroupModalVisible(true);
        }}
      />

      {showDatePicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      <ScheduleFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        themeColor={themeColor}
        uniqueClientNames={uniqueClientNames}
        uniqueBuildingNames={uniqueBuildingNames}
        uniqueCleanerNames={uniqueCleanerNames}
        uniqueBuildingGroupNames={uniqueBuildingGroupNames}
        uniqueCleanerGroupNames={uniqueCleanerGroupNames}
        getClientCount={getClientCount}
        getBuildingCount={getBuildingCount}
        getCleanerCount={getCleanerCount}
        getBuildingGroupCount={getBuildingGroupCount}
        getCleanerGroupCount={getCleanerGroupCount}
        activeFilterCount={activeFilterCount}
        hasActiveFilters={hasActiveFilters}
      />

      <ScheduleModal
        key={`${modalVisible}-${selectedDay}-${selectedEntry?.id || 'new'}`}
        visible={modalVisible}
        modalType={modalType}
        selectedEntry={selectedEntry}
        selectedClient={selectedClient}
        selectedClientBuilding={selectedClientBuilding}
        cleaners={cleaners}
        clients={clients}
        clientBuildings={clientBuildings}
        selectedDay={selectedDay}
        currentDate={currentDate}
        cleanerName={cleanerName}
        selectedCleaners={selectedCleaners}
        hours={hours}
        cleanerHours={cleanerHours}
        startTime={startTime}
        paymentType={paymentType}
        flatRateAmount={flatRateAmount}
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
        isAddingFromGrid={isAddingFromGrid}
        setCleanerName={setCleanerName}
        setSelectedCleaners={setSelectedCleaners}
        setHours={setHours}
        setCleanerHours={setCleanerHours}
        setStartTime={setStartTime}
        setPaymentType={setPaymentType}
        setFlatRateAmount={setFlatRateAmount}
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
        onClose={handleModalClose}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        onAddClient={handleAddClient}
        onAddBuilding={handleAddBuilding}
        onAddCleaner={handleAddCleaner}
        onEditClient={handleEditClient}
        onEditBuilding={handleEditBuilding}
        onSwitchToEdit={handleSwitchToEdit}
        onOpenRecurringModal={handleOpenRecurringModal}
      />

      <RecurringTaskModal
        visible={recurringModalVisible}
        clientBuildings={clientBuildings}
        clients={clients}
        cleaners={cleaners}
        onClose={() => {
          setRecurringModalVisible(false);
          if (selectedClientBuilding) {
            setModalVisible(true);
          }
        }}
        onSave={handleRecurringTaskSave}
      />

      <BuildingGroupScheduleModal
        visible={buildingGroupModalVisible}
        onClose={() => setBuildingGroupModalVisible(false)}
        cleaners={cleaners}
        clients={clients}
        onScheduleCreated={async () => {
          // Refresh from Supabase after schedule created
          const freshEntries = await fetchWeekSchedule(currentWeekId);
          setCurrentWeekSchedule(freshEntries);
          setScheduleKey(prev => prev + 1);
        }}
        weekId={currentWeekId}
        day={selectedDay || 'monday'}
        date={currentDate.toISOString().split('T')[0]}
      />

      <ScheduleChangeNotifications
        visible={showChangeNotifications}
        onClose={() => setShowChangeNotifications(false)}
      />

      <Toast />
    </View>
  );
}