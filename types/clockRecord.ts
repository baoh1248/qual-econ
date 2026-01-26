/**
 * Clock Record Type Definitions
 * Types for geofenced clock-in/clock-out functionality
 */

import { Coordinates } from '../utils/geofence';

export type ClockOutReason = 'manual' | 'auto_geofence' | 'shift_ended' | 'admin';
export type ClockStatus = 'clocked_in' | 'clocked_out' | 'auto_clocked_out';

export interface ClockRecord {
  id: string;
  cleanerId: string;
  cleanerName: string;
  scheduleEntryId?: string;
  buildingId?: string;
  buildingName: string;
  clientName: string;

  // Clock-in details
  clockInTime?: Date;
  clockInLatitude?: number;
  clockInLongitude?: number;
  clockInDistanceFt?: number;

  // Clock-out details
  clockOutTime?: Date;
  clockOutLatitude?: number;
  clockOutLongitude?: number;
  clockOutDistanceFt?: number;
  clockOutReason?: ClockOutReason;

  // Calculated fields
  totalMinutes?: number;

  // Status
  status: ClockStatus;

  // Notes
  notes?: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClockInRequest {
  cleanerId: string;
  cleanerName: string;
  scheduleEntryId: string;
  buildingId?: string;
  buildingName: string;
  clientName: string;
  location: Coordinates;
}

export interface ClockOutRequest {
  clockRecordId: string;
  location: Coordinates;
  reason: ClockOutReason;
  notes?: string;
}

export interface GeofenceShiftInfo {
  id: string;
  clientName: string;
  buildingName: string;
  address?: string;
  date: string;
  startTime: string;
  endTime?: string;
  hours: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  // Geofence data
  buildingLatitude?: number;
  buildingLongitude?: number;
  geofenceRadiusFt: number;
  // Clock status
  activeClockRecord?: ClockRecord;
  canClockIn: boolean;
  clockInMessage?: string;
}

export interface ClockInOutState {
  isLoading: boolean;
  error: string | null;
  currentClockRecord: ClockRecord | null;
  isWithinGeofence: boolean;
  distanceFromSite: number;
  canClockIn: boolean;
  clockInMessage: string;
  isMonitoringLocation: boolean;
}

export interface GeofenceAlert {
  type: 'left_geofence' | 'entered_geofence' | 'clock_in_available' | 'too_early';
  message: string;
  timestamp: Date;
}
