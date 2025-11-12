
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import ScheduleModal from '../../components/schedule/ScheduleModal';
import ScheduleFiltersModal from '../../components/schedule/ScheduleFiltersModal';
import BuildingGroupScheduleModal from '../../components/schedule/BuildingGroupScheduleModal';
import Toast from '../../components/Toast';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Calendar } from 'react-native-calendars';
import Icon from '../../components/Icon';
import DragDropScheduleGrid from '../../components/schedule/DragDropScheduleGrid';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import IconButton from '../../components/IconButton';
import DraggableButton from '../../components/DraggableButton';
import UnassignedShiftNotifications from '../../components/UnassignedShiftNotifications';
import { projectToScheduleEntry, scheduleEntryExistsForProject } from '../../utils/projectScheduleSync';
import { formatTimeRange } from '../../utils/timeFormatter';
import { supabase } from '../integrations/supabase/client';
import type { RecurringShiftPattern } from '../../utils/recurringShiftGenerator';
import { 
  generateOccurrences, 
  patternToScheduleEntries, 
  isPatternActive,
  needsGeneration,
  formatPatternDescription
} from '../../utils/recurringShiftGenerator';

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
  const [cleanerName, setCleanerName] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);
  const [hours, setHours] = useState('');
  const [startTime, setStartTime] = useState('09:00');
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
  
  const [showFiltersModal, setShowFiltersModal] = useState(false);
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
  const { 
    getWeekSchedule, 
    addScheduleEntry, 
    updateScheduleEntry, 
    deleteScheduleEntry,
    getCurrentWeekId,
    getWeekIdFromDate,
  } = useScheduleStorage();

  const currentWeekId = useMemo(() => {
    return getWeekIdFromDate(currentDate);
  }, [currentDate, getWeekIdFromDate]);

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
      
      const currentSchedule = getWeekSchedule(currentWeekId);
      
      let addedCount = 0;
      
      for (const project of scheduledProjects) {
        if (!scheduleEntryExistsForProject(currentSchedule, project as any)) {
          const scheduleEntry = projectToScheduleEntry(project as any);
          
          if (scheduleEntry) {
            const entryWithId = {
              ...scheduleEntry,
              id: `project-schedule-${project.id}-${Date.now()}`,
            };
            
            console.log('Adding schedule entry for project:', project.project_name);
            await addScheduleEntry(currentWeekId, entryWithId as ScheduleEntry);
            
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
  }, [executeQuery, getWeekSchedule, currentWeekId, addScheduleEntry, showToast]);

  const generateRecurringShifts = useCallback(async () => {
    try {
      console.log('=== GENERATING RECURRING SHIFTS ===');
      
      const patterns = await executeQuery<RecurringShiftPattern>('select', 'recurring_shifts');
      console.log('Loaded recurring patterns:', patterns.length);
      
      const activePatterns = patterns.filter(p => isPatternActive(p));
      console.log('Active patterns:', activePatterns.length);
      
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 28);
      
      let totalGenerated = 0;
      
      for (const pattern of activePatterns) {
        if (!needsGeneration(pattern, 4)) {
          console.log('Pattern does not need generation:', pattern.id);
          continue;
        }
        
        const startDate = pattern.last_generated_date || pattern.start_date;
        const occurrences = generateOccurrences(
          pattern,
          startDate,
          futureDate.toISOString().split('T')[0],
          50
        );
        
        console.log(`Generated ${occurrences.length} occurrences for pattern ${pattern.id}`);
        
        const entries = patternToScheduleEntries(pattern, occurrences, getWeekIdFromDate);
        
        for (const entry of entries) {
          const weekSchedule = getWeekSchedule(entry.weekId);
          const exists = weekSchedule.some(e => 
            e.recurringId === pattern.id && 
            e.date === entry.date
          );
          
          if (!exists) {
            await addScheduleEntry(entry.weekId, entry);
            totalGenerated++;
          }
        }
        
        await executeQuery('update', 'recurring_shifts', {
          id: pattern.id,
          last_generated_date: futureDate.toISOString().split('T')[0],
          occurrence_count: (pattern.occurrence_count || 0) + occurrences.length,
        });
      }
      
      console.log('✅ Generated', totalGenerated, 'recurring shift entries');
      
      if (totalGenerated > 0) {
        showToast(`Generated ${totalGenerated} recurring shift${totalGenerated > 1 ? 's' : ''}`, 'success');
      }
      
      return totalGenerated;
    } catch (error) {
      console.error('❌ Error generating recurring shifts:', error);
      return 0;
    }
  }, [executeQuery, getWeekSchedule, getWeekIdFromDate, addScheduleEntry, showToast]);

  const loadCurrentWeekSchedule = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingInProgressRef.current) {
      console.log('⏸️ Load already in progress, skipping...');
      return;
    }

    try {
      loadingInProgressRef.current = true;
      console.log('🔄 Loading current week schedule...');
      
      const weekId = getWeekIdFromDate(currentDate);
      
      // Always sync projects and generate recurring shifts first
      await syncProjectsToSchedule();
      await generateRecurringShifts();
      
      // Then get the updated schedule
      const schedule = getWeekSchedule(weekId, true);
      setCurrentWeekSchedule(schedule);
      console.log('✅ Loaded schedule for week', weekId, ':', schedule.length, 'entries');
      
      if (!initialLoadCompleteRef.current) {
        initialLoadCompleteRef.current = true;
      }
    } catch (error) {
      console.error('❌ Error loading schedule:', error);
      showToast('Failed to load schedule', 'error');
    } finally {
      loadingInProgressRef.current = false;
    }
  }, [currentDate, getWeekSchedule, getWeekIdFromDate, showToast, syncProjectsToSchedule, generateRecurringShifts]);

  // Simplified realtime sync - only refresh the schedule display, don't reload everything
  const { isConnected, lastSyncTime, syncToSupabase } = useRealtimeSync({
    enabled: true,
    onSyncComplete: useCallback(() => {
      console.log('✅ Realtime sync completed - refreshing schedule display');
      // Just refresh the current week schedule without reloading everything
      const weekId = getWeekIdFromDate(currentDate);
      const schedule = getWeekSchedule(weekId, true);
      setCurrentWeekSchedule(schedule);
    }, [currentDate, getWeekIdFromDate, getWeekSchedule]),
    onError: useCallback((error) => {
      console.error('❌ Realtime sync error:', error);
      showToast('Sync error - changes may not be reflected on other devices', 'error');
    }, [showToast]),
  });

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

  // Filter schedule entries based on applied filters
  const filteredSchedule = useMemo(() => {
    console.log('🔍 Filtering schedule with filters:', filters);
    
    if (filters.shiftType === 'all' &&
        !filters.clientName.trim() &&
        !filters.buildingName.trim() &&
        !filters.cleanerName.trim() &&
        !filters.buildingGroupName.trim() &&
        !filters.cleanerGroupName.trim() &&
        filters.status === 'all') {
      console.log('✅ No filters applied, returning all schedule entries');
      return currentWeekSchedule;
    }

    let filtered = currentWeekSchedule;

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
  }, [currentWeekSchedule, filters, buildingGroups, clientBuildings, cleanerGroups, cleaners]);

  // Filter buildings to only show those with matching schedule entries
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

    // Get unique building names from filtered schedule
    const buildingNamesWithSchedule = new Set(
      filteredSchedule.map(entry => entry.buildingName)
    );

    console.log(`🔍 Buildings with matching schedule entries: ${buildingNamesWithSchedule.size}`);

    // Filter buildings to only include those with schedule entries
    const filtered = clientBuildings.filter(building => 
      buildingNamesWithSchedule.has(building.buildingName)
    );

    console.log(`✅ Filtered buildings: ${filtered.length} out of ${clientBuildings.length}`);
    return filtered;
  }, [clientBuildings, filteredSchedule, filters]);

  // Filter clients to only show those with matching buildings
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

    // Get unique client names from filtered buildings
    const clientNamesWithBuildings = new Set(
      filteredClientBuildings.map(building => building.clientName)
    );

    console.log(`🔍 Clients with matching buildings: ${clientNamesWithBuildings.size}`);

    // Filter clients to only include those with buildings
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

  // Initial data load - only runs once
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
        // Load schedule after groups are loaded
        await loadCurrentWeekSchedule();
      } catch (error) {
        console.error('❌ Error loading initial data:', error);
        showToast('Failed to load schedule data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array - only run once on mount

  // Reload schedule when date changes (but not on initial mount)
  useEffect(() => {
    if (!isLoading && initialLoadCompleteRef.current) {
      console.log('🔄 Date changed, reloading schedule for new week');
      loadCurrentWeekSchedule();
    }
  }, [currentDate, isLoading, loadCurrentWeekSchedule]);

  // Add focus effect to refresh schedule when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Schedule screen focused - refreshing data');
      
      // Only refresh if initial load is complete
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
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
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
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
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
    console.log('Cell pressed:', building.buildingName, day);
    setSelectedClientBuilding(building);
    setSelectedDay(day);
    setSelectedCleaners([]);
    setHours('');
    setStartTime('09:00');
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
    setStartTime('09:00');
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
    setSelectedDay(entry.day);
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
    setCleanerName('');
    setSelectedCleaners([]);
    setHours('');
    setStartTime('09:00');
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

  const handleModalSave = useCallback(async () => {
    console.log('=== SCHEDULE MODAL SAVE HANDLER ===');
    console.log('Modal type:', modalType);
    console.log('Selected cleaners:', selectedCleaners);
    console.log('Hours:', hours);
    console.log('Start time:', startTime);
    console.log('Selected building:', selectedClientBuilding);
    console.log('Selected day:', selectedDay);

    try {
      if (modalType === 'add') {
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

        const endTime = addHoursToTime(startTime, parseFloat(hours));
        
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(selectedDay);
        const entryDate = new Date(weekStart);
        entryDate.setDate(weekStart.getDate() + dayIndex);
        
        const newEntry: ScheduleEntry = {
          id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientName: selectedClientBuilding.clientName,
          buildingName: selectedClientBuilding.buildingName,
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          day: selectedDay as any,
          date: entryDate.toISOString().split('T')[0],
          hours: parseFloat(hours),
          startTime,
          endTime,
          status: 'scheduled',
          weekId: currentWeekId,
          paymentType: 'hourly',
          hourlyRate: 15,
        };

        console.log('Adding new schedule entry:', newEntry);
        await addScheduleEntry(currentWeekId, newEntry);
        
        console.log('🔄 Syncing new entry to Supabase...');
        await syncToSupabase(newEntry, 'insert');
        
        showToast('Shift added successfully', 'success');
        
        // Refresh the schedule display
        const schedule = getWeekSchedule(currentWeekId, true);
        setCurrentWeekSchedule(schedule);
        
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
        if (!hours || parseFloat(hours) <= 0) {
          showToast('Please enter valid hours', 'error');
          return;
        }

        const endTime = addHoursToTime(startTime, parseFloat(hours));
        
        const updates: Partial<ScheduleEntry> = {
          cleanerName: selectedCleaners[0],
          cleanerNames: selectedCleaners,
          hours: parseFloat(hours),
          startTime,
          endTime,
        };

        console.log('Updating schedule entry:', selectedEntry.id, updates);
        await updateScheduleEntry(selectedEntry.weekId, selectedEntry.id, updates);
        
        const updatedEntry = { ...selectedEntry, ...updates };
        console.log('🔄 Syncing updated entry to Supabase...');
        await syncToSupabase(updatedEntry as ScheduleEntry, 'update');
        
        showToast('Shift updated successfully', 'success');
        
        // Refresh the schedule display
        const schedule = getWeekSchedule(currentWeekId, true);
        setCurrentWeekSchedule(schedule);
        
        handleModalClose();
      }
    } catch (error) {
      console.error('Error saving schedule entry:', error);
      showToast('Failed to save shift', 'error');
    }
  }, [modalType, selectedClientBuilding, selectedCleaners, hours, startTime, selectedDay, currentDate, currentWeekId, selectedEntry, addScheduleEntry, updateScheduleEntry, syncToSupabase, getWeekSchedule, handleModalClose, showToast, addHoursToTime]);

  const handleModalDelete = useCallback(async () => {
    console.log('=== SCHEDULE MODAL DELETE HANDLER ===');
    console.log('Selected entry:', selectedEntry);

    if (!selectedEntry) {
      showToast('No entry selected', 'error');
      return;
    }

    Alert.alert(
      'Delete Shift',
      'Are you sure you want to delete this shift?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting schedule entry:', selectedEntry.id);
              await deleteScheduleEntry(selectedEntry.weekId, selectedEntry.id);
              
              console.log('🔄 Syncing deleted entry to Supabase...');
              await syncToSupabase(selectedEntry, 'delete');
              
              showToast('Shift deleted successfully', 'success');
              
              // Refresh the schedule display
              const schedule = getWeekSchedule(currentWeekId, true);
              setCurrentWeekSchedule(schedule);
              
              handleModalClose();
            } catch (error) {
              console.error('Error deleting schedule entry:', error);
              showToast('Failed to delete shift', 'error');
            }
          },
        },
      ]
    );
  }, [selectedEntry, deleteScheduleEntry, syncToSupabase, getWeekSchedule, currentWeekId, handleModalClose, showToast]);

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
      setSelectedCleaners(selectedEntry.cleanerNames || [selectedEntry.cleanerName]);
      setHours(selectedEntry.hours.toString());
      setStartTime(selectedEntry.startTime || '09:00');
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
      
      await executeQuery('insert', 'recurring_shifts', recurringPattern);
      
      showToast('Recurring shift created successfully!', 'success');
      
      await generateRecurringShifts();
      
      // Refresh the schedule display
      const schedule = getWeekSchedule(currentWeekId, true);
      setCurrentWeekSchedule(schedule);
      
      setRecurringModalVisible(false);
    } catch (error) {
      console.error('Error creating recurring task:', error);
      showToast('Failed to create recurring shift', 'error');
    }
  }, [executeQuery, generateRecurringShifts, getWeekSchedule, currentWeekId, showToast]);

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
      backgroundColor: colors.background,
    },
    header: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
      color: colors.textInverse,
      fontWeight: '600',
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
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    viewToggle: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    viewButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.backgroundAlt,
    },
    viewButtonActive: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 8,
    },
    viewButtonText: {
      ...typography.bodyMedium,
      color: colors.text,
    },
    viewButtonTextActive: {
      ...typography.bodyMedium,
      color: colors.textInverse,
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
      gap: spacing.xs,
    },
    modeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      backgroundColor: colors.backgroundAlt,
    },
    modeButtonActive: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 6,
    },
    modeButtonText: {
      ...typography.small,
      color: colors.text,
    },
    modeButtonTextActive: {
      ...typography.small,
      color: colors.textInverse,
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
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.syncIndicator}>
            <View style={styles.syncIndicatorDot} />
            <Text style={styles.syncIndicatorText}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
          
          <UnassignedShiftNotifications
            themeColor={themeColor}
            onAssignShift={(notification) => {
              console.log('Assign shift from notification:', notification);
              // Navigate to the shift date and open assignment modal
              if (notification.shift_date) {
                setCurrentDate(new Date(notification.shift_date));
              }
            }}
            onRemoveShift={(notification) => {
              console.log('Remove shift from notification:', notification);
              // Handle shift removal
            }}
          />
          
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

      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={viewType === 'daily' ? [styles.viewButtonActive, { backgroundColor: themeColor }] : styles.viewButton}
            onPress={() => setViewType('daily')}
          >
            <Text style={viewType === 'daily' ? styles.viewButtonTextActive : styles.viewButtonText}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={viewType === 'weekly' ? [styles.viewButtonActive, { backgroundColor: themeColor }] : styles.viewButton}
            onPress={() => setViewType('weekly')}
          >
            <Text style={viewType === 'weekly' ? styles.viewButtonTextActive : styles.viewButtonText}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={viewType === 'monthly' ? [styles.viewButtonActive, { backgroundColor: themeColor }] : styles.viewButton}
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
              style={viewMode === 'building' ? [styles.modeButtonActive, { backgroundColor: themeColor }] : styles.modeButton}
              onPress={() => setViewMode('building')}
            >
              <Text style={viewMode === 'building' ? styles.modeButtonTextActive : styles.modeButtonText}>
                Buildings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={viewMode === 'user' ? [styles.modeButtonActive, { backgroundColor: themeColor }] : styles.modeButton}
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

      <DraggableButton
        icon="add"
        iconSize={28}
        iconColor={colors.textInverse}
        backgroundColor={themeColor}
        size={56}
        onPress={() => {
          console.log('FAB pressed');
          setSelectedClientBuilding(null);
          setSelectedCleaners([]);
          setHours('');
          setStartTime('09:00');
          setModalType('add');
          setModalVisible(true);
        }}
      />

      <DraggableButton
        icon="repeat"
        iconSize={24}
        iconColor={colors.textInverse}
        backgroundColor={colors.warning}
        size={48}
        initialX={Platform.select({ ios: 20, android: 20, default: 20 })}
        initialY={Platform.select({ ios: 200, android: 200, default: 200 })}
        onPress={() => {
          console.log('Recurring FAB pressed');
          setRecurringModalVisible(true);
        }}
      />

      <DraggableButton
        icon="albums"
        iconSize={24}
        iconColor={colors.textInverse}
        backgroundColor={colors.success}
        size={48}
        initialX={Platform.select({ ios: 100, android: 100, default: 100 })}
        onPress={() => {
          console.log('Building Group FAB pressed');
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
        visible={modalVisible}
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
        onScheduleCreated={() => {
          // Refresh the schedule display
          const schedule = getWeekSchedule(currentWeekId, true);
          setCurrentWeekSchedule(schedule);
        }}
        weekId={currentWeekId}
        day={selectedDay || 'monday'}
        date={currentDate.toISOString().split('T')[0]}
      />

      <Toast />
    </View>
  );
}
