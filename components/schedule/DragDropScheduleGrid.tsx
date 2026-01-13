
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
import { formatTimeWithAMPM } from '../../utils/timeFormatter';

interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  highlight_color?: string;
}

interface DragDropScheduleGridProps {
  clientBuildings: ClientBuilding[];
  clients: Client[];
  cleaners: Cleaner[];
  schedule: ScheduleEntry[];
  buildingGroups?: BuildingGroup[];
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
  onTaskPress?: (entry: ScheduleEntry) => void;
}

const DragDropScheduleGrid = memo(({
  clientBuildings = [],
  clients = [],
  cleaners = [],
  schedule = [],
  buildingGroups = [],
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
  onTaskPress,
}: DragDropScheduleGridProps) => {
  console.log('🔍 DragDropScheduleGrid rendered with viewMode:', viewMode, 'currentWeekId:', currentWeekId);
  console.log('🔍 Building groups received:', buildingGroups.length);
  
  // Log building groups details
  buildingGroups.forEach(group => {
    console.log(`🔍 Group "${group.group_name}":`, {
      id: group.id,
      building_ids: group.building_ids,
      color: group.highlight_color
    });
  });

  // State to track which clients are expanded
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Toggle client expansion
  const toggleClientExpansion = useCallback((clientName: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  }, []);

  // Calculate the week's dates based on currentWeekId
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
    const dayShorts = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      weekDays.push({
        name: dayNames[i],
        short: dayShorts[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: date,
      });
    }

    console.log('Building view week dates calculated:', weekDays.map(d => `${d.name} ${d.date}`).join(', '));
    return weekDays;
  }, [currentWeekId]);

  // Create a map of building ID to group info
  const buildingGroupMap = useMemo(() => {
    const map = new Map<string, { group: BuildingGroup; color: string }>();
    
    console.log('🔍 Creating building group map from', buildingGroups.length, 'groups');
    
    buildingGroups.forEach(group => {
      const color = group.highlight_color || '#3B82F6';
      console.log(`🔍 Processing group "${group.group_name}" (${group.id}) with ${group.building_ids?.length || 0} buildings and color ${color}`);
      
      if (group.building_ids && Array.isArray(group.building_ids)) {
        group.building_ids.forEach(buildingId => {
          console.log(`  ✅ Mapping building ID ${buildingId} to group "${group.group_name}"`);
          map.set(buildingId, { group, color });
        });
      } else {
        console.warn(`  ⚠️ Group "${group.group_name}" has no building_ids or it's not an array:`, group.building_ids);
      }
    });
    
    console.log('🔍 Building group map created with', map.size, 'entries');
    console.log('🔍 Map contents:', Array.from(map.entries()).map(([id, info]) => `${id} -> ${info.group.group_name}`));
    return map;
  }, [buildingGroups]);

  // Sort buildings by group, then by name
  const sortedBuildingsByClient = useMemo(() => {
    const grouped = new Map<string, ClientBuilding[]>();
    
    console.log('🔍 Sorting buildings by client and group...');
    console.log('🔍 Total buildings:', clientBuildings.length);
    
    for (const building of clientBuildings) {
      if (!grouped.has(building.clientName)) {
        grouped.set(building.clientName, []);
      }
      grouped.get(building.clientName)!.push(building);
    }
    
    // Sort buildings within each client
    grouped.forEach((buildings, clientName) => {
      console.log(`🔍 Sorting ${buildings.length} buildings for client "${clientName}"`);
      
      buildings.sort((a, b) => {
        const aGroupInfo = buildingGroupMap.get(a.id);
        const bGroupInfo = buildingGroupMap.get(b.id);
        
        console.log(`  🔍 Comparing "${a.buildingName}" (${a.id}) vs "${b.buildingName}" (${b.id})`);
        console.log(`    - "${a.buildingName}" group:`, aGroupInfo ? aGroupInfo.group.group_name : 'NO GROUP');
        console.log(`    - "${b.buildingName}" group:`, bGroupInfo ? bGroupInfo.group.group_name : 'NO GROUP');
        
        // If both are in groups
        if (aGroupInfo && bGroupInfo) {
          // Same group - sort by building name
          if (aGroupInfo.group.id === bGroupInfo.group.id) {
            console.log(`    ✅ Both in same group "${aGroupInfo.group.group_name}", sorting by name`);
            return a.buildingName.localeCompare(b.buildingName);
          }
          // Different groups - sort by group name
          console.log(`    ✅ Different groups, sorting by group name: "${aGroupInfo.group.group_name}" vs "${bGroupInfo.group.group_name}"`);
          return aGroupInfo.group.group_name.localeCompare(bGroupInfo.group.group_name);
        }
        
        // Only a is in a group - a comes first
        if (aGroupInfo) {
          console.log(`    ✅ Only "${a.buildingName}" is in a group, it comes first`);
          return -1;
        }
        
        // Only b is in a group - b comes first
        if (bGroupInfo) {
          console.log(`    ✅ Only "${b.buildingName}" is in a group, it comes first`);
          return 1;
        }
        
        // Neither in a group - sort by building name
        console.log(`    ✅ Neither in a group, sorting by name`);
        return a.buildingName.localeCompare(b.buildingName);
      });
      
      console.log(`🔍 Final sorted order for "${clientName}":`, buildings.map(b => {
        const groupInfo = buildingGroupMap.get(b.id);
        return `${b.buildingName} (${groupInfo ? groupInfo.group.group_name : 'no group'})`;
      }).join(', '));
    });
    
    return grouped;
  }, [clientBuildings, buildingGroupMap]);

  const activeClients = useMemo(() => {
    return clients.filter(client => 
      client.isActive && sortedBuildingsByClient.has(client.name)
    );
  }, [clients, sortedBuildingsByClient]);

  const getEntriesForCell = useCallback((buildingName: string, day: string): ScheduleEntry[] => {
    return schedule.filter(entry => 
      entry.buildingName === buildingName && 
      entry.day.toLowerCase() === day.toLowerCase()
    );
  }, [schedule]);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return '#3B82F6';
      case 'in-progress': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return colors.border;
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'calendar';
      case 'in-progress': return 'time';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'ellipse';
    }
  }, []);

  const renderCellContent = useCallback((building: ClientBuilding, day: string) => {
    const entries = getEntriesForCell(building.buildingName, day.name);
    
    if (entries.length === 0) {
      return (
        <TouchableOpacity 
          style={styles.emptyCell}
          onPress={() => onCellPress(building, day.name)}
          activeOpacity={0.6}
        >
          <Icon name="add-circle-outline" size={24} style={{ color: colors.textSecondary, opacity: 0.4 }} />
          <Text style={styles.emptyCellText}>Add Shift</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.cellContent}>
        {entries.map((entry, index) => {
          const statusColor = getStatusColor(entry.status);
          const statusIcon = getStatusIcon(entry.status);
          const isSelected = selectedEntries.includes(entry.id);
          const isProject = entry.isProject || false;
          
          return (
            <TouchableOpacity
              key={entry.id}
              style={[
                styles.entryCard,
                { 
                  backgroundColor: colors.background,
                  borderLeftColor: statusColor,
                  borderLeftWidth: 4,
                },
                isSelected && styles.entryCardSelected,
                index > 0 && { marginTop: spacing.xs }
              ]}
              onPress={() => onTaskPress && onTaskPress(entry)}
              activeOpacity={0.7}
            >
              {/* Shift Type Badge */}
              <View style={styles.entryTypeBadge}>
                {isProject ? (
                  <View style={[styles.typeBadge, styles.projectBadge]}>
                    <Icon name="briefcase" size={10} style={{ color: '#FFFFFF' }} />
                    <Text style={styles.typeBadgeText}>PROJECT</Text>
                  </View>
                ) : (
                  <View style={[styles.typeBadge, styles.regularBadge]}>
                    <Icon name="calendar-outline" size={10} style={{ color: '#FFFFFF' }} />
                    <Text style={styles.typeBadgeText}>SHIFT</Text>
                  </View>
                )}
              </View>

              <View style={styles.entryHeader}>
                <View style={styles.entryTimeContainer}>
                  <Icon name="time-outline" size={14} style={{ color: statusColor }} />
                  <Text style={[styles.entryTime, { color: statusColor }]} numberOfLines={1}>
                    {formatTimeWithAMPM(entry.startTime || '09:00')}
                  </Text>
                </View>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
                  <Icon name={statusIcon} size={12} style={{ color: colors.background }} />
                </View>
              </View>
              
              <View style={styles.entryBody}>
                {isProject && entry.projectName && (
                  <View style={styles.projectNameContainer}>
                    <Icon name="folder-outline" size={12} style={{ color: '#8B5CF6' }} />
                    <Text style={styles.projectName} numberOfLines={1}>
                      {entry.projectName}
                    </Text>
                  </View>
                )}
                
                <View style={styles.entryCleanersContainer}>
                  <Icon name="person-outline" size={14} style={{ color: colors.textSecondary }} />
                  <Text style={styles.entryCleaners} numberOfLines={1}>
                    {entry.cleanerNames && entry.cleanerNames.length > 0 
                      ? entry.cleanerNames.join(', ')
                      : entry.cleanerName
                    }
                  </Text>
                </View>
                
                <View style={styles.entryFooter}>
                  <View style={styles.entryHoursContainer}>
                    <Icon name="hourglass-outline" size={12} style={{ color: colors.textSecondary }} />
                    <Text style={styles.entryHours}>{entry.hours}h</Text>
                  </View>
                  {entry.notes && !isProject && (
                    <Icon name="document-text-outline" size={12} style={{ color: colors.textSecondary }} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        
        {entries.length > 0 && (
          <TouchableOpacity 
            style={styles.addMoreButton}
            onPress={() => onCellPress(building, day.name)}
            activeOpacity={0.7}
          >
            <Icon name="add" size={16} style={{ color: colors.primary }} />
            <Text style={styles.addMoreText}>Add Another</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [getEntriesForCell, getStatusColor, getStatusIcon, selectedEntries, onCellPress, onTaskPress]);

  const renderBuildingRow = useCallback((building: ClientBuilding) => {
    const totalShifts = days.reduce((sum, day) => {
      return sum + getEntriesForCell(building.buildingName, day.name).length;
    }, 0);

    // Check if building is in a group
    const groupInfo = buildingGroupMap.get(building.id);
    const highlightColor = groupInfo ? groupInfo.color : null;

    console.log(`🎨 Rendering building "${building.buildingName}" (${building.id}):`, groupInfo ? `in group "${groupInfo.group.group_name}" with color ${highlightColor}` : 'no group');

    return (
      <View 
        key={building.id} 
        style={styles.buildingRow}
      >
        <TouchableOpacity
          style={[
            styles.buildingCell,
            highlightColor && {
              backgroundColor: `${highlightColor}40`, // 40 in hex = ~25% opacity for better visibility
            }
          ]}
          onLongPress={() => onBuildingLongPress(building)}
          activeOpacity={0.7}
        >
          <View style={styles.buildingHeader}>
            <Icon name="business" size={18} style={{ color: colors.primary }} />
            <Text style={styles.buildingName} numberOfLines={2}>
              {building.buildingName}
            </Text>
          </View>
          
          <View style={styles.buildingMeta}>
            {groupInfo && (
              <View style={[styles.groupBadge, { backgroundColor: `${highlightColor}30` }]}>
                <Icon name="albums" size={12} style={{ color: highlightColor }} />
                <Text style={[styles.groupText, { color: highlightColor }]}>
                  {groupInfo.group.group_name}
                </Text>
              </View>
            )}
            
            <View style={styles.securityBadge}>
              <Icon 
                name="shield-checkmark" 
                size={12} 
                style={{ color: building.securityLevel === 'high' ? colors.danger : building.securityLevel === 'medium' ? colors.warning : colors.success }} 
              />
              <Text style={[styles.securityText, { 
                color: building.securityLevel === 'high' ? colors.danger : building.securityLevel === 'medium' ? colors.warning : colors.success 
              }]}>
                {building.securityLevel.toUpperCase()}
              </Text>
            </View>
            
            {totalShifts > 0 && (
              <View style={styles.shiftCountBadge}>
                <Icon name="calendar" size={12} style={{ color: colors.primary }} />
                <Text style={styles.shiftCountText}>{totalShifts}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {days.map(day => (
          <View
            key={day.name}
            style={[
              styles.dayCell,
              highlightColor && {
                backgroundColor: `${highlightColor}18`, // 18 in hex = ~9% opacity
              }
            ]}
          >
            {renderCellContent(building, day)}
          </View>
        ))}
      </View>
    );
  }, [days, onBuildingLongPress, renderCellContent, getEntriesForCell, buildingGroupMap]);

  const renderClientSection = useCallback((client: Client) => {
    const buildings = sortedBuildingsByClient.get(client.name) || [];
    
    if (buildings.length === 0) return null;

    const isExpanded = expandedClients.has(client.name);

    const totalShifts = buildings.reduce((sum, building) => {
      return sum + days.reduce((daySum, day) => {
        return daySum + getEntriesForCell(building.buildingName, day.name).length;
      }, 0);
    }, 0);

    return (
      <View key={client.id} style={styles.clientSection}>
        <TouchableOpacity
          style={[styles.clientHeader, { backgroundColor: client.color || colors.primary }]}
          onPress={() => toggleClientExpansion(client.name)}
          onLongPress={() => onClientLongPress(client)}
          activeOpacity={0.7}
        >
          <View style={styles.clientHeaderLeft}>
            <Icon 
              name={isExpanded ? "chevron-down" : "chevron-forward"} 
              size={24} 
              style={{ color: colors.background }} 
            />
            <Icon name="briefcase" size={20} style={{ color: colors.background }} />
            <Text style={styles.clientName}>{client.name}</Text>
          </View>
          <View style={styles.clientHeaderRight}>
            <View style={styles.clientBadge}>
              <Icon name="business" size={14} style={{ color: colors.background }} />
              <Text style={styles.clientBadgeText}>
                {buildings.length} {buildings.length === 1 ? 'building' : 'buildings'}
              </Text>
            </View>
            {totalShifts > 0 && (
              <View style={styles.clientBadge}>
                <Icon name="calendar" size={14} style={{ color: colors.background }} />
                <Text style={styles.clientBadgeText}>{totalShifts} shifts</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {isExpanded && buildings.map(building => renderBuildingRow(building))}
        
        {!isExpanded && (
          <View style={styles.collapsedIndicator}>
            <Icon name="chevron-down" size={16} style={{ color: colors.textSecondary }} />
            <Text style={styles.collapsedText}>
              Tap to expand {buildings.length} {buildings.length === 1 ? 'building' : 'buildings'}
            </Text>
          </View>
        )}
      </View>
    );
  }, [sortedBuildingsByClient, expandedClients, toggleClientExpansion, onClientLongPress, renderBuildingRow, days, getEntriesForCell]);

  if (viewMode === 'user') {
    return (
      <UserScheduleView
        cleaners={cleaners}
        schedule={schedule}
        currentWeekId={currentWeekId}
        onTaskPress={onTaskPress}
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
          {/* Enhanced Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.buildingHeaderCell}>
              <Icon name="business-outline" size={20} style={{ color: colors.text }} />
              <Text style={styles.headerText}>Buildings</Text>
            </View>
            {days.map(day => {
              const isToday = day.fullDate.toDateString() === new Date().toDateString();
              
              return (
                <View 
                  key={day.name} 
                  style={[
                    styles.dayHeaderCell,
                    isToday && styles.dayHeaderCellToday
                  ]}
                >
                  <Text style={[styles.dayHeaderText, isToday && styles.dayHeaderTextToday]}>
                    {day.short}
                  </Text>
                  <Text style={[styles.dayHeaderDate, isToday && styles.dayHeaderDateToday]}>
                    {day.date}
                  </Text>
                  {isToday && (
                    <View style={styles.todayIndicator}>
                      <Text style={styles.todayIndicatorText}>TODAY</Text>
                    </View>
                  )}
                </View>
              );
            })}
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
                <Icon name="business-outline" size={80} style={{ color: colors.textSecondary, opacity: 0.3 }} />
                <Text style={styles.emptyStateText}>No clients or buildings available</Text>
                <Text style={styles.emptyStateSubtext}>Add a client and building to get started with scheduling</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
});

const BUILDING_COLUMN_WIDTH = 220;
const DAY_COLUMN_WIDTH = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  horizontalScroll: {
    flex: 1,
  },
  scheduleGrid: {
    minWidth: BUILDING_COLUMN_WIDTH + (DAY_COLUMN_WIDTH * 7),
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buildingHeaderCell: {
    width: BUILDING_COLUMN_WIDTH,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerText: {
    ...typography.body,
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 15,
  },
  dayHeaderCell: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    position: 'relative',
    minHeight: 80,
  },
  dayHeaderCellToday: {
    backgroundColor: '#EFF6FF',
  },
  dayHeaderText: {
    ...typography.small,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  dayHeaderTextToday: {
    color: '#3B82F6',
  },
  dayHeaderDate: {
    ...typography.small,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  dayHeaderDateToday: {
    color: '#3B82F6',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayIndicatorText: {
    ...typography.small,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verticalScroll: {
    flex: 1,
  },
  clientSection: {
    borderBottomWidth: 3,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  clientHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clientHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  clientName: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  clientHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clientBadgeText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  collapsedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  collapsedText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  buildingRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  buildingCell: {
    width: BUILDING_COLUMN_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  buildingName: {
    ...typography.body,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buildingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  groupText: {
    ...typography.small,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityText: {
    ...typography.small,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shiftCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shiftCountText: {
    ...typography.small,
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '700',
  },
  dayCell: {
    width: DAY_COLUMN_WIDTH,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  emptyCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  emptyCellText: {
    ...typography.small,
    color: '#94A3B8',
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '600',
  },
  cellContent: {
    flex: 1,
    gap: spacing.xs,
  },
  entryCard: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  entryCardSelected: {
    borderWidth: 2,
    borderColor: '#10B981',
    shadowOpacity: 0.15,
  },
  entryTypeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  projectBadge: {
    backgroundColor: '#8B5CF6',
  },
  regularBadge: {
    backgroundColor: '#3B82F6',
  },
  typeBadgeText: {
    ...typography.small,
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginTop: 16, // Space for the badge
  },
  entryTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTime: {
    ...typography.small,
    fontWeight: '700',
    fontSize: 12,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryBody: {
    gap: spacing.xs,
  },
  projectNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 2,
  },
  projectName: {
    ...typography.small,
    color: '#8B5CF6',
    fontWeight: '700',
    flex: 1,
    fontSize: 11,
  },
  entryCleanersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryCleaners: {
    ...typography.small,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    fontSize: 12,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryHours: {
    ...typography.small,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    backgroundColor: '#EFF6FF',
  },
  addMoreText: {
    ...typography.small,
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    ...typography.h3,
    color: '#64748B',
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    ...typography.body,
    color: '#94A3B8',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

DragDropScheduleGrid.displayName = 'DragDropScheduleGrid';

export default DragDropScheduleGrid;
