/**
 * SIMPLIFIED SCHEDULE DATA HOOK
 *
 * This hook provides a clean, simple interface for schedule data management.
 * Key principles:
 * 1. Supabase is the ONLY source of truth - no local caching
 * 2. After any mutation, we refetch from Supabase
 * 3. Simple state management - just entries and loading states
 * 4. No complex caching mechanisms to get out of sync
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import uuid from 'react-native-uuid';

export interface ScheduleEntry {
  id: string;
  clientName: string;
  buildingName: string;
  cleanerName: string;
  cleanerNames?: string[];
  cleanerIds?: string[];
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
  isProject?: boolean;
  projectId?: string;
  projectName?: string;
  paymentType?: 'hourly' | 'flat_rate';
  flatRateAmount?: number;
  hourlyRate?: number;
  overtimeRate?: number;
  bonusAmount?: number;
  deductions?: number;
  totalCalculatedPay?: number;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

// Convert database row to ScheduleEntry
const fromDatabase = (row: any): ScheduleEntry => ({
  id: row.id,
  clientName: row.client_name || '',
  buildingName: row.building_name || '',
  cleanerName: row.cleaner_name || '',
  cleanerNames: row.cleaner_names || [],
  cleanerIds: row.cleaner_ids || [],
  hours: parseFloat(row.hours) || 0,
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
  estimatedDuration: row.estimated_duration || null,
  actualDuration: row.actual_duration || null,
  tags: row.tags || [],
  isProject: row.is_project || false,
  projectId: row.project_id || null,
  projectName: row.project_name || null,
  paymentType: row.payment_type || 'hourly',
  flatRateAmount: parseFloat(row.flat_rate_amount) || 0,
  hourlyRate: parseFloat(row.hourly_rate) || 15,
  overtimeRate: parseFloat(row.overtime_rate) || 1.5,
  bonusAmount: parseFloat(row.bonus_amount) || 0,
  deductions: parseFloat(row.deductions) || 0,
  address: row.address || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// Convert ScheduleEntry to database format
const toDatabase = (entry: ScheduleEntry): any => ({
  id: entry.id,
  client_name: entry.clientName || '',
  building_name: entry.buildingName || '',
  cleaner_name: entry.cleanerName || entry.cleanerNames?.[0] || 'UNASSIGNED',
  cleaner_names: entry.cleanerNames?.length ? entry.cleanerNames : [entry.cleanerName || 'UNASSIGNED'],
  cleaner_ids: entry.cleanerIds || [],
  hours: entry.hours || 0,
  day: (entry.day || 'monday').toLowerCase(),
  date: entry.date || '',
  start_time: entry.startTime || null,
  end_time: entry.endTime || null,
  status: entry.status || 'scheduled',
  week_id: entry.weekId || '',
  notes: entry.notes || null,
  priority: entry.priority || 'medium',
  is_recurring: entry.isRecurring || false,
  recurring_id: entry.recurringId || null,
  estimated_duration: entry.estimatedDuration || null,
  actual_duration: entry.actualDuration || null,
  tags: entry.tags || [],
  is_project: entry.isProject || false,
  project_id: entry.projectId || null,
  project_name: entry.projectName || null,
  payment_type: entry.paymentType || 'hourly',
  flat_rate_amount: entry.flatRateAmount || 0,
  hourly_rate: entry.hourlyRate || 15,
  created_at: entry.created_at || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Get week ID from a date (Monday start)
export const getWeekIdFromDate = (date: Date): string => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useScheduleData = () => {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current week to know what we're displaying
  const currentWeekIdRef = useRef<string>('');

  // Version counter to force re-renders
  const [version, setVersion] = useState(0);

  /**
   * Fetch schedule entries for a specific week from Supabase
   * This is the ONLY way we get data - always fresh from DB
   */
  const fetchWeekSchedule = useCallback(async (weekId: string): Promise<ScheduleEntry[]> => {
    console.log('📥 [useScheduleData] Fetching week:', weekId);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('week_id', weekId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (fetchError) {
        console.error('❌ [useScheduleData] Fetch error:', fetchError);
        throw fetchError;
      }

      const fetchedEntries = (data || []).map(fromDatabase);
      console.log(`✅ [useScheduleData] Fetched ${fetchedEntries.length} entries for week ${weekId}`);

      // Update state
      currentWeekIdRef.current = weekId;
      setEntries(fetchedEntries);
      setVersion(v => v + 1);

      return fetchedEntries;
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error fetching schedule:', err);
      setError(err.message || 'Failed to fetch schedule');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Add a new schedule entry
   * 1. Insert to Supabase
   * 2. Refetch the week to get fresh data
   */
  const addEntry = useCallback(async (entry: Omit<ScheduleEntry, 'id'> & { id?: string }): Promise<ScheduleEntry | null> => {
    console.log('➕ [useScheduleData] Adding entry:', entry.buildingName, entry.day);
    setIsSaving(true);
    setError(null);

    try {
      // Generate ID if not provided
      const entryWithId: ScheduleEntry = {
        ...entry,
        id: entry.id || (uuid.v4() as string),
      } as ScheduleEntry;

      const dbEntry = toDatabase(entryWithId);
      console.log('📤 [useScheduleData] DB entry:', { id: dbEntry.id, building: dbEntry.building_name, week: dbEntry.week_id });

      const { data, error: insertError } = await supabase
        .from('schedule_entries')
        .insert(dbEntry)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [useScheduleData] Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ [useScheduleData] Entry inserted successfully:', data.id);

      // Refetch the week to ensure UI is in sync
      const weekId = entryWithId.weekId || currentWeekIdRef.current;
      if (weekId) {
        console.log('🔄 [useScheduleData] Refetching week after insert:', weekId);
        await fetchWeekSchedule(weekId);
      }

      return fromDatabase(data);
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error adding entry:', err);
      setError(err.message || 'Failed to add entry');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [fetchWeekSchedule]);

  /**
   * Update an existing schedule entry
   * 1. Update in Supabase
   * 2. Refetch the week to get fresh data
   */
  const updateEntry = useCallback(async (id: string, updates: Partial<ScheduleEntry>): Promise<ScheduleEntry | null> => {
    console.log('✏️ [useScheduleData] Updating entry:', id, updates);
    setIsSaving(true);
    setError(null);

    try {
      // Find the existing entry to merge with updates
      const existingEntry = entries.find(e => e.id === id);
      if (!existingEntry) {
        throw new Error(`Entry ${id} not found`);
      }

      const mergedEntry: ScheduleEntry = {
        ...existingEntry,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const dbEntry = toDatabase(mergedEntry);

      const { data, error: updateError } = await supabase
        .from('schedule_entries')
        .update(dbEntry)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [useScheduleData] Update error:', updateError);
        throw updateError;
      }

      console.log('✅ [useScheduleData] Entry updated successfully:', data.id);

      // Refetch the week to ensure UI is in sync
      const weekId = mergedEntry.weekId || currentWeekIdRef.current;
      if (weekId) {
        console.log('🔄 [useScheduleData] Refetching week after update:', weekId);
        await fetchWeekSchedule(weekId);
      }

      return fromDatabase(data);
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error updating entry:', err);
      setError(err.message || 'Failed to update entry');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [entries, fetchWeekSchedule]);

  /**
   * Delete a schedule entry
   * 1. Delete from Supabase
   * 2. Refetch the week to get fresh data
   */
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    console.log('🗑️ [useScheduleData] Deleting entry:', id);
    setIsSaving(true);
    setError(null);

    try {
      // Find the entry first to know which week to refetch
      const entryToDelete = entries.find(e => e.id === id);
      const weekId = entryToDelete?.weekId || currentWeekIdRef.current;

      const { error: deleteError } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ [useScheduleData] Delete error:', deleteError);
        throw deleteError;
      }

      console.log('✅ [useScheduleData] Entry deleted successfully');

      // Refetch the week to ensure UI is in sync
      if (weekId) {
        console.log('🔄 [useScheduleData] Refetching week after delete:', weekId);
        await fetchWeekSchedule(weekId);
      }

      return true;
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error deleting entry:', err);
      setError(err.message || 'Failed to delete entry');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [entries, fetchWeekSchedule]);

  /**
   * Bulk update multiple entries
   */
  const bulkUpdateEntries = useCallback(async (ids: string[], updates: Partial<ScheduleEntry>): Promise<boolean> => {
    console.log('✏️ [useScheduleData] Bulk updating entries:', ids.length);
    setIsSaving(true);
    setError(null);

    try {
      // Update each entry
      for (const id of ids) {
        const existingEntry = entries.find(e => e.id === id);
        if (!existingEntry) continue;

        const mergedEntry: ScheduleEntry = {
          ...existingEntry,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const dbEntry = toDatabase(mergedEntry);

        const { error: updateError } = await supabase
          .from('schedule_entries')
          .update(dbEntry)
          .eq('id', id);

        if (updateError) {
          console.error('❌ [useScheduleData] Bulk update error for', id, ':', updateError);
        }
      }

      console.log('✅ [useScheduleData] Bulk update completed');

      // Refetch the week
      if (currentWeekIdRef.current) {
        await fetchWeekSchedule(currentWeekIdRef.current);
      }

      return true;
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error in bulk update:', err);
      setError(err.message || 'Failed to bulk update');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [entries, fetchWeekSchedule]);

  /**
   * Bulk delete multiple entries
   */
  const bulkDeleteEntries = useCallback(async (ids: string[]): Promise<boolean> => {
    console.log('🗑️ [useScheduleData] Bulk deleting entries:', ids.length);
    setIsSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('schedule_entries')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('❌ [useScheduleData] Bulk delete error:', deleteError);
        throw deleteError;
      }

      console.log('✅ [useScheduleData] Bulk delete completed');

      // Refetch the week
      if (currentWeekIdRef.current) {
        await fetchWeekSchedule(currentWeekIdRef.current);
      }

      return true;
    } catch (err: any) {
      console.error('❌ [useScheduleData] Error in bulk delete:', err);
      setError(err.message || 'Failed to bulk delete');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [fetchWeekSchedule]);

  /**
   * Refresh current week data
   */
  const refresh = useCallback(async () => {
    if (currentWeekIdRef.current) {
      console.log('🔄 [useScheduleData] Refreshing current week:', currentWeekIdRef.current);
      return fetchWeekSchedule(currentWeekIdRef.current);
    }
    return [];
  }, [fetchWeekSchedule]);

  /**
   * Clear any error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get current week ID
   */
  const getCurrentWeekId = useCallback((): string => {
    return getWeekIdFromDate(new Date());
  }, []);

  return {
    // State
    entries,
    isLoading,
    isSaving,
    error,
    version, // Can be used as a key to force re-renders
    currentWeekId: currentWeekIdRef.current,

    // Operations
    fetchWeekSchedule,
    addEntry,
    updateEntry,
    deleteEntry,
    bulkUpdateEntries,
    bulkDeleteEntries,
    refresh,
    clearError,

    // Utilities
    getCurrentWeekId,
    getWeekIdFromDate,
  };
};

export default useScheduleData;
