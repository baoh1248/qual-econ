
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import AnimatedCard from './AnimatedCard';

interface CleanerLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: 'on-duty' | 'off-duty' | 'break';
  currentTask: string;
  lastUpdate: string;
}

interface LiveMapProps {
  cleaners?: CleanerLocation[];
  onCleanerPress?: (cleaner: CleanerLocation) => void;
}

const LiveMap: React.FC<LiveMapProps> = ({ cleaners = [], onCleanerPress }) => {
  const [selectedCleaner, setSelectedCleaner] = useState<CleanerLocation | null>(null);

  // Mock data for demonstration
  const mockCleaners: CleanerLocation[] = [
    {
      id: '1',
      name: 'John Doe',
      latitude: 40.7128,
      longitude: -74.0060,
      status: 'on-duty',
      currentTask: 'TechCorp Main Office',
      lastUpdate: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Jane Smith',
      latitude: 40.7589,
      longitude: -73.9851,
      status: 'on-duty',
      currentTask: 'MedCenter Hospital',
      lastUpdate: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Johnson Smith',
      latitude: 40.7484,
      longitude: -73.9857,
      status: 'break',
      currentTask: 'Lunch Break',
      lastUpdate: new Date().toISOString(),
    },
  ];

  const displayCleaners = cleaners.length > 0 ? cleaners : mockCleaners;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-duty':
        return colors.success;
      case 'break':
        return colors.warning;
      case 'off-duty':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Icon name="map" size={48} style={{ color: colors.textSecondary }} />
        <Text style={styles.mapPlaceholderTitle}>Live Map View</Text>
        <Text style={styles.mapPlaceholderText}>
          Note: Live map is not ready yet.
          {'\n'}
          When ready, this would show a real-time map with cleaner locations.
        </Text>
      </View>

      {/* Cleaner List */}
      <ScrollView style={styles.cleanerList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Active Cleaners ({displayCleaners.length})</Text>
        
        {displayCleaners.map((cleaner) => (
          <TouchableOpacity
            key={cleaner.id}
            onPress={() => {
              setSelectedCleaner(cleaner);
              onCleanerPress?.(cleaner);
            }}
          >
            <AnimatedCard 
              style={[
                styles.cleanerCard,
                selectedCleaner?.id === cleaner.id && styles.cleanerCardSelected
              ]}
            >
              <View style={styles.cleanerHeader}>
                <View style={styles.cleanerInfo}>
                  <View style={styles.cleanerNameRow}>
                    <Icon name="person" size={20} style={{ color: colors.primary }} />
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cleaner.status) }]}>
                    <Text style={styles.statusText}>{cleaner.status.replace('-', ' ')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cleanerDetails}>
                <View style={styles.detailRow}>
                  <Icon name="briefcase" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>{cleaner.currentTask}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Icon name="location" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>
                    {cleaner.latitude.toFixed(4)}, {cleaner.longitude.toFixed(4)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Icon name="time" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>
                    Updated {formatLastUpdate(cleaner.lastUpdate)}
                  </Text>
                </View>
              </View>

              {selectedCleaner?.id === cleaner.id && (
                <View style={styles.selectedIndicator}>
                  <Icon name="checkmark-circle" size={20} style={{ color: colors.primary }} />
                  <Text style={styles.selectedText}>Selected</Text>
                </View>
              )}
            </AnimatedCard>
          </TouchableOpacity>
        ))}

        {displayCleaners.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No active cleaners</Text>
          </View>
        )}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status Legend:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>On Duty</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Break</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
            <Text style={styles.legendText}>Off Duty</Text>
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
  mapPlaceholder: {
    height: 250,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapPlaceholderTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  mapPlaceholderText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    color: colors.background,
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
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
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
  legend: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  legendTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.lg,
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
