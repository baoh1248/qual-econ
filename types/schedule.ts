
/**
 * Schedule Type Definitions
 * Centralized type definitions for schedule-related data structures
 */

export interface ScheduleEntry {
  id: string;
  clientName: string;
  buildingName: string;
  cleanerName: string;
  cleanerNames?: string[];
  cleanerIds?: string[];
  hours: number;
  cleanerHours?: { [cleanerName: string]: number }; // Individual hours per cleaner
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
}

export interface WeeklySchedule {
  [weekId: string]: ScheduleEntry[];
}

export interface ScheduleFilters {
  shiftType: 'all' | 'project' | 'regular';
  clientName: string;
  buildingName: string;
  cleanerName: string;
  buildingGroupName: string;
  cleanerGroupName: string;
  status: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
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

export interface RecurringShiftPattern {
  id: string;
  building_id?: string;
  building_name: string;
  client_name: string;
  cleaner_names: string[];
  cleaner_ids?: string[];
  hours: number;
  cleaner_hours?: { [cleanerName: string]: number }; // Individual hours per cleaner
  start_time?: string;
  notes?: string;
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  custom_days?: number;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  is_active: boolean;
  last_generated_date?: string;
  next_occurrence_date?: string;
  occurrence_count?: number;
  payment_type?: 'hourly' | 'flat_rate';
  flat_rate_amount?: number;
  hourly_rate?: number;
}

export interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  highlight_color?: string;
}

export interface CleanerGroup {
  id: string;
  group_name: string;
  description?: string;
  cleaner_ids: string[];
  highlight_color?: string;
}

export type ModalType = 'add' | 'edit' | 'addClient' | 'addBuilding' | 'addCleaner' | 'editClient' | 'editBuilding' | 'details' | null;
export type ViewType = 'daily' | 'weekly' | 'monthly';
export type ScheduleViewMode = 'building' | 'user';
