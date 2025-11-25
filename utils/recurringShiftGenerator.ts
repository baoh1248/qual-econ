
/**
 * Utility functions for generating recurring shift occurrences
 * FIXED: Improved date handling and occurrence generation accuracy
 */

import type { ScheduleEntry } from '../hooks/useScheduleStorage';
import uuid from 'react-native-uuid';

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
 * FIXED: Create date from string without timezone issues
 */
function createDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * FIXED: Format date to YYYY-MM-DD without timezone issues
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * FIXED: Calculate the next occurrence date based on the recurring pattern
 */
export function calculateNextOccurrence(
  currentDate: string,
  pattern: RecurringShiftPattern
): string | null {
  try {
    const current = createDateFromString(currentDate);
    let next: Date;

    switch (pattern.pattern_type) {
      case 'daily':
        next = new Date(current);
        next.setDate(current.getDate() + pattern.interval);
        break;

      case 'weekly':
        if (!pattern.days_of_week || pattern.days_of_week.length === 0) {
          console.error('Weekly pattern missing days_of_week');
          return null;
        }
        
        next = new Date(current);
        next.setDate(current.getDate() + 1);
        
        let daysChecked = 0;
        const maxDaysToCheck = 7 * pattern.interval + 7;
        
        const startDate = createDateFromString(pattern.start_date);
        
        while (daysChecked < maxDaysToCheck) {
          const dayOfWeek = next.getDay();
          
          const daysSinceStart = Math.floor((next.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          const weeksSinceStart = Math.floor(daysSinceStart / 7);
          
          if (
            pattern.days_of_week.includes(dayOfWeek) &&
            weeksSinceStart % pattern.interval === 0
          ) {
            break;
          }
          
          next.setDate(next.getDate() + 1);
          daysChecked++;
        }
        
        if (daysChecked >= maxDaysToCheck) {
          console.error('Could not find next weekly occurrence');
          return null;
        }
        break;

      case 'monthly':
        next = new Date(current);
        next.setMonth(current.getMonth() + pattern.interval);
        
        if (pattern.day_of_month) {
          const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          const targetDay = Math.min(pattern.day_of_month, daysInMonth);
          next.setDate(targetDay);
        }
        break;

      case 'custom':
        next = new Date(current);
        next.setDate(current.getDate() + (pattern.custom_days || 1));
        break;

      default:
        console.error('Unknown pattern type:', pattern.pattern_type);
        return null;
    }

    if (pattern.end_date) {
      const endDate = createDateFromString(pattern.end_date);
      if (next > endDate) {
        return null;
      }
    }

    return formatDateToString(next);
  } catch (error) {
    console.error('Error calculating next occurrence:', error);
    return null;
  }
}

/**
 * FIXED: Generate all occurrences for a recurring pattern within a date range
 */
export function generateOccurrences(
  pattern: RecurringShiftPattern,
  startDate?: string,
  endDate?: string,
  maxCount?: number
): ShiftOccurrence[] {
  try {
    const occurrences: ShiftOccurrence[] = [];
    const start = startDate ? createDateFromString(startDate) : createDateFromString(pattern.start_date);
    const end = endDate ? createDateFromString(endDate) : pattern.end_date ? createDateFromString(pattern.end_date) : null;
    const limit = maxCount || pattern.max_occurrences || 100;

    let currentDate = pattern.start_date;
    let occurrenceNumber = 1;

    const firstDate = createDateFromString(currentDate);
    if (firstDate >= start && (!end || firstDate <= end)) {
      occurrences.push({
        date: currentDate,
        day: DAY_NAMES[firstDate.getDay()] as any,
        occurrenceNumber: occurrenceNumber++,
      });
    }

    while (occurrences.length < limit) {
      const nextDate = calculateNextOccurrence(currentDate, pattern);
      
      if (!nextDate) {
        break;
      }

      const nextDateObj = createDateFromString(nextDate);
      
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

    console.log(`Generated ${occurrences.length} occurrences for pattern ${pattern.id}`);
    return occurrences;
  } catch (error) {
    console.error('Error generating occurrences:', error);
    return [];
  }
}

/**
 * FIXED: Convert a recurring shift pattern to schedule entries
 */
export function patternToScheduleEntries(
  pattern: RecurringShiftPattern,
  occurrences: ShiftOccurrence[],
  getWeekIdFromDate: (date: Date) => string
): ScheduleEntry[] {
  try {
    const entries: ScheduleEntry[] = [];

    for (const occurrence of occurrences) {
      const date = createDateFromString(occurrence.date);
      const weekId = getWeekIdFromDate(date);
      
      const endTime = pattern.start_time 
        ? addHoursToTime(pattern.start_time, pattern.hours)
        : undefined;

      const entry: ScheduleEntry = {
        id: uuid.v4() as string, // Use UUID format for database compatibility
        clientName: pattern.client_name,
        buildingName: pattern.building_name,
        cleanerName: pattern.cleaner_names[0] || 'UNASSIGNED',
        cleanerNames: pattern.cleaner_names.length > 0 ? pattern.cleaner_names : ['UNASSIGNED'],
        cleanerIds: pattern.cleaner_ids || [],
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

    console.log(`Created ${entries.length} schedule entries from pattern ${pattern.id}`);
    return entries;
  } catch (error) {
    console.error('Error converting pattern to schedule entries:', error);
    return [];
  }
}

/**
 * Helper function to add hours to a time string
 */
function addHoursToTime(time: string, hours: number): string {
  try {
    const [hoursStr, minutesStr] = time.split(':');
    const totalMinutes = parseInt(hoursStr) * 60 + parseInt(minutesStr) + hours * 60;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  } catch (error) {
    console.error('Error adding hours to time:', error);
    return time;
  }
}

/**
 * FIXED: Check if a recurring pattern is still active
 */
export function isPatternActive(pattern: RecurringShiftPattern): boolean {
  try {
    if (!pattern.is_active) {
      return false;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const startDate = createDateFromString(pattern.start_date);
    startDate.setHours(0, 0, 0, 0);

    if (now < startDate) {
      return false;
    }

    if (pattern.end_date) {
      const endDate = createDateFromString(pattern.end_date);
      endDate.setHours(23, 59, 59, 999);
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
  } catch (error) {
    console.error('Error checking if pattern is active:', error);
    return false;
  }
}

/**
 * Get the next N occurrences from today
 */
export function getUpcomingOccurrences(
  pattern: RecurringShiftPattern,
  count: number = 5
): ShiftOccurrence[] {
  try {
    const today = formatDateToString(new Date());
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 365);
    const endDate = pattern.end_date || formatDateToString(futureDate);

    return generateOccurrences(pattern, today, endDate, count);
  } catch (error) {
    console.error('Error getting upcoming occurrences:', error);
    return [];
  }
}

/**
 * Format a recurring pattern description for display
 */
export function formatPatternDescription(pattern: RecurringShiftPattern): string {
  try {
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
      const startDate = createDateFromString(pattern.start_date);
      description += `, starting ${startDate.toLocaleDateString()}`;
    }

    if (pattern.end_date) {
      const endDate = createDateFromString(pattern.end_date);
      description += `, until ${endDate.toLocaleDateString()}`;
    } else if (pattern.max_occurrences) {
      description += `, for ${pattern.max_occurrences} occurrence${pattern.max_occurrences !== 1 ? 's' : ''}`;
    }

    return description;
  } catch (error) {
    console.error('Error formatting pattern description:', error);
    return 'Invalid pattern';
  }
}

/**
 * FIXED: Check if occurrences need to be generated for a pattern
 */
export function needsGeneration(pattern: RecurringShiftPattern, weeksAhead: number = 4): boolean {
  try {
    if (!isPatternActive(pattern)) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + (weeksAhead * 7));

    if (!pattern.last_generated_date) {
      return true;
    }

    const lastGenerated = createDateFromString(pattern.last_generated_date);
    lastGenerated.setHours(0, 0, 0, 0);
    
    return lastGenerated < futureDate;
  } catch (error) {
    console.error('Error checking if generation needed:', error);
    return false;
  }
}

/**
 * FIXED: Validate recurring shift pattern for accuracy
 */
export function validateRecurringPattern(pattern: RecurringShiftPattern): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pattern.id) errors.push('Pattern must have an ID');
  if (!pattern.building_name) errors.push('Pattern must have a building name');
  if (!pattern.client_name) errors.push('Pattern must have a client name');
  if (!pattern.cleaner_names || pattern.cleaner_names.length === 0) errors.push('Pattern must have at least one cleaner');
  if (pattern.hours <= 0) errors.push('Pattern must have positive hours');
  if (!pattern.start_date) errors.push('Pattern must have a start date');
  
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(pattern.pattern_type)) {
    errors.push('Invalid pattern type');
  }

  if (pattern.pattern_type === 'weekly' && (!pattern.days_of_week || pattern.days_of_week.length === 0)) {
    errors.push('Weekly pattern must specify days of week');
  }

  if (pattern.pattern_type === 'monthly' && !pattern.day_of_month) {
    errors.push('Monthly pattern must specify day of month');
  }

  if (pattern.end_date) {
    const startDate = createDateFromString(pattern.start_date);
    const endDate = createDateFromString(pattern.end_date);
    if (endDate < startDate) {
      errors.push('End date must be after start date');
    }
  }

  if (pattern.max_occurrences && pattern.max_occurrences <= 0) {
    errors.push('Max occurrences must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
