
import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import { useScheduleStorage, type ScheduleEntry } from './useScheduleStorage';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeSyncOptions {
  enabled?: boolean;
  cleanerName?: string; // Filter for specific cleaner
  onSyncComplete?: () => void;
  onError?: (error: Error) => void;
}

export const useRealtimeSync = (options: RealtimeSyncOptions = {}) => {
  const {
    enabled = true,
    cleanerName,
    onSyncComplete,
    onError,
  } = options;

  const {
    getWeekSchedule,
    updateWeekSchedule,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    getCurrentWeekId,
    getWeekIdFromDate,
  } = useScheduleStorage();

  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const syncInProgressRef = useRef(false);

  // Convert database entry to local ScheduleEntry format
  const convertToScheduleEntry = useCallback((dbEntry: any): ScheduleEntry => {
    return {
      id: dbEntry.id,
      clientName: dbEntry.client_name,
      buildingName: dbEntry.building_name,
      cleanerName: dbEntry.cleaner_name || '',
      cleanerNames: dbEntry.cleaner_names || (dbEntry.cleaner_name ? [dbEntry.cleaner_name] : []),
      cleanerIds: dbEntry.cleaner_ids || [],
      hours: parseFloat(dbEntry.hours) || 0,
      day: dbEntry.day,
      date: dbEntry.date,
      startTime: dbEntry.start_time,
      endTime: dbEntry.end_time,
      status: dbEntry.status || 'scheduled',
      weekId: dbEntry.week_id,
      notes: dbEntry.notes,
      priority: dbEntry.priority || 'medium',
      isRecurring: dbEntry.is_recurring || false,
      recurringId: dbEntry.recurring_id,
      estimatedDuration: dbEntry.estimated_duration,
      actualDuration: dbEntry.actual_duration,
      tags: dbEntry.tags || [],
      paymentType: dbEntry.payment_type || 'hourly',
      flatRateAmount: parseFloat(dbEntry.flat_rate_amount) || 0,
      hourlyRate: parseFloat(dbEntry.hourly_rate) || 15,
      isProject: dbEntry.is_project || false,
      projectId: dbEntry.project_id,
      projectName: dbEntry.project_name,
    };
  }, []);

  // Load initial data from Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      console.log('🔄 Loading schedule from Supabase...');
      
      let query = supabase
        .from('schedule_entries')
        .select('*')
        .order('date', { ascending: true });

      // Filter by cleaner if specified
      if (cleanerName) {
        query = query.contains('cleaner_names', [cleanerName]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error loading from Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} entries from Supabase`);
        
        // Group entries by week
        const entriesByWeek: { [weekId: string]: ScheduleEntry[] } = {};
        
        data.forEach((dbEntry: any) => {
          const entry = convertToScheduleEntry(dbEntry);
          const weekId = entry.weekId || getWeekIdFromDate(new Date(entry.date));
          
          if (!entriesByWeek[weekId]) {
            entriesByWeek[weekId] = [];
          }
          entriesByWeek[weekId].push(entry);
        });

        // Update local storage for each week
        for (const [weekId, entries] of Object.entries(entriesByWeek)) {
          console.log(`📦 Updating local storage for week ${weekId} with ${entries.length} entries`);
          await updateWeekSchedule(weekId, entries);
        }

        console.log('✅ Schedule loaded from Supabase and synced to local storage');
        setLastSyncTime(new Date());
      } else {
        console.log('ℹ️ No schedule entries found in Supabase');
      }
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error);
      onError?.(error as Error);
    }
  }, [cleanerName, convertToScheduleEntry, getWeekIdFromDate, updateWeekSchedule, onError]);

  // Handle real-time INSERT events
  const handleInsert = useCallback(async (payload: any) => {
    if (syncInProgressRef.current) {
      console.log('⏸️ Sync in progress, skipping real-time INSERT');
      return;
    }

    try {
      console.log('📨 Real-time INSERT received:', payload);
      const dbEntry = payload.new;
      const entry = convertToScheduleEntry(dbEntry);

      // Check if this entry is relevant (for cleaner filter)
      if (cleanerName) {
        const cleaners = entry.cleanerNames || [entry.cleanerName];
        if (!cleaners.includes(cleanerName)) {
          console.log('⏭️ Entry not relevant for this cleaner, skipping');
          return;
        }
      }

      const weekId = entry.weekId || getWeekIdFromDate(new Date(entry.date));
      const currentSchedule = getWeekSchedule(weekId);
      
      // Check if entry already exists
      const existingEntry = currentSchedule.find(e => e.id === entry.id);
      if (existingEntry) {
        console.log('⏭️ Entry already exists locally, skipping');
        return;
      }

      // Add to local storage (without syncing back to Supabase)
      console.log('📝 Adding real-time entry to local storage');
      const updatedSchedule = [...currentSchedule, entry];
      await updateWeekSchedule(weekId, updatedSchedule);
      console.log('✅ Real-time entry added locally');
      setLastSyncTime(new Date());
      onSyncComplete?.();
    } catch (error) {
      console.error('❌ Error handling real-time INSERT:', error);
      onError?.(error as Error);
    }
  }, [cleanerName, convertToScheduleEntry, getWeekIdFromDate, getWeekSchedule, updateWeekSchedule, onSyncComplete, onError]);

  // Handle real-time UPDATE events
  const handleUpdate = useCallback(async (payload: any) => {
    if (syncInProgressRef.current) {
      console.log('⏸️ Sync in progress, skipping real-time UPDATE');
      return;
    }

    try {
      console.log('📨 Real-time UPDATE received:', payload);
      const dbEntry = payload.new;
      const entry = convertToScheduleEntry(dbEntry);

      // Check if this entry is relevant (for cleaner filter)
      if (cleanerName) {
        const cleaners = entry.cleanerNames || [entry.cleanerName];
        if (!cleaners.includes(cleanerName)) {
          console.log('⏭️ Entry not relevant for this cleaner, skipping');
          return;
        }
      }

      const weekId = entry.weekId || getWeekIdFromDate(new Date(entry.date));
      const currentSchedule = getWeekSchedule(weekId);
      
      // Find and update the entry
      const entryIndex = currentSchedule.findIndex(e => e.id === entry.id);
      if (entryIndex === -1) {
        console.log('⏭️ Entry not found locally, adding it');
        const updatedSchedule = [...currentSchedule, entry];
        await updateWeekSchedule(weekId, updatedSchedule);
      } else {
        console.log('📝 Updating real-time entry in local storage');
        const updatedSchedule = [...currentSchedule];
        updatedSchedule[entryIndex] = entry;
        await updateWeekSchedule(weekId, updatedSchedule);
      }
      
      console.log('✅ Real-time entry updated locally');
      setLastSyncTime(new Date());
      onSyncComplete?.();
    } catch (error) {
      console.error('❌ Error handling real-time UPDATE:', error);
      onError?.(error as Error);
    }
  }, [cleanerName, convertToScheduleEntry, getWeekIdFromDate, getWeekSchedule, updateWeekSchedule, onSyncComplete, onError]);

  // Handle real-time DELETE events
  const handleDelete = useCallback(async (payload: any) => {
    if (syncInProgressRef.current) {
      console.log('⏸️ Sync in progress, skipping real-time DELETE');
      return;
    }

    try {
      console.log('📨 Real-time DELETE received:', payload);
      const dbEntry = payload.old;
      const entryId = dbEntry.id;
      const weekId = dbEntry.week_id;

      if (!weekId || !entryId) {
        console.error('❌ Missing weekId or entryId in DELETE payload');
        return;
      }

      const currentSchedule = getWeekSchedule(weekId);
      
      // Remove the entry
      console.log('📝 Deleting real-time entry from local storage');
      const updatedSchedule = currentSchedule.filter(e => e.id !== entryId);
      await updateWeekSchedule(weekId, updatedSchedule);
      console.log('✅ Real-time entry deleted locally');
      setLastSyncTime(new Date());
      onSyncComplete?.();
    } catch (error) {
      console.error('❌ Error handling real-time DELETE:', error);
      onError?.(error as Error);
    }
  }, [getWeekSchedule, updateWeekSchedule, onSyncComplete, onError]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled) {
      console.log('⏸️ Real-time sync disabled');
      return;
    }

    console.log('🔌 Setting up real-time subscription...');

    // Load initial data
    loadFromSupabase();

    // Create channel for real-time updates
    const channel = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'schedule_entries',
        },
        handleDelete
      )
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up real-time subscription...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, loadFromSupabase, handleInsert, handleUpdate, handleDelete]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    console.log('🔄 Manual sync triggered');
    await loadFromSupabase();
  }, [loadFromSupabase]);

  return {
    isConnected,
    lastSyncTime,
    manualSync,
  };
};
