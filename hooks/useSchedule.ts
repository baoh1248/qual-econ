
/**
 * useSchedule Hook
 * Main hook for schedule management with improved state management and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { scheduleService } from '../services/scheduleService';
import type { ScheduleEntry, WeeklySchedule, ScheduleStats } from '../types/schedule';
import { calculateScheduleStats, calculateEntryPay } from '../utils/scheduleCalculations';

interface UseScheduleOptions {
  autoLoad?: boolean;
  weekId?: string;
}

export function useSchedule(options: UseScheduleOptions = {}) {
  const { autoLoad = true, weekId: initialWeekId } = options;

  const [schedules, setSchedules] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Load all schedules
   */
  const loadSchedules = useCallback(async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const data = await scheduleService.loadSchedules();
      
      if (mountedRef.current) {
        setSchedules(data);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      if (mountedRef.current) {
        setError('Failed to load schedules');
      }
    } finally {
      loadingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Get schedule for specific week
   */
  const getWeekSchedule = useCallback(
    async (weekId: string, forceRefresh = false): Promise<ScheduleEntry[]> => {
      try {
        return await scheduleService.getWeekSchedule(weekId, forceRefresh);
      } catch (err) {
        console.error('Error getting week schedule:', err);
        return [];
      }
    },
    []
  );

  /**
   * Add schedule entry
   */
  const addEntry = useCallback(
    async (weekId: string, entry: ScheduleEntry): Promise<void> => {
      try {
        setIsSyncing(true);
        await scheduleService.addEntry(weekId, entry);
        await loadSchedules();
      } catch (err) {
        console.error('Error adding entry:', err);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [loadSchedules]
  );

  /**
   * Update schedule entry
   */
  const updateEntry = useCallback(
    async (
      weekId: string,
      entryId: string,
      updates: Partial<ScheduleEntry>
    ): Promise<void> => {
      try {
        setIsSyncing(true);
        await scheduleService.updateEntry(weekId, entryId, updates);
        await loadSchedules();
      } catch (err) {
        console.error('Error updating entry:', err);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [loadSchedules]
  );

  /**
   * Delete schedule entry
   */
  const deleteEntry = useCallback(
    async (weekId: string, entryId: string): Promise<void> => {
      try {
        setIsSyncing(true);
        await scheduleService.deleteEntry(weekId, entryId);
        await loadSchedules();
      } catch (err) {
        console.error('Error deleting entry:', err);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [loadSchedules]
  );

  /**
   * Get schedule statistics
   */
  const getStats = useCallback(
    (weekId: string): ScheduleStats => {
      const schedule = schedules[weekId] || [];
      return calculateScheduleStats(schedule);
    },
    [schedules]
  );

  /**
   * Get current week ID
   */
  const getCurrentWeekId = useCallback(() => {
    return scheduleService.getCurrentWeekId();
  }, []);

  /**
   * Get week ID from date
   */
  const getWeekIdFromDate = useCallback((date: Date) => {
    return scheduleService.getWeekId(date);
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    scheduleService.clearCache();
  }, []);

  /**
   * Refresh specific week
   */
  const refreshWeek = useCallback(
    async (weekId: string) => {
      scheduleService.clearWeekCache(weekId);
      await loadSchedules();
    },
    [loadSchedules]
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadSchedules();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoLoad, loadSchedules]);

  return {
    schedules,
    isLoading,
    isSyncing,
    error,
    loadSchedules,
    getWeekSchedule,
    addEntry,
    updateEntry,
    deleteEntry,
    getStats,
    getCurrentWeekId,
    getWeekIdFromDate,
    clearCache,
    refreshWeek,
  };
}
