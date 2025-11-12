
/**
 * Utility functions for generating recurring shift occurrences
 */

import type { ScheduleEntry } from '../hooks/useScheduleStorage';

export interface RecurringShiftPattern {
  id: string;
  building_id?: string;
  building_name: string;
  client_name: string;
  cleaner_names: string[];
  cleaner_ids?: string[];
  hours: number;
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

interface ShiftOccurrence {
  date: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  occurrenceNumber: number;
}

const DAY_NAMES: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

/**
 * Calculate the next occurrence date based on the recurring pattern
 */
export function calculateNextOccurrence(
  currentDate: string,
  pattern: RecurringShiftPattern
): string | null {
  const current = new Date(currentDate);
  let next: Date;

  switch (pattern.pattern_type) {
    case 'daily':
      next = new Date(current);
      next.setDate(current.getDate() + pattern.interval);
      break;

    case 'weekly':
      if (!pattern.days_of_week || pattern.days_of_week.length === 0) {
        return null;
      }
      
      next = new Date(current);
      next.setDate(current.getDate() + 1);
      
      let daysChecked = 0;
      const maxDaysToCheck = 7 * pattern.interval;
      
      while (daysChecked < maxDaysToCheck) {
        const dayOfWeek = next.getDay();
        const weeksSinceStart = Math.floor(
          (next.getTime() - new Date(pattern.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        
        if (
          pattern.days_of_week.includes(dayOfWeek) &&
          weeksSinceStart % pattern.interval === 0
        ) {
          break;
        }
        
        next.setDate(next.getDate() + 1);
        daysChecked++;
      }
      break;

    case 'monthly':
      next = new Date(current);
      next.setMonth(current.getMonth() + pattern.interval);
      
      if (pattern.day_of_month) {
        const targetDay = Math.min(
          pattern.day_of_month,
          new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        );
        next.setDate(targetDay);
      }
      break;

    case 'custom':
      next = new Date(current);
      next.setDate(current.getDate() + (pattern.custom_days || 1));
      break;

    default:
      return null;
  }

  if (pattern.end_date) {
    const endDate = new Date(pattern.end_date);
    if (next > endDate) {
      return null;
    }
  }

  return next.toISOString().split('T')[0];
}

/**
 * Generate all occurrences for a recurring pattern within a date range
 */
export function generateOccurrences(
  pattern: RecurringShiftPattern,
  startDate?: string,
  endDate?: string,
  maxCount?: number
): ShiftOccurrence[] {
  const occurrences: ShiftOccurrence[] = [];
  const start = startDate ? new Date(startDate) : new Date(pattern.start_date);
  const end = endDate ? new Date(endDate) : pattern.end_date ? new Date(pattern.end_date) : null;
  const limit = maxCount || pattern.max_occurrences || 100;

  let currentDate = pattern.start_date;
  let occurrenceNumber = 1;

  if (new Date(currentDate) >= start && (!end || new Date(currentDate) <= end)) {
    const date = new Date(currentDate);
    occurrences.push({
      date: currentDate,
      day: DAY_NAMES[date.getDay()] as any,
      occurrenceNumber: occurrenceNumber++,
    });
  }

  while (occurrences.length < limit) {
    const nextDate = calculateNextOccurrence(currentDate, pattern);
    
    if (!nextDate) {
      break;
    }

    const nextDateObj = new Date(nextDate);
    
    if (nextDateObj < start) {
      currentDate = nextDate;
      continue;
    }
    
    if (end && nextDateObj > end) {
      break;
    }

    occurrences.push({
      date: nextDate,
      day: DAY_NAMES[nextDateObj.getDay()] as any,
      occurrenceNumber: occurrenceNumber++,
    });

    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Convert a recurring shift pattern to schedule entries
 */
export function patternToScheduleEntries(
  pattern: RecurringShiftPattern,
  occurrences: ShiftOccurrence[],
  getWeekIdFromDate: (date: Date) => string
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const occurrence of occurrences) {
    const date = new Date(occurrence.date);
    const weekId = getWeekIdFromDate(date);
    
    const endTime = pattern.start_time 
      ? addHoursToTime(pattern.start_time, pattern.hours)
      : undefined;

    const entry: ScheduleEntry = {
      id: `recurring-${pattern.id}-${occurrence.date}-${Date.now()}`,
      clientName: pattern.client_name,
      buildingName: pattern.building_name,
      cleanerName: pattern.cleaner_names[0],
      cleanerNames: pattern.cleaner_names,
      cleanerIds: pattern.cleaner_ids,
      hours: pattern.hours,
      day: occurrence.day,
      date: occurrence.date,
      startTime: pattern.start_time,
      endTime,
      status: 'scheduled',
      weekId,
      notes: pattern.notes,
      isRecurring: true,
      recurringId: pattern.id,
      paymentType: pattern.payment_type || 'hourly',
      flatRateAmount: pattern.flat_rate_amount || 0,
      hourlyRate: pattern.hourly_rate || 15,
    };

    entries.push(entry);
  }

  return entries;
}

/**
 * Helper function to add hours to a time string
 */
function addHoursToTime(time: string, hours: number): string {
  const [hoursStr, minutesStr] = time.split(':');
  const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + hours * 60;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * Check if a recurring pattern is still active
 */
export function isPatternActive(pattern: RecurringShiftPattern): boolean {
  if (!pattern.is_active) {
    return false;
  }

  const now = new Date();
  const startDate = new Date(pattern.start_date);

  if (now < startDate) {
    return false;
  }

  if (pattern.end_date) {
    const endDate = new Date(pattern.end_date);
    if (now > endDate) {
      return false;
    }
  }

  if (pattern.max_occurrences && pattern.occurrence_count) {
    if (pattern.occurrence_count >= pattern.max_occurrences) {
      return false;
    }
  }

  return true;
}

/**
 * Get the next N occurrences from today
 */
export function getUpcomingOccurrences(
  pattern: RecurringShiftPattern,
  count: number = 5
): ShiftOccurrence[] {
  const today = new Date().toISOString().split('T')[0];
  const endDate = pattern.end_date || 
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return generateOccurrences(pattern, today, endDate, count);
}

/**
 * Format a recurring pattern description for display
 */
export function formatPatternDescription(pattern: RecurringShiftPattern): string {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let description = '';

  switch (pattern.pattern_type) {
    case 'daily':
      description = pattern.interval === 1 ? 'Every day' : `Every ${pattern.interval} days`;
      break;

    case 'weekly':
      const dayNames = pattern.days_of_week
        ?.map(d => daysOfWeek[d])
        .join(', ') || '';
      description =
        pattern.interval === 1
          ? `Every week on ${dayNames}`
          : `Every ${pattern.interval} weeks on ${dayNames}`;
      break;

    case 'monthly':
      description =
        pattern.interval === 1
          ? `Every month on day ${pattern.day_of_month}`
          : `Every ${pattern.interval} months on day ${pattern.day_of_month}`;
      break;

    case 'custom':
      description = pattern.custom_days === 1 ? 'Every day' : `Every ${pattern.custom_days} days`;
      break;
  }

  if (pattern.start_date) {
    const startDate = new Date(pattern.start_date);
    description += `, starting ${startDate.toLocaleDateString()}`;
  }

  if (pattern.end_date) {
    const endDate = new Date(pattern.end_date);
    description += `, until ${endDate.toLocaleDateString()}`;
  } else if (pattern.max_occurrences) {
    description += `, for ${pattern.max_occurrences} occurrence${pattern.max_occurrences !== 1 ? 's' : ''}`;
  }

  return description;
}

/**
 * Check if occurrences need to be generated for a pattern
 */
export function needsGeneration(pattern: RecurringShiftPattern, weeksAhead: number = 4): boolean {
  if (!isPatternActive(pattern)) {
    return false;
  }

  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + (weeksAhead * 7));

  if (!pattern.last_generated_date) {
    return true;
  }

  const lastGenerated = new Date(pattern.last_generated_date);
  
  return lastGenerated < futureDate;
}
