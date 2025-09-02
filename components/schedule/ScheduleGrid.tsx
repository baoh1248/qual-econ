
import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { ClientBuilding, Client } from '../../hooks/useClientData';

interface ScheduleGridProps {
  clientBuildings: ClientBuilding[];
  clients: Client[];
  schedule: ScheduleEntry[];
  onCellPress: (clientBuilding: ClientBuilding, day: string) => void;
  onCellLongPress: (clientBuilding: ClientBuilding, day: string) => void;
  onClientLongPress: (client: Client) => void;
  onBuildingLongPress: (building: ClientBuilding) => void;
}

const ScheduleGrid = memo(({
  clientBuildings,
  clients,
  schedule,
  onCellPress,
  onCellLongPress,
  onClientLongPress,
  onBuildingLongPress,
}: ScheduleGridProps) => {
  console.log('ScheduleGrid rendered with', clientBuildings.length, 'buildings and', schedule.length, 'schedule entries');

  const days = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], []);
  const screenWidth = Dimensions.get('window').width;
  const buildingColumnWidth = Math.max(180, screenWidth * 0.25); // Responsive width
  const cellWidth = Math.max(100, (screenWidth - buildingColumnWidth) / 7); // Responsive cell width
  const totalGridWidth = buildingColumnWidth + (cellWidth * days.length);

  // Group buildings by client name for better organization
  const buildingsByClient = useMemo(() => {
    const grouped: { [clientName: string]: ClientBuilding[] } = {};
    clientBuildings.forEach(building => {
      if (!grouped[building.clientName]) {
        grouped[building.clientName] = [];
      }
      grouped[building.clientName].push(building);
    });
    console.log('Buildings grouped by client:', Object.keys(grouped));
    return grouped;
  }, [clientBuildings]);

  // Create a map for quick schedule lookup with better performance
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    schedule.forEach(entry => {
      if (entry && entry.buildingName && entry.day) {
        const key = `${entry.buildingName}-${entry.day.toLowerCase()}`;
        map.set(key, entry);
      }
    });
    console.log('Schedule map created with', map.size, 'entries');
    return map;
  }, [schedule]);

  const getScheduleEntry = useCallback((buildingName: string, day: string): ScheduleEntry | null => {
    const key = `${buildingName}-${day.toLowerCase()}`;
    return scheduleMap.get(key) || null;
  }, [scheduleMap]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.border;
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  }, []);

  const getSecurityLevelColor = useCallback((level: string) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  }, []);

  const renderCell = useCallback((building: ClientBuilding, day: string) => {
    const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    const entry = getScheduleEntry(building.buildingName, day);
    
    return (
      <TouchableOpacity
        key={`${building.id}-${day}`}
        style={[
          styles.cell,
          { 
            width: cellWidth,
            backgroundColor: entry ? getStatusColor(entry.status) + '20' : colors.backgroundAlt,
            borderColor: entry ? getStatusColor(entry.status) : colors.border,
          }
        ]}
        onPress={() => onCellPress(building, dayKey)}
        onLongPress={() => onCellLongPress(building, dayKey)}
        activeOpacity={0.7}
      >
        {entry ? (
          <View style={styles.cellContent}>
            <Text style={[styles.cleanerName, { color: getStatusColor(entry.status) }]} numberOfLines={1}>
              {entry.cleanerName}
            </Text>
            <Text style={[styles.hours, { color: colors.textSecondary }]} numberOfLines={1}>
              {entry.hours}h
            </Text>
            {entry.startTime && (
              <Text style={[styles.time, { color: colors.textSecondary }]} numberOfLines={1}>
                {entry.startTime}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyCell}>
            <Icon name="add" size={16} style={{ color: colors.textSecondary }} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [cellWidth, getScheduleEntry, getStatusColor, onCellPress, onCellLongPress]);

  const renderBuildingRow = useCallback((building: ClientBuilding) => (
    <View key={building.id} style={styles.row}>
      <TouchableOpacity
        style={[styles.buildingCell, { width: buildingColumnWidth }]}
        onLongPress={() => onBuildingLongPress(building)}
        activeOpacity={0.7}
      >
        <View style={styles.buildingInfo}>
          <Text style={styles.buildingName} numberOfLines={2}>
            {building.buildingName}
          </Text>
          <View style={styles.buildingMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(building.priority) }]}>
              <Text style={styles.priorityText}>{building.priority.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(building.securityLevel) }]}>
              <Icon name="shield" size={12} style={{ color: colors.background }} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {days.map(day => renderCell(building, day))}
    </View>
  ), [buildingColumnWidth, days, renderCell, onBuildingLongPress, getPriorityColor, getSecurityLevelColor]);

  const renderClientSection = useCallback((clientName: string, buildings: ClientBuilding[]) => {
    const client = clients.find(c => c.name === clientName);
    if (!client) {
      console.log('Client not found for name:', clientName);
      return null;
    }

    return (
      <View key={clientName} style={styles.clientSection}>
        <View style={styles.clientHeader}>
          <TouchableOpacity
            style={styles.clientHeaderContent}
            onLongPress={() => onClientLongPress(client)}
            activeOpacity={0.7}
          >
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <View style={styles.clientMeta}>
                <View style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(client.securityLevel) }]}>
                  <Icon name="shield" size={12} style={{ color: colors.background }} />
                </View>
                <Text style={styles.buildingCount}>{buildings.length} buildings</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
        {buildings.map(building => renderBuildingRow(building))}
      </View>
    );
  }, [clients, onClientLongPress, getSecurityLevelColor, renderBuildingRow]);

  if (clientBuildings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="business" size={48} style={{ color: colors.textSecondary }} />
        <Text style={styles.emptyText}>No buildings found</Text>
        <Text style={styles.emptySubtext}>Add clients and buildings to start scheduling</Text>
      </View>
    );
  }

  console.log('Rendering grid with client groups:', Object.keys(buildingsByClient));
  console.log('Grid dimensions - Total width:', totalGridWidth, 'Screen width:', screenWidth);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.horizontalScroll}
        contentContainerStyle={{ minWidth: Math.max(totalGridWidth, screenWidth) }}
        bounces={false}
        decelerationRate="fast"
      >
        <ScrollView 
          style={styles.verticalScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.grid, { width: totalGridWidth }]}>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={[styles.buildingHeaderCell, { width: buildingColumnWidth }]}>
                <Text style={styles.headerText}>Buildings</Text>
              </View>
              {days.map(day => (
                <View key={day} style={[styles.dayHeaderCell, { width: cellWidth }]}>
                  <Text style={styles.dayHeaderText} numberOfLines={1}>
                    {day.substring(0, 3)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Client Sections */}
            {Object.entries(buildingsByClient).map(([clientName, buildings]) =>
              renderClientSection(clientName, buildings)
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  horizontalScroll: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  grid: {
    paddingBottom: spacing.lg,
    minHeight: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  buildingHeaderCell: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayHeaderCell: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  dayHeaderText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  clientSection: {
    marginBottom: spacing.sm,
  },
  clientHeader: {
    backgroundColor: colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  clientHeaderContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buildingCount: {
    ...typography.small,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 60,
  },
  buildingCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.background,
  },
  buildingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  buildingName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  buildingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  securityBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    minHeight: 60,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xs,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cleanerName: {
    ...typography.small,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  hours: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: 2,
  },
  time: {
    ...typography.small,
    textAlign: 'center',
    fontSize: 10,
  },
  emptyCell: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
