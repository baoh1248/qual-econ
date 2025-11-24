
/**
 * Schedule Service
 * Centralized business logic for schedule management
 * Handles all schedule operations, data transformations, and validations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../app/integrations/supabase/client';
import type { ScheduleEntry, WeeklySchedule } from '../types/schedule';

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
    } finally {
      this.pendingSyncs.delete(syncKey);
    }
  }

  private async performSync(
    entry: ScheduleEntry,
    operation: 'insert' | 'update' | 'delete',
    retries: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const dbEntry = this.toDatabaseEntry(entry);

        switch (operation) {
          case 'insert':
            // Check if entry already exists before inserting
            const { data: existingData, error: checkError } = await supabase
              .from('schedule_entries')
              .select('id')
              .eq('id', entry.id)
              .single();

            if (existingData) {
              console.log('⚠️ Entry already exists in Supabase, skipping insert:', entry.id);
              return;
            }

            const { error: insertError } = await supabase
              .from('schedule_entries')
              .insert(dbEntry);
            if (insertError) throw insertError;
            break;

          case 'update':
            const { error: updateError } = await supabase
              .from('schedule_entries')
              .update(dbEntry)
              .eq('id', entry.id);
            if (updateError) throw updateError;
            break;

          case 'delete':
            const { error: deleteError } = await supabase
              .from('schedule_entries')
              .delete()
              .eq('id', entry.id);
            if (deleteError) throw deleteError;
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

        if (attempt === retries) {
          console.error(`Failed to sync after ${retries} attempts:`, error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /**
   * Convert ScheduleEntry to database format
   */
  private toDatabaseEntry(entry: ScheduleEntry): any {
    return {
      id: entry.id,
      client_name: entry.clientName,
      building_name: entry.buildingName,
      cleaner_name: entry.cleanerName || entry.cleanerNames?.[0] || '',
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
      payment_type: entry.paymentType || 'hourly',
      flat_rate_amount: entry.flatRateAmount || 0,
      hourly_rate: entry.hourlyRate || 15,
      is_project: entry.isProject || false,
      project_id: entry.projectId,
      project_name: entry.projectName,
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
