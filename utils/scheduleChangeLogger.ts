import { supabase } from '../app/integrations/supabase/client';
import uuid from 'react-native-uuid';

export type ChangeType =
  | 'shift_created'
  | 'shift_edited'
  | 'shift_deleted'
  | 'shift_unassigned_timeoff'
  | 'shift_assigned'
  | 'shift_status_changed'
  | 'cleaner_added'
  | 'cleaner_removed';

export interface ScheduleChangeLog {
  id: string;
  change_type: ChangeType;
  description: string;
  changed_by: string;
  client_name?: string;
  building_name?: string;
  cleaner_names?: string[];
  shift_date?: string;
  shift_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Initialize the schedule_change_logs table if it doesn't exist
 */
export async function initializeChangeLogsTable() {
  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('schedule_change_logs')
      .select('id')
      .limit(1);

    // If table doesn't exist, it will return an error
    if (checkError && checkError.message.includes('does not exist')) {
      console.log('⚠️ schedule_change_logs table does not exist. Please create it manually.');
      console.log('Run this SQL in your Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS schedule_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  description TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  client_name TEXT,
  building_name TEXT,
  cleaner_names TEXT[],
  shift_date DATE,
  shift_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_change_logs_created_at ON schedule_change_logs(created_at DESC);
CREATE INDEX idx_schedule_change_logs_shift_date ON schedule_change_logs(shift_date);
CREATE INDEX idx_schedule_change_logs_change_type ON schedule_change_logs(change_type);
      `);
    }
  } catch (error) {
    console.error('Error checking schedule_change_logs table:', error);
  }
}

/**
 * Log a schedule change
 */
export async function logScheduleChange(params: {
  changeType: ChangeType;
  description: string;
  changedBy?: string;
  clientName?: string;
  buildingName?: string;
  cleanerNames?: string[];
  shiftDate?: string;
  shiftId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const log: Partial<ScheduleChangeLog> = {
      id: uuid.v4() as string,
      change_type: params.changeType,
      description: params.description,
      changed_by: params.changedBy || 'Supervisor',
      client_name: params.clientName,
      building_name: params.buildingName,
      cleaner_names: params.cleanerNames,
      shift_date: params.shiftDate,
      shift_id: params.shiftId,
      metadata: params.metadata,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('schedule_change_logs')
      .insert([log]);

    if (error) {
      console.error('Error logging schedule change:', error);
    } else {
      console.log('✅ Schedule change logged:', params.changeType);
    }
  } catch (error) {
    console.error('Error in logScheduleChange:', error);
  }
}

/**
 * Log when a shift is created
 */
export async function logShiftCreated(params: {
  clientName: string;
  buildingName: string;
  cleanerNames: string[];
  shiftDate: string;
  hours: number;
  shiftId: string;
}) {
  const cleanerList = params.cleanerNames.join(', ');
  await logScheduleChange({
    changeType: 'shift_created',
    description: `Created shift for ${cleanerList} at ${params.clientName} - ${params.buildingName} (${params.hours}hrs)`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: params.cleanerNames,
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
    metadata: { hours: params.hours },
  });
}

/**
 * Log when a shift is edited
 */
export async function logShiftEdited(params: {
  clientName: string;
  buildingName: string;
  cleanerNames: string[];
  shiftDate: string;
  shiftId: string;
  changes: string[];
}) {
  const cleanerList = params.cleanerNames.join(', ');
  const changesList = params.changes.join(', ');
  await logScheduleChange({
    changeType: 'shift_edited',
    description: `Edited shift for ${cleanerList} at ${params.clientName} - ${params.buildingName}. Changes: ${changesList}`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: params.cleanerNames,
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
    metadata: { changes: params.changes },
  });
}

/**
 * Log when a shift is deleted
 */
export async function logShiftDeleted(params: {
  clientName: string;
  buildingName: string;
  cleanerNames: string[];
  shiftDate: string;
  shiftId: string;
}) {
  const cleanerList = params.cleanerNames.join(', ');
  await logScheduleChange({
    changeType: 'shift_deleted',
    description: `Deleted shift for ${cleanerList} at ${params.clientName} - ${params.buildingName}`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: params.cleanerNames,
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
  });
}

/**
 * Log when a shift is unassigned due to approved time off
 */
export async function logShiftUnassignedTimeOff(params: {
  clientName: string;
  buildingName: string;
  cleanerName: string;
  shiftDate: string;
  shiftId: string;
  timeOffReason: string;
}) {
  await logScheduleChange({
    changeType: 'shift_unassigned_timeoff',
    description: `${params.cleanerName} unassigned from ${params.clientName} - ${params.buildingName} due to approved time off (${params.timeOffReason})`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: [params.cleanerName],
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
    metadata: { timeOffReason: params.timeOffReason },
  });
}

/**
 * Log when a cleaner is added to a shift
 */
export async function logCleanerAdded(params: {
  clientName: string;
  buildingName: string;
  cleanerName: string;
  shiftDate: string;
  shiftId: string;
}) {
  await logScheduleChange({
    changeType: 'cleaner_added',
    description: `Added ${params.cleanerName} to shift at ${params.clientName} - ${params.buildingName}`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: [params.cleanerName],
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
  });
}

/**
 * Log when a cleaner is removed from a shift
 */
export async function logCleanerRemoved(params: {
  clientName: string;
  buildingName: string;
  cleanerName: string;
  shiftDate: string;
  shiftId: string;
}) {
  await logScheduleChange({
    changeType: 'cleaner_removed',
    description: `Removed ${params.cleanerName} from shift at ${params.clientName} - ${params.buildingName}`,
    clientName: params.clientName,
    buildingName: params.buildingName,
    cleanerNames: [params.cleanerName],
    shiftDate: params.shiftDate,
    shiftId: params.shiftId,
  });
}

/**
 * Fetch recent schedule changes
 */
export async function fetchRecentChanges(limit: number = 50): Promise<ScheduleChangeLog[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_change_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching schedule changes:', error);
    return [];
  }
}

/**
 * Fetch schedule changes for a specific date range
 */
export async function fetchChangesByDateRange(
  startDate: string,
  endDate: string
): Promise<ScheduleChangeLog[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_change_logs')
      .select('*')
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching schedule changes by date:', error);
    return [];
  }
}

/**
 * Fetch schedule changes for a specific shift
 */
export async function fetchChangesByShiftId(shiftId: string): Promise<ScheduleChangeLog[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_change_logs')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching schedule changes by shift ID:', error);
    return [];
  }
}
