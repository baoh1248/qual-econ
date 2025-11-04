
/**
 * Utility functions for generating recurring project occurrences
 */

interface RecurringPattern {
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  custom_days?: number;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
}

interface ProjectOccurrence {
  date: string;
  occurrenceNumber: number;
}

/**
 * Calculate the next occurrence date based on the recurring pattern
 */
export function calculateNextOccurrence(
  currentDate: string,
  pattern: RecurringPattern
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
      next.setDate(current.getDate() + 1); // Start from next day
      
      // Find the next occurrence day
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
        // Handle months with fewer days
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

  // Check if we've exceeded the end date
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
  pattern: RecurringPattern,
  startDate?: string,
  endDate?: string,
  maxCount?: number
): ProjectOccurrence[] {
  const occurrences: ProjectOccurrence[] = [];
  const start = startDate ? new Date(startDate) : new Date(pattern.start_date);
  const end = endDate ? new Date(endDate) : pattern.end_date ? new Date(pattern.end_date) : null;
  const limit = maxCount || pattern.max_occurrences || 100; // Default limit to prevent infinite loops

  let currentDate = pattern.start_date;
  let occurrenceNumber = 1;

  // Add the first occurrence (start date)
  if (new Date(currentDate) >= start && (!end || new Date(currentDate) <= end)) {
    occurrences.push({
      date: currentDate,
      occurrenceNumber: occurrenceNumber++,
    });
  }

  // Generate subsequent occurrences
  while (occurrences.length < limit) {
    const nextDate = calculateNextOccurrence(currentDate, pattern);
    
    if (!nextDate) {
      break; // No more occurrences
    }

    const nextDateObj = new Date(nextDate);
    
    // Check if within date range
    if (nextDateObj < start) {
      currentDate = nextDate;
      continue;
    }
    
    if (end && nextDateObj > end) {
      break;
    }

    occurrences.push({
      date: nextDate,
      occurrenceNumber: occurrenceNumber++,
    });

    currentDate = nextDate;
  }

  return occurrences;
}

/**
 * Check if a recurring pattern is still active
 */
export function isPatternActive(pattern: RecurringPattern): boolean {
  const now = new Date();
  const startDate = new Date(pattern.start_date);

  // Check if pattern has started
  if (now < startDate) {
    return false;
  }

  // Check if pattern has ended
  if (pattern.end_date) {
    const endDate = new Date(pattern.end_date);
    if (now > endDate) {
      return false;
    }
  }

  return true;
}

/**
 * Get the next N occurrences from today
 */
export function getUpcomingOccurrences(
  pattern: RecurringPattern,
  count: number = 5
): ProjectOccurrence[] {
  const today = new Date().toISOString().split('T')[0];
  const endDate = pattern.end_date || 
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from now

  return generateOccurrences(pattern, today, endDate, count);
}

/**
 * Format a recurring pattern description for display
 */
export function formatPatternDescription(pattern: RecurringPattern): string {
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
