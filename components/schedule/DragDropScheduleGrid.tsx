
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  runOnJS,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import React, { memo, useMemo, useState, useCallback } from 'react';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import UserScheduleView from './UserScheduleView';
import Icon from '../Icon';
import { colors, spacing, typography } from '../../styles/commonStyles';
import type { ClientBuilding, Client, Cleaner } from '../../hooks/useClientData';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert } from 'react-native';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';

interface DragDropScheduleGridProps {
  clientBuildings: ClientBuilding[];
  clients: Client[];
  cleaners: Cleaner[];
  schedule: ScheduleEntry[];
  onCellPress: (clientBuilding: ClientBuilding, day: string) => void;
  onCellLongPress: (clientBuilding: ClientBuilding, day: string) => void;
  onClientLongPress: (client: Client) => void;
  onBuildingLongPress: (building: ClientBuilding) => void;
  onMoveEntry: (entryId: string, newBuilding: ClientBuilding, newDay: string) => void;
  onBulkSelect: (entries: ScheduleEntry[]) => void;
  bulkMode: boolean;
  selectedEntries: string[];
  viewMode: 'building' | 'user';
  onAddShiftToCleaner?: (cleaner: Cleaner, day: string) => void;
  currentWeekId?: string;
}

const DragDropScheduleGrid = memo(({
  clientBuildings = [],
  clients = [],
  cleaners = [],
  schedule = [],
  onCellPress,
  onCellLongPress,
  onClientLongPress,
  onBuildingLongPress,
  onMoveEntry,
  onBulkSelect,
  bulkMode,
  selectedEntries,
  viewMode,
  onAddShiftToCleaner,
  currentWeekId,
}: DragDropScheduleGridProps) => {
  console.log('DragDropScheduleGrid rendered with viewMode:', viewMode, 'currentWeekId:', currentWeekId);

  // FIXED: Calculate the week's dates based on currentWeekId
  const days = useMemo(() => {
    console.log('Recalculating week dates for building view, week ID:', currentWeekId);
    
    let monday: Date;
    
    if (currentWeekId) {
      // Parse week ID (format: YYYY-MM-DD, which is the Monday of the week)
      const [year, month, day] = currentWeekId.split('-').map(Number);
      monday = new Date(year, month - 1, day);
      console.log('Using week ID date:', monday.toISOString());
    } else {
      // Fall back to current week
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      console.log('Using current week date:', monday.toISOString());
    }

    const weekDays = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      weekDays.push({
        name: dayNames[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
      });
    }

    console.log('Building view week dates calculated:', weekDays.map(d => `${d.name} ${d.date}`).join(', '));
    return weekDays;
  }, [currentWeekId]); // FIXED: Recalculate when currentWeekId changes

  const buildingsByClient = useMemo(() => {
    const grouped = new Map<string, ClientBuilding[]>();
    
    for (const building of clientBuildings) {
      if (!grouped.has(building.clientName)) {
        grouped.set(building.clientName, []);
      }
      grouped.get(building.clientName)!.push(building);
    }
    
    return grouped;
  }, [clientBuildings]);

  const activeClients = useMemo(() => {
    return clients.filter(client => 
      client.isActive && buildingsByClient.has(client.name)
    );
  }, [clients, buildingsByClient]);

  const getEntriesForCell = useCallback((buildingName: string, day: string): ScheduleEntry[] => {
    return schedule.filter(entry => 
      entry.buildingName === buildingName && 
      entry.day.toLowerCase() === day.toLowerCase()
    );
  }, [schedule]);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.border;
    }
  }, []);

  const renderCellContent = useCallback((building: ClientBuilding, day: string) => {
    const entries = getEntriesForCell(building.buildingName, day);
    
    if (entries.length === 0) {
      return (
        <View style={styles.emptyCell}>
          <Icon name="add-circle-outline" size={20} style={{ color: colors.textSecondary, opacity: 0.3 }} />
        </View>
      );
    }

    return (
      <View style={styles.cellContent}>
        {entries.map((entry, index) => {
          const statusColor = getStatusColor(entry.status);
          const isSelected = selectedEntries.includes(entry.id);
          
          return (
            <View
              key={entry.id}
              style={[
                styles.entryCard,
                { 
                  backgroundColor: statusColor + '15',
                  borderLeftColor: statusColor,
                },
                isSelected && styles.entryCardSelected,
                index > 0 && { marginTop: spacing.xs }
              ]}
            >
              <View style={styles.entryHeader}>
                <Text style={[styles.entryTime, { color: statusColor }]} numberOfLines={1}>
                  {entry.startTime || '09:00'}
                </Text>
                {bulkMode && (
                  <Icon 
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                    size={16} 
                    style={{ color: isSelected ? colors.success : colors.textSecondary }} 
                  />
                )}
              </View>
              <Text style={styles.entryCleaners} numberOfLines={1}>
                {entry.cleanerNames && entry.cleanerNames.length > 0 
                  ? entry.cleanerNames.join(', ')
                  : entry.cleanerName
                }
              </Text>
              <Text style={styles.entryHours}>{entry.hours}h</Text>
            </View>
          );
        })}
      </View>
    );
  }, [getEntriesForCell, getStatusColor, selectedEntries, bulkMode]);

  const renderBuildingRow = useCallback((building: ClientBuilding) => {
    return (
      <View key={building.id} style={styles.buildingRow}>
        <TouchableOpacity
          style={styles.buildingCell}
          onLongPress={() => onBuildingLongPress(building)}
          activeOpacity={0.7}
        >
          <Text style={styles.buildingName} numberOfLines={2}>
            {building.buildingName}
          </Text>
          <View style={styles.securityBadge}>
            <Icon 
              name="shield-checkmark" 
              size={12} 
              style={{ color: colors.textSecondary }} 
            />
            <Text style={styles.securityText}>
              {building.securityLevel.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
        
        {days.map(day => (
          <TouchableOpacity
            key={day.name}
            style={styles.dayCell}
            onPress={() => onCellPress(building, day.name)}
            onLongPress={() => onCellLongPress(building, day.name)}
            activeOpacity={0.7}
          >
            {renderCellContent(building, day.name)}
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [days, onCellPress, onCellLongPress, onBuildingLongPress, renderCellContent]);

  const renderClientSection = useCallback((client: Client) => {
    const buildings = buildingsByClient.get(client.name) || [];
    
    if (buildings.length === 0) return null;

    return (
      <View key={client.id} style={styles.clientSection}>
        <TouchableOpacity
          style={[styles.clientHeader, { backgroundColor: client.color || colors.primary }]}
          onLongPress={() => onClientLongPress(client)}
          activeOpacity={0.7}
        >
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.buildingCount}>
            {buildings.length} {buildings.length === 1 ? 'building' : 'buildings'}
          </Text>
        </TouchableOpacity>
        
        {buildings.map(building => renderBuildingRow(building))}
      </View>
    );
  }, [buildingsByClient, onClientLongPress, renderBuildingRow]);

  if (viewMode === 'user') {
    return (
      <UserScheduleView
        cleaners={cleaners}
        schedule={schedule}
        currentWeekId={currentWeekId}
        onTaskPress={(entry) => {
          const building = clientBuildings.find(b => b.buildingName === entry.buildingName);
          if (building) {
            onCellPress(building, entry.day);
          }
        }}
        onAddShiftToCleaner={onAddShiftToCleaner}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
        bounces={false}
      >
        <View style={styles.scheduleGrid}>
          <View style={styles.headerRow}>
            <View style={styles.buildingHeaderCell}>
              <Text style={styles.headerText}>Buildings</Text>
            </View>
            {days.map(day => (
              <View key={day.name} style={styles.dayHeaderCell}>
                <Text style={styles.dayHeaderText}>{day.name}</Text>
                <Text style={styles.dayHeaderDate}>{day.date}</Text>
              </View>
            ))}
          </View>

          <ScrollView 
            style={styles.verticalScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {activeClients.length > 0 ? (
              activeClients.map(client => renderClientSection(client))
            ) : (
              <View style={styles.emptyState}>
                <Icon name="business-outline" size={64} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyStateText}>No clients or buildings available</Text>
                <Text style={styles.emptyStateSubtext}>Add a client and building to get started</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
});

const BUILDING_COLUMN_WIDTH = 200;
const DAY_COLUMN_WIDTH = 150;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  horizontalScroll: {
    flex: 1,
  },
  scheduleGrid: {
    minWidth: BUILDING_COLUMN_WIDTH + (DAY_COLUMN_WIDTH * 7),
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  buildingHeaderCell: {
    width: BUILDING_COLUMN_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  dayHeaderCell: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeaderText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  dayHeaderDate: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  verticalScroll: {
    flex: 1,
  },
  clientSection: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  clientHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientName: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  buildingCount: {
    ...typography.small,
    color: colors.background,
    opacity: 0.9,
  },
  buildingRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 80,
  },
  buildingCell: {
    width: BUILDING_COLUMN_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  buildingName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  dayCell: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
  },
  emptyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  cellContent: {
    flex: 1,
  },
  entryCard: {
    padding: spacing.sm,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  entryCardSelected: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryTime: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 11,
  },
  entryCleaners: {
    ...typography.small,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  entryHours: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

DragDropScheduleGrid.displayName = 'DragDropScheduleGrid';

export default DragDropScheduleGrid;
