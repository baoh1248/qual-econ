
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Modal, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Icon from '../../components/Icon';
import InventoryAlertBadge from '../../components/InventoryAlertBadge';
import AnimatedCard from '../../components/AnimatedCard';
import ProgressRing from '../../components/ProgressRing';
import CompanyLogo from '../../components/CompanyLogo';
import Toast from '../../components/Toast';
import LiveMap, { ActiveCleaner } from '../../components/LiveMap';
import MapView, { Marker } from '../../components/NativeMap';
import { commonStyles, colors, spacing, typography, statusColors } from '../../styles/commonStyles';
import { useToast } from '../../hooks/useToast';
import { useInventoryAlerts } from '../../hooks/useInventoryAlerts';
import { useDatabase } from '../../hooks/useDatabase';
import { useScheduleStorage } from '../../hooks/useScheduleStorage';
import { useClientData } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';

interface TeamMember {
  id: string;
  name: string;
  status: 'on-duty' | 'off-duty' | 'break';
  currentTask: string;
  location: string;
  todayHours: number;
  tasksCompleted: number;
}

interface TaskSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

interface Client {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'pending';
  tasksToday: number;
}

const SupervisorDashboard = () => {
  const { themeColor } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config, syncStatus } = useDatabase();
  const { lowStockCount, criticalStockCount } = useInventoryAlerts();
  const { getWeekSchedule, getCurrentWeekId, getWeekStats } = useScheduleStorage();
  const { cleaners = [] } = useClientData();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);
  const [activeClockedIn, setActiveClockedIn] = useState(0);
  const [mapCleaners, setMapCleaners] = useState<ActiveCleaner[]>([]);

  // Get current week schedule and stats
  const currentWeekId = getCurrentWeekId();
  const currentWeekSchedule = getWeekSchedule(currentWeekId);
  const weekStats = getWeekStats(currentWeekId);

  // Calculate team members from schedule data
  const teamMembers = useMemo<TeamMember[]>(() => {
    const cleanerMap = new Map<string, TeamMember>();

    // Initialize with all active cleaners
    cleaners.filter(c => c.isActive).forEach(cleaner => {
      cleanerMap.set(cleaner.name, {
        id: cleaner.id,
        name: cleaner.name,
        status: 'off-duty',
        currentTask: 'No tasks assigned',
        location: 'Unknown',
        todayHours: 0,
        tasksCompleted: 0,
      });
    });

    // Update with schedule data
    currentWeekSchedule.forEach(entry => {
      const cleanerNames = entry.cleanerNames && entry.cleanerNames.length > 0 
        ? entry.cleanerNames 
        : (entry.cleanerName ? [entry.cleanerName] : []);

      cleanerNames.forEach(cleanerName => {
        const existing = cleanerMap.get(cleanerName);
        if (existing) {
          // Update hours
          existing.todayHours += entry.hours || 0;
          
          // Update task count
          if (entry.status === 'completed') {
            existing.tasksCompleted += 1;
          }
          
          // Update status based on entry status
          if (entry.status === 'in-progress') {
            existing.status = 'on-duty';
            existing.currentTask = `${entry.clientName} - ${entry.buildingName}`;
            existing.location = entry.clientName;
          } else if (entry.status === 'scheduled' && existing.status === 'off-duty') {
            existing.status = 'on-duty';
            existing.currentTask = `${entry.clientName} - ${entry.buildingName}`;
            existing.location = entry.clientName;
          }
        } else {
          // Add new cleaner from schedule
          cleanerMap.set(cleanerName, {
            id: `cleaner-${cleanerName}`,
            name: cleanerName,
            status: entry.status === 'in-progress' ? 'on-duty' : 'off-duty',
            currentTask: `${entry.clientName} - ${entry.buildingName}`,
            location: entry.clientName,
            todayHours: entry.hours || 0,
            tasksCompleted: entry.status === 'completed' ? 1 : 0,
          });
        }
      });
    });

    return Array.from(cleanerMap.values());
  }, [cleaners, currentWeekSchedule]);

  // Calculate task summary from schedule
  const taskSummary = useMemo<TaskSummary>(() => {
    const total = currentWeekSchedule.length;
    const completed = currentWeekSchedule.filter(e => e.status === 'completed').length;
    const inProgress = currentWeekSchedule.filter(e => e.status === 'in-progress').length;
    const pending = currentWeekSchedule.filter(e => e.status === 'scheduled').length;
    const overdue = 0; // Could be calculated based on dates

    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
    };
  }, [currentWeekSchedule]);

  // Calculate client status from schedule
  const clients = useMemo<Client[]>(() => {
    const clientMap = new Map<string, Client>();

    currentWeekSchedule.forEach(entry => {
      const existing = clientMap.get(entry.clientName);
      if (existing) {
        existing.tasksToday += 1;
        if (entry.status === 'completed') {
          existing.status = 'completed';
        } else if (entry.status === 'in-progress' && existing.status !== 'completed') {
          existing.status = 'active';
        }
      } else {
        clientMap.set(entry.clientName, {
          id: `client-${entry.clientName}`,
          name: entry.clientName,
          location: entry.buildingName,
          status: entry.status === 'completed' ? 'completed' : 
                  entry.status === 'in-progress' ? 'active' : 'pending',
          tasksToday: 1,
        });
      }
    });

    return Array.from(clientMap.values());
  }, [currentWeekSchedule]);

  // Compute map region from active cleaners for the preview
  const mapPreviewRegion = useMemo(() => {
    if (mapCleaners.length === 0) {
      return { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 40, longitudeDelta: 40 };
    }
    if (mapCleaners.length === 1) {
      return {
        latitude: mapCleaners[0].latitude,
        longitude: mapCleaners[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    const lats = mapCleaners.map(c => c.latitude);
    const lngs = mapCleaners.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
    };
  }, [mapCleaners]);

  // Fetch active clocked-in count and locations from clock_records
  const fetchClockedInCount = useCallback(async () => {
    try {
      const { data: clockRecords, error } = await supabase
        .from('clock_records')
        .select('id, cleaner_id, cleaner_name, building_name, client_name, clock_in_time, clock_in_latitude, clock_in_longitude, clock_in_distance_ft, status')
        .eq('status', 'clocked_in')
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching clocked-in data:', error);
        return;
      }

      setActiveClockedIn(clockRecords?.length ?? 0);

      if (!clockRecords || clockRecords.length === 0) {
        setMapCleaners([]);
        return;
      }

      // Get building coordinates for cleaners without clock-in coordinates
      const buildingNames = [...new Set(clockRecords.map(r => r.building_name).filter(Boolean))];
      let buildingCoords = new Map<string, { lat: number; lng: number }>();

      if (buildingNames.length > 0) {
        const { data: buildings } = await supabase
          .from('client_buildings')
          .select('building_name, latitude, longitude')
          .in('building_name', buildingNames);

        if (buildings) {
          buildings.forEach(b => {
            if (b.latitude && b.longitude) {
              buildingCoords.set(b.building_name, {
                lat: parseFloat(b.latitude),
                lng: parseFloat(b.longitude),
              });
            }
          });
        }
      }

      const mapped: ActiveCleaner[] = clockRecords
        .map(record => {
          let lat = record.clock_in_latitude ? parseFloat(record.clock_in_latitude) : 0;
          let lng = record.clock_in_longitude ? parseFloat(record.clock_in_longitude) : 0;

          if ((!lat || !lng) && record.building_name) {
            const coord = buildingCoords.get(record.building_name);
            if (coord) { lat = coord.lat; lng = coord.lng; }
          }

          if (!lat || !lng || (lat === 0 && lng === 0)) return null;

          return {
            id: record.id,
            cleanerId: record.cleaner_id,
            cleanerName: record.cleaner_name,
            buildingName: record.building_name || 'Unknown Building',
            clientName: record.client_name || '',
            latitude: lat,
            longitude: lng,
            clockInTime: record.clock_in_time,
            distanceFt: record.clock_in_distance_ft ? parseFloat(record.clock_in_distance_ft) : 0,
            status: 'on-duty' as const,
          };
        })
        .filter((c): c is ActiveCleaner => c !== null);

      setMapCleaners(mapped);
    } catch (err) {
      console.error('Error fetching clocked-in count:', err);
    }
  }, []);

  useEffect(() => {
    fetchClockedInCount();
    // Auto-refresh data every 30 seconds
    const interval = setInterval(fetchClockedInCount, 30000);
    return () => clearInterval(interval);
  }, [fetchClockedInCount]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('Dashboard refreshed', 'success');
    } catch (error) {
      console.log('Error refreshing dashboard:', error);
      showToast('Failed to refresh dashboard', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-duty':
      case 'active':
        return colors.success;
      case 'break':
      case 'pending':
        return colors.warning;
      case 'off-duty':
      case 'completed':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerRow}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <View style={styles.headerActions}>
            {/* Settings button */}
            <TouchableOpacity
              onPress={() => router.push('/supervisor/settings')}
              style={styles.settingsButton}
            >
              <Icon name="settings" size={22} style={{ color: colors.background }} />
            </TouchableOpacity>

            <InventoryAlertBadge
              lowStockCount={lowStockCount}
              criticalStockCount={criticalStockCount}
              onPress={() => router.push('/supervisor/inventory')}
            />
          </View>
        </View>
        <Text style={styles.title}>Management Dashboard</Text>
        <Text style={styles.subtitle}>
          {teamMembers.length} team members • {taskSummary.completed} tasks completed today
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <AnimatedCard style={[styles.statCard, { borderLeftColor: themeColor }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: themeColor + '15' }]}>
                <Icon name="people" size={24} style={{ color: themeColor }} />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{teamMembers.length}</Text>
                <Text style={styles.statLabel}>Team Members</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + '15' }]}>
                <Icon name="checkmark-circle" size={24} style={{ color: colors.success }} />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={[styles.statCard, { borderLeftColor: colors.warning }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Icon name="time" size={24} style={{ color: colors.warning }} />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.inProgress}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
            </View>
          </AnimatedCard>

          <AnimatedCard style={[styles.statCard, { borderLeftColor: colors.danger }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.danger + '15' }]}>
                <Icon name="alert-circle" size={24} style={{ color: colors.danger }} />
              </View>
              <View style={styles.statText}>
                <Text style={styles.statValue}>{taskSummary.overdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
          </AnimatedCard>
        </View>

        {/* Live Map Card */}
        <AnimatedCard style={styles.liveMapCard}>
          <TouchableOpacity
            style={styles.liveMapHeader}
            onPress={() => setShowLiveMap(true)}
          >
            <View style={styles.liveMapTitleRow}>
              <Icon name="map" size={24} style={{ color: themeColor }} />
              <Text style={styles.cardTitle}>Live Cleaner Tracking</Text>
            </View>
            <Icon name="chevron-forward" size={20} style={{ color: colors.textSecondary }} />
          </TouchableOpacity>
          <Text style={styles.liveMapDescription}>
            Monitor your team&apos;s real-time locations and status
          </Text>

          {/* Map Preview */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowLiveMap(true)}
            style={styles.mapPreviewContainer}
          >
            {mapCleaners.length > 0 ? (
              <MapView
                style={styles.mapPreview}
                initialRegion={mapPreviewRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsUserLocation={false}
                showsMyLocationButton={false}
                toolbarEnabled={false}
              >
                {mapCleaners.map(cleaner => (
                  <Marker
                    key={cleaner.id}
                    coordinate={{ latitude: cleaner.latitude, longitude: cleaner.longitude }}
                    title={cleaner.cleanerName}
                    description={cleaner.buildingName}
                    pinColor={colors.success}
                  >
                    <View style={styles.mapPreviewMarker}>
                      <Icon name="person" size={12} style={{ color: '#FFF' }} />
                    </View>
                  </Marker>
                ))}
              </MapView>
            ) : (
              <View style={styles.mapPreviewEmpty}>
                <Icon name="map-outline" size={32} style={{ color: colors.textSecondary }} />
                <Text style={styles.mapPreviewEmptyText}>No active cleaners to display</Text>
              </View>
            )}
            <View style={styles.mapPreviewOverlay}>
              <Text style={styles.mapPreviewOverlayText}>Tap to expand</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.liveMapStats}>
            <View style={styles.liveMapStat}>
              <Text style={[styles.liveMapStatValue, { color: colors.success }]}>
                {activeClockedIn}
              </Text>
              <Text style={styles.liveMapStatLabel}>Clocked In</Text>
            </View>
            <View style={styles.liveMapStat}>
              <Text style={[styles.liveMapStatValue, { color: themeColor }]}>
                {cleaners.filter(c => c.isActive).length}
              </Text>
              <Text style={styles.liveMapStatLabel}>Total Active</Text>
            </View>
            <View style={styles.liveMapStat}>
              <Text style={[styles.liveMapStatValue, { color: colors.textSecondary }]}>
                {Math.max(cleaners.filter(c => c.isActive).length - activeClockedIn, 0)}
              </Text>
              <Text style={styles.liveMapStatLabel}>Off Duty</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Task Progress */}
        <AnimatedCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>Today&apos;s Progress</Text>
            <Text style={[styles.progressPercentage, { color: themeColor }]}>
              {taskSummary.total > 0 ? Math.round((taskSummary.completed / taskSummary.total) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.progressContent}>
            <ProgressRing
              progress={taskSummary.total > 0 ? (taskSummary.completed / taskSummary.total) * 100 : 0}
              size={80}
              strokeWidth={8}
              color={themeColor}
            />
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.success }]} />
                <Text style={styles.progressStatText}>Completed: {taskSummary.completed}</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.progressStatText}>In Progress: {taskSummary.inProgress}</Text>
              </View>
              <View style={styles.progressStat}>
                <View style={[styles.progressDot, { backgroundColor: colors.textSecondary }]} />
                <Text style={styles.progressStatText}>Pending: {taskSummary.pending}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Team Status */}
        <AnimatedCard style={styles.teamCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Team Status</Text>
            <TouchableOpacity onPress={() => router.push('/supervisor/cleaners')}>
              <Text style={[styles.viewAllText, { color: themeColor }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.teamList} nestedScrollEnabled showsVerticalScrollIndicator>
          {teamMembers.map((member) => (
            <View key={member.id} style={styles.teamMember}>
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) }]}>
                    <Text style={styles.statusText}>{member.status.replace('-', ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.memberTask}>{member.currentTask}</Text>
                <Text style={styles.memberLocation}>{member.location}</Text>
              </View>
              <View style={styles.memberStats}>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.todayHours.toFixed(1)}h</Text>
                  <Text style={styles.memberStatLabel}>Hours</Text>
                </View>
                <View style={styles.memberStat}>
                  <Text style={styles.memberStatValue}>{member.tasksCompleted}</Text>
                  <Text style={styles.memberStatLabel}>Tasks</Text>
                </View>
              </View>
            </View>
          ))}
          </ScrollView>
        </AnimatedCard>

        {/* Client Status */}
        <AnimatedCard style={styles.clientCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Client Status</Text>
            <TouchableOpacity onPress={() => router.push('/supervisor/clients-list')}>
              <Text style={[styles.viewAllText, { color: themeColor }]}>View All Clients</Text>
            </TouchableOpacity>
          </View>
          {clients.slice(0, 5).map((client) => (
            <View key={client.id} style={styles.clientItem}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientLocation}>{client.location}</Text>
              </View>
              <View style={styles.clientStats}>
                <View style={styles.clientStat}>
                  <Text style={styles.clientStatValue}>{client.tasksToday}</Text>
                  <Text style={styles.clientStatLabel}>Tasks Today</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(client.status) }]}>
                  <Text style={styles.statusText}>{client.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </AnimatedCard>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/payroll')}
          >
            <Icon name="card" size={24} style={{ color: themeColor }} />
            <Text style={styles.actionButtonText}>Payroll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/photos')}
          >
            <Icon name="camera" size={24} style={{ color: themeColor }} />
            <Text style={styles.actionButtonText}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/projects')}
          >
            <Icon name="briefcase" size={24} style={{ color: themeColor }} />
            <Text style={styles.actionButtonText}>Projects</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/supervisor/time-off-requests')}
          >
            <Icon name="calendar-outline" size={24} style={{ color: themeColor }} />
            <Text style={styles.actionButtonText}>Time Off</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Live Map Modal */}
      <Modal
        visible={showLiveMap}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Live Cleaner Tracking</Text>
            <TouchableOpacity onPress={() => setShowLiveMap(false)}>
              <Icon name="close" size={24} style={{ color: colors.text }} />
            </TouchableOpacity>
          </View>
          <LiveMap />
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    marginTop: -spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 3,
  },
  statContent: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statText: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveMapCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 4,
  },
  liveMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveMapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveMapDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  mapPreviewContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundAlt,
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPreviewMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  mapPreviewEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapPreviewEmptyText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  mapPreviewOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapPreviewOverlayText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  liveMapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  liveMapStat: {
    alignItems: 'center',
  },
  liveMapStatValue: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: 4,
  },
  liveMapStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  progressCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  progressPercentage: {
    ...typography.h2,
    fontWeight: '700',
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStats: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  progressStatText: {
    ...typography.small,
    color: colors.text,
  },
  teamCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 4,
  },
  teamList: {
    maxHeight: 400,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  viewAllText: {
    ...typography.small,
    fontWeight: '600',
  },
  teamMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  memberTask: {
    ...typography.small,
    color: colors.text,
    marginBottom: 2,
  },
  memberLocation: {
    ...typography.small,
    color: colors.textSecondary,
  },
  memberStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  clientCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 4,
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientLocation: {
    ...typography.small,
    color: colors.textSecondary,
  },
  clientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clientStat: {
    alignItems: 'center',
  },
  clientStatValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientStatLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    elevation: 3,
    borderWidth: 0,
  },
  actionButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
});

export default SupervisorDashboard;
