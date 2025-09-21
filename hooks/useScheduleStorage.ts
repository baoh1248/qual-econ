
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScheduleEntry {
  id: string;
  clientName: string;
  buildingName: string;
  cleanerName: string; // Keep for backward compatibility
  cleanerNames?: string[]; // New field for multiple cleaners
  cleanerIds?: string[]; // Store cleaner IDs for better data integrity
  hours: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  date: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  weekId: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  isRecurring?: boolean;
  recurringId?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  tags?: string[];
}

export interface WeeklySchedule {
  [weekId: string]: ScheduleEntry[];
}

export interface ScheduleConflict {
  type: 'cleaner_double_booking' | 'location_overlap' | 'time_conflict';
  entries: ScheduleEntry[];
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface ScheduleStats {
  totalHours: number;
  totalEntries: number;
  completedEntries: number;
  pendingEntries: number;
  conflictCount: number;
  utilizationRate: number;
  averageHoursPerCleaner: number;
}

const STORAGE_KEYS = {
  WEEKLY_SCHEDULES: 'weekly_schedules_v4',
  SCHEDULE_CACHE: 'schedule_cache_v4',
  LAST_CLEANUP_DATE: 'last_cleanup_date',
};

// Cache for frequently accessed data
const scheduleCache = new Map<string, ScheduleEntry[]>();
const statsCache = new Map<string, ScheduleStats>();
const conflictsCache = new Map<string, ScheduleConflict[]>();

export const useScheduleStorage = () => {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent unnecessary re-renders
  const loadingRef = useRef(false);
  const saveQueueRef = useRef<Map<string, ScheduleEntry[]>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized week ID generation with caching and error handling
  const getCurrentWeekId = useCallback((): string => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const year = startOfWeek.getFullYear();
      const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const day = String(startOfWeek.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error getting current week ID:', error);
      // Fallback to a simple date string
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
  }, []);

  const getWeekIdFromDate = useCallback((date: Date): string => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided to getWeekIdFromDate:', date);
        return getCurrentWeekId();
      }

      const startOfWeek = new Date(date);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const year = startOfWeek.getFullYear();
      const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const day = String(startOfWeek.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error getting week ID from date:', error);
      return getCurrentWeekId();
    }
  }, [getCurrentWeekId]);

  // Optimized conflict detection with caching and error handling
  const detectConflicts = useCallback((schedule: ScheduleEntry[]): ScheduleConflict[] => {
    try {
      if (!Array.isArray(schedule)) {
        console.error('Invalid schedule provided to detectConflicts');
        return [];
      }

      const scheduleKey = schedule.map(e => e?.id || '').filter(Boolean).sort().join(',');
      
      if (conflictsCache.has(scheduleKey)) {
        return conflictsCache.get(scheduleKey)!;
      }

      const conflicts: ScheduleConflict[] = [];
      const cleanerDayMap = new Map<string, ScheduleEntry[]>();
      
      // Use Map for O(1) lookups instead of array operations
      for (const entry of schedule) {
        if (!entry || entry.status === 'cancelled') continue;
        
        const key = `${entry.cleanerName || ''}-${entry.day || ''}`;
        if (!cleanerDayMap.has(key)) {
          cleanerDayMap.set(key, []);
        }
        cleanerDayMap.get(key)!.push(entry);
      }

      // Check for conflicts
      for (const [key, entries] of cleanerDayMap) {
        if (entries.length > 1) {
          const [cleanerName, day] = key.split('-');
          conflicts.push({
            type: 'cleaner_double_booking',
            entries,
            severity: 'high',
            description: `${cleanerName} is scheduled for ${entries.length} jobs on ${day}`,
          });
        }
      }

      // Cache the result
      conflictsCache.set(scheduleKey, conflicts);
      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }, []);

  // Optimized stats calculation with caching and error handling
  const calculateScheduleStats = useCallback((schedule: ScheduleEntry[]): ScheduleStats => {
    try {
      if (!Array.isArray(schedule)) {
        console.error('Invalid schedule provided to calculateScheduleStats');
        return {
          totalHours: 0,
          totalEntries: 0,
          completedEntries: 0,
          pendingEntries: 0,
          conflictCount: 0,
          utilizationRate: 0,
          averageHoursPerCleaner: 0,
        };
      }

      const scheduleKey = schedule.map(e => `${e?.id || ''}-${e?.status || ''}-${e?.hours || 0}`).filter(Boolean).sort().join(',');
      
      if (statsCache.has(scheduleKey)) {
        return statsCache.get(scheduleKey)!;
      }

      const totalEntries = schedule.length;
      let totalHours = 0;
      let completedEntries = 0;
      let pendingEntries = 0;
      
      const cleanerHours = new Map<string, number>();
      
      // Single pass through the data
      for (const entry of schedule) {
        if (!entry) continue;
        
        const hours = typeof entry.hours === 'number' ? entry.hours : 0;
        totalHours += hours;
        
        if (entry.status === 'completed') completedEntries++;
        else if (entry.status === 'scheduled') pendingEntries++;
        
        const cleanerName = entry.cleanerName || 'Unknown';
        const current = cleanerHours.get(cleanerName) || 0;
        cleanerHours.set(cleanerName, current + hours);
      }
      
      const conflicts = detectConflicts(schedule);
      const averageHoursPerCleaner = cleanerHours.size > 0 
        ? Array.from(cleanerHours.values()).reduce((sum, hours) => sum + hours, 0) / cleanerHours.size
        : 0;
      const utilizationRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

      const stats: ScheduleStats = {
        totalHours,
        totalEntries,
        completedEntries,
        pendingEntries,
        conflictCount: conflicts.length,
        utilizationRate,
        averageHoursPerCleaner,
      };

      // Cache the result
      statsCache.set(scheduleKey, stats);
      return stats;
    } catch (error) {
      console.error('Error calculating schedule stats:', error);
      return {
        totalHours: 0,
        totalEntries: 0,
        completedEntries: 0,
        pendingEntries: 0,
        conflictCount: 0,
        utilizationRate: 0,
        averageHoursPerCleaner: 0,
      };
    }
  }, [detectConflicts]);

  // Debounced save to prevent excessive storage writes
  const debouncedSave = useCallback(async (schedules: WeeklySchedule) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('Saving schedules to storage (debounced)', Object.keys(schedules).length, 'weeks');
        const serializedData = JSON.stringify(schedules);
        console.log('Serialized data size:', serializedData.length, 'characters');
        await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_SCHEDULES, serializedData);
        console.log('Schedules saved successfully to AsyncStorage');
      } catch (err) {
        console.error('Error saving schedules:', err);
        setError('Failed to save schedule data');
      }
    }, 300); // Reduced debounce time for better responsiveness
  }, []);

  // Optimized data loading with caching and error handling
  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      console.log('Loading schedule data...');
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const schedulesData = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SCHEDULES);

      if (schedulesData) {
        const parsedSchedules = JSON.parse(schedulesData);
        
        if (typeof parsedSchedules === 'object' && parsedSchedules !== null) {
          // Validate and clean the data
          const cleanedSchedules: WeeklySchedule = {};
          
          Object.entries(parsedSchedules).forEach(([weekId, entries]) => {
            if (Array.isArray(entries)) {
              const validEntries = entries.filter(entry => 
                entry && 
                typeof entry === 'object' && 
                entry.id && 
                entry.clientName && 
                entry.buildingName
              );
              if (validEntries.length > 0) {
                cleanedSchedules[weekId] = validEntries as ScheduleEntry[];
              }
            }
          });

          setWeeklySchedules(cleanedSchedules);
          
          // Populate cache
          Object.entries(cleanedSchedules).forEach(([weekId, entries]) => {
            scheduleCache.set(weekId, entries);
          });
          
          console.log('Loaded schedules:', Object.keys(cleanedSchedules).length, 'weeks');
        } else {
          console.warn('Invalid schedule data format');
          setWeeklySchedules({});
        }
      } else {
        console.log('No existing schedule data found');
        setWeeklySchedules({});
      }
    } catch (err) {
      console.error('Error loading schedule data:', err);
      setError('Failed to load schedule data');
      setWeeklySchedules({});
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Optimized schedule retrieval with caching and error handling
  const getWeekSchedule = useCallback((weekId: string, forceRefresh: boolean = false): ScheduleEntry[] => {
    try {
      if (!weekId || typeof weekId !== 'string') {
        console.error('Invalid weekId provided to getWeekSchedule:', weekId);
        return [];
      }

      // Check cache first (unless force refresh is requested)
      if (!forceRefresh && scheduleCache.has(weekId)) {
        const cachedSchedule = scheduleCache.get(weekId)!;
        console.log('Returning cached schedule for week:', weekId, 'entries:', cachedSchedule.length);
        return cachedSchedule;
      }
      
      console.log('Getting fresh schedule data for week:', weekId, 'forceRefresh:', forceRefresh);
      const schedule = weeklySchedules[weekId] || [];
      console.log('Raw schedule from storage:', schedule.map(e => ({
        id: e?.id,
        cleanerName: e?.cleanerName,
        cleanerNames: e?.cleanerNames,
        hours: e?.hours,
        buildingName: e?.buildingName
      })));
      
      // Validate and sort once and cache
      const validSchedule = schedule.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        entry.id && 
        entry.clientName && 
        entry.buildingName
      );

      const sortedSchedule = validSchedule.sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });
      
      console.log('Processed schedule for week:', weekId, 'entries:', sortedSchedule.length);
      console.log('Processed schedule details:', sortedSchedule.map(e => ({
        id: e.id,
        cleanerName: e.cleanerName,
        cleanerNames: e.cleanerNames,
        hours: e.hours,
        buildingName: e.buildingName
      })));
      
      // Cache the result
      scheduleCache.set(weekId, sortedSchedule);
      return sortedSchedule;
    } catch (error) {
      console.error('Error getting week schedule:', error);
      return [];
    }
  }, [weeklySchedules]);

  // Optimized update with batching and error handling
  const updateWeekSchedule = useCallback(async (weekId: string, entries: ScheduleEntry[]) => {
    try {
      console.log('=== UPDATING WEEK SCHEDULE ===');
      console.log('Week ID:', weekId);
      console.log('Entries count:', entries.length);
      console.log('Entries being saved:', entries.map(e => ({
        id: e.id,
        cleanerName: e.cleanerName,
        cleanerNames: e.cleanerNames,
        hours: e.hours,
        buildingName: e.buildingName,
        day: e.day
      })));
      
      if (!weekId || typeof weekId !== 'string') {
        throw new Error('Invalid weekId provided');
      }

      if (!Array.isArray(entries)) {
        throw new Error('Invalid entries provided');
      }

      // Validate entries more thoroughly
      const validatedEntries = entries
        .filter(entry => {
          if (!entry || typeof entry !== 'object') {
            console.warn('Filtering out invalid entry:', entry);
            return false;
          }
          if (!entry.id || !entry.clientName || !entry.buildingName) {
            console.warn('Filtering out entry with missing required fields:', entry);
            return false;
          }
          return true;
        })
        .map(entry => ({
          ...entry,
          weekId,
          date: entry.date || weekId,
          id: entry.id || String(Date.now() + Math.random()),
          hours: typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours as any) || 0,
          status: entry.status || 'scheduled',
          day: entry.day || 'monday'
        }));

      console.log('Validated entries for save:', validatedEntries.map(e => ({
        id: e.id,
        cleanerName: e.cleanerName,
        cleanerNames: e.cleanerNames,
        hours: e.hours,
        buildingName: e.buildingName,
        day: e.day
      })));

      const updatedSchedules = {
        ...weeklySchedules,
        [weekId]: validatedEntries,
      };
      
      console.log('Setting updated schedules for week:', weekId);
      setWeeklySchedules(updatedSchedules);
      
      // Update cache immediately
      scheduleCache.set(weekId, validatedEntries);
      
      // Clear related caches to force refresh
      statsCache.clear();
      conflictsCache.clear();
      
      // Force immediate save instead of debounced save for critical updates
      try {
        console.log('Force saving schedules to storage immediately');
        const serializedData = JSON.stringify(updatedSchedules);
        await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_SCHEDULES, serializedData);
        console.log('Schedules force saved successfully to AsyncStorage');
        
        // Verify the save by reading it back
        const verifyData = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SCHEDULES);
        if (verifyData) {
          const parsedData = JSON.parse(verifyData);
          const savedWeekData = parsedData[weekId];
          console.log('Verification: Data successfully saved and retrieved for week:', weekId);
          console.log('Verification: Saved entries count:', savedWeekData?.length || 0);
          if (savedWeekData && savedWeekData.length > 0) {
            console.log('Verification: Sample saved entry:', {
              id: savedWeekData[0].id,
              cleanerName: savedWeekData[0].cleanerName,
              cleanerNames: savedWeekData[0].cleanerNames,
              hours: savedWeekData[0].hours
            });
          }
        } else {
          console.error('Verification failed: No data found after save');
        }
      } catch (saveError) {
        console.error('Error force saving schedules:', saveError);
        // Fall back to debounced save
        debouncedSave(updatedSchedules);
      }
      
      console.log('=== WEEK SCHEDULE UPDATE COMPLETED ===');
    } catch (err) {
      console.error('=== WEEK SCHEDULE UPDATE FAILED ===');
      console.error('Error updating week schedule:', err);
      setError('Failed to update schedule');
      throw err;
    }
  }, [weeklySchedules, debouncedSave]);

  // Optimized stats retrieval with error handling
  const getWeekStats = useCallback((weekId: string): ScheduleStats => {
    try {
      const schedule = getWeekSchedule(weekId);
      return calculateScheduleStats(schedule);
    } catch (error) {
      console.error('Error getting week stats:', error);
      return {
        totalHours: 0,
        totalEntries: 0,
        completedEntries: 0,
        pendingEntries: 0,
        conflictCount: 0,
        utilizationRate: 0,
        averageHoursPerCleaner: 0,
      };
    }
  }, [getWeekSchedule, calculateScheduleStats]);

  // Optimized conflicts retrieval with error handling
  const getWeekConflicts = useCallback((weekId: string): ScheduleConflict[] => {
    try {
      const schedule = getWeekSchedule(weekId);
      return detectConflicts(schedule);
    } catch (error) {
      console.error('Error getting week conflicts:', error);
      return [];
    }
  }, [getWeekSchedule, detectConflicts]);

  // Batch operations for better performance with error handling
  const addScheduleEntry = useCallback(async (weekId: string, entry: ScheduleEntry) => {
    try {
      console.log('=== ADDING SCHEDULE ENTRY ===');
      console.log('Week ID:', weekId);
      console.log('Entry:', {
        id: entry.id,
        cleanerName: entry.cleanerName,
        cleanerNames: entry.cleanerNames,
        hours: entry.hours,
        buildingName: entry.buildingName,
        day: entry.day
      });
      
      if (!weekId || !entry) {
        throw new Error('Invalid parameters for addScheduleEntry');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      console.log('Current week schedule has', currentWeekSchedule.length, 'entries');
      
      const validatedEntry = {
        ...entry,
        weekId,
        id: entry.id || String(Date.now() + Math.random()),
        date: entry.date || weekId,
        hours: typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours as any) || 0,
        status: entry.status || 'scheduled',
        day: entry.day || 'monday'
      };

      console.log('Validated entry:', {
        id: validatedEntry.id,
        cleanerName: validatedEntry.cleanerName,
        cleanerNames: validatedEntry.cleanerNames,
        hours: validatedEntry.hours,
        buildingName: validatedEntry.buildingName,
        day: validatedEntry.day
      });

      const updatedSchedule = [...currentWeekSchedule, validatedEntry];
      console.log('Updated schedule will have', updatedSchedule.length, 'entries');
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      console.log('=== SCHEDULE ENTRY ADDED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== ADD SCHEDULE ENTRY FAILED ===');
      console.error('Error adding schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const updateScheduleEntry = useCallback(async (weekId: string, entryId: string, updates: Partial<ScheduleEntry>) => {
    try {
      console.log('=== UPDATING SCHEDULE ENTRY ===');
      console.log('Week ID:', weekId);
      console.log('Entry ID:', entryId);
      console.log('Updates:', JSON.stringify(updates));
      
      if (!weekId || !entryId || !updates) {
        throw new Error('Invalid parameters for updateScheduleEntry');
      }

      // Check if updates object has any meaningful changes
      if (Object.keys(updates).length === 0) {
        console.log('No updates provided, skipping update');
        return;
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      console.log('Current week schedule has', currentWeekSchedule.length, 'entries');
      
      const entryIndex = currentWeekSchedule.findIndex(entry => entry?.id === entryId);
      
      if (entryIndex === -1) {
        throw new Error(`Schedule entry ${entryId} not found in week ${weekId}`);
      }

      const originalEntry = currentWeekSchedule[entryIndex];
      console.log('Original entry before update:', JSON.stringify({
        id: originalEntry.id,
        cleanerName: originalEntry.cleanerName,
        cleanerNames: originalEntry.cleanerNames,
        cleanerIds: originalEntry.cleanerIds,
        hours: originalEntry.hours,
        startTime: originalEntry.startTime
      }));

      const updatedEntry = { 
        ...originalEntry, 
        ...updates,
        weekId,
        hours: updates.hours !== undefined ? 
          (typeof updates.hours === 'number' ? updates.hours : parseFloat(updates.hours as any) || 0) :
          originalEntry.hours
      };
      
      console.log('Updated entry after merge:', JSON.stringify({
        id: updatedEntry.id,
        cleanerName: updatedEntry.cleanerName,
        cleanerNames: updatedEntry.cleanerNames,
        cleanerIds: updatedEntry.cleanerIds,
        hours: updatedEntry.hours,
        startTime: updatedEntry.startTime
      }));
      
      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      console.log('Updated schedule will have', updatedSchedule.length, 'entries');
      
      // Force clear cache to ensure fresh data
      scheduleCache.delete(weekId);
      statsCache.clear();
      conflictsCache.clear();
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      console.log('=== SCHEDULE ENTRY UPDATED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== UPDATE SCHEDULE ENTRY FAILED ===');
      console.error('Error updating schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const deleteScheduleEntry = useCallback(async (weekId: string, entryId: string) => {
    try {
      console.log('=== DELETING SCHEDULE ENTRY ===');
      console.log('Week ID:', weekId);
      console.log('Entry ID:', entryId);
      
      if (!weekId || !entryId) {
        throw new Error('Invalid parameters for deleteScheduleEntry');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      console.log('Current week schedule has', currentWeekSchedule.length, 'entries');
      
      const entryToDelete = currentWeekSchedule.find(entry => entry?.id === entryId);
      if (!entryToDelete) {
        throw new Error(`Schedule entry ${entryId} not found in week ${weekId}`);
      }
      
      console.log('Found entry to delete:', {
        id: entryToDelete.id,
        cleanerName: entryToDelete.cleanerName,
        buildingName: entryToDelete.buildingName
      });
      
      const updatedSchedule = currentWeekSchedule.filter(entry => entry?.id !== entryId);
      console.log('Updated schedule will have', updatedSchedule.length, 'entries');
      
      // Force clear cache to ensure fresh data
      scheduleCache.delete(weekId);
      statsCache.clear();
      conflictsCache.clear();
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      console.log('=== SCHEDULE ENTRY DELETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('=== DELETE SCHEDULE ENTRY FAILED ===');
      console.error('Error deleting schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  // Bulk operations with optimized performance and error handling
  const bulkUpdateEntries = useCallback(async (weekId: string, entryIds: string[], updates: Partial<ScheduleEntry>) => {
    try {
      if (!weekId || !Array.isArray(entryIds) || !updates) {
        throw new Error('Invalid parameters for bulkUpdateEntries');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIdSet = new Set(entryIds); // O(1) lookup
      
      const updatedSchedule = currentWeekSchedule.map(entry =>
        entry && entryIdSet.has(entry.id) ? { ...entry, ...updates, weekId } : entry
      );
      
      await updateWeekSchedule(weekId, updatedSchedule);
    } catch (error) {
      console.error('Error bulk updating entries:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const bulkDeleteEntries = useCallback(async (weekId: string, entryIds: string[]) => {
    try {
      if (!weekId || !Array.isArray(entryIds)) {
        throw new Error('Invalid parameters for bulkDeleteEntries');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIdSet = new Set(entryIds); // O(1) lookup
      
      const updatedSchedule = currentWeekSchedule.filter(entry => entry && !entryIdSet.has(entry.id));
      await updateWeekSchedule(weekId, updatedSchedule);
    } catch (error) {
      console.error('Error bulk deleting entries:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  // Clear caches when needed
  const clearCaches = useCallback(() => {
    try {
      scheduleCache.clear();
      statsCache.clear();
      conflictsCache.clear();
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }, []);

  const clearWeekSchedule = useCallback(async (weekId: string) => {
    try {
      if (!weekId) {
        throw new Error('Invalid weekId for clearWeekSchedule');
      }

      const updatedSchedules = { ...weeklySchedules };
      delete updatedSchedules[weekId];
      setWeeklySchedules(updatedSchedules);
      scheduleCache.delete(weekId);
      debouncedSave(updatedSchedules);
    } catch (error) {
      console.error('Error clearing week schedule:', error);
      setError('Failed to clear week schedule');
    }
  }, [weeklySchedules, debouncedSave]);

  const resetAllSchedules = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.WEEKLY_SCHEDULES,
        STORAGE_KEYS.SCHEDULE_CACHE,
        STORAGE_KEYS.LAST_CLEANUP_DATE,
      ]);
      setWeeklySchedules({});
      clearCaches();
    } catch (err) {
      console.error('Error resetting schedules:', err);
      setError('Failed to reset schedules');
    }
  }, [clearCaches]);

  // Helper functions for multiple cleaners
  const getEntryCleaners = useCallback((entry: ScheduleEntry): string[] => {
    try {
      if (entry.cleanerNames && entry.cleanerNames.length > 0) {
        return entry.cleanerNames;
      }
      // Fallback to single cleaner for backward compatibility
      return entry.cleanerName ? [entry.cleanerName] : [];
    } catch (error) {
      console.error('Error getting entry cleaners:', error);
      return [];
    }
  }, []);

  const addCleanerToEntry = useCallback(async (weekId: string, entryId: string, cleanerName: string, cleanerId?: string) => {
    try {
      console.log('Adding cleaner to entry:', { weekId, entryId, cleanerName, cleanerId });
      
      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIndex = currentWeekSchedule.findIndex(entry => entry?.id === entryId);
      
      if (entryIndex === -1) {
        throw new Error(`Schedule entry ${entryId} not found in week ${weekId}`);
      }

      const entry = currentWeekSchedule[entryIndex];
      const currentCleaners = getEntryCleaners(entry);
      
      // Check if cleaner is already assigned
      if (currentCleaners.includes(cleanerName)) {
        console.log('Cleaner already assigned to this entry');
        return;
      }

      const updatedCleaners = [...currentCleaners, cleanerName];
      const updatedCleanerIds = entry.cleanerIds ? [...entry.cleanerIds] : [];
      if (cleanerId && !updatedCleanerIds.includes(cleanerId)) {
        updatedCleanerIds.push(cleanerId);
      }

      const updatedEntry = {
        ...entry,
        cleanerNames: updatedCleaners,
        cleanerIds: updatedCleanerIds,
        // Update single cleaner field for backward compatibility
        cleanerName: updatedCleaners[0] || '',
      };

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      console.log('Cleaner added to entry successfully');
    } catch (error) {
      console.error('Error adding cleaner to entry:', error);
      throw error;
    }
  }, [getWeekSchedule, getEntryCleaners, updateWeekSchedule]);

  const removeCleanerFromEntry = useCallback(async (weekId: string, entryId: string, cleanerName: string) => {
    try {
      console.log('Removing cleaner from entry:', { weekId, entryId, cleanerName });
      
      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIndex = currentWeekSchedule.findIndex(entry => entry?.id === entryId);
      
      if (entryIndex === -1) {
        throw new Error(`Schedule entry ${entryId} not found in week ${weekId}`);
      }

      const entry = currentWeekSchedule[entryIndex];
      const currentCleaners = getEntryCleaners(entry);
      
      // Check if cleaner is assigned
      if (!currentCleaners.includes(cleanerName)) {
        console.log('Cleaner not assigned to this entry');
        return;
      }

      // Don't allow removing the last cleaner
      if (currentCleaners.length <= 1) {
        throw new Error('Cannot remove the last cleaner from an entry');
      }

      const updatedCleaners = currentCleaners.filter(name => name !== cleanerName);
      const updatedCleanerIds = entry.cleanerIds ? 
        entry.cleanerIds.filter((_, index) => currentCleaners[index] !== cleanerName) : [];

      const updatedEntry = {
        ...entry,
        cleanerNames: updatedCleaners,
        cleanerIds: updatedCleanerIds,
        // Update single cleaner field for backward compatibility
        cleanerName: updatedCleaners[0] || '',
      };

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      console.log('Cleaner removed from entry successfully');
    } catch (error) {
      console.error('Error removing cleaner from entry:', error);
      throw error;
    }
  }, [getWeekSchedule, getEntryCleaners, updateWeekSchedule]);

  const updateEntryCleaners = useCallback(async (weekId: string, entryId: string, cleanerNames: string[], cleanerIds?: string[]) => {
    try {
      console.log('Updating entry cleaners:', { weekId, entryId, cleanerNames, cleanerIds });
      
      if (!cleanerNames || cleanerNames.length === 0) {
        throw new Error('At least one cleaner must be assigned to an entry');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIndex = currentWeekSchedule.findIndex(entry => entry?.id === entryId);
      
      if (entryIndex === -1) {
        throw new Error(`Schedule entry ${entryId} not found in week ${weekId}`);
      }

      const entry = currentWeekSchedule[entryIndex];
      const updatedEntry = {
        ...entry,
        cleanerNames: [...cleanerNames],
        cleanerIds: cleanerIds ? [...cleanerIds] : entry.cleanerIds,
        // Update single cleaner field for backward compatibility
        cleanerName: cleanerNames[0] || '',
      };

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      console.log('Entry cleaners updated successfully');
    } catch (error) {
      console.error('Error updating entry cleaners:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Data
    weeklySchedules,
    isLoading,
    error,
    
    // Basic operations
    getWeekSchedule,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    updateWeekSchedule,
    clearWeekSchedule,
    resetAllSchedules,
    
    // Enhanced features
    getWeekStats,
    getWeekConflicts,
    detectConflicts,
    calculateScheduleStats,
    bulkUpdateEntries,
    bulkDeleteEntries,
    
    // Multiple cleaners operations
    getEntryCleaners,
    addCleanerToEntry,
    removeCleanerFromEntry,
    updateEntryCleaners,
    
    // Utilities
    clearError,
    clearCaches,
    loadData,
    getCurrentWeekId,
    getWeekIdFromDate,
  };
};
