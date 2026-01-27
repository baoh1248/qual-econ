/**
 * useCleanerTracking Hook
 * Provides real-time tracking data for cleaners who are clocked in
 *
 * Features:
 * - Real-time subscription to clock_records table
 * - Automatic data refresh
 * - Calculates elapsed time and distance from work site
 * - Filtering and sorting options
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../app/integrations/supabase/client';
import { ClockRecord, ClockStatus } from '../types/clockRecord';
import { calculateMinutesWorked, formatMinutesAsTime } from '../utils/geofence';

export type CleanerTrackingStatus = 'on-duty' | 'off-duty' | 'break' | 'traveling';

export interface TrackedCleaner {
  id: string;
  cleanerId: string;
  name: string;
  status: CleanerTrackingStatus;
  currentTask: string;
  buildingName: string;
  clientName: string;
  latitude: number | null;
  longitude: number | null;
  clockInTime: Date | null;
  elapsedTime: string;
  elapsedMinutes: number;
  distanceFromSite: number | null;
  lastUpdate: Date;
  clockRecordId: string;
  isWithinGeofence: boolean;
}

export interface CleanerTrackingStats {
  totalTracked: number;
  onDuty: number;
  onBreak: number;
  traveling: number;
  totalHoursToday: number;
}

export interface UseCleanerTrackingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  includeCompleted?: boolean; // include recently completed shifts
}

interface UseCleanerTrackingReturn {
  trackedCleaners: TrackedCleaner[];
  stats: CleanerTrackingStats;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
}

const DEFAULT_GEOFENCE_RADIUS_FT = 300;

export function useCleanerTracking(options: UseCleanerTrackingOptions = {}): UseCleanerTrackingReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds default
    includeCompleted = false,
  } = options;

  const [trackedCleaners, setTrackedCleaners] = useState<TrackedCleaner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Calculate stats from tracked cleaners
  const stats: CleanerTrackingStats = {
    totalTracked: trackedCleaners.length,
    onDuty: trackedCleaners.filter(c => c.status === 'on-duty').length,
    onBreak: trackedCleaners.filter(c => c.status === 'break').length,
    traveling: trackedCleaners.filter(c => c.status === 'traveling').length,
    totalHoursToday: trackedCleaners.reduce((sum, c) => sum + c.elapsedMinutes, 0) / 60,
  };

  // Fetch active clock records
  const fetchActiveClockRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Fetch active clock records (clocked_in status)
      let query = supabase
        .from('clock_records')
        .select('*')
        .gte('created_at', todayIso);

      if (includeCompleted) {
        // Include recently completed (within last 2 hours)
        query = query.or('status.eq.clocked_in,status.eq.clocked_out,status.eq.auto_clocked_out');
      } else {
        query = query.eq('status', 'clocked_in');
      }

      const { data, error: fetchError } = await query.order('clock_in_time', { ascending: false });

      if (fetchError) throw fetchError;

      const cleaners = (data || []).map(transformClockRecord);
      setTrackedCleaners(cleaners);
      setLastRefresh(new Date());
      setIsConnected(true);
    } catch (err) {
      console.error('Error fetching clock records:', err);
      setError('Failed to fetch tracking data');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [includeCompleted]);

  // Transform database record to TrackedCleaner
  const transformClockRecord = (record: any): TrackedCleaner => {
    const clockInTime = record.clock_in_time ? new Date(record.clock_in_time) : null;
    const now = new Date();
    const elapsedMinutes = clockInTime ? calculateMinutesWorked(clockInTime, now) : 0;
    const elapsedTime = formatElapsedTime(elapsedMinutes);

    // Determine tracking status
    let status: CleanerTrackingStatus = 'on-duty';
    if (record.status === 'clocked_out' || record.status === 'auto_clocked_out') {
      status = 'off-duty';
    } else if (record.clock_in_distance_ft && record.clock_in_distance_ft > DEFAULT_GEOFENCE_RADIUS_FT) {
      status = 'traveling';
    }

    const isWithinGeofence = record.clock_in_distance_ft
      ? record.clock_in_distance_ft <= DEFAULT_GEOFENCE_RADIUS_FT
      : true;

    return {
      id: record.id,
      cleanerId: record.cleaner_id,
      name: record.cleaner_name,
      status,
      currentTask: `${record.client_name} - ${record.building_name}`,
      buildingName: record.building_name,
      clientName: record.client_name,
      latitude: record.clock_in_latitude,
      longitude: record.clock_in_longitude,
      clockInTime,
      elapsedTime,
      elapsedMinutes,
      distanceFromSite: record.clock_in_distance_ft,
      lastUpdate: record.updated_at ? new Date(record.updated_at) : new Date(record.created_at),
      clockRecordId: record.id,
      isWithinGeofence,
    };
  };

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
  };

  // Update elapsed times for all cleaners
  const updateElapsedTimes = useCallback(() => {
    setTrackedCleaners(prev => prev.map(cleaner => {
      if (!cleaner.clockInTime || cleaner.status === 'off-duty') return cleaner;

      const now = new Date();
      const elapsedMinutes = calculateMinutesWorked(cleaner.clockInTime, now);
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const secs = Math.floor((now.getTime() - cleaner.clockInTime.getTime()) / 1000) % 60;

      return {
        ...cleaner,
        elapsedMinutes,
        elapsedTime: `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      };
    }));
  }, []);

  // Set up real-time subscription
  const setupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const channel = supabase
      .channel('clock_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clock_records',
        },
        (payload) => {
          console.log('Clock record change:', payload.eventType);

          if (payload.eventType === 'INSERT') {
            const newCleaner = transformClockRecord(payload.new);
            setTrackedCleaners(prev => [newCleaner, ...prev.filter(c => c.cleanerId !== newCleaner.cleanerId)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedCleaner = transformClockRecord(payload.new);
            setTrackedCleaners(prev => {
              // If status changed to clocked_out/auto_clocked_out, remove from list (unless includeCompleted)
              if (!includeCompleted && (updatedCleaner.status === 'off-duty')) {
                return prev.filter(c => c.id !== updatedCleaner.id);
              }
              // Update existing record
              return prev.map(c => c.id === updatedCleaner.id ? updatedCleaner : c);
            });
          } else if (payload.eventType === 'DELETE') {
            setTrackedCleaners(prev => prev.filter(c => c.id !== (payload.old as any).id));
          }

          setLastRefresh(new Date());
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError('Real-time connection error');
        }
      });

    subscriptionRef.current = channel;
  }, [includeCompleted]);

  // Initial fetch and subscription setup
  useEffect(() => {
    fetchActiveClockRecords();
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [fetchActiveClockRecords, setupSubscription]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchActiveClockRecords();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchActiveClockRecords]);

  // Elapsed time update interval (every second)
  useEffect(() => {
    elapsedTimeIntervalRef.current = setInterval(updateElapsedTimes, 1000);

    return () => {
      if (elapsedTimeIntervalRef.current) {
        clearInterval(elapsedTimeIntervalRef.current);
      }
    };
  }, [updateElapsedTimes]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchActiveClockRecords();
  }, [fetchActiveClockRecords]);

  return {
    trackedCleaners,
    stats,
    isLoading,
    error,
    isConnected,
    lastRefresh,
    refresh,
  };
}

export default useCleanerTracking;
