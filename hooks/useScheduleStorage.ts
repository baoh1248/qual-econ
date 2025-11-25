import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  totalHourlyJobs: number;
  totalFlatRateJobs: number;
  totalHourlyAmount: number;
  totalFlatRateAmount: number;
  totalBonusAmount: number;
  totalDeductions: number;
  totalPayroll: number;
  averageHourlyRate: number;
  overtimeHours: number;
  overtimeAmount: number;
}

const STORAGE_KEYS = {
  WEEKLY_SCHEDULES: 'weekly_schedules_v8',
  SCHEDULE_CACHE: 'schedule_cache_v8',
  LAST_CLEANUP_DATE: 'last_cleanup_date',
  LAST_SUPABASE_SYNC: 'last_supabase_sync',
};

const scheduleCache = new Map<string, ScheduleEntry[]>();
const statsCache = new Map<string, ScheduleStats>();
const conflictsCache = new Map<string, ScheduleConflict[]>();
let cacheVersion = 0;

// Convert database entry to local ScheduleEntry format
const convertFromDatabaseEntry = (dbEntry: any): ScheduleEntry => {
  return {
    id: dbEntry.id,
    clientName: dbEntry.client_name,
    buildingName: dbEntry.building_name,
    cleanerName: dbEntry.cleaner_name || (dbEntry.cleaner_names && dbEntry.cleaner_names[0]) || '',
    cleanerNames: dbEntry.cleaner_names || (dbEntry.cleaner_name ? [dbEntry.cleaner_name] : []),
    cleanerIds: dbEntry.cleaner_ids || [],
    hours: parseFloat(dbEntry.hours) || 0,
    day: dbEntry.day,
    date: dbEntry.date,
    startTime: dbEntry.start_time,
    endTime: dbEntry.end_time,
    status: dbEntry.status,
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
    overtimeRate: parseFloat(dbEntry.overtime_rate) || 1.5,
    bonusAmount: parseFloat(dbEntry.bonus_amount) || 0,
    deductions: parseFloat(dbEntry.deductions) || 0,
    isProject: dbEntry.is_project || false,
    projectId: dbEntry.project_id,
    projectName: dbEntry.project_name,
    address: dbEntry.address,
    created_at: dbEntry.created_at,
    updated_at: dbEntry.updated_at,
  };
};

// Convert local ScheduleEntry to database format
const convertToDatabaseEntry = (entry: ScheduleEntry): any => {
  // Ensure cleaner_name is not empty (required field)
  const cleanerName = entry.cleanerName || (entry.cleanerNames && entry.cleanerNames[0]) || 'UNASSIGNED';
  
  // Ensure cleaner_names array is not empty
  const cleanerNames = entry.cleanerNames && entry.cleanerNames.length > 0 
    ? entry.cleanerNames 
    : (entry.cleanerName ? [entry.cleanerName] : ['UNASSIGNED']);

  // ONLY SEND COLUMNS THAT EXIST IN DATABASE
  const dbEntry: any = {
    id: entry.id,
    client_name: entry.clientName || '',
    building_name: entry.buildingName || '',
    cleaner_name: cleanerName,
    cleaner_names: cleanerNames,
    cleaner_ids: entry.cleanerIds || [],
    hours: entry.hours || 0,
    day: entry.day || 'monday',
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
    payment_type: entry.paymentType || 'hourly',
    flat_rate_amount: entry.flatRateAmount || 0,
    hourly_rate: entry.hourlyRate || 15,
    created_at: entry.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_project: entry.isProject || false,
    project_id: entry.projectId || null,
    project_name: entry.projectName || null,
  };

  // Don't send these columns - they're causing the schema cache error
  // overtime_rate, bonus_amount, deductions, address

  return dbEntry;
};

// Sync entry to Supabase with retry logic
const syncEntryToSupabase = async (
  entry: ScheduleEntry,
  operation: 'insert' | 'update' | 'delete',
  retries: number = 3
): Promise<boolean> => {
  // Validate required fields before attempting sync
  const requiredFields = ['id', 'clientName', 'buildingName', 'cleanerName', 'hours', 'day', 'date', 'weekId'];
  const missingFields = requiredFields.filter(field => {
    const value = (entry as any)[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields: ${missingFields.join(', ')}`);
    console.error('❌ Validation failed:', error);
    throw error;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Syncing ${operation} to Supabase (attempt ${attempt}/${retries}):`, entry.id);

      const dbEntry = convertToDatabaseEntry(entry);
      
      // Log the database entry being sent (for debugging)
      console.log(`📤 Database entry for ${operation}:`, {
        id: dbEntry.id,
        client_name: dbEntry.client_name,
        building_name: dbEntry.building_name,
        cleaner_name: dbEntry.cleaner_name,
        date: dbEntry.date,
        week_id: dbEntry.week_id,
      });

      switch (operation) {
        case 'insert':
          // Check if entry already exists before inserting
          const { data: existingData, error: checkError } = await supabase
            .from('schedule_entries')
            .select('id')
            .eq('id', entry.id)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "not found" which is expected for new entries
            console.warn('⚠️ Error checking existing entry:', checkError);
          }

          if (existingData) {
            console.log('⚠️ Entry already exists in Supabase, skipping insert:', entry.id);
            return true;
          }

          const { data: insertData, error: insertError } = await supabase
            .from('schedule_entries')
            .insert(dbEntry)
            .select();
          
          if (insertError) {
            console.error('❌ Insert error details:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              dbEntry,
            });
            throw insertError;
          }
          
          console.log('✅ Entry inserted to Supabase:', insertData);
          return true;

        case 'update':
          const { data: updateData, error: updateError } = await supabase
            .from('schedule_entries')
            .update(dbEntry)
            .eq('id', entry.id)
            .select();
          
          if (updateError) {
            console.error('❌ Update error details:', {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              dbEntry,
            });
            throw updateError;
          }
          
          console.log('✅ Entry updated in Supabase:', updateData);
          return true;

        case 'delete':
          const { error: deleteError } = await supabase
            .from('schedule_entries')
            .delete()
            .eq('id', entry.id);
          
          if (deleteError) {
            console.error('❌ Delete error details:', {
              code: deleteError.code,
              message: deleteError.message,
              details: deleteError.details,
              hint: deleteError.hint,
            });
            throw deleteError;
          }
          
          console.log('✅ Entry deleted from Supabase');
          return true;
      }
    } catch (error: any) {
      // If it's a duplicate key error, consider it a success
      if (error?.code === '23505') {
        console.log('⚠️ Duplicate key error, entry already exists:', entry.id);
        return true;
      }

      // If it's an invalid UUID format error, log it clearly
      if (error?.code === '22P02' || error?.message?.includes('invalid input syntax for type uuid')) {
        console.error('❌ Invalid UUID format for entry ID:', entry.id);
        console.error('Entry ID must be a valid UUID format. Current ID:', entry.id);
        throw new Error(`Invalid entry ID format. Expected UUID, got: ${entry.id}`);
      }

      console.error(`❌ Sync attempt ${attempt} failed:`, {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        entryId: entry.id,
      });
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        console.error('❌ All sync attempts failed');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      console.log(`⏳ Retrying in ${Math.pow(2, attempt)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return false;
};

export const useScheduleStorage = () => {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const loadingRef = useRef(false);
  const saveQueueRef = useRef<Map<string, ScheduleEntry[]>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const invalidateAllCaches = useCallback(() => {
    console.log('=== INVALIDATING ALL CACHES ===');
    cacheVersion++;
    scheduleCache.clear();
    statsCache.clear();
    conflictsCache.clear();
    console.log('✅ All caches cleared, version:', cacheVersion);
  }, []);

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

  const calculateEntryPay = useCallback((entry: ScheduleEntry, cleanerDefaultRate: number = 15): number => {
    try {
      const paymentType = entry.paymentType || 'hourly';
      const hours = entry.hours || 0;
      
      if (paymentType === 'flat_rate') {
        const flatRate = entry.flatRateAmount || 0;
        const bonus = entry.bonusAmount || 0;
        const deductions = entry.deductions || 0;
        return flatRate + bonus - deductions;
      } else {
        const hourlyRate = entry.hourlyRate || cleanerDefaultRate;
        const overtimeMultiplier = entry.overtimeRate || 1.5;
        
        const regularHours = Math.min(hours, 8);
        const overtimeHours = Math.max(0, hours - 8);
        
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
        const bonus = entry.bonusAmount || 0;
        const deductions = entry.deductions || 0;
        
        return regularPay + overtimePay + bonus - deductions;
      }
    } catch (error) {
      console.error('Error calculating entry pay:', error);
      return 0;
    }
  }, []);

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
          totalHourlyJobs: 0,
          totalFlatRateJobs: 0,
          totalHourlyAmount: 0,
          totalFlatRateAmount: 0,
          totalBonusAmount: 0,
          totalDeductions: 0,
          totalPayroll: 0,
          averageHourlyRate: 0,
          overtimeHours: 0,
          overtimeAmount: 0,
        };
      }

      const scheduleKey = schedule.map(e => 
        `${e?.id || ''}-${e?.status || ''}-${e?.hours || 0}-${e?.paymentType || 'hourly'}-${e?.flatRateAmount || 0}-${e?.hourlyRate || 15}`
      ).filter(Boolean).sort().join(',');
      
      if (statsCache.has(scheduleKey)) {
        return statsCache.get(scheduleKey)!;
      }

      const totalEntries = schedule.length;
      let totalHours = 0;
      let completedEntries = 0;
      let pendingEntries = 0;
      let totalHourlyJobs = 0;
      let totalFlatRateJobs = 0;
      let totalHourlyAmount = 0;
      let totalFlatRateAmount = 0;
      let totalBonusAmount = 0;
      let totalDeductions = 0;
      let totalPayroll = 0;
      let overtimeHours = 0;
      let overtimeAmount = 0;
      let totalHourlyRateSum = 0;
      let hourlyJobCount = 0;
      
      const cleanerHours = new Map<string, number>();
      
      for (const entry of schedule) {
        if (!entry) continue;
        
        const hours = typeof entry.hours === 'number' ? entry.hours : 0;
        totalHours += hours;
        
        if (entry.status === 'completed') completedEntries++;
        else if (entry.status === 'scheduled') pendingEntries++;
        
        const cleanerName = entry.cleanerName || 'Unknown';
        const current = cleanerHours.get(cleanerName) || 0;
        cleanerHours.set(cleanerName, current + hours);

        const paymentType = entry.paymentType || 'hourly';
        const entryPay = calculateEntryPay(entry);
        totalPayroll += entryPay;
        
        totalBonusAmount += entry.bonusAmount || 0;
        totalDeductions += entry.deductions || 0;
        
        if (paymentType === 'flat_rate') {
          totalFlatRateJobs++;
          totalFlatRateAmount += entry.flatRateAmount || 0;
        } else {
          totalHourlyJobs++;
          const hourlyRate = entry.hourlyRate || 15;
          totalHourlyRateSum += hourlyRate;
          hourlyJobCount++;
          
          const entryOvertimeHours = Math.max(0, hours - 8);
          overtimeHours += entryOvertimeHours;
          
          if (entryOvertimeHours > 0) {
            const overtimeMultiplier = entry.overtimeRate || 1.5;
            overtimeAmount += entryOvertimeHours * hourlyRate * (overtimeMultiplier - 1);
          }
          
          totalHourlyAmount += entryPay;
        }
      }
      
      const averageHoursPerCleaner = cleanerHours.size > 0 
        ? Array.from(cleanerHours.values()).reduce((sum, hours) => sum + hours, 0) / cleanerHours.size
        : 0;
      const utilizationRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;
      const averageHourlyRate = hourlyJobCount > 0 ? totalHourlyRateSum / hourlyJobCount : 0;

      const stats: ScheduleStats = {
        totalHours,
        totalEntries,
        completedEntries,
        pendingEntries,
        conflictCount: 0,
        utilizationRate,
        averageHoursPerCleaner,
        totalHourlyJobs,
        totalFlatRateJobs,
        totalHourlyAmount,
        totalFlatRateAmount,
        totalBonusAmount,
        totalDeductions,
        totalPayroll,
        averageHourlyRate,
        overtimeHours,
        overtimeAmount,
      };

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
        totalHourlyJobs: 0,
        totalFlatRateJobs: 0,
        totalHourlyAmount: 0,
        totalFlatRateAmount: 0,
        totalBonusAmount: 0,
        totalDeductions: 0,
        totalPayroll: 0,
        averageHourlyRate: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
      };
    }
  }, [calculateEntryPay]);

  const saveSchedulesImmediately = useCallback(async (schedules: WeeklySchedule) => {
    try {
      console.log('=== IMMEDIATE SAVE OPERATION ===');
      console.log('Saving schedules to storage immediately', Object.keys(schedules).length, 'weeks');
      const serializedData = JSON.stringify(schedules);
      console.log('Serialized data size:', serializedData.length, 'characters');
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_SCHEDULES, serializedData);
      console.log('✅ Schedules saved successfully to AsyncStorage');
      
      const verifyData = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SCHEDULES);
      if (verifyData) {
        const parsedData = JSON.parse(verifyData);
        console.log('✅ Verification: Data successfully saved and retrieved');
        console.log('Verification: Total weeks in storage:', Object.keys(parsedData).length);
      } else {
        console.error('❌ Verification failed: No data found after save');
      }
    } catch (err) {
      console.error('❌ Error in immediate save:', err);
      throw err;
    }
  }, []);

  const debouncedSave = useCallback(async (schedules: WeeklySchedule) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveSchedulesImmediately(schedules);
      } catch (err) {
        console.error('Error in debounced save:', err);
        setError('Failed to save schedule data');
      }
    }, 300);
  }, [saveSchedulesImmediately]);

  const loadFromSupabase = useCallback(async () => {
    try {
      console.log('🔄 Loading schedule data from Supabase...');
      
      // Load all schedule entries from Supabase
      const { data: entries, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Error loading from Supabase:', error);
        throw error;
      }

      if (!entries || entries.length === 0) {
        console.log('ℹ️ No schedule entries found in Supabase');
        return {};
      }

      console.log(`✅ Loaded ${entries.length} entries from Supabase`);

      // Group entries by week_id
      const schedulesByWeek: WeeklySchedule = {};
      
      for (const dbEntry of entries) {
        try {
          const entry = convertFromDatabaseEntry(dbEntry);
          
          // Recalculate week_id from date to ensure consistency
          const entryDate = new Date(entry.date);
          const correctWeekId = getWeekIdFromDate(entryDate);
          entry.weekId = correctWeekId;
          
          // Calculate pay
          entry.totalCalculatedPay = calculateEntryPay(entry, 15);
          
          if (!schedulesByWeek[correctWeekId]) {
            schedulesByWeek[correctWeekId] = [];
          }
          
          schedulesByWeek[correctWeekId].push(entry);
        } catch (conversionError) {
          console.error('❌ Error converting entry:', dbEntry.id, conversionError);
        }
      }

      console.log(`✅ Organized into ${Object.keys(schedulesByWeek).length} weeks`);
      
      // Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SUPABASE_SYNC, new Date().toISOString());
      
      return schedulesByWeek;
    } catch (error) {
      console.error('❌ Error loading from Supabase:', error);
      return {};
    }
  }, [getWeekIdFromDate, calculateEntryPay]);

  const loadData = useCallback(async () => {
    if (loadingRef.current) {
      console.log('⏸️ Load already in progress, skipping...');
      return;
    }
    
    try {
      console.log('🔄 Loading schedule data...');
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      // CRITICAL FIX: ALWAYS load from Supabase when loadData is called explicitly
      console.log('📥 Fetching latest data from Supabase...');
      const supabaseSchedules = await loadFromSupabase();
      
      // Then load from AsyncStorage for any local-only data
      const schedulesData = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SCHEDULES);

      let finalSchedules: WeeklySchedule = {};

      if (schedulesData) {
        const parsedSchedules = JSON.parse(schedulesData);
        
        if (typeof parsedSchedules === 'object' && parsedSchedules !== null) {
          const cleanedSchedules: WeeklySchedule = {};
          
          Object.entries(parsedSchedules).forEach(([weekId, entries]) => {
            if (Array.isArray(entries)) {
              const validEntries = entries.filter(entry => 
                entry && 
                typeof entry === 'object' && 
                entry.id && 
                entry.clientName && 
                entry.buildingName
              ).map(entry => ({
                ...entry,
                paymentType: entry.paymentType || 'hourly',
                hourlyRate: entry.hourlyRate || 15,
                flatRateAmount: entry.flatRateAmount || 0,
                overtimeRate: entry.overtimeRate || 1.5,
                bonusAmount: entry.bonusAmount || 0,
                deductions: entry.deductions || 0,
                totalCalculatedPay: entry.totalCalculatedPay || calculateEntryPay(entry, 15)
              }));
              if (validEntries.length > 0) {
                cleanedSchedules[weekId] = validEntries as ScheduleEntry[];
              }
            }
          });

          finalSchedules = cleanedSchedules;
          console.log('✅ Loaded from AsyncStorage:', Object.keys(cleanedSchedules).length, 'weeks');
        }
      }

      // Merge Supabase data with local data (Supabase takes precedence)
      if (Object.keys(supabaseSchedules).length > 0) {
        console.log('🔄 Merging Supabase data with local data...');
        finalSchedules = { ...finalSchedules, ...supabaseSchedules };
        
        // Save merged data to AsyncStorage
        await saveSchedulesImmediately(finalSchedules);
        console.log('✅ Merged data saved to AsyncStorage');
      }

      setWeeklySchedules(finalSchedules);
      
      // Update cache
      Object.entries(finalSchedules).forEach(([weekId, entries]) => {
        scheduleCache.set(weekId, entries);
      });
      
      console.log('✅ Final schedule loaded:', Object.keys(finalSchedules).length, 'weeks');
    } catch (err) {
      console.error('❌ Error loading schedule data:', err);
      setError('Failed to load schedule data');
      setWeeklySchedules({});
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [calculateEntryPay, loadFromSupabase, saveSchedulesImmediately]);

  const getWeekSchedule = useCallback((weekId: string, forceRefresh: boolean = false): ScheduleEntry[] => {
    try {
      if (!weekId || typeof weekId !== 'string') {
        console.error('Invalid weekId provided to getWeekSchedule:', weekId);
        return [];
      }

      if (!forceRefresh && scheduleCache.has(weekId)) {
        const cachedSchedule = scheduleCache.get(weekId)!;
        console.log('✅ Returning cached schedule for week:', weekId, 'entries:', cachedSchedule.length);
        return cachedSchedule;
      }
      
      console.log('🔄 Getting fresh schedule data for week:', weekId, 'forceRefresh:', forceRefresh);
      const schedule = weeklySchedules[weekId] || [];
      
      const validSchedule = schedule.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        entry.id && 
        entry.clientName && 
        entry.buildingName
      ).map(entry => ({
        ...entry,
        paymentType: entry.paymentType || 'hourly',
        hourlyRate: entry.hourlyRate || 15,
        flatRateAmount: entry.flatRateAmount || 0,
        overtimeRate: entry.overtimeRate || 1.5,
        bonusAmount: entry.bonusAmount || 0,
        deductions: entry.deductions || 0,
        totalCalculatedPay: calculateEntryPay(entry, 15)
      }));

      const sortedSchedule = validSchedule.sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return 0;
      });
      
      console.log('✅ Processed schedule for week:', weekId, 'entries:', sortedSchedule.length);
      
      scheduleCache.set(weekId, sortedSchedule);
      return sortedSchedule;
    } catch (error) {
      console.error('Error getting week schedule:', error);
      return [];
    }
  }, [weeklySchedules, calculateEntryPay]);

  const getScheduleForCleaner = useCallback(async (cleanerName: string): Promise<ScheduleEntry[]> => {
    try {
      console.log('🔄 Getting schedule for cleaner:', cleanerName);
      
      const allEntries: ScheduleEntry[] = [];
      
      Object.keys(weeklySchedules).forEach(weekId => {
        const weekSchedule = getWeekSchedule(weekId);
        allEntries.push(...weekSchedule);
      });
      
      const cleanerEntries = allEntries.filter(entry => {
        if (entry.cleanerNames && entry.cleanerNames.length > 0) {
          return entry.cleanerNames.includes(cleanerName);
        }
        return entry.cleanerName === cleanerName;
      });
      
      console.log(`✅ Found ${cleanerEntries.length} schedule entries for ${cleanerName}`);
      return cleanerEntries;
    } catch (error) {
      console.error('Error getting schedule for cleaner:', error);
      return [];
    }
  }, [weeklySchedules, getWeekSchedule]);

  const updateWeekSchedule = useCallback(async (weekId: string, entries: ScheduleEntry[]) => {
    try {
      console.log('=== UPDATING WEEK SCHEDULE ===');
      console.log('Week ID:', weekId);
      console.log('Entries count:', entries.length);
      
      if (!weekId || typeof weekId !== 'string') {
        throw new Error('Invalid weekId provided');
      }

      if (!Array.isArray(entries)) {
        throw new Error('Invalid entries provided');
      }

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
        .map(entry => {
          // Ensure date and weekId are properly aligned
          const entryDate = entry.date ? new Date(entry.date) : new Date();
          const calculatedWeekId = getWeekIdFromDate(entryDate);
          
          const enhancedEntry = {
            ...entry,
            weekId: calculatedWeekId, // Use calculated weekId to ensure alignment
            date: entry.date || calculatedWeekId,
            id: entry.id || (uuid.v4() as string), // Use UUID format for database compatibility
            hours: typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours as any) || 0,
            status: entry.status || 'scheduled',
            day: entry.day || 'monday',
            paymentType: entry.paymentType || 'hourly',
            hourlyRate: Math.max(0, entry.hourlyRate || 15),
            flatRateAmount: Math.max(0, entry.flatRateAmount || 0),
            overtimeRate: Math.max(1, entry.overtimeRate || 1.5),
            bonusAmount: Math.max(0, entry.bonusAmount || 0),
            deductions: Math.max(0, entry.deductions || 0),
          };
          
          enhancedEntry.totalCalculatedPay = calculateEntryPay(enhancedEntry, 15);
          
          return enhancedEntry;
        });

      const updatedSchedules = {
        ...weeklySchedules,
        [weekId]: validatedEntries,
      };
      
      console.log('🔄 Setting updated schedules for week:', weekId);
      
      // Update state immediately for optimistic UI
      setWeeklySchedules(updatedSchedules);
      
      // Clear caches
      invalidateAllCaches();
      
      // Update cache
      scheduleCache.set(weekId, validatedEntries);
      
      // Save to AsyncStorage
      await saveSchedulesImmediately(updatedSchedules);
      
      console.log('✅ WEEK SCHEDULE UPDATE COMPLETED ===');
    } catch (err) {
      console.error('❌ WEEK SCHEDULE UPDATE FAILED ===');
      console.error('Error updating week schedule:', err);
      setError('Failed to update schedule');
      throw err;
    }
  }, [weeklySchedules, saveSchedulesImmediately, invalidateAllCaches, calculateEntryPay, getWeekIdFromDate]);

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
        totalHourlyJobs: 0,
        totalFlatRateJobs: 0,
        totalHourlyAmount: 0,
        totalFlatRateAmount: 0,
        totalBonusAmount: 0,
        totalDeductions: 0,
        totalPayroll: 0,
        averageHourlyRate: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
      };
    }
  }, [getWeekSchedule, calculateScheduleStats]);

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
        day: entry.day,
        date: entry.date,
        paymentType: entry.paymentType,
        flatRateAmount: entry.flatRateAmount,
        hourlyRate: entry.hourlyRate,
        isProject: entry.isProject,
        projectName: entry.projectName
      });
      
      if (!weekId || !entry) {
        throw new Error('Invalid parameters for addScheduleEntry');
      }

      // Ensure date and weekId are properly aligned
      const entryDate = entry.date ? new Date(entry.date) : new Date();
      const calculatedWeekId = getWeekIdFromDate(entryDate);
      
      console.log('Date alignment check:', {
        providedWeekId: weekId,
        calculatedWeekId,
        entryDate: entry.date,
        aligned: weekId === calculatedWeekId
      });

      const currentWeekSchedule = getWeekSchedule(calculatedWeekId);
      console.log('Current week schedule has', currentWeekSchedule.length, 'entries');
      
      const validatedEntry = {
        ...entry,
        weekId: calculatedWeekId, // Use calculated weekId to ensure alignment
        id: entry.id || (uuid.v4() as string), // Use UUID format for database compatibility
        date: entry.date || calculatedWeekId,
        hours: typeof entry.hours === 'number' ? entry.hours : parseFloat(entry.hours as any) || 0,
        status: entry.status || 'scheduled',
        day: entry.day || 'monday',
        paymentType: entry.paymentType || 'hourly',
        hourlyRate: Math.max(0, entry.hourlyRate || 15),
        flatRateAmount: Math.max(0, entry.flatRateAmount || 0),
        overtimeRate: Math.max(1, entry.overtimeRate || 1.5),
        bonusAmount: Math.max(0, entry.bonusAmount || 0),
        deductions: Math.max(0, entry.deductions || 0),
      };
      
      validatedEntry.totalCalculatedPay = calculateEntryPay(validatedEntry, 15);

      const updatedSchedule = [...currentWeekSchedule, validatedEntry];
      console.log('Updated schedule will have', updatedSchedule.length, 'entries');
      
      // Update local storage first
      await updateWeekSchedule(calculatedWeekId, updatedSchedule);
      
      // Then sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(validatedEntry, 'insert');
        console.log('✅ Entry synced to Supabase successfully');
      } catch (syncError) {
        console.error('❌ Failed to sync to Supabase:', syncError);
        // Don't throw - we've already saved locally
        setError('Entry saved locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('✅ SCHEDULE ENTRY ADDED SUCCESSFULLY ===');
    } catch (error) {
      console.error('❌ ADD SCHEDULE ENTRY FAILED ===');
      console.error('Error adding schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule, calculateEntryPay, getWeekIdFromDate]);

  const updateScheduleEntry = useCallback(async (weekId: string, entryId: string, updates: Partial<ScheduleEntry>) => {
    try {
      console.log('=== UPDATING SCHEDULE ENTRY ===');
      console.log('Week ID:', weekId);
      console.log('Entry ID:', entryId);
      console.log('Updates:', JSON.stringify(updates));
      
      if (!weekId || !entryId || !updates) {
        throw new Error('Invalid parameters for updateScheduleEntry');
      }

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
      
      const updatedEntry = { 
        ...originalEntry, 
        ...updates,
        weekId,
        hours: updates.hours !== undefined ? 
          (typeof updates.hours === 'number' ? updates.hours : parseFloat(updates.hours as any) || 0) :
          originalEntry.hours,
        paymentType: updates.paymentType || originalEntry.paymentType || 'hourly',
        hourlyRate: updates.hourlyRate !== undefined ? Math.max(0, updates.hourlyRate) : (originalEntry.hourlyRate || 15),
        flatRateAmount: updates.flatRateAmount !== undefined ? Math.max(0, updates.flatRateAmount) : (originalEntry.flatRateAmount || 0),
        overtimeRate: updates.overtimeRate !== undefined ? Math.max(1, updates.overtimeRate) : (originalEntry.overtimeRate || 1.5),
        bonusAmount: updates.bonusAmount !== undefined ? Math.max(0, updates.bonusAmount) : (originalEntry.bonusAmount || 0),
        deductions: updates.deductions !== undefined ? Math.max(0, updates.deductions) : (originalEntry.deductions || 0),
      };
      
      updatedEntry.totalCalculatedPay = calculateEntryPay(updatedEntry, 15);
      
      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      console.log('Updated schedule will have', updatedSchedule.length, 'entries');
      
      // Update local storage first
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Then sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(updatedEntry, 'update');
        console.log('✅ Entry synced to Supabase successfully');
      } catch (syncError) {
        console.error('❌ Failed to sync to Supabase:', syncError);
        // Don't throw - we've already saved locally
        setError('Entry updated locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('✅ SCHEDULE ENTRY UPDATED SUCCESSFULLY ===');
    } catch (error) {
      console.error('❌ UPDATE SCHEDULE ENTRY FAILED ===');
      console.error('Error updating schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule, calculateEntryPay]);

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
      
      // Update local storage first
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Then sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(entryToDelete, 'delete');
        console.log('✅ Entry deleted from Supabase successfully');
      } catch (syncError) {
        console.error('❌ Failed to sync deletion to Supabase:', syncError);
        // Don't throw - we've already deleted locally
        setError('Entry deleted locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('✅ SCHEDULE ENTRY DELETED SUCCESSFULLY ===');
    } catch (error) {
      console.error('❌ DELETE SCHEDULE ENTRY FAILED ===');
      console.error('Error deleting schedule entry:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const updateEntryPayment = useCallback(async (
    weekId: string, 
    entryId: string, 
    paymentType: 'hourly' | 'flat_rate',
    amount: number,
    bonusAmount?: number,
    deductions?: number
  ) => {
    try {
      console.log('=== UPDATING ENTRY PAYMENT ===');
      console.log('Entry ID:', entryId, 'Payment Type:', paymentType, 'Amount:', amount);
      
      const updates: Partial<ScheduleEntry> = {
        paymentType,
        bonusAmount: bonusAmount || 0,
        deductions: deductions || 0,
      };
      
      if (paymentType === 'flat_rate') {
        updates.flatRateAmount = Math.max(0, amount);
      } else {
        updates.hourlyRate = Math.max(0, amount);
      }
      
      await updateScheduleEntry(weekId, entryId, updates);
      console.log('✅ ENTRY PAYMENT UPDATED SUCCESSFULLY ===');
    } catch (error) {
      console.error('❌ UPDATE ENTRY PAYMENT FAILED ===');
      console.error('Error updating entry payment:', error);
      throw error;
    }
  }, [updateScheduleEntry]);

  const getPaymentSummary = useCallback((weekId: string) => {
    try {
      const schedule = getWeekSchedule(weekId);
      const stats = calculateScheduleStats(schedule);
      
      return {
        totalJobs: stats.totalEntries,
        hourlyJobs: stats.totalHourlyJobs,
        flatRateJobs: stats.totalFlatRateJobs,
        totalHourlyAmount: stats.totalHourlyAmount,
        totalFlatRateAmount: stats.totalFlatRateAmount,
        totalBonusAmount: stats.totalBonusAmount,
        totalDeductions: stats.totalDeductions,
        totalAmount: stats.totalPayroll,
        completedJobs: stats.completedEntries,
        pendingJobs: stats.pendingEntries,
        averageHourlyRate: stats.averageHourlyRate,
        overtimeHours: stats.overtimeHours,
        overtimeAmount: stats.overtimeAmount,
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      return {
        totalJobs: 0,
        hourlyJobs: 0,
        flatRateJobs: 0,
        totalHourlyAmount: 0,
        totalFlatRateAmount: 0,
        totalBonusAmount: 0,
        totalDeductions: 0,
        totalAmount: 0,
        completedJobs: 0,
        pendingJobs: 0,
        averageHourlyRate: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
      };
    }
  }, [getWeekSchedule, calculateScheduleStats]);

  const bulkUpdateEntries = useCallback(async (weekId: string, entryIds: string[], updates: Partial<ScheduleEntry>) => {
    try {
      if (!weekId || !Array.isArray(entryIds) || !updates) {
        throw new Error('Invalid parameters for bulkUpdateEntries');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIdSet = new Set(entryIds);
      
      const updatedSchedule = currentWeekSchedule.map(entry => {
        if (entry && entryIdSet.has(entry.id)) {
          const updatedEntry = { ...entry, ...updates, weekId };
          updatedEntry.totalCalculatedPay = calculateEntryPay(updatedEntry, 15);
          return updatedEntry;
        }
        return entry;
      });
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Sync all updated entries to Supabase
      setIsSyncing(true);
      try {
        const syncPromises = updatedSchedule
          .filter(entry => entryIdSet.has(entry.id))
          .map(entry => syncEntryToSupabase(entry, 'update'));
        
        await Promise.all(syncPromises);
        console.log('✅ All entries synced to Supabase successfully');
      } catch (syncError) {
        console.error('❌ Failed to sync some entries to Supabase:', syncError);
        setError('Entries updated locally but some failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Error bulk updating entries:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule, calculateEntryPay]);

  const bulkDeleteEntries = useCallback(async (weekId: string, entryIds: string[]) => {
    try {
      if (!weekId || !Array.isArray(entryIds)) {
        throw new Error('Invalid parameters for bulkDeleteEntries');
      }

      const currentWeekSchedule = getWeekSchedule(weekId);
      const entryIdSet = new Set(entryIds);
      
      const entriesToDelete = currentWeekSchedule.filter(entry => entry && entryIdSet.has(entry.id));
      const updatedSchedule = currentWeekSchedule.filter(entry => entry && !entryIdSet.has(entry.id));
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Sync all deletions to Supabase
      setIsSyncing(true);
      try {
        const syncPromises = entriesToDelete.map(entry => syncEntryToSupabase(entry, 'delete'));
        await Promise.all(syncPromises);
        console.log('✅ All entries deleted from Supabase successfully');
      } catch (syncError) {
        console.error('❌ Failed to sync some deletions to Supabase:', syncError);
        setError('Entries deleted locally but some failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Error bulk deleting entries:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule]);

  const clearCaches = useCallback(() => {
    try {
      console.log('=== CLEARING CACHES ===');
      invalidateAllCaches();
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }, [invalidateAllCaches]);

  const clearWeekSchedule = useCallback(async (weekId: string) => {
    try {
      if (!weekId) {
        throw new Error('Invalid weekId for clearWeekSchedule');
      }

      const updatedSchedules = { ...weeklySchedules };
      delete updatedSchedules[weekId];
      setWeeklySchedules(updatedSchedules);
      
      invalidateAllCaches();
      
      await saveSchedulesImmediately(updatedSchedules);
    } catch (error) {
      console.error('Error clearing week schedule:', error);
      setError('Failed to clear week schedule');
    }
  }, [weeklySchedules, saveSchedulesImmediately, invalidateAllCaches]);

  const resetAllSchedules = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.WEEKLY_SCHEDULES,
        STORAGE_KEYS.SCHEDULE_CACHE,
        STORAGE_KEYS.LAST_CLEANUP_DATE,
        STORAGE_KEYS.LAST_SUPABASE_SYNC,
      ]);
      setWeeklySchedules({});
      invalidateAllCaches();
    } catch (err) {
      console.error('Error resetting schedules:', err);
      setError('Failed to reset schedules');
    }
  }, [invalidateAllCaches]);

  const getEntryCleaners = useCallback((entry: ScheduleEntry): string[] => {
    try {
      if (entry.cleanerNames && entry.cleanerNames.length > 0) {
        return entry.cleanerNames;
      }
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
        cleanerName: updatedCleaners[0] || '',
      };
      
      updatedEntry.totalCalculatedPay = calculateEntryPay(updatedEntry, 15);

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(updatedEntry, 'update');
        console.log('✅ Cleaner addition synced to Supabase');
      } catch (syncError) {
        console.error('❌ Failed to sync cleaner addition:', syncError);
        setError('Cleaner added locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('Cleaner added to entry successfully');
    } catch (error) {
      console.error('Error adding cleaner to entry:', error);
      throw error;
    }
  }, [getWeekSchedule, getEntryCleaners, updateWeekSchedule, calculateEntryPay]);

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
      
      if (!currentCleaners.includes(cleanerName)) {
        console.log('Cleaner not assigned to this entry');
        return;
      }

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
        cleanerName: updatedCleaners[0] || '',
      };
      
      updatedEntry.totalCalculatedPay = calculateEntryPay(updatedEntry, 15);

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(updatedEntry, 'update');
        console.log('✅ Cleaner removal synced to Supabase');
      } catch (syncError) {
        console.error('❌ Failed to sync cleaner removal:', syncError);
        setError('Cleaner removed locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('Cleaner removed from entry successfully');
    } catch (error) {
      console.error('Error removing cleaner from entry:', error);
      throw error;
    }
  }, [getWeekSchedule, getEntryCleaners, updateWeekSchedule, calculateEntryPay]);

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
        cleanerName: cleanerNames[0] || '',
      };
      
      updatedEntry.totalCalculatedPay = calculateEntryPay(updatedEntry, 15);

      const updatedSchedule = [...currentWeekSchedule];
      updatedSchedule[entryIndex] = updatedEntry;
      
      await updateWeekSchedule(weekId, updatedSchedule);
      
      // Sync to Supabase
      setIsSyncing(true);
      try {
        await syncEntryToSupabase(updatedEntry, 'update');
        console.log('✅ Cleaner update synced to Supabase');
      } catch (syncError) {
        console.error('❌ Failed to sync cleaner update:', syncError);
        setError('Cleaners updated locally but failed to sync to database');
      } finally {
        setIsSyncing(false);
      }
      
      console.log('Entry cleaners updated successfully');
    } catch (error) {
      console.error('Error updating entry cleaners:', error);
      throw error;
    }
  }, [getWeekSchedule, updateWeekSchedule, calculateEntryPay]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    weeklySchedules,
    isLoading,
    isSyncing,
    error,
    
    getWeekSchedule,
    getScheduleForCleaner,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    updateWeekSchedule,
    clearWeekSchedule,
    resetAllSchedules,
    
    getWeekStats,
    calculateScheduleStats,
    bulkUpdateEntries,
    bulkDeleteEntries,
    
    getEntryCleaners,
    addCleanerToEntry,
    removeCleanerFromEntry,
    updateEntryCleaners,
    
    updateEntryPayment,
    getPaymentSummary,
    calculateEntryPay,
    
    clearError,
    clearCaches,
    loadData,
    getCurrentWeekId,
    getWeekIdFromDate,
  };
};