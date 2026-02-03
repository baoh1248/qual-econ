/**
 * useGeofenceClockInOut Hook
 * Manages geofenced clock-in/clock-out functionality for cleaners
 *
 * Features:
 * - Location-based clock-in validation (300ft radius)
 * - Automatic clock-out when leaving geofence
 * - Time window restriction (1 hour before shift start)
 * - Real-time location monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../app/integrations/supabase/client';
import {
  checkGeofence,
  checkClockInTimeWindow,
  calculateMinutesWorked,
  formatDistance,
  formatMinutesAsTime,
  Coordinates,
} from '../utils/geofence';
import { geocodeAddress, isValidCoordinates } from '../utils/geocoding';
import {
  ClockRecord,
  ClockInOutState,
  GeofenceShiftInfo,
  ClockOutReason,
  GeofenceAlert,
} from '../types/clockRecord';

const GEOFENCE_RADIUS_FT = 300;
const EARLY_CLOCK_IN_MINUTES = 60;
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds

interface UseGeofenceClockInOutProps {
  cleanerId: string;
  cleanerName: string;
  shift: GeofenceShiftInfo | null;
  onAutoClockOut?: (message: string) => void;
  onGeofenceAlert?: (alert: GeofenceAlert) => void;
}

interface UseGeofenceClockInOutReturn {
  state: ClockInOutState;
  clockIn: () => Promise<boolean>;
  clockOut: (reason?: ClockOutReason, notes?: string) => Promise<boolean>;
  refreshLocation: () => Promise<void>;
  startLocationMonitoring: () => void;
  stopLocationMonitoring: () => void;
  currentLocation: Coordinates | null;
  elapsedTime: string;
}

export function useGeofenceClockInOut({
  cleanerId,
  cleanerName,
  shift,
  onAutoClockOut,
  onGeofenceAlert,
}: UseGeofenceClockInOutProps): UseGeofenceClockInOutReturn {
  const [state, setState] = useState<ClockInOutState>({
    isLoading: false,
    error: null,
    currentClockRecord: null,
    isWithinGeofence: false,
    distanceFromSite: 0,
    canClockIn: false,
    clockInMessage: '',
    isMonitoringLocation: false,
  });

  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [elapsedTime, setElapsedTime] = useState('0:00:00');

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const elapsedTimeInterval = useRef<NodeJS.Timeout | null>(null);
  const wasWithinGeofence = useRef(false);
  // Resolved building coordinates (fetched directly from DB or geocoded on-the-fly)
  const [resolvedCoords, setResolvedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const lastResolvedShiftId = useRef<string | null>(null);

  // Function to resolve building coordinates from DB or geocoding
  const resolveBuildingCoordinates = useCallback(async (shiftInfo: GeofenceShiftInfo) => {
    console.log('🔍 Resolving coordinates for building:', shiftInfo.buildingName);

    // Step 1: Try fetching directly from client_buildings table
    try {
      const { data } = await supabase
        .from('client_buildings')
        .select('latitude, longitude, address')
        .eq('building_name', shiftInfo.buildingName)
        .maybeSingle();

      if (data && isValidCoordinates(
        data.latitude ? parseFloat(data.latitude) : null,
        data.longitude ? parseFloat(data.longitude) : null
      )) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        console.log('✅ Found coordinates in DB:', lat, lng);
        setResolvedCoords({ latitude: lat, longitude: lng });
        return;
      }

      // Step 2: Try geocoding the address (from shift or from DB)
      const addressToGeocode = shiftInfo.address || data?.address;
      if (addressToGeocode) {
        console.log('🌍 Geocoding address on-the-fly:', addressToGeocode);
        const result = await geocodeAddress(addressToGeocode);
        if (result.success && isValidCoordinates(result.latitude, result.longitude)) {
          console.log('✅ Geocoded successfully:', result.latitude, result.longitude);
          setResolvedCoords({ latitude: result.latitude, longitude: result.longitude });

          // Save to DB so we don't have to geocode again
          await supabase
            .from('client_buildings')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              updated_at: new Date().toISOString(),
            })
            .eq('building_name', shiftInfo.buildingName);
          console.log('✅ Saved coordinates to database');
          return;
        }
      }

      console.warn('⚠️ Could not resolve coordinates for:', shiftInfo.buildingName);
    } catch (error) {
      console.error('❌ Error resolving coordinates:', error);
    }
  }, []);

  // Resolve building coordinates when shift changes
  useEffect(() => {
    if (!shift) {
      setResolvedCoords(null);
      lastResolvedShiftId.current = null;
      return;
    }

    // If shift already has valid coordinates, use them directly
    if (isValidCoordinates(shift.buildingLatitude, shift.buildingLongitude)) {
      setResolvedCoords({ latitude: shift.buildingLatitude!, longitude: shift.buildingLongitude! });
      lastResolvedShiftId.current = shift.id;
      return;
    }

    // Don't re-attempt automatically for the same shift (refreshLocation can force retry)
    if (lastResolvedShiftId.current === shift.id) return;
    lastResolvedShiftId.current = shift.id;

    resolveBuildingCoordinates(shift);
  }, [shift?.id, shift?.buildingLatitude, shift?.buildingLongitude, shift?.buildingName, resolveBuildingCoordinates]);

  // Load active clock record on mount
  useEffect(() => {
    if (cleanerId && shift) {
      loadActiveClockRecord();
    }
  }, [cleanerId, shift?.id]);

  // Update elapsed time when clocked in
  useEffect(() => {
    if (state.currentClockRecord?.clockInTime && state.currentClockRecord.status === 'clocked_in') {
      const updateElapsed = () => {
        const now = new Date();
        const clockIn = new Date(state.currentClockRecord!.clockInTime!);
        const minutes = calculateMinutesWorked(clockIn, now);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const secs = Math.floor((now.getTime() - clockIn.getTime()) / 1000) % 60;
        setElapsedTime(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      };

      updateElapsed();
      elapsedTimeInterval.current = setInterval(updateElapsed, 1000);

      return () => {
        if (elapsedTimeInterval.current) {
          clearInterval(elapsedTimeInterval.current);
        }
      };
    } else {
      setElapsedTime('0:00:00');
    }
  }, [state.currentClockRecord?.clockInTime, state.currentClockRecord?.status]);

  // Check geofence and time window when location, shift, or resolved coordinates change
  useEffect(() => {
    if (!currentLocation || !shift) return;

    // Use resolved coordinates (which may come from shift, DB lookup, or on-the-fly geocoding)
    if (!resolvedCoords) {
      setState(prev => ({
        ...prev,
        isWithinGeofence: false,
        distanceFromSite: 0,
        canClockIn: false,
        clockInMessage: 'Locating building... If this persists, contact your supervisor to update the building address.',
      }));
      return;
    }

    const targetLocation: Coordinates = {
      latitude: resolvedCoords.latitude,
      longitude: resolvedCoords.longitude,
    };

    const geofenceResult = checkGeofence(
      currentLocation,
      targetLocation,
      shift.geofenceRadiusFt || GEOFENCE_RADIUS_FT
    );

    const timeResult = checkClockInTimeWindow(
      shift.startTime,
      shift.date,
      EARLY_CLOCK_IN_MINUTES
    );

    // Check if user just left the geofence while clocked in
    if (
      state.currentClockRecord?.status === 'clocked_in' &&
      wasWithinGeofence.current &&
      !geofenceResult.isWithinRadius
    ) {
      handleLeftGeofence();
    }

    wasWithinGeofence.current = geofenceResult.isWithinRadius;

    const canClockIn =
      geofenceResult.isWithinRadius &&
      timeResult.canClockIn &&
      !state.currentClockRecord;

    setState(prev => ({
      ...prev,
      isWithinGeofence: geofenceResult.isWithinRadius,
      distanceFromSite: geofenceResult.distanceFeet,
      canClockIn,
      clockInMessage: !geofenceResult.isWithinRadius
        ? `You are ${formatDistance(geofenceResult.distanceFeet)} away from the work site. Move within ${GEOFENCE_RADIUS_FT}ft to clock in.`
        : !timeResult.canClockIn
        ? timeResult.message
        : state.currentClockRecord
        ? 'Already clocked in'
        : 'Ready to clock in',
    }));
  }, [currentLocation, shift, resolvedCoords, state.currentClockRecord]);

  const loadActiveClockRecord = async () => {
    if (!cleanerId || !shift) return;

    try {
      const { data, error } = await supabase
        .from('clock_records')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .eq('schedule_entry_id', shift.id)
        .eq('status', 'clocked_in')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const clockRecord: ClockRecord = {
          id: data.id,
          cleanerId: data.cleaner_id,
          cleanerName: data.cleaner_name,
          scheduleEntryId: data.schedule_entry_id,
          buildingId: data.building_id,
          buildingName: data.building_name,
          clientName: data.client_name,
          clockInTime: data.clock_in_time ? new Date(data.clock_in_time) : undefined,
          clockInLatitude: data.clock_in_latitude,
          clockInLongitude: data.clock_in_longitude,
          clockInDistanceFt: data.clock_in_distance_ft,
          status: data.status,
          notes: data.notes,
        };

        setState(prev => ({ ...prev, currentClockRecord: clockRecord }));
      }
    } catch (error) {
      console.error('Error loading active clock record:', error);
    }
  };

  const handleLeftGeofence = async () => {
    const message = `You have left the work area (${GEOFENCE_RADIUS_FT}ft radius). You have been automatically clocked out.`;

    onGeofenceAlert?.({
      type: 'left_geofence',
      message,
      timestamp: new Date(),
    });

    await clockOut('auto_geofence', 'Automatically clocked out - left geofence area');

    onAutoClockOut?.(message);

    Alert.alert(
      'Automatic Clock Out',
      message,
      [{ text: 'OK' }]
    );
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to clock in and out. Please enable location services in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<Coordinates | null> => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      return coords;
    } catch (error) {
      console.error('Error getting current location:', error);
      setState(prev => ({ ...prev, error: 'Failed to get current location' }));
      return null;
    }
  };

  const refreshLocation = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await getCurrentLocation();

    // Re-attempt coordinate resolution if still missing
    if (!resolvedCoords && shift) {
      lastResolvedShiftId.current = null; // Reset so it tries again
      await resolveBuildingCoordinates(shift);
    }

    setState(prev => ({ ...prev, isLoading: false }));
  };

  const startLocationMonitoring = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Get initial location
    await getCurrentLocation();

    // Start watching location
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: LOCATION_UPDATE_INTERVAL,
      },
      (location) => {
        const coords: Coordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(coords);
      }
    );

    setState(prev => ({ ...prev, isMonitoringLocation: true }));
  }, []);

  const stopLocationMonitoring = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setState(prev => ({ ...prev, isMonitoringLocation: false }));
  }, []);

  const clockIn = async (): Promise<boolean> => {
    if (!shift || !cleanerId) {
      setState(prev => ({ ...prev, error: 'No shift or cleaner data available' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        setState(prev => ({ ...prev, isLoading: false, error: 'Could not get location' }));
        return false;
      }

      // Check geofence using resolved coordinates
      if (!resolvedCoords) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Building location not set. Please contact your supervisor to update the building address.',
        }));
        return false;
      }

      const geofenceResult = checkGeofence(
        location,
        { latitude: resolvedCoords.latitude, longitude: resolvedCoords.longitude },
        shift.geofenceRadiusFt || GEOFENCE_RADIUS_FT
      );

      if (!geofenceResult.isWithinRadius) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `You must be within ${GEOFENCE_RADIUS_FT}ft of the work site to clock in. You are currently ${formatDistance(geofenceResult.distanceFeet)} away.`,
        }));
        return false;
      }

      // Check time window
      const timeResult = checkClockInTimeWindow(
        shift.startTime,
        shift.date,
        EARLY_CLOCK_IN_MINUTES
      );

      if (!timeResult.canClockIn) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: timeResult.message,
        }));
        return false;
      }

      // Calculate distance for record (coordinates already validated above)
      const distanceFt = geofenceResult.distanceFeet;

      // Create clock record
      const { data, error } = await supabase
        .from('clock_records')
        .insert({
          cleaner_id: cleanerId,
          cleaner_name: cleanerName,
          schedule_entry_id: shift.id,
          building_name: shift.buildingName,
          client_name: shift.clientName,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: location.latitude,
          clock_in_longitude: location.longitude,
          clock_in_distance_ft: distanceFt,
          status: 'clocked_in',
        })
        .select()
        .single();

      if (error) throw error;

      const clockRecord: ClockRecord = {
        id: data.id,
        cleanerId: data.cleaner_id,
        cleanerName: data.cleaner_name,
        scheduleEntryId: data.schedule_entry_id,
        buildingName: data.building_name,
        clientName: data.client_name,
        clockInTime: new Date(data.clock_in_time),
        clockInLatitude: data.clock_in_latitude,
        clockInLongitude: data.clock_in_longitude,
        clockInDistanceFt: data.clock_in_distance_ft,
        status: 'clocked_in',
      };

      // Update schedule entry status to in-progress
      await supabase
        .from('schedule_entries')
        .update({ status: 'in-progress' })
        .eq('id', shift.id);

      wasWithinGeofence.current = true;
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentClockRecord: clockRecord,
        error: null,
      }));

      // Start location monitoring for auto clock-out
      startLocationMonitoring();

      return true;
    } catch (error) {
      console.error('Error clocking in:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to clock in. Please try again.',
      }));
      return false;
    }
  };

  const clockOut = async (
    reason: ClockOutReason = 'manual',
    notes?: string
  ): Promise<boolean> => {
    if (!state.currentClockRecord) {
      setState(prev => ({ ...prev, error: 'No active clock record' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const location = await getCurrentLocation();
      const clockOutTime = new Date();
      const clockInTime = new Date(state.currentClockRecord.clockInTime!);
      const totalMinutes = calculateMinutesWorked(clockInTime, clockOutTime);

      let distanceFt = 0;
      if (location && resolvedCoords) {
        const geofenceResult = checkGeofence(
          location,
          { latitude: resolvedCoords.latitude, longitude: resolvedCoords.longitude },
          shift?.geofenceRadiusFt || GEOFENCE_RADIUS_FT
        );
        distanceFt = geofenceResult.distanceFeet;
      }

      const status = reason === 'auto_geofence' ? 'auto_clocked_out' : 'clocked_out';

      const { error } = await supabase
        .from('clock_records')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_latitude: location?.latitude,
          clock_out_longitude: location?.longitude,
          clock_out_distance_ft: distanceFt,
          clock_out_reason: reason,
          total_minutes: totalMinutes,
          status,
          notes: notes || state.currentClockRecord.notes,
        })
        .eq('id', state.currentClockRecord.id);

      if (error) throw error;

      // Update schedule entry status to completed if manual clock-out
      if (shift && reason === 'manual') {
        await supabase
          .from('schedule_entries')
          .update({ status: 'completed' })
          .eq('id', shift.id);
      }

      stopLocationMonitoring();

      setState(prev => ({
        ...prev,
        isLoading: false,
        currentClockRecord: null,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Error clocking out:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to clock out. Please try again.',
      }));
      return false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationMonitoring();
      if (elapsedTimeInterval.current) {
        clearInterval(elapsedTimeInterval.current);
      }
    };
  }, [stopLocationMonitoring]);

  return {
    state,
    clockIn,
    clockOut,
    refreshLocation,
    startLocationMonitoring,
    stopLocationMonitoring,
    currentLocation,
    elapsedTime,
  };
}

export default useGeofenceClockInOut;
