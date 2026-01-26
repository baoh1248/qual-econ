
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import AnimatedCard from '../../components/AnimatedCard';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';
import CompanyLogo from '../../components/CompanyLogo';
import Toast from '../../components/Toast';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl, StyleSheet, Linking, Modal, ActivityIndicator } from 'react-native';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useState, useEffect, useCallback } from 'react';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { supabase } from '../integrations/supabase/client';
import { useTheme } from '../../hooks/useTheme';
import { useGeofenceClockInOut } from '../../hooks/useGeofenceClockInOut';
import { GeofenceShiftInfo } from '../../types/clockRecord';
import { formatDistance } from '../../utils/geofence';

interface Shift {
  id: string;
  clientName: string;
  buildingName: string;
  address: string;
  day: string;
  date: string;
  startTime: string;
  endTime?: string;
  hours: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  // Geofence data
  buildingLatitude?: number;
  buildingLongitude?: number;
  geofenceRadiusFt?: number;
}

interface CleanerProfile {
  id: string;
  name: string;
  employeeId: string;
  currentLocation: string;
  todayHours: number;
  todayTasks: number;
  todayPhotos: number;
  weeklyPhotos: number;
  efficiency: number;
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.h1,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  employeeIdText: {
    ...typography.small,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  subGreeting: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  quickActionsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  quickActionCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  quickActionDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    ...typography.bodyMedium,
    fontWeight: '500',
  },
  shiftCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  shiftClient: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  shiftBuilding: {
    ...typography.body,
    color: colors.textSecondary,
  },
  shiftDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  shiftDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shiftDetailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emergencyButton: {
    position: 'absolute',
    bottom: spacing.xl + 80,
    right: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    ...commonStyles.shadowLg,
  },
  logoutModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  logoutModalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 400,
  },
  logoutModalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  logoutModalText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shiftModalSubtitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  shiftModalDetails: {
    width: '100%',
    gap: spacing.sm,
  },
  shiftModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  shiftModalAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    marginVertical: spacing.xs,
  },
  shiftModalLabel: {
    ...typography.body,
    color: colors.textSecondary,
    width: 60,
  },
  shiftModalValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  shiftModalAddressLink: {
    textDecorationLine: 'underline',
  },
  shiftModalNotesSection: {
    marginTop: spacing.lg,
    width: '100%',
  },
  shiftModalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  shiftModalNotesTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  shiftModalNotesBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
  },
  shiftModalNotesText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  // Clock-in/out styles
  clockCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
  },
  clockCardActive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  clockCardInactive: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  clockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  clockTitle: {
    ...typography.h3,
    color: colors.text,
  },
  clockStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  clockStatusText: {
    ...typography.small,
    fontWeight: '600',
  },
  clockTimer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  clockTimerText: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  clockTimerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  clockShiftInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  clockShiftName: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  clockShiftDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clockShiftDetailText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  clockLocationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  clockLocationStatusWithin: {
    backgroundColor: colors.success + '20',
  },
  clockLocationStatusOutside: {
    backgroundColor: colors.warning + '20',
  },
  clockLocationText: {
    ...typography.small,
    fontWeight: '500',
  },
  clockButton: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockButtonIn: {
    backgroundColor: colors.success,
  },
  clockButtonOut: {
    backgroundColor: colors.danger,
  },
  clockButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  clockButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '700',
  },
  clockMessage: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  clockError: {
    ...typography.small,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default function CleanerDashboard() {
  const { themeColor } = useTheme();
  const [profile, setProfile] = useState<CleanerProfile>({
    id: '1',
    name: 'Loading...',
    employeeId: '',
    currentLocation: 'Unknown',
    todayHours: 0,
    todayTasks: 0,
    todayPhotos: 0,
    weeklyPhotos: 0,
    efficiency: 0,
  });

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShiftForClock, setSelectedShiftForClock] = useState<GeofenceShiftInfo | null>(null);

  const { syncStatus } = useRealtimeSync();
  const { toast, showToast } = useToast();
  const { getScheduleForCleaner } = useScheduleStorage();

  // Geofence clock-in/out hook
  const {
    state: clockState,
    clockIn,
    clockOut,
    refreshLocation,
    currentLocation,
    elapsedTime,
  } = useGeofenceClockInOut({
    cleanerId: profile.id,
    cleanerName: profile.name,
    shift: selectedShiftForClock,
    onAutoClockOut: (message) => {
      showToast(message, 'warning');
      loadShifts(); // Refresh shifts to update status
    },
    onGeofenceAlert: (alert) => {
      if (alert.type === 'left_geofence') {
        showToast(alert.message, 'warning');
      }
    },
  });

  const loadProfile = useCallback(async () => {
    try {
      // Get session from auth system
      const { getSession } = await import('../utils/auth');
      const session = await getSession();

      if (!session) {
        router.replace('/auth/login');
        return;
      }

      // Optionally verify the cleaner still exists in the database
      const { data: cleanerData, error } = await supabase
        .from('cleaners')
        .select('*')
        .eq('id', session.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading cleaner profile:', error);
      }

      if (!cleanerData) {
        const { clearSession } = await import('../utils/auth');
        await clearSession();
        router.replace('/auth/login');
        return;
      }

      // Check if account is still active
      if (!cleanerData.is_active || cleanerData.employment_status !== 'active') {
        Alert.alert(
          'Account Inactive',
          'Your account is no longer active. Please contact your supervisor.',
          [
            {
              text: 'OK',
              onPress: async () => {
                const { clearSession } = await import('../utils/auth');
                await clearSession();
                router.replace('/auth/login');
              }
            }
          ]
        );
        return;
      }

      setProfile({
        id: cleanerData.id,
        name: cleanerData.name || cleanerData.go_by || session.name,
        employeeId: cleanerData.employee_id || '',
        currentLocation: 'On Site',
        todayHours: 0,
        todayTasks: 0,
        todayPhotos: 0,
        weeklyPhotos: 0,
        efficiency: 95,
      });
    } catch (error) {
      console.error('Error in loadProfile:', error);
      router.replace('/auth/login');
    }
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      if (!profile.name || profile.name === 'Loading...') {
        return;
      }

      const schedule = await getScheduleForCleaner(profile.name);

      // Use local date instead of UTC to avoid timezone issues around midnight
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Get today's shifts
      const todayScheduleEntries = schedule.filter(entry => entry.date === todayStr);

      // Fetch building coordinates for geofencing
      const buildingNames = [...new Set(todayScheduleEntries.map(e => e.buildingName).filter(Boolean))];
      let buildingCoordinates: { [key: string]: { latitude: number; longitude: number; radius: number } } = {};

      if (buildingNames.length > 0) {
        const { data: buildings } = await supabase
          .from('client_buildings')
          .select('building_name, latitude, longitude, geofence_radius_ft')
          .in('building_name', buildingNames);

        if (buildings) {
          buildings.forEach(b => {
            if (b.latitude && b.longitude) {
              buildingCoordinates[b.building_name] = {
                latitude: b.latitude,
                longitude: b.longitude,
                radius: b.geofence_radius_ft || 300,
              };
            }
          });
        }
      }

      const todayShifts: Shift[] = todayScheduleEntries.map(entry => {
        const buildingCoords = entry.buildingName ? buildingCoordinates[entry.buildingName] : null;
        return {
          id: entry.id,
          clientName: entry.clientName,
          buildingName: entry.buildingName || '',
          address: entry.address || '',
          day: entry.day,
          date: entry.date,
          startTime: entry.startTime || '09:00',
          endTime: entry.endTime,
          hours: entry.hours,
          status: entry.status,
          priority: 'medium' as const,
          notes: entry.notes || '',
          buildingLatitude: buildingCoords?.latitude,
          buildingLongitude: buildingCoords?.longitude,
          geofenceRadiusFt: buildingCoords?.radius || 300,
        };
      });

      setShifts(todayShifts);

      // Set the first available (non-completed, non-cancelled) shift for clock-in
      const availableShift = todayShifts.find(s => s.status === 'scheduled' || s.status === 'in-progress');
      if (availableShift) {
        const geofenceShift: GeofenceShiftInfo = {
          id: availableShift.id,
          clientName: availableShift.clientName,
          buildingName: availableShift.buildingName,
          address: availableShift.address,
          date: availableShift.date,
          startTime: availableShift.startTime,
          endTime: availableShift.endTime,
          hours: availableShift.hours,
          status: availableShift.status,
          buildingLatitude: availableShift.buildingLatitude,
          buildingLongitude: availableShift.buildingLongitude,
          geofenceRadiusFt: availableShift.geofenceRadiusFt || 300,
          canClockIn: false,
        };
        setSelectedShiftForClock(geofenceShift);
      }

      // Get upcoming shifts (next 7 days, excluding today)
      const upcoming = schedule
        .filter(entry => entry.date > todayStr)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        .slice(0, 10)
        .map(entry => ({
          id: entry.id,
          clientName: entry.clientName,
          buildingName: entry.buildingName || '',
          address: entry.address || '',
          day: entry.day,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          hours: entry.hours,
          status: entry.status,
          priority: 'medium' as const,
          notes: entry.notes || '',
        }));

      setUpcomingShifts(upcoming);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  }, [profile.name, getScheduleForCleaner]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile.name && profile.name !== 'Loading...') {
      loadShifts();
    }
  }, [profile.name, loadShifts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    await loadShifts();
    await refreshLocation();
    setRefreshing(false);
  };

  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      // Clear session using auth system
      const { clearSession } = await import('../utils/auth');
      await clearSession();
      setShowLogoutModal(false);
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      showToast('Failed to logout', 'error');
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleShiftPress = (shift: Shift) => {
    setSelectedShift(shift);
    setShowShiftModal(true);
  };

  const handleOpenMaps = (address: string) => {
    if (address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      Linking.openURL(url);
    }
  };

  const handleCloseShiftModal = () => {
    setShowShiftModal(false);
    setSelectedShift(null);
  };

  const handleEmergencyAlert = () => {
    Alert.alert(
      'Emergency Alert',
      'This will send an emergency notification to all supervisors. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Alert', 
          style: 'destructive',
          onPress: () => {
            showToast('Emergency alert sent!', 'success');
          }
        },
      ]
    );
  };

  const handleTimeOffPress = () => {
    router.push('/cleaner/time-off');
  };

  const handleClockIn = async () => {
    if (!selectedShiftForClock) {
      showToast('No shift available for clock-in', 'error');
      return;
    }

    const success = await clockIn();
    if (success) {
      showToast('Successfully clocked in!', 'success');
      loadShifts(); // Refresh to update shift status
    }
  };

  const handleClockOut = async () => {
    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            const success = await clockOut('manual');
            if (success) {
              showToast('Successfully clocked out!', 'success');
              loadShifts(); // Refresh to update shift status
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.pending;
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColor} />
        }
      >
        {/* Header with Gradient */}
        <View style={[styles.headerGradient, { backgroundColor: themeColor }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {profile.name}!</Text>
              {profile.employeeId && (
                <Text style={styles.employeeIdText}>Employee ID: {profile.employeeId}</Text>
              )}
              <Text style={styles.subGreeting}>Ready to make a difference today?</Text>
            </View>
            <TouchableOpacity onPress={handleLogoutPress}>
              <CompanyLogo size={50} />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Icon name="time" size={24} color={colors.textInverse} />
              <Text style={styles.statValue}>{profile.todayHours}h</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="checkmark-circle" size={24} color={colors.textInverse} />
              <Text style={styles.statValue}>{profile.todayTasks}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="camera" size={24} color={colors.textInverse} />
              <Text style={styles.statValue}>{profile.todayPhotos}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Clock In/Out Card */}
          {selectedShiftForClock && (
            <AnimatedCard
              style={[
                styles.clockCard,
                clockState.currentClockRecord ? styles.clockCardActive : styles.clockCardInactive,
              ]}
            >
              <View style={styles.clockHeader}>
                <Text style={styles.clockTitle}>
                  {clockState.currentClockRecord ? 'Currently Working' : 'Clock In'}
                </Text>
                <View
                  style={[
                    styles.clockStatusBadge,
                    {
                      backgroundColor: clockState.currentClockRecord
                        ? colors.success + '20'
                        : colors.textTertiary + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.clockStatusText,
                      {
                        color: clockState.currentClockRecord
                          ? colors.success
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {clockState.currentClockRecord ? 'Clocked In' : 'Not Clocked In'}
                  </Text>
                </View>
              </View>

              {/* Timer Display */}
              {clockState.currentClockRecord && (
                <View style={styles.clockTimer}>
                  <Text style={[styles.clockTimerText, { color: colors.success }]}>
                    {elapsedTime}
                  </Text>
                  <Text style={styles.clockTimerLabel}>Time Worked</Text>
                </View>
              )}

              {/* Shift Info */}
              <View style={styles.clockShiftInfo}>
                <Text style={styles.clockShiftName}>
                  {selectedShiftForClock.clientName} - {selectedShiftForClock.buildingName}
                </Text>
                <View style={styles.clockShiftDetails}>
                  <Icon name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.clockShiftDetailText}>
                    {selectedShiftForClock.startTime}
                    {selectedShiftForClock.endTime ? ` - ${selectedShiftForClock.endTime}` : ''}
                  </Text>
                  <Text style={styles.clockShiftDetailText}>|</Text>
                  <Icon name="hourglass-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.clockShiftDetailText}>{selectedShiftForClock.hours}h</Text>
                </View>
              </View>

              {/* Location Status */}
              <TouchableOpacity
                style={[
                  styles.clockLocationStatus,
                  clockState.isWithinGeofence
                    ? styles.clockLocationStatusWithin
                    : styles.clockLocationStatusOutside,
                ]}
                onPress={refreshLocation}
              >
                <Icon
                  name={clockState.isWithinGeofence ? 'checkmark-circle' : 'location-outline'}
                  size={18}
                  color={clockState.isWithinGeofence ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.clockLocationText,
                    { color: clockState.isWithinGeofence ? colors.success : colors.warning },
                  ]}
                >
                  {clockState.isWithinGeofence
                    ? `Within work area (${Math.round(clockState.distanceFromSite)} ft)`
                    : currentLocation
                    ? `${formatDistance(clockState.distanceFromSite)} from work site`
                    : 'Tap to check location'}
                </Text>
                {clockState.isLoading && (
                  <ActivityIndicator size="small" color={themeColor} />
                )}
              </TouchableOpacity>

              {/* Clock In/Out Button */}
              {clockState.currentClockRecord ? (
                <TouchableOpacity
                  style={[styles.clockButton, styles.clockButtonOut]}
                  onPress={handleClockOut}
                  disabled={clockState.isLoading}
                >
                  {clockState.isLoading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.clockButtonText}>Clock Out</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.clockButton,
                    clockState.canClockIn ? styles.clockButtonIn : styles.clockButtonDisabled,
                  ]}
                  onPress={handleClockIn}
                  disabled={!clockState.canClockIn || clockState.isLoading}
                >
                  {clockState.isLoading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.clockButtonText}>Clock In</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Clock Message */}
              {!clockState.currentClockRecord && clockState.clockInMessage && (
                <Text style={styles.clockMessage}>{clockState.clockInMessage}</Text>
              )}

              {/* Error Message */}
              {clockState.error && <Text style={styles.clockError}>{clockState.error}</Text>}
            </AnimatedCard>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity onPress={handleTimeOffPress}>
              <View style={styles.quickActionCard}>
                <View style={[styles.quickActionIcon, { backgroundColor: themeColor + '20' }]}>
                  <Icon name="calendar-outline" size={24} color={themeColor} />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>Request Time Off</Text>
                  <Text style={styles.quickActionDescription}>
                    Submit a time off request for approval
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Today's Schedule */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          </View>

          {shifts.length > 0 ? (
            shifts.map((shift) => (
              <TouchableOpacity key={shift.id} onPress={() => handleShiftPress(shift)}>
                <AnimatedCard style={styles.shiftCard}>
                  <View style={styles.shiftHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftClient}>{shift.clientName}</Text>
                      <Text style={styles.shiftBuilding}>{shift.buildingName}</Text>
                    </View>
                    <View style={[commonStyles.badge, { backgroundColor: getStatusStyle(shift.status).bg }]}>
                      <Text style={[typography.small, { color: getStatusStyle(shift.status).text }]}>
                        {shift.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shiftDetails}>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="time" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText}>{shift.startTime}</Text>
                    </View>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="hourglass" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText}>{shift.hours}h</Text>
                    </View>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="location" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText} numberOfLines={1}>
                        {shift.address || 'No address'}
                      </Text>
                    </View>
                  </View>
                </AnimatedCard>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="calendar" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyStateText}>No shifts scheduled for today</Text>
            </View>
          )}

          {/* Upcoming Schedule */}
          <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
            <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
          </View>

          {upcomingShifts.length > 0 ? (
            upcomingShifts.map((shift) => (
              <TouchableOpacity key={shift.id} onPress={() => handleShiftPress(shift)}>
                <AnimatedCard style={styles.shiftCard}>
                  <View style={styles.shiftHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftClient}>{shift.clientName}</Text>
                      <Text style={styles.shiftBuilding}>{shift.buildingName}</Text>
                    </View>
                    <View style={[commonStyles.badge, { backgroundColor: themeColor + '20' }]}>
                      <Text style={[typography.small, { color: themeColor }]}>
                        {shift.day}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.shiftDetails}>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="calendar" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText}>{shift.date}</Text>
                    </View>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="time" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText}>{shift.startTime}</Text>
                    </View>
                    <View style={styles.shiftDetailItem}>
                      <Icon name="hourglass" size={16} color={colors.textSecondary} />
                      <Text style={styles.shiftDetailText}>{shift.hours}h</Text>
                    </View>
                  </View>
                </AnimatedCard>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyStateText}>No upcoming shifts scheduled</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Emergency Button */}
      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyAlert}>
        <Icon name="alert-circle" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={handleLogoutCancel}
      >
        <View style={styles.logoutModal}>
          <View style={styles.logoutModalContent}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutModalButtons}>
              <Button
                title="Cancel"
                onPress={handleLogoutCancel}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Logout"
                onPress={handleLogoutConfirm}
                variant="danger"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Shift Details Modal */}
      <Modal
        visible={showShiftModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseShiftModal}
      >
        <View style={styles.logoutModal}>
          <View style={[styles.logoutModalContent, { maxWidth: 400 }]}>
            {selectedShift && (
              <>
                <Text style={styles.logoutModalTitle}>{selectedShift.clientName}</Text>
                <Text style={[styles.shiftModalSubtitle, { color: themeColor }]}>
                  {selectedShift.buildingName}
                </Text>

                <View style={styles.shiftModalDetails}>
                  <View style={styles.shiftModalRow}>
                    <Icon name="calendar" size={18} color={colors.textSecondary} />
                    <Text style={styles.shiftModalLabel}>Date:</Text>
                    <Text style={styles.shiftModalValue}>{selectedShift.date}</Text>
                  </View>

                  <View style={styles.shiftModalRow}>
                    <Icon name="time" size={18} color={colors.textSecondary} />
                    <Text style={styles.shiftModalLabel}>Time:</Text>
                    <Text style={styles.shiftModalValue}>
                      {selectedShift.startTime}{selectedShift.endTime ? ` - ${selectedShift.endTime}` : ''}
                    </Text>
                  </View>

                  <View style={styles.shiftModalRow}>
                    <Icon name="hourglass" size={18} color={colors.textSecondary} />
                    <Text style={styles.shiftModalLabel}>Hours:</Text>
                    <Text style={styles.shiftModalValue}>{selectedShift.hours}h</Text>
                  </View>

                  {selectedShift.address ? (
                    <TouchableOpacity
                      style={styles.shiftModalAddressRow}
                      onPress={() => handleOpenMaps(selectedShift.address)}
                    >
                      <Icon name="location" size={18} color={themeColor} />
                      <Text style={styles.shiftModalLabel}>Address:</Text>
                      <Text style={[styles.shiftModalValue, styles.shiftModalAddressLink, { color: themeColor }]}>
                        {selectedShift.address}
                      </Text>
                      <Icon name="open-outline" size={16} color={themeColor} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.shiftModalRow}>
                      <Icon name="location" size={18} color={colors.textSecondary} />
                      <Text style={styles.shiftModalLabel}>Address:</Text>
                      <Text style={[styles.shiftModalValue, { color: colors.textTertiary }]}>No address provided</Text>
                    </View>
                  )}
                </View>

                {selectedShift.notes ? (
                  <View style={styles.shiftModalNotesSection}>
                    <View style={styles.shiftModalNotesHeader}>
                      <Icon name="document-text" size={18} color={themeColor} />
                      <Text style={[styles.shiftModalNotesTitle, { color: themeColor }]}>Notes from Supervisor</Text>
                    </View>
                    <View style={[styles.shiftModalNotesBox, { borderColor: themeColor + '40' }]}>
                      <Text style={styles.shiftModalNotesText}>{selectedShift.notes}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.logoutModalButtons, { marginTop: spacing.lg }]}>
                  {selectedShift.address && (
                    <Button
                      title="Get Directions"
                      onPress={() => handleOpenMaps(selectedShift.address)}
                      variant="primary"
                      style={{ flex: 1 }}
                    />
                  )}
                  <Button
                    title="Close"
                    onPress={handleCloseShiftModal}
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => {}}
      />
    </View>
  );
}
