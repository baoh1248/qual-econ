
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from './NativeMap';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import AnimatedCard from './AnimatedCard';
import { supabase } from '../app/integrations/supabase/client';

const REFRESH_INTERVAL = 30000; // 30 seconds

export interface ActiveCleaner {
  id: string;
  cleanerId: string;
  cleanerName: string;
  buildingName: string;
  clientName: string;
  latitude: number;
  longitude: number;
  clockInTime: string;
  distanceFt: number;
  status: 'on-duty' | 'break';
}

interface LiveMapProps {
  onCleanerPress?: (cleaner: ActiveCleaner) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ onCleanerPress }) => {
  const [activeCleaners, setActiveCleaners] = useState<ActiveCleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedCleaner, setSelectedCleaner] = useState<ActiveCleaner | null>(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<any>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchActiveCleaners = useCallback(async () => {
    try {
      // Fetch all active clock records (status = 'clocked_in')
      const { data: clockRecords, error } = await supabase
        .from('clock_records')
        .select('id, cleaner_id, cleaner_name, building_name, client_name, clock_in_time, clock_in_latitude, clock_in_longitude, clock_in_distance_ft, status')
        .eq('status', 'clocked_in')
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching active cleaners:', error);
        return;
      }

      if (!clockRecords || clockRecords.length === 0) {
        setActiveCleaners([]);
        setLastRefresh(new Date());
        return;
      }

      // Get building coordinates for cleaners that don't have clock-in coordinates
      const buildingNames = [...new Set(clockRecords.map(r => r.building_name).filter(Boolean))];
      let buildingCoords: Map<string, { lat: number; lng: number }> = new Map();

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

      // Map clock records to ActiveCleaner objects
      const cleaners: ActiveCleaner[] = clockRecords
        .map(record => {
          // Use clock-in coordinates first, fall back to building coordinates
          let lat = record.clock_in_latitude ? parseFloat(record.clock_in_latitude) : 0;
          let lng = record.clock_in_longitude ? parseFloat(record.clock_in_longitude) : 0;

          if ((!lat || !lng) && record.building_name) {
            const buildingCoord = buildingCoords.get(record.building_name);
            if (buildingCoord) {
              lat = buildingCoord.lat;
              lng = buildingCoord.lng;
            }
          }

          // Skip cleaners with no valid coordinates
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

      setActiveCleaners(cleaners);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error in fetchActiveCleaners:', err);
    }
  }, []);

  // Initial load and auto-refresh
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchActiveCleaners();
      setLoading(false);
    };
    load();

    // Set up auto-refresh
    refreshTimer.current = setInterval(fetchActiveCleaners, REFRESH_INTERVAL);

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [fetchActiveCleaners]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchActiveCleaners();
    setLoading(false);
  };

  const handleCleanerPress = (cleaner: ActiveCleaner) => {
    setSelectedCleaner(cleaner);
    onCleanerPress?.(cleaner);

    // Animate map to the selected cleaner
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: cleaner.latitude,
        longitude: cleaner.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  };

  const fitMapToMarkers = () => {
    if (mapRef.current && activeCleaners.length > 0) {
      const coords = activeCleaners.map(c => ({ latitude: c.latitude, longitude: c.longitude }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const formatElapsedTime = (clockInTime: string) => {
    const clockIn = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatClockInTime = (clockInTime: string) => {
    const date = new Date(clockInTime);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatLastRefresh = () => {
    const diffMs = new Date().getTime() - lastRefresh.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    return `${Math.floor(diffSecs / 60)}m ago`;
  };

  // Compute map region from active cleaners
  const getInitialRegion = () => {
    if (activeCleaners.length === 0) {
      // Default to US center
      return { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 40, longitudeDelta: 40 };
    }
    if (activeCleaners.length === 1) {
      return {
        latitude: activeCleaners[0].latitude,
        longitude: activeCleaners[0].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    const lats = activeCleaners.map(c => c.latitude);
    const lngs = activeCleaners.map(c => c.longitude);
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
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        {mapError ? (
          <View style={styles.mapFallback}>
            <Icon name="map" size={48} style={{ color: colors.textSecondary }} />
            <Text style={styles.mapFallbackTitle}>Map View</Text>
            <Text style={styles.mapFallbackText}>
              {activeCleaners.length > 0
                ? `${activeCleaners.length} cleaner${activeCleaners.length !== 1 ? 's' : ''} currently on duty`
                : 'No active cleaners to display'}
            </Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={getInitialRegion()}
            onMapReady={fitMapToMarkers}
            onError={() => setMapError(true)}
            showsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {activeCleaners.map(cleaner => (
              <Marker
                key={cleaner.id}
                coordinate={{ latitude: cleaner.latitude, longitude: cleaner.longitude }}
                title={cleaner.cleanerName}
                description={`${cleaner.buildingName} - ${formatElapsedTime(cleaner.clockInTime)}`}
                pinColor={colors.success}
                onPress={() => handleCleanerPress(cleaner)}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerDot, { backgroundColor: colors.success }]}>
                    <Icon name="person" size={14} style={{ color: '#FFF' }} />
                  </View>
                  <Text style={styles.markerLabel} numberOfLines={1}>{cleaner.cleanerName.split(' ')[0]}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Map overlay controls */}
        <View style={styles.mapOverlay}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="refresh" size={20} style={{ color: colors.primary }} />
            )}
          </TouchableOpacity>
          {activeCleaners.length > 1 && !mapError && (
            <TouchableOpacity style={styles.fitButton} onPress={fitMapToMarkers}>
              <Icon name="expand" size={20} style={{ color: colors.primary }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Refresh indicator */}
        <View style={styles.refreshIndicator}>
          <View style={[styles.liveDot, { backgroundColor: activeCleaners.length > 0 ? colors.success : colors.textSecondary }]} />
          <Text style={styles.refreshText}>
            {activeCleaners.length > 0 ? 'LIVE' : 'No active cleaners'}
            {' '} - Updated {formatLastRefresh()}
          </Text>
        </View>
      </View>

      {/* Active Cleaners List */}
      <ScrollView style={styles.cleanerList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          Active Cleaners ({activeCleaners.length})
        </Text>

        {loading && activeCleaners.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptyStateText}>Loading active cleaners...</Text>
          </View>
        ) : activeCleaners.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No cleaners currently clocked in</Text>
            <Text style={styles.emptyStateSubtext}>Active cleaners will appear here when they clock in</Text>
          </View>
        ) : (
          activeCleaners.map((cleaner) => (
            <TouchableOpacity
              key={cleaner.id}
              onPress={() => handleCleanerPress(cleaner)}
            >
              <AnimatedCard
                style={[
                  styles.cleanerCard,
                  selectedCleaner?.id === cleaner.id && styles.cleanerCardSelected,
                ]}
              >
                <View style={styles.cleanerHeader}>
                  <View style={styles.cleanerInfo}>
                    <View style={styles.cleanerNameRow}>
                      <Icon name="person" size={20} style={{ color: colors.primary }} />
                      <Text style={styles.cleanerName}>{cleaner.cleanerName}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
                      <Text style={styles.statusText}>On Duty</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cleanerDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="business" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>{cleaner.buildingName}</Text>
                  </View>

                  {cleaner.clientName ? (
                    <View style={styles.detailRow}>
                      <Icon name="briefcase" size={16} style={{ color: colors.textSecondary }} />
                      <Text style={styles.detailText}>{cleaner.clientName}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Icon name="time" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>
                      Clocked in at {formatClockInTime(cleaner.clockInTime)} ({formatElapsedTime(cleaner.clockInTime)})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Icon name="location" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>
                      {Math.round(cleaner.distanceFt)} ft from building
                    </Text>
                  </View>
                </View>
              </AnimatedCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>On Duty</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendText}>Auto-refreshes every 30s</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    height: 280,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  mapFallbackTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  mapFallbackText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  mapOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    gap: spacing.xs,
  },
  refreshButton: {
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  fitButton: {
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshIndicator: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cleanerList: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  cleanerCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cleanerCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cleanerHeader: {
    marginBottom: spacing.sm,
  },
  cleanerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cleanerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...typography.small,
    color: '#FFF',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  cleanerDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  legend: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.small,
    color: colors.textSecondary,
  },
});

export default LiveMap;
