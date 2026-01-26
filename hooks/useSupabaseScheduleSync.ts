
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import type { ScheduleEntry } from './useScheduleStorage';

export const useSupabaseScheduleSync = () => {
  const syncQueueRef = useRef<{ entry: ScheduleEntry; operation: 'insert' | 'update' | 'delete' }[]>([]);
  const syncInProgressRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const convertToDatabaseEntry = useCallback((entry: ScheduleEntry): any => {
    return {
      id: entry.id,
      client_name: entry.clientName,
      building_name: entry.buildingName,
      cleaner_name: entry.cleanerName || (entry.cleanerNames && entry.cleanerNames[0]) || '',
      cleaner_names: entry.cleanerNames || (entry.cleanerName ? [entry.cleanerName] : []),
      cleaner_ids: entry.cleanerIds || [],
      hours: entry.hours,
      day: entry.day,
      date: entry.date,
      start_time: entry.startTime,
      end_time: entry.endTime,
      status: entry.status,
      week_id: entry.weekId,
      notes: entry.notes,
      priority: entry.priority || 'medium',
      is_recurring: entry.isRecurring || false,
      recurring_id: entry.recurringId,
      estimated_duration: entry.estimatedDuration,
      actual_duration: entry.actualDuration,
      tags: entry.tags || [],
      payment_type: entry.paymentType || 'hourly',
      flat_rate_amount: entry.flatRateAmount || 0,
      hourly_rate: entry.hourlyRate || 15,
      updated_at: new Date().toISOString(),
    };
  }, []);

  const processSyncQueue = useCallback(async () => {
    if (syncInProgressRef.current || syncQueueRef.current.length === 0) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      const operations = [...syncQueueRef.current];
      syncQueueRef.current = [];

      console.log(`Processing ${operations.length} sync operations...`);

      for (const { entry, operation } of operations) {
        const dbEntry = convertToDatabaseEntry(entry);

        try {
          switch (operation) {
            case 'insert':
              const { error: insertError } = await supabase
                .from('schedule_entries')
                .insert(dbEntry);
              
              if (insertError) {
                console.error('Insert error:', insertError);
              } else {
                console.log('✅ Entry inserted:', entry.id);
              }
              break;

            case 'update':
              const { error: updateError } = await supabase
                .from('schedule_entries')
                .update(dbEntry)
                .eq('id', entry.id);
              
              if (updateError) {
                console.error('Update error:', updateError);
              } else {
                console.log('✅ Entry updated:', entry.id);
              }
              break;

            case 'delete':
              const { error: deleteError } = await supabase
                .from('schedule_entries')
                .delete()
                .eq('id', entry.id);
              
              if (deleteError) {
                console.error('Delete error:', deleteError);
              } else {
                console.log('✅ Entry deleted:', entry.id);
              }
              break;
          }
        } catch (error) {
          console.error(`Error processing ${operation} for entry ${entry.id}:`, error);
        }
      }

      console.log('✅ Sync queue processed');
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [convertToDatabaseEntry]);

  const queueSync = useCallback((entry: ScheduleEntry, operation: 'insert' | 'update' | 'delete') => {
    console.log(`Queueing ${operation} for entry:`, entry.id);
    syncQueueRef.current.push({ entry, operation });

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      processSyncQueue();
    }, 500);
  }, [processSyncQueue]);

  const syncInsert = useCallback((entry: ScheduleEntry) => {
    queueSync(entry, 'insert');
  }, [queueSync]);

  const syncUpdate = useCallback((entry: ScheduleEntry) => {
    queueSync(entry, 'update');
  }, [queueSync]);

  const syncDelete = useCallback((entry: ScheduleEntry) => {
    queueSync(entry, 'delete');
  }, [queueSync]);

  const syncBulkInsert = useCallback((entries: ScheduleEntry[]) => {
    entries.forEach(entry => queueSync(entry, 'insert'));
  }, [queueSync]);

  const syncBulkUpdate = useCallback((entries: ScheduleEntry[]) => {
    entries.forEach(entry => queueSync(entry, 'update'));
  }, [queueSync]);

  const syncBulkDelete = useCallback((entries: ScheduleEntry[]) => {
    entries.forEach(entry => queueSync(entry, 'delete'));
  }, [queueSync]);

  return {
    syncInsert,
    syncUpdate,
    syncDelete,
    syncBulkInsert,
    syncBulkUpdate,
    syncBulkDelete,
  };
};
