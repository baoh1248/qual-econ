/**
 * Geofence Utility Functions
 * Handles distance calculations and geofence validation for clock-in/out
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceFeet: number;
  distanceMeters: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate (latitude, longitude)
 * @param coord2 Second coordinate (latitude, longitude)
 * @returns Distance in meters
 */
export function calculateDistanceMeters(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters

  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLat = toRadians(coord2.latitude - coord1.latitude);
  const deltaLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert meters to feet
 * @param meters Distance in meters
 * @returns Distance in feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Convert feet to meters
 * @param feet Distance in feet
 * @returns Distance in meters
 */
export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a location is within the geofence radius of a target location
 * @param currentLocation Current device location
 * @param targetLocation Target location (building/work site)
 * @param radiusFeet Radius in feet (default: 300 feet)
 * @returns GeofenceResult with distance and whether within radius
 */
export function checkGeofence(
  currentLocation: Coordinates,
  targetLocation: Coordinates,
  radiusFeet: number = 300
): GeofenceResult {
  const distanceMeters = calculateDistanceMeters(currentLocation, targetLocation);
  const distanceFeet = metersToFeet(distanceMeters);
  const radiusMeters = feetToMeters(radiusFeet);

  return {
    isWithinRadius: distanceMeters <= radiusMeters,
    distanceFeet: Math.round(distanceFeet * 100) / 100,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
  };
}

/**
 * Format distance for display
 * @param distanceFeet Distance in feet
 * @returns Formatted string (e.g., "150 ft" or "0.5 mi")
 */
export function formatDistance(distanceFeet: number): string {
  if (distanceFeet < 5280) {
    return `${Math.round(distanceFeet)} ft`;
  }
  const miles = distanceFeet / 5280;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Check if current time is within the allowed clock-in window
 * @param shiftStartTime Shift start time in HH:MM format (e.g., "09:00")
 * @param shiftDate Date of the shift in YYYY-MM-DD format
 * @param earlyMinutes How many minutes before shift start is allowed (default: 60)
 * @returns Object with canClockIn status and message
 */
export function checkClockInTimeWindow(
  shiftStartTime: string,
  shiftDate: string,
  earlyMinutes: number = 60
): { canClockIn: boolean; message: string; minutesUntilAllowed?: number } {
  const now = new Date();

  // Parse the shift start datetime
  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const shiftStart = new Date(shiftDate);
  shiftStart.setHours(hours, minutes, 0, 0);

  // Calculate the earliest allowed clock-in time
  const earliestClockIn = new Date(shiftStart.getTime() - earlyMinutes * 60 * 1000);

  // Check if current time is before the allowed window
  if (now < earliestClockIn) {
    const diffMs = earliestClockIn.getTime() - now.getTime();
    const minutesUntilAllowed = Math.ceil(diffMs / (60 * 1000));

    return {
      canClockIn: false,
      message: `You can clock in starting at ${formatTime(earliestClockIn)} (${earlyMinutes} minutes before your shift)`,
      minutesUntilAllowed,
    };
  }

  // Check if the shift has already ended (allow clock-in during the shift)
  // Assuming shifts are at least 1 hour, we allow clock-in up to the shift start + some buffer
  // For now, we allow clock-in anytime after the early window opens

  return {
    canClockIn: true,
    message: 'You are within the allowed clock-in window',
  };
}

/**
 * Format a Date object to a time string (HH:MM AM/PM)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parse a time string (HH:MM) and date string (YYYY-MM-DD) into a Date object
 */
export function parseShiftDateTime(timeString: string, dateString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(dateString);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Calculate total minutes worked between two timestamps
 */
export function calculateMinutesWorked(clockIn: Date, clockOut: Date): number {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  return Math.round(diffMs / (60 * 1000));
}

/**
 * Format minutes as hours and minutes string
 */
export function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}
