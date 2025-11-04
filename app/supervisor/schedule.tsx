
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useScheduleStorage, type ScheduleEntry } from '../../hooks/useScheduleStorage';
import { useClientData, type Client, type ClientBuilding, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import RecurringTaskModal from '../../components/schedule/RecurringTaskModal';
import ScheduleModal from '../../components/schedule/ScheduleModal';
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
import FilterDropdown from '../../components/FilterDropdown';
import { projectToScheduleEntry, scheduleEntryExistsForProject } from '../../utils/projectScheduleSync';
import { formatTimeRange } from '../../utils/timeFormatter';
import { supabase } from '../integrations/supabase/client';

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
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<ScheduleEntry[]>([]);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [buildingGroupModalVisible, setBuildingGroupModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [buildingGroups, setBuildingGroups] = useState<BuildingGroup[]>([]);
  const [cleanerGroups, setCleanerGroups] = useState<CleanerGroup[]>([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ScheduleFilters>({
    shiftType: 'all',
    clientName: '',
    buildingName: '',
    cleanerName: '',
    buildingGroupName: '',
    cleanerGroupName: '',
    status: 'all',
  });

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

  // Calculate current week ID
  const currentWeekId = useMemo(() => {
    return getWeekIdFromDate(currentDate);
  }, [currentDate, getWeekIdFromDate]);

  // Load building groups using direct Supabase query
  const loadBuildingGroups = useCallback(async () => {
    try {
      console.log('🔄 Loading building groups...');
      
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('building_groups')
        .select('*')
        .order('group_name', { ascending: true });

      if (groupsError) {
        console.error('❌ Error loading building groups:', groupsError);
        throw groupsError;
      }

      console.log(`📦 Loaded ${groupsData?.length || 0} building groups from database`);

      if (!groupsData || groupsData.length === 0) {
        console.log('ℹ️ No building groups found');
        setBuildingGroups([]);
        return;
      }

      // Load members for each group
      const groupsWithMembers: BuildingGroup[] = [];
      
      for (const group of groupsData) {
        console.log(`🔍 Loading members for group "${group.group_name}" (${group.id})`);
        
        const { data: membersData, error: membersError } = await supabase
          .from('building_group_members')
          .select('building_id')
          .eq('group_id', group.id);

        if (membersError) {
          console.error(`❌ Error loading members for group "${group.group_name}":`, membersError);
          continue;
        }

        const buildingIds = membersData?.map(m => m.building_id) || [];
        console.log(`  ✅ Group "${group.group_name}" has ${buildingIds.length} buildings:`, buildingIds);

        groupsWithMembers.push({
          id: group.id,
          client_name: group.client_name,
          group_name: group.group_name,
          description: group.description,
          building_ids: buildingIds,
          highlight_color: group.highlight_color || '#3B82F6',
        });
      }

      console.log(`✅ Successfully loaded ${groupsWithMembers.length} building groups with members`);
      console.log('📊 Building groups summary:', groupsWithMembers.map(g => ({
        name: g.group_name,
        buildings: g.building_ids.length,
        color: g.highlight_color
      })));
      
      setBuildingGroups(groupsWithMembers);
    } catch (error) {
      console.error('❌ Failed to load building groups:', error);
      setBuildingGroups([]);
    }
  }, []);

  // Load cleaner groups using direct Supabase query
  const loadCleanerGroups = useCallback(async () => {
    try {
      console.log('🔄 Loading cleaner groups...');
      
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('cleaner_groups')
        .select('*')
        .order('group_name', { ascending: true });

      if (groupsError) {
        console.error('❌ Error loading cleaner groups:', groupsError);
        throw groupsError;
      }

      console.log(`📦 Loaded ${groupsData?.length || 0} cleaner groups from database`);

      if (!groupsData || groupsData.length === 0) {
        console.log('ℹ️ No cleaner groups found');
        setCleanerGroups([]);
        return;
      }

      // Load members for each group
      const groupsWithMembers: CleanerGroup[] = [];
      
      for (const group of groupsData) {
        console.log(`🔍 Loading members for group "${group.group_name}" (${group.id})`);
        
        const { data: membersData, error: membersError } = await supabase
          .from('cleaner_group_members')
          .select('cleaner_id')
          .eq('group_id', group.id);

        if (membersError) {
          console.error(`❌ Error loading members for group "${group.group_name}":`, membersError);
          continue;
        }

        const cleanerIds = membersData?.map(m => m.cleaner_id) || [];
        console.log(`  ✅ Group "${group.group_name}" has ${cleanerIds.length} cleaners:`, cleanerIds);

        groupsWithMembers.push({
          id: group.id,
          group_name: group.group_name,
          description: group.description,
          cleaner_ids: cleanerIds,
          highlight_color: group.highlight_color || '#3B82F6',
        });
      }

      console.log(`✅ Successfully loaded ${groupsWithMembers.length} cleaner groups with members`);
      console.log('📊 Cleaner groups summary:', groupsWithMembers.map(g => ({
        name: g.group_name,
        cleaners: g.cleaner_ids.length,
        color: g.highlight_color
      })));
      
      setCleanerGroups(groupsWithMembers);
    } catch (error) {
      console.error('❌ Failed to load cleaner groups:', error);
      setCleanerGroups([]);
    }
  }, []);

  // Get unique building group names from building groups
  const uniqueBuildingGroupNames = useMemo(() => {
    const names = new Set(buildingGroups.map(group => group.group_name));
    return Array.from(names).sort();
  }, [buildingGroups]);

  // Get unique cleaner group names from cleaner groups
  const uniqueCleanerGroupNames = useMemo(() => {
    const names = new Set(cleanerGroups.map(group => group.group_name));
    return Array.from(names).sort();
  }, [cleanerGroups]);

  // Get unique client names from schedule
  const uniqueClientNames = useMemo(() => {
    const names = new Set(currentWeekSchedule.map(entry => entry.clientName));
    return Array.from(names).sort();
  }, [currentWeekSchedule]);

  // Get unique building names from schedule (filtered by selected client if any)
  const uniqueBuildingNames = useMemo(() => {
    let entries = currentWeekSchedule;
    if (filters.clientName) {
      entries = entries.filter(entry => entry.clientName === filters.clientName);
    }
    const names = new Set(entries.map(entry => entry.buildingName));
    return Array.from(names).sort();
  }, [currentWeekSchedule, filters.clientName]);

  // Get unique cleaner names from schedule
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

  // Apply filters to schedule
  const filteredSchedule = useMemo(() => {
    let filtered = [...currentWeekSchedule];

    // Filter by shift type
    if (filters.shiftType !== 'all') {
      if (filters.shiftType === 'project') {
        filtered = filtered.filter(entry => entry.isProject === true);
      } else {
        filtered = filtered.filter(entry => !entry.isProject);
      }
    }

    // Filter by client name (supports both exact match and partial match)
    if (filters.clientName.trim()) {
      filtered = filtered.filter(entry => 
        entry.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
      );
    }

    // Filter by building name (supports both exact match and partial match)
    if (filters.buildingName.trim()) {
      filtered = filtered.filter(entry => 
        entry.buildingName.toLowerCase().includes(filters.buildingName.toLowerCase())
      );
    }

    // Filter by cleaner name (supports both exact match and partial match)
    if (filters.cleanerName.trim()) {
      filtered = filtered.filter(entry => {
        const cleanerNames = entry.cleanerNames || [entry.cleanerName];
        return cleanerNames.some(name => 
          name.toLowerCase().includes(filters.cleanerName.toLowerCase())
        );
      });
    }

    // Filter by building group
    if (filters.buildingGroupName.trim()) {
      const selectedGroup = buildingGroups.find(g => 
        g.group_name.toLowerCase().includes(filters.buildingGroupName.toLowerCase())
      );
      
      if (selectedGroup) {
        const groupBuildingIds = selectedGroup.building_ids;
        const groupBuildingNames = clientBuildings
          .filter(b => groupBuildingIds.includes(b.id))
          .map(b => b.buildingName);
        
        filtered = filtered.filter(entry => 
          groupBuildingNames.includes(entry.buildingName)
        );
      }
    }

    // Filter by cleaner group
    if (filters.cleanerGroupName.trim()) {
      const selectedGroup = cleanerGroups.find(g => 
        g.group_name.toLowerCase().includes(filters.cleanerGroupName.toLowerCase())
      );
      
      if (selectedGroup) {
        const groupCleanerIds = selectedGroup.cleaner_ids;
        const groupCleanerNames = cleaners
          .filter(c => groupCleanerIds.includes(c.id))
          .map(c => c.name);
        
        filtered = filtered.filter(entry => {
          const entryCleanerNames = entry.cleanerNames || [entry.cleanerName];
          return entryCleanerNames.some(name => groupCleanerNames.includes(name));
        });
      }
    }

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(entry => entry.status === filters.status);
    }

    return filtered;
  }, [currentWeekSchedule, filters, buildingGroups, clientBuildings]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.shiftType !== 'all' ||
           filters.clientName.trim() !== '' ||
           filters.buildingName.trim() !== '' ||
           filters.cleanerName.trim() !== '' ||
           filters.buildingGroupName.trim() !== '' ||
           filters.cleanerGroupName.trim() !== '' ||
           filters.status !== 'all';
  }, [filters]);

  // Count active filters
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

  // Clear all filters
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

  // Get count for filter options
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

  const loadCurrentWeekSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const weekId = getWeekIdFromDate(currentDate);
      const schedule = getWeekSchedule(weekId, true);
      setCurrentWeekSchedule(schedule);
      console.log('Loaded schedule for week', weekId, ':', schedule.length, 'entries');
      
      await syncProjectsToSchedule();
      
      const updatedSchedule = getWeekSchedule(weekId, true);
      setCurrentWeekSchedule(updatedSchedule);
      
      // Load building groups and cleaner groups
      await loadBuildingGroups();
      await loadCleanerGroups();
    } catch (error) {
      console.error('Error loading schedule:', error);
      showToast('Failed to load schedule', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, getWeekSchedule, getWeekIdFromDate, showToast, syncProjectsToSchedule, loadBuildingGroups]);

  useEffect(() => {
    loadCurrentWeekSchedule();
  }, [loadCurrentWeekSchedule]);

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

  const addHoursToTime = (time: string, hours: number): string => {
    const [hoursStr, minutesStr] = time.split(':');
    const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + hours * 60;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

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
        showToast('Shift added successfully', 'success');
        await loadCurrentWeekSchedule();
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
        showToast('Shift updated successfully', 'success');
        await loadCurrentWeekSchedule();
        handleModalClose();
      }
    } catch (error) {
      console.error('Error saving schedule entry:', error);
      showToast('Failed to save shift', 'error');
    }
  }, [modalType, selectedClientBuilding, selectedCleaners, hours, startTime, selectedDay, currentDate, currentWeekId, selectedEntry, addScheduleEntry, updateScheduleEntry, loadCurrentWeekSchedule, handleModalClose, showToast, addHoursToTime]);

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
              showToast('Shift deleted successfully', 'success');
              await loadCurrentWeekSchedule();
              handleModalClose();
            } catch (error) {
              console.error('Error deleting schedule entry:', error);
              showToast('Failed to delete shift', 'error');
            }
          },
        },
      ]
    );
  }, [selectedEntry, deleteScheduleEntry, loadCurrentWeekSchedule, handleModalClose, showToast]);

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
      showToast('Recurring task feature coming soon!', 'info');
      setRecurringModalVisible(false);
      
      if (selectedClientBuilding) {
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error creating recurring task:', error);
      showToast('Failed to create recurring task', 'error');
    }
  }, [selectedClientBuilding, showToast]);

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
            style={styles.dayEntry}
          >
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
            clientBuildings={clientBuildings}
            clients={clients}
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
      return <LoadingSpinner />;
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
    filterContainer: {
      backgroundColor: colors.backgroundAlt,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    filterHeaderText: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
    },
    filterGrid: {
      gap: spacing.md,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    filterItem: {
      flex: 1,
    },
    filterLabel: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      fontWeight: '600',
    },
    filterInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...typography.body,
      color: colors.text,
    },
    filterButtonGroup: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    filterButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    filterButtonActive: {
      borderWidth: 2,
    },
    filterButtonText: {
      ...typography.small,
      color: colors.text,
      fontWeight: '500',
    },
    filterButtonTextActive: {
      fontWeight: '700',
    },
    filterActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
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
    filterBadge: {
      backgroundColor: colors.danger,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginLeft: spacing.xs,
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
  });

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
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

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterHeaderText}>Filters</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={{ ...typography.small, color: colors.danger, fontWeight: '600' }}>
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterGrid}>
            {/* Shift Type Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Shift Type</Text>
              <View style={styles.filterButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.shiftType === 'all' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, shiftType: 'all' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.shiftType === 'all' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.shiftType === 'regular' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, shiftType: 'regular' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.shiftType === 'regular' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    Regular
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.shiftType === 'project' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, shiftType: 'project' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.shiftType === 'project' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    Project
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.status === 'all' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, status: 'all' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.status === 'all' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.status === 'scheduled' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, status: 'scheduled' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.status === 'scheduled' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    Scheduled
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filters.status === 'completed' && [styles.filterButtonActive, { borderColor: themeColor }]
                  ]}
                  onPress={() => setFilters({ ...filters, status: 'completed' })}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filters.status === 'completed' && [styles.filterButtonTextActive, { color: themeColor }]
                  ]}>
                    Completed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Dropdown Filters with Manual Input */}
            <View style={styles.filterRow}>
              <FilterDropdown
                label="Client"
                value={filters.clientName}
                onValueChange={(value) => setFilters({ ...filters, clientName: value, buildingName: '' })}
                options={uniqueClientNames}
                placeholder="All Clients or type..."
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getClientCount}
              />

              <FilterDropdown
                label="Building"
                value={filters.buildingName}
                onValueChange={(value) => setFilters({ ...filters, buildingName: value })}
                options={uniqueBuildingNames}
                placeholder="All Buildings or type..."
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getBuildingCount}
              />
            </View>

            <View style={styles.filterRow}>
              <FilterDropdown
                label="Cleaner"
                value={filters.cleanerName}
                onValueChange={(value) => setFilters({ ...filters, cleanerName: value })}
                options={uniqueCleanerNames}
                placeholder="All Cleaners or type..."
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getCleanerCount}
              />

              <FilterDropdown
                label="Cleaner Group"
                value={filters.cleanerGroupName}
                onValueChange={(value) => setFilters({ ...filters, cleanerGroupName: value })}
                options={uniqueCleanerGroupNames}
                placeholder="All Cleaner Groups or type..."
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getCleanerGroupCount}
              />
            </View>

            <View style={styles.filterRow}>
              <FilterDropdown
                label="Building Group"
                value={filters.buildingGroupName}
                onValueChange={(value) => setFilters({ ...filters, buildingGroupName: value })}
                options={uniqueBuildingGroupNames}
                placeholder="All Building Groups or type..."
                themeColor={themeColor}
                allowManualInput={true}
                showCount={true}
                getOptionCount={getBuildingGroupCount}
              />
            </View>
          </View>
        </View>
      )}

      {/* Controls */}
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

      {/* Main Content */}
      {renderMainContent()}

      {/* Draggable FAB - Add Single Shift */}
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

      {/* Draggable FAB - Schedule Building Group */}
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

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Schedule Modal */}
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

      {/* Recurring Task Modal */}
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

      {/* Building Group Schedule Modal */}
      <BuildingGroupScheduleModal
        visible={buildingGroupModalVisible}
        onClose={() => setBuildingGroupModalVisible(false)}
        cleaners={cleaners}
        onScheduleCreated={loadCurrentWeekSchedule}
        weekId={currentWeekId}
        day={selectedDay || 'monday'}
        date={currentDate.toISOString().split('T')[0]}
      />

      <Toast />
    </View>
  );
}
