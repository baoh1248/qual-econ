
/**
 * Schedule Service
 * Centralized business logic for schedule management
 * Handles all schedule operations, data transformations, and validations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';
import type { ScheduleEntry, WeeklySchedule } from '../types/schedule';
import uuid from 'react-native-uuid';

const STORAGE_KEYS = {
  WEEKLY_SCHEDULES: 'weekly_schedules_v8',
  LAST_SYNC: 'last_schedule_sync',
} as const;

export class ScheduleService {
  private static instance: ScheduleService;
  private cache: Map<string, ScheduleEntry[]> = new Map();
  private syncQueue: Set<string> = new Set();
  private isSyncing = false;
  private pendingSyncs: Map<string, Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): ScheduleService {
    if (!ScheduleService.instance) {
      ScheduleService.instance = new ScheduleService();
    }
    return ScheduleService.instance;
  }

  /**
   * Get week ID from date
   */
  getWeekId(date: Date): string {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get current week ID
   */
  getCurrentWeekId(): string {
    return this.getWeekId(new Date());
  }

  /**
   * Load all schedules from AsyncStorage
   */
  async loadSchedules(): Promise<WeeklySchedule> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_SCHEDULES);
      if (!data) return {};

      const schedules = JSON.parse(data) as WeeklySchedule;
      
      // Populate cache
      Object.entries(schedules).forEach(([weekId, entries]) => {
        this.cache.set(weekId, entries);
      });

      return schedules;
    } catch (error) {
      console.error('Error loading schedules:', error);
      return {};
    }
  }

  /**
   * Save schedules to AsyncStorage
   */
  async saveSchedules(schedules: WeeklySchedule): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.WEEKLY_SCHEDULES,
        JSON.stringify(schedules)
      );
    } catch (error) {
      console.error('Error saving schedules:', error);
      throw error;
    }
  }

  /**
   * Get schedule for a specific week
   */
  async getWeekSchedule(weekId: string, forceRefresh = false): Promise<ScheduleEntry[]> {
    if (!forceRefresh && this.cache.has(weekId)) {
      return this.cache.get(weekId)!;
    }

    const schedules = await this.loadSchedules();
    const weekSchedule = schedules[weekId] || [];
    
    this.cache.set(weekId, weekSchedule);
    return weekSchedule;
  }

  /**
   * Add schedule entry
   */
  async addEntry(weekId: string, entry: ScheduleEntry): Promise<void> {
    const schedules = await this.loadSchedules();
    
    if (!schedules[weekId]) {
      schedules[weekId] = [];
    }

    // Check if entry already exists
    const existingIndex = schedules[weekId].findIndex(e => e.id === entry.id);
    if (existingIndex !== -1) {
      console.log('⚠️ Entry already exists, skipping add:', entry.id);
      return;
    }

    schedules[weekId].push(entry);
    this.cache.set(weekId, schedules[weekId]);
    
    await this.saveSchedules(schedules);
    await this.syncToSupabase(entry, 'insert');
  }

  /**
   * Update schedule entry
   */
  async updateEntry(
    weekId: string,
    entryId: string,
    updates: Partial<ScheduleEntry>
  ): Promise<void> {
    const schedules = await this.loadSchedules();
    const weekSchedule = schedules[weekId] || [];
    
    const index = weekSchedule.findIndex(e => e.id === entryId);
    if (index === -1) {
      throw new Error(`Entry ${entryId} not found in week ${weekId}`);
    }

    const updatedEntry = { ...weekSchedule[index], ...updates };
    weekSchedule[index] = updatedEntry;
    
    schedules[weekId] = weekSchedule;
    this.cache.set(weekId, weekSchedule);
    
    await this.saveSchedules(schedules);
    await this.syncToSupabase(updatedEntry, 'update');
  }

  /**
   * Delete schedule entry
   */
  async deleteEntry(weekId: string, entryId: string): Promise<void> {
    const schedules = await this.loadSchedules();
    const weekSchedule = schedules[weekId] || [];
    
    const entry = weekSchedule.find(e => e.id === entryId);
    if (!entry) {
      throw new Error(`Entry ${entryId} not found in week ${weekId}`);
    }

    schedules[weekId] = weekSchedule.filter(e => e.id !== entryId);
    this.cache.set(weekId, schedules[weekId]);
    
    await this.saveSchedules(schedules);
    await this.syncToSupabase(entry, 'delete');
  }

  /**
   * Sync entry to Supabase
   */
  private async syncToSupabase(
    entry: ScheduleEntry,
    operation: 'insert' | 'update' | 'delete',
    retries = 3
  ): Promise<void> {
    const syncKey = `${operation}-${entry.id}`;
    
    // If already syncing this entry, wait for it
    if (this.pendingSyncs.has(syncKey)) {
      console.log('⏸️ Sync already in progress for:', syncKey);
      return this.pendingSyncs.get(syncKey);
    }

    const syncPromise = this.performSync(entry, operation, retries);
    this.pendingSyncs.set(syncKey, syncPromise);

    try {
      await syncPromise;
    } catch (error) {
      // Log detailed error information
      console.error(`❌ Failed to sync ${operation} for entry ${entry.id}:`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
        errorDetails: (error as any)?.details,
        entry: {
          id: entry.id,
          clientName: entry.clientName,
          buildingName: entry.buildingName,
          cleanerName: entry.cleanerName,
          date: entry.date,
          weekId: entry.weekId,
        },
      });
      throw error; // Re-throw to allow caller to handle
    } finally {
      this.pendingSyncs.delete(syncKey);
    }
  }

  private async performSync(
    entry: ScheduleEntry,
    operation: 'insert' | 'update' | 'delete',
    retries: number
  ): Promise<void> {
    // Validate required fields before attempting sync
    this.validateEntry(entry);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const dbEntry = this.toDatabaseEntry(entry);
        
        // Log the database entry being sent (for debugging)
        console.log(`🔄 Attempting ${operation} (attempt ${attempt}/${retries}):`, {
          entryId: entry.id,
          clientName: dbEntry.client_name,
          buildingName: dbEntry.building_name,
          cleanerName: dbEntry.cleaner_name,
          date: dbEntry.date,
          weekId: dbEntry.week_id,
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
              return;
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
            
            console.log('✅ Entry inserted successfully:', insertData);
            break;

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
            
            console.log('✅ Entry updated successfully:', updateData);
            break;

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
            
            console.log('✅ Entry deleted successfully');
            break;
        }

        console.log(`✅ Successfully synced ${operation} for entry:`, entry.id);
        return;
      } catch (error: any) {
        // If it's a duplicate key error, consider it a success
        if (error?.code === '23505') {
          console.log('⚠️ Duplicate key error, entry already exists:', entry.id);
          return;
        }

        // If it's an invalid UUID format error, log it clearly
        if (error?.code === '22P02' || error?.message?.includes('invalid input syntax for type uuid')) {
          console.error('❌ Invalid UUID format for entry ID:', entry.id);
          console.error('Entry ID must be a valid UUID format. Current ID:', entry.id);
          throw new Error(`Invalid entry ID format. Expected UUID, got: ${entry.id}`);
        }

        if (attempt === retries) {
          console.error(`❌ Failed to sync after ${retries} attempts:`, {
            error,
            errorMessage: error?.message,
            errorCode: error?.code,
            errorDetails: error?.details,
            entryId: entry.id,
          });
          throw error;
        }
        
        console.log(`⏳ Retrying in ${Math.pow(2, attempt)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Validate entry has all required fields
   */
  private validateEntry(entry: ScheduleEntry): void {
    const requiredFields = [
      { field: 'id', value: entry.id },
      { field: 'clientName', value: entry.clientName },
      { field: 'buildingName', value: entry.buildingName },
      { field: 'cleanerName', value: entry.cleanerName },
      { field: 'hours', value: entry.hours },
      { field: 'day', value: entry.day },
      { field: 'date', value: entry.date },
      { field: 'weekId', value: entry.weekId },
    ];

    const missingFields = requiredFields
      .filter(({ value }) => value === undefined || value === null || value === '')
      .map(({ field }) => field);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate UUID format for ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entry.id)) {
      console.warn('⚠️ Entry ID is not in UUID format:', entry.id);
      // Don't throw here, but log a warning - we'll let the database handle it
    }
  }

  /**
   * Convert ScheduleEntry to database format
   */
  private toDatabaseEntry(entry: ScheduleEntry): any {
    // Ensure cleaner_name is not empty (required field)
    const cleanerName = entry.cleanerName || entry.cleanerNames?.[0] || 'UNASSIGNED';
    
    // Ensure cleaner_names array is not empty
    const cleanerNames = entry.cleanerNames && entry.cleanerNames.length > 0 
      ? entry.cleanerNames 
      : (entry.cleanerName ? [entry.cleanerName] : ['UNASSIGNED']);

    return {
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
      payment_type: entry.paymentType || 'hourly',
      flat_rate_amount: entry.flatRateAmount || 0,
      hourly_rate: entry.hourlyRate || 15,
      is_project: entry.isProject || false,
      project_id: entry.projectId || null,
      project_name: entry.projectName || null,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Convert database entry to ScheduleEntry
   */
  fromDatabaseEntry(dbEntry: any): ScheduleEntry {
    return {
      id: dbEntry.id,
      clientName: dbEntry.client_name,
      buildingName: dbEntry.building_name,
      cleanerName: dbEntry.cleaner_name || '',
      cleanerNames: dbEntry.cleaner_names || [dbEntry.cleaner_name],
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
      paymentType: dbEntry.payment_type || 'hourly',
      flatRateAmount: parseFloat(dbEntry.flat_rate_amount) || 0,
      hourlyRate: parseFloat(dbEntry.hourly_rate) || 15,
      isProject: dbEntry.is_project || false,
      projectId: dbEntry.project_id,
      projectName: dbEntry.project_name,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear specific week cache
   */
  clearWeekCache(weekId: string): void {
    this.cache.delete(weekId);
  }
}

export const scheduleService = ScheduleService.getInstance();
