
import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';

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
  isProject?: boolean;
  projectId?: string;
  projectName?: string;
  paymentType?: 'hourly' | 'flat_rate';
  flatRateAmount?: number;
  hourlyRate?: number;
  overtimeRate?: number;
  bonusAmount?: number;
  deductions?: number;
  address?: string;
}

interface WeeklySchedule {
  [weekId: string]: ScheduleEntry[];
}

const STORAGE_KEY = 'schedule_data_v8';

export const useScheduleManager = () => {
  const [schedules, setSchedules] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<Map<string, ScheduleEntry[]>>(new Map());
  const syncQueueRef = useRef<Set<string>>(new Set());

  // Load schedules from AsyncStorage
  const loadSchedules = useCallback(async () => {
    try {
      console.log('📂 Loading schedules from storage...');
      setIsLoading(true);
      
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setSchedules(parsed);
        cacheRef.current.clear();
        console.log('✅ Schedules loaded:', Object.keys(parsed).length, 'weeks');
      } else {
        console.log('ℹ️ No schedules found in storage');
        setSchedules({});
      }
    } catch (err) {
      console.error('❌ Error loading schedules:', err);
      setError('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save schedules to AsyncStorage
  const saveSchedules = useCallback(async (data: WeeklySchedule) => {
    try {
      console.log('💾 Saving schedules to storage...');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Schedules saved');
    } catch (err) {
      console.error('❌ Error saving schedules:', err);
      setError('Failed to save schedules');
      throw err;
    }
  }, []);

  // Get week ID from date
  const getWeekId = useCallback((date: Date): string => {
    try {
      const startOfWeek = new Date(date);
      const dayOfWeek = startOfWeek.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const year = startOfWeek.getFullYear();
      const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const day = String(startOfWeek.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (err) {
      console.error('Error calculating week ID:', err);
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Get current week ID
  const getCurrentWeekId = useCallback((): string => {
    return getWeekId(new Date());
  }, [getWeekId]);

  // Get week schedule
  const getWeekSchedule = useCallback((weekId: string): ScheduleEntry[] => {
    if (!weekId) return [];
    
    if (cacheRef.current.has(weekId)) {
      return cacheRef.current.get(weekId) || [];
    }
    
    const schedule = schedules[weekId] || [];
    cacheRef.current.set(weekId, schedule);
    return schedule;
  }, [schedules]);

  // Add schedule entry
  const addEntry = useCallback(async (weekId: string, entry: ScheduleEntry) => {
    try {
      console.log('➕ Adding entry:', entry.id);
      
      const currentSchedule = getWeekSchedule(weekId);
      const updated = [...currentSchedule, entry];
      
      const newSchedules = { ...schedules, [weekId]: updated };
      setSchedules(newSchedules);
      cacheRef.current.set(weekId, updated);
      
      await saveSchedules(newSchedules);
      
      // Queue for Supabase sync
      syncQueueRef.current.add(entry.id);
      
      console.log('✅ Entry added');
    } catch (err) {
      console.error('❌ Error adding entry:', err);
      throw err;
    }
  }, [schedules, getWeekSchedule, saveSchedules]);

  // Update schedule entry
  const updateEntry = useCallback(async (weekId: string, entryId: string, updates: Partial<ScheduleEntry>) => {
    try {
      console.log('✏️ Updating entry:', entryId);
      
      const currentSchedule = getWeekSchedule(weekId);
      const index = currentSchedule.findIndex(e => e.id === entryId);
      
      if (index === -1) {
        throw new Error('Entry not found');
      }
      
      const updated = [...currentSchedule];
      updated[index] = { ...updated[index], ...updates };
      
      const newSchedules = { ...schedules, [weekId]: updated };
      setSchedules(newSchedules);
      cacheRef.current.set(weekId, updated);
      
      await saveSchedules(newSchedules);
      
      // Queue for Supabase sync
      syncQueueRef.current.add(entryId);
      
      console.log('✅ Entry updated');
    } catch (err) {
      console.error('❌ Error updating entry:', err);
      throw err;
    }
  }, [schedules, getWeekSchedule, saveSchedules]);

  // Delete schedule entry
  const deleteEntry = useCallback(async (weekId: string, entryId: string) => {
    try {
      console.log('🗑️ Deleting entry:', entryId);
      
      const currentSchedule = getWeekSchedule(weekId);
      const updated = currentSchedule.filter(e => e.id !== entryId);
      
      const newSchedules = { ...schedules, [weekId]: updated };
      setSchedules(newSchedules);
      cacheRef.current.set(weekId, updated);
      
      await saveSchedules(newSchedules);
      
      // Queue for Supabase sync
      syncQueueRef.current.add(entryId);
      
      console.log('✅ Entry deleted');
    } catch (err) {
      console.error('❌ Error deleting entry:', err);
      throw err;
    }
  }, [schedules, getWeekSchedule, saveSchedules]);

  // Sync to Supabase
  const syncToSupabase = useCallback(async () => {
    if (syncQueueRef.current.size === 0) {
      console.log('ℹ️ No entries to sync');
      return;
    }

    try {
      console.log('🔄 Syncing to Supabase...');
      setIsSyncing(true);
      
      const entriesToSync: ScheduleEntry[] = [];
      
      Object.values(schedules).forEach(weekSchedule => {
        weekSchedule.forEach(entry => {
          if (syncQueueRef.current.has(entry.id)) {
            entriesToSync.push(entry);
          }
        });
      });

      for (const entry of entriesToSync) {
        const dbEntry = {
          id: entry.id,
          client_name: entry.clientName,
          building_name: entry.buildingName,
          cleaner_name: entry.cleanerName,
          cleaner_names: entry.cleanerNames || [entry.cleanerName],
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
          is_project: entry.isProject || false,
          project_id: entry.projectId,
          project_name: entry.projectName,
          payment_type: entry.paymentType || 'hourly',
          flat_rate_amount: entry.flatRateAmount || 0,
          hourly_rate: entry.hourlyRate || 15,
          updated_at: new Date().toISOString(),
        };

        // Check if entry exists
        const { data: existing } = await supabase
          .from('schedule_entries')
          .select('id')
          .eq('id', entry.id)
          .single();

        if (existing) {
          // Update
          const { error } = await supabase
            .from('schedule_entries')
            .update(dbEntry)
            .eq('id', entry.id);
          
          if (error) throw error;
          console.log('✅ Synced update:', entry.id);
        } else {
          // Insert
          const { error } = await supabase
            .from('schedule_entries')
            .insert(dbEntry);
          
          if (error) throw error;
          console.log('✅ Synced insert:', entry.id);
        }
      }

      syncQueueRef.current.clear();
      console.log('✅ Sync completed');
    } catch (err) {
      console.error('❌ Sync error:', err);
      setError('Failed to sync to database');
    } finally {
      setIsSyncing(false);
    }
  }, [schedules]);

  // Load from Supabase
  const loadFromSupabase = useCallback(async () => {
    try {
      console.log('📥 Loading from Supabase...');
      
      const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const entriesByWeek: WeeklySchedule = {};
        
        data.forEach((dbEntry: any) => {
          const entry: ScheduleEntry = {
            id: dbEntry.id,
            clientName: dbEntry.client_name,
            buildingName: dbEntry.building_name,
            cleanerName: dbEntry.cleaner_name,
            cleanerNames: dbEntry.cleaner_names,
            cleanerIds: dbEntry.cleaner_ids,
            hours: parseFloat(dbEntry.hours),
            day: dbEntry.day,
            date: dbEntry.date,
            startTime: dbEntry.start_time,
            endTime: dbEntry.end_time,
            status: dbEntry.status,
            weekId: dbEntry.week_id,
            notes: dbEntry.notes,
            priority: dbEntry.priority,
            isRecurring: dbEntry.is_recurring,
            recurringId: dbEntry.recurring_id,
            isProject: dbEntry.is_project,
            projectId: dbEntry.project_id,
            projectName: dbEntry.project_name,
            paymentType: dbEntry.payment_type,
            flatRateAmount: parseFloat(dbEntry.flat_rate_amount),
            hourlyRate: parseFloat(dbEntry.hourly_rate),
          };

          const weekId = entry.weekId;
          if (!entriesByWeek[weekId]) {
            entriesByWeek[weekId] = [];
          }
          entriesByWeek[weekId].push(entry);
        });

        setSchedules(entriesByWeek);
        cacheRef.current.clear();
        await saveSchedules(entriesByWeek);
        console.log('✅ Loaded from Supabase:', Object.keys(entriesByWeek).length, 'weeks');
      }
    } catch (err) {
      console.error('❌ Error loading from Supabase:', err);
      setError('Failed to load from database');
    }
  }, [saveSchedules]);

  // Initialize
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  return {
    schedules,
    isLoading,
    isSyncing,
    error,
    
    getWeekId,
    getCurrentWeekId,
    getWeekSchedule,
    
    addEntry,
    updateEntry,
    deleteEntry,
    
    syncToSupabase,
    loadFromSupabase,
    
    clearError: () => setError(null),
  };
};
