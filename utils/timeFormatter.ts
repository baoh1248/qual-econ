
/**
 * Utility functions for formatting time with AM/PM
 */

/**
 * Convert 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "09:00", "17:30")
 * @returns Time in 12-hour format with AM/PM (e.g., "9:00 AM", "5:30 PM")
 */
export function formatTimeWithAMPM(time24: string): string {
  if (!time24 || typeof time24 !== 'string') {
    return '';
  }

  try {
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return time24;
    }

    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const minutesFormatted = String(minutes).padStart(2, '0');

    return `${hours12}:${minutesFormatted} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24;
  }
}

/**
 * Convert 12-hour time format with AM/PM to 24-hour format
 * @param time12 - Time in 12-hour format with AM/PM (e.g., "9:00 AM", "5:30 PM")
 * @returns Time in 24-hour format (e.g., "09:00", "17:30")
 */
export function parseTimeFromAMPM(time12: string): string {
  if (!time12 || typeof time12 !== 'string') {
    return '09:00';
  }

  try {
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) {
      return time12;
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const hoursFormatted = String(hours).padStart(2, '0');
    const minutesFormatted = String(minutes).padStart(2, '0');

    return `${hoursFormatted}:${minutesFormatted}`;
  } catch (error) {
    console.error('Error parsing time:', error);
    return '09:00';
  }
}

/**
 * Format a time range with AM/PM
 * @param startTime - Start time in 24-hour format
 * @param endTime - End time in 24-hour format
 * @returns Formatted time range (e.g., "9:00 AM - 5:00 PM")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatTimeWithAMPM(startTime);
  const end = formatTimeWithAMPM(endTime);
  return `${start} - ${end}`;
}

/**
 * Get current time in 24-hour format
 * @returns Current time (e.g., "14:30")
 */
export function getCurrentTime24(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get current time in 12-hour format with AM/PM
 * @returns Current time (e.g., "2:30 PM")
 */
export function getCurrentTime12(): string {
  return formatTimeWithAMPM(getCurrentTime24());
}
