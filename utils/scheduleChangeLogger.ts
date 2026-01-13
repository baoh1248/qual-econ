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
 * Test if we can insert and read from the schedule_change_logs table
 */
export async function testChangeLogsTable() {
  console.log('🧪 Testing schedule_change_logs table...');

  try {
    // Test 1: Try to insert a test record
    const testLog = {
      id: uuid.v4() as string,
      change_type: 'shift_created',
      description: 'TEST RECORD - This is a test entry to verify database setup',
      changed_by: 'System Test',
      created_at: new Date().toISOString(),
    };

    console.log('Test 1: Attempting to insert test record...');
    const { data: insertData, error: insertError } = await supabase
      .from('schedule_change_logs')
      .insert([testLog])
      .select();

    if (insertError) {
      console.error('❌ Insert test FAILED:', insertError);
      return { success: false, error: insertError.message, step: 'insert' };
    }

    console.log('✅ Insert test PASSED. Inserted:', insertData);

    // Test 2: Try to fetch records
    console.log('Test 2: Attempting to fetch records...');
    const { data: fetchData, error: fetchError } = await supabase
      .from('schedule_change_logs')
      .select('*')
      .limit(5);

    if (fetchError) {
      console.error('❌ Fetch test FAILED:', fetchError);
      return { success: false, error: fetchError.message, step: 'fetch' };
    }

    console.log('✅ Fetch test PASSED. Found', fetchData?.length, 'records');
    console.log('Sample records:', fetchData);

    // Test 3: Delete the test record
    console.log('Test 3: Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('schedule_change_logs')
      .delete()
      .eq('id', testLog.id);

    if (deleteError) {
      console.warn('⚠️ Cleanup warning:', deleteError.message);
    } else {
      console.log('✅ Cleanup complete');
    }

    return {
      success: true,
      message: 'All tests passed! Database is working correctly.',
      recordCount: fetchData?.length || 0
    };

  } catch (error: any) {
    console.error('❌ Test exception:', error);
    return { success: false, error: error.message, step: 'exception' };
  }
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

    console.log('💾 Inserting log into database:', {
      type: log.change_type,
      description: log.description.substring(0, 50) + '...',
      date: log.shift_date
    });

    const { data, error } = await supabase
      .from('schedule_change_logs')
      .insert([log])
      .select();

    if (error) {
      console.error('❌ Database error logging schedule change:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    } else {
      console.log('✅ Schedule change logged successfully:', params.changeType);
      console.log('Inserted record:', data);
    }
  } catch (error: any) {
    console.error('❌ Exception in logScheduleChange:', error);
    console.error('Error message:', error.message);
    throw error;
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
  const { data, error } = await supabase
    .from('schedule_change_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
}

/**
 * Fetch schedule changes for a specific date range
 */
export async function fetchChangesByDateRange(
  startDate: string,
  endDate: string
): Promise<ScheduleChangeLog[]> {
  const { data, error } = await supabase
    .from('schedule_change_logs')
    .select('*')
    .gte('shift_date', startDate)
    .lte('shift_date', endDate)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Fetch schedule changes for a specific shift
 */
export async function fetchChangesByShiftId(shiftId: string): Promise<ScheduleChangeLog[]> {
  const { data, error } = await supabase
    .from('schedule_change_logs')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data || [];
}
