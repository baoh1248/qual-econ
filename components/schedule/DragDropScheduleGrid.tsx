
import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { ClientBuilding, Client, Cleaner } from '../../hooks/useClientData';
import { useConflictDetection } from '../../hooks/useConflictDetection';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  runOnJS,
  withSpring,
  withTiming
} from 'react-native-reanimated';

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
  bulkMode = false,
  selectedEntries = [],
}: DragDropScheduleGridProps) => {
  console.log('DragDropScheduleGrid rendered with enhanced conflict detection');

  const days = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], []);
  const screenWidth = Dimensions.get('window').width;
  const buildingColumnWidth = Math.max(180, screenWidth * 0.25);
  const cellWidth = Math.max(100, (screenWidth - buildingColumnWidth) / 7);
  const totalGridWidth = buildingColumnWidth + (cellWidth * days.length);

  const [draggedEntry, setDraggedEntry] = useState<ScheduleEntry | null>(null);
  const [dropTarget, setDropTarget] = useState<{ building: ClientBuilding; day: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewConflicts, setPreviewConflicts] = useState<string[]>([]);

  // Enhanced conflict detection
  const { 
    conflicts, 
    getEntryConflicts, 
    validateScheduleChange,
    hasConflicts,
    conflictSummary 
  } = useConflictDetection(schedule, cleaners);

  // Animation values for drag and drop
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Optimized grouping with memoization and Map for O(1) lookups
  const buildingsByClient = useMemo(() => {
    try {
      const grouped = new Map<string, ClientBuilding[]>();
      
      if (!Array.isArray(clientBuildings)) {
        console.error('clientBuildings is not an array:', clientBuildings);
        return grouped;
      }

      for (const building of clientBuildings) {
        if (!building || !building.clientName) {
          console.warn('Invalid building:', building);
          continue;
        }

        if (!grouped.has(building.clientName)) {
          grouped.set(building.clientName, []);
        }
        grouped.get(building.clientName)!.push(building);
      }
      
      return grouped;
    } catch (error) {
      console.error('Error grouping buildings by client:', error);
      return new Map<string, ClientBuilding[]>();
    }
  }, [clientBuildings]);

  // Optimized schedule map with better key generation and error handling
  const scheduleMap = useMemo(() => {
    try {
      const map = new Map<string, ScheduleEntry>();
      
      if (!Array.isArray(schedule)) {
        console.error('schedule is not an array:', schedule);
        return map;
      }

      for (const entry of schedule) {
        if (!entry || !entry.buildingName || !entry.day) {
          console.warn('Invalid schedule entry:', entry);
          continue;
        }

        const key = `${entry.buildingName}|${entry.day.toLowerCase()}`;
        map.set(key, entry);
      }
      
      console.log('Schedule map created with', map.size, 'entries');
      return map;
    } catch (error) {
      console.error('Error creating schedule map:', error);
      return new Map<string, ScheduleEntry>();
    }
  }, [schedule]);

  // Enhanced conflict map with entry-specific conflicts
  const entryConflictMap = useMemo(() => {
    try {
      const map = new Map<string, string[]>();
      
      for (const conflict of conflicts) {
        for (const entry of conflict.affectedEntries) {
          if (!map.has(entry.id)) {
            map.set(entry.id, []);
          }
          map.get(entry.id)!.push(conflict.id);
        }
      }
      
      return map;
    } catch (error) {
      console.error('Error creating entry conflict map:', error);
      return new Map<string, string[]>();
    }
  }, [conflicts]);

  // Optimized lookup function with error handling
  const getScheduleEntry = useCallback((buildingName: string, day: string): ScheduleEntry | null => {
    try {
      if (!buildingName || !day) {
        return null;
      }

      const key = `${buildingName}|${day.toLowerCase()}`;
      return scheduleMap.get(key) || null;
    } catch (error) {
      console.error('Error getting schedule entry:', error);
      return null;
    }
  }, [scheduleMap]);

  // Enhanced color functions with conflict awareness
  const getStatusColor = useCallback((status: string) => {
    try {
      switch (status) {
        case 'scheduled': return colors.primary;
        case 'in-progress': return colors.warning;
        case 'completed': return colors.success;
        case 'cancelled': return colors.danger;
        default: return colors.border;
      }
    } catch (error) {
      console.error('Error getting status color:', error);
      return colors.border;
    }
  }, []);

  const getConflictSeverityColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical': return colors.danger;
      case 'high': return '#FF6B35';
      case 'medium': return colors.warning;
      case 'low': return '#4ECDC4';
      default: return colors.textSecondary;
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    try {
      switch (priority) {
        case 'high': return colors.danger;
        case 'medium': return colors.warning;
        case 'low': return colors.success;
        default: return colors.text;
      }
    } catch (error) {
      console.error('Error getting priority color:', error);
      return colors.text;
    }
  }, []);

  const getSecurityLevelColor = useCallback((level: string) => {
    try {
      switch (level) {
        case 'high': return colors.danger;
        case 'medium': return colors.warning;
        case 'low': return colors.success;
        default: return colors.text;
      }
    } catch (error) {
      console.error('Error getting security level color:', error);
      return colors.text;
    }
  }, []);

  // Enhanced conflict checking
  const hasEntryConflict = useCallback((entry: ScheduleEntry): boolean => {
    try {
      return entry?.id ? entryConflictMap.has(entry.id) : false;
    } catch (error) {
      console.error('Error checking entry conflict:', error);
      return false;
    }
  }, [entryConflictMap]);

  const getEntryConflictSeverity = useCallback((entry: ScheduleEntry): string => {
    try {
      if (!entry?.id || !entryConflictMap.has(entry.id)) {
        return 'none';
      }

      const entryConflicts = getEntryConflicts(entry.id);
      if (entryConflicts.length === 0) return 'none';

      // Return the highest severity
      const severities = entryConflicts.map(c => c.severity);
      if (severities.includes('critical')) return 'critical';
      if (severities.includes('high')) return 'high';
      if (severities.includes('medium')) return 'medium';
      if (severities.includes('low')) return 'low';
      return 'none';
    } catch (error) {
      console.error('Error getting entry conflict severity:', error);
      return 'none';
    }
  }, [entryConflictMap, getEntryConflicts]);

  // Enhanced drop target detection with conflict preview
  const findDropTarget = useCallback((x: number, y: number) => {
    try {
      // Calculate which day column we're over
      const dayIndex = Math.floor((x - buildingColumnWidth) / cellWidth);
      if (dayIndex < 0 || dayIndex >= days.length) {
        return null;
      }

      // Calculate which building row we're over (approximate)
      const headerHeight = 60; // Approximate header height
      const rowHeight = 60; // Approximate row height
      const buildingIndex = Math.floor((y - headerHeight) / rowHeight);
      
      const allBuildings = Array.from(buildingsByClient.values()).flat();
      if (buildingIndex < 0 || buildingIndex >= allBuildings.length) {
        return null;
      }

      const targetBuilding = allBuildings[buildingIndex];
      const targetDay = days[dayIndex];

      if (targetBuilding && targetDay) {
        return {
          building: targetBuilding,
          day: targetDay.toLowerCase()
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding drop target:', error);
      return null;
    }
  }, [buildingColumnWidth, cellWidth, days, buildingsByClient]);

  // Enhanced drop validation with conflict checking
  const validateDrop = useCallback((entry: ScheduleEntry, target: { building: ClientBuilding; day: string }) => {
    try {
      if (!entry || !target) return { canDrop: false, conflicts: [], warnings: [] };

      // Create a temporary entry for validation
      const tempEntry = {
        ...entry,
        clientName: target.building.clientName,
        buildingName: target.building.buildingName,
        day: target.day as any
      };

      const validation = validateScheduleChange(tempEntry, entry.id);
      
      return {
        canDrop: validation.canProceed,
        conflicts: validation.conflicts,
        warnings: validation.warnings
      };
    } catch (error) {
      console.error('Error validating drop:', error);
      return { canDrop: true, conflicts: [], warnings: [] };
    }
  }, [validateScheduleChange]);

  const handleDrop = useCallback(() => {
    try {
      console.log('Handling enhanced drop:', { draggedEntry: draggedEntry?.id, dropTarget });
      
      if (draggedEntry && dropTarget && onMoveEntry) {
        // Check if we're dropping on a different location
        const isSameLocation = 
          draggedEntry.buildingName === dropTarget.building.buildingName &&
          draggedEntry.day.toLowerCase() === dropTarget.day.toLowerCase();
          
        if (!isSameLocation) {
          // Validate the drop
          const validation = validateDrop(draggedEntry, dropTarget);
          
          if (!validation.canDrop && validation.conflicts.length > 0) {
            // Show conflict warning
            const conflictMessages = validation.conflicts.map(c => c.description).join('\n');
            Alert.alert(
              'Scheduling Conflict Detected',
              `Moving this entry will create conflicts:\n\n${conflictMessages}\n\nDo you want to proceed anyway?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Proceed Anyway', 
                  style: 'destructive',
                  onPress: () => {
                    console.log('User chose to proceed despite conflicts');
                    onMoveEntry(draggedEntry.id, dropTarget.building, dropTarget.day);
                  }
                }
              ]
            );
          } else if (validation.warnings.length > 0) {
            // Show warnings but allow the move
            Alert.alert(
              'Schedule Warning',
              validation.warnings.join('\n') + '\n\nDo you want to continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Continue', 
                  onPress: () => onMoveEntry(draggedEntry.id, dropTarget.building, dropTarget.day)
                }
              ]
            );
          } else {
            // No conflicts, proceed with move
            console.log('Moving entry to new location');
            onMoveEntry(draggedEntry.id, dropTarget.building, dropTarget.day);
          }
        } else {
          console.log('Dropped on same location, no move needed');
        }
      }
      
      // Reset drag state
      setDraggedEntry(null);
      setDropTarget(null);
      setIsDragging(false);
      setPreviewConflicts([]);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [draggedEntry, dropTarget, onMoveEntry, validateDrop]);

  // Move the gesture handler to component level
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      try {
        console.log('Enhanced drag started');
        context.startX = translateX.value;
        context.startY = translateY.value;
        scale.value = withSpring(1.1);
        opacity.value = withTiming(0.8);
        runOnJS(setIsDragging)(true);
      } catch (error) {
        console.error('Error in gesture start:', error);
      }
    },
    onActive: (event, context: any) => {
      try {
        translateX.value = context.startX + event.translationX;
        translateY.value = context.startY + event.translationY;
        
        // Find drop target and validate conflicts
        const target = runOnJS(findDropTarget)(event.absoluteX, event.absoluteY);
        if (target) {
          runOnJS(setDropTarget)(target);
          
          // Preview conflicts for this drop
          if (draggedEntry) {
            const validation = runOnJS(validateDrop)(draggedEntry, target);
            if (validation && validation.conflicts) {
              runOnJS(setPreviewConflicts)(validation.conflicts.map(c => c.id));
            }
          }
        }
      } catch (error) {
        console.error('Error in gesture active:', error);
      }
    },
    onEnd: () => {
      try {
        console.log('Enhanced drag ended');
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        opacity.value = withTiming(1);
        runOnJS(handleDrop)();
      } catch (error) {
        console.error('Error in gesture end:', error);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: isDragging ? 1000 : 1,
  }));

  // Optimized event handlers with Set for O(1) lookups and error handling
  const selectedEntriesSet = useMemo(() => {
    try {
      return new Set(Array.isArray(selectedEntries) ? selectedEntries : []);
    } catch (error) {
      console.error('Error creating selected entries set:', error);
      return new Set<string>();
    }
  }, [selectedEntries]);

  const handleEntryPress = useCallback((entry: ScheduleEntry, building: ClientBuilding, day: string) => {
    try {
      if (!entry || !building || !day) {
        console.error('Invalid parameters for entry press');
        return;
      }

      if (bulkMode && onBulkSelect) {
        const isSelected = selectedEntriesSet.has(entry.id);
        const newSelection = isSelected 
          ? selectedEntries.filter(id => id !== entry.id)
          : [...selectedEntries, entry.id];
        
        const selectedScheduleEntries = schedule.filter(e => e && newSelection.includes(e.id));
        onBulkSelect(selectedScheduleEntries);
      } else if (onCellPress) {
        onCellPress(building, day);
      }
    } catch (error) {
      console.error('Error handling entry press:', error);
    }
  }, [bulkMode, selectedEntriesSet, selectedEntries, schedule, onBulkSelect, onCellPress]);

  const handleEntryLongPress = useCallback((entry: ScheduleEntry, building: ClientBuilding, day: string) => {
    try {
      if (!entry || !building || !day) {
        console.error('Invalid parameters for entry long press');
        return;
      }

      if (!bulkMode) {
        console.log('Long press detected, preparing for enhanced drag:', entry.id);
        setDraggedEntry(entry);
        
        // Show conflict info if entry has conflicts
        const entryConflicts = getEntryConflicts(entry.id);
        let message = `Drag ${entry.cleanerName || 'this'}'s shift to move it to a different time slot`;
        
        if (entryConflicts.length > 0) {
          message += `\n\nNote: This entry currently has ${entryConflicts.length} conflict(s). Moving it may help resolve them.`;
        }
        
        Alert.alert('Move Entry', message, [{ text: 'OK' }]);
      } else if (onCellLongPress) {
        onCellLongPress(building, day);
      }
    } catch (error) {
      console.error('Error handling entry long press:', error);
    }
  }, [bulkMode, onCellLongPress, getEntryConflicts]);

  // Enhanced cell renderer with conflict indicators
  const renderCell = useCallback((building: ClientBuilding, day: string) => {
    try {
      if (!building || !day) {
        return null;
      }

      const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      const entry = getScheduleEntry(building.buildingName, day);
      const isDropTarget = dropTarget?.building?.id === building.id && dropTarget?.day === dayKey;
      const isSelected = entry && selectedEntriesSet.has(entry.id);
      const isDraggedEntry = draggedEntry?.id === entry?.id;
      const hasConflict = entry && hasEntryConflict(entry);
      const conflictSeverity = entry ? getEntryConflictSeverity(entry) : 'none';
      const isPreviewConflict = entry && previewConflicts.includes(entry.id);
      
      // Determine cell background color based on conflicts and status
      let backgroundColor = colors.backgroundAlt;
      let borderColor = colors.border;
      let borderWidth = 1;
      
      if (entry) {
        backgroundColor = getStatusColor(entry.status) + '20';
        borderColor = getStatusColor(entry.status);
        
        if (hasConflict) {
          const severityColor = getConflictSeverityColor(conflictSeverity);
          backgroundColor = severityColor + '30';
          borderColor = severityColor;
          borderWidth = 2;
        }
      }
      
      if (isDropTarget) {
        borderWidth = 3;
        if (previewConflicts.length > 0) {
          borderColor = colors.danger;
          backgroundColor = colors.danger + '20';
        } else {
          borderColor = colors.success;
          backgroundColor = colors.success + '20';
        }
      }
      
      return (
        <TouchableOpacity
          key={`${building.id}-${day}`}
          style={[
            styles.cell,
            { 
              width: cellWidth,
              backgroundColor,
              borderColor,
              borderWidth,
            },
            isSelected && styles.selectedCell,
            isDraggedEntry && styles.draggedCell,
          ]}
          onPress={() => {
            if (entry) {
              handleEntryPress(entry, building, dayKey);
            } else if (onCellPress) {
              onCellPress(building, dayKey);
            }
          }}
          onLongPress={() => {
            if (entry) {
              handleEntryLongPress(entry, building, dayKey);
            } else if (onCellLongPress) {
              onCellLongPress(building, dayKey);
            }
          }}
          activeOpacity={0.7}
        >
          {entry ? (
            <PanGestureHandler 
              onGestureEvent={gestureHandler} 
              enabled={!bulkMode && draggedEntry?.id === entry.id}
            >
              <Animated.View style={[styles.cellContent, isDraggedEntry ? animatedStyle : {}]}>
                {bulkMode && (
                  <View style={styles.selectionIndicator}>
                    <Icon 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      style={{ color: isSelected ? colors.success : colors.textSecondary }} 
                    />
                  </View>
                )}
                
                <View style={styles.cleanerNamesContainer}>
                  {(() => {
                    const entryCleaners = entry.cleanerNames && entry.cleanerNames.length > 0 
                      ? entry.cleanerNames 
                      : (entry.cleanerName ? [entry.cleanerName] : ['Unknown']);
                    
                    if (entryCleaners.length === 1) {
                      return (
                        <Text style={[styles.cleanerName, { color: getStatusColor(entry.status) }]} numberOfLines={1}>
                          {entryCleaners[0]}
                        </Text>
                      );
                    } else {
                      return (
                        <>
                          <Text style={[styles.cleanerName, { color: getStatusColor(entry.status) }]} numberOfLines={1}>
                            {entryCleaners[0]}
                          </Text>
                          <Text style={[styles.additionalCleaners, { color: colors.textSecondary }]} numberOfLines={1}>
                            +{entryCleaners.length - 1} more
                          </Text>
                        </>
                      );
                    }
                  })()}
                </View>
                <Text style={[styles.hours, { color: colors.textSecondary }]} numberOfLines={1}>
                  {entry.hours || 0}h
                </Text>
                {entry.startTime && (
                  <Text style={[styles.time, { color: colors.textSecondary }]} numberOfLines={1}>
                    {entry.startTime}
                  </Text>
                )}
                
                {/* Enhanced conflict indicators */}
                {hasConflict && (
                  <View style={[styles.conflictIndicator, { backgroundColor: getConflictSeverityColor(conflictSeverity) }]}>
                    <Icon 
                      name={conflictSeverity === 'critical' ? 'alert-circle' : 'warning'} 
                      size={12} 
                      style={{ color: colors.background }} 
                    />
                  </View>
                )}
                
                {/* Preview conflict indicator */}
                {isPreviewConflict && (
                  <View style={styles.previewConflictIndicator}>
                    <Icon name="flash" size={10} style={{ color: colors.background }} />
                  </View>
                )}
                
                {!bulkMode && (
                  <View style={styles.dragIndicator}>
                    <Icon name="reorder-three-outline" size={12} style={{ color: colors.textSecondary }} />
                  </View>
                )}
              </Animated.View>
            </PanGestureHandler>
          ) : (
            <View style={styles.emptyCell}>
              <Icon name="add" size={16} style={{ color: colors.textSecondary }} />
            </View>
          )}
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering cell:', error);
      return (
        <View key={`error-${building?.id || 'unknown'}-${day}`} style={[styles.cell, { width: cellWidth }]}>
          <Text style={styles.errorText}>Error</Text>
        </View>
      );
    }
  }, [
    cellWidth, 
    getScheduleEntry, 
    getStatusColor, 
    selectedEntriesSet, 
    dropTarget, 
    bulkMode, 
    draggedEntry, 
    hasEntryConflict,
    getEntryConflictSeverity,
    getConflictSeverityColor,
    previewConflicts,
    handleEntryPress, 
    handleEntryLongPress, 
    onCellPress, 
    onCellLongPress, 
    gestureHandler, 
    animatedStyle
  ]);

  // Enhanced building row renderer with conflict indicators
  const renderBuildingRow = useCallback((building: ClientBuilding) => {
    try {
      if (!building) {
        return null;
      }

      // Check if this building has any conflicts
      const buildingEntries = schedule.filter(entry => entry.buildingName === building.buildingName);
      const buildingHasConflicts = buildingEntries.some(entry => hasEntryConflict(entry));

      return (
        <View key={building.id} style={styles.row}>
          <TouchableOpacity
            style={[
              styles.buildingCell, 
              { width: buildingColumnWidth },
              bulkMode && styles.buildingCellBulkMode,
              buildingHasConflicts && styles.buildingCellWithConflicts
            ]}
            onLongPress={() => onBuildingLongPress && onBuildingLongPress(building)}
            activeOpacity={0.7}
          >
            <View style={styles.buildingInfo}>
              <View style={styles.buildingNameRow}>
                <Text style={styles.buildingName} numberOfLines={2}>
                  {building.buildingName || 'Unknown Building'}
                </Text>
                {buildingHasConflicts && (
                  <Icon name="warning" size={16} style={{ color: colors.danger }} />
                )}
              </View>
              <View style={styles.buildingMeta}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(building.priority || 'medium') }]}>
                  <Text style={styles.priorityText}>{(building.priority || 'M').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(building.securityLevel || 'medium') }]}>
                  <Icon name="shield" size={12} style={{ color: colors.background }} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
          {days.map(day => renderCell(building, day))}
        </View>
      );
    } catch (error) {
      console.error('Error rendering building row:', error);
      return null;
    }
  }, [
    buildingColumnWidth, 
    bulkMode, 
    days, 
    schedule,
    hasEntryConflict,
    renderCell, 
    onBuildingLongPress, 
    getPriorityColor, 
    getSecurityLevelColor
  ]);

  // Enhanced client section renderer with conflict summary
  const renderClientSection = useCallback((clientName: string, buildings: ClientBuilding[]) => {
    try {
      if (!clientName || !Array.isArray(buildings) || buildings.length === 0) {
        return null;
      }

      const client = clients.find(c => c?.name === clientName);
      if (!client) {
        console.warn('Client not found:', clientName);
        return null;
      }

      // Check for client-level conflicts
      const clientEntries = schedule.filter(entry => entry.clientName === clientName);
      const clientConflicts = clientEntries.filter(entry => hasEntryConflict(entry));

      return (
        <View key={clientName} style={styles.clientSection}>
          <View style={styles.clientHeader}>
            <TouchableOpacity
              style={styles.clientHeaderContent}
              onLongPress={() => onClientLongPress && onClientLongPress(client)}
              activeOpacity={0.7}
            >
              <View style={styles.clientInfo}>
                <View style={styles.clientNameRow}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  {clientConflicts.length > 0 && (
                    <View style={styles.clientConflictBadge}>
                      <Icon name="warning" size={12} style={{ color: colors.background }} />
                      <Text style={styles.clientConflictText}>{clientConflicts.length}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.clientMeta}>
                  <View style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(client.securityLevel || 'medium') }]}>
                    <Icon name="shield" size={12} style={{ color: colors.background }} />
                  </View>
                  <Text style={styles.buildingCount}>{buildings.length} buildings</Text>
                  {clientEntries.length > 0 && (
                    <Text style={styles.entryCount}>{clientEntries.length} jobs</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
          {buildings.map(building => renderBuildingRow(building))}
        </View>
      );
    } catch (error) {
      console.error('Error rendering client section:', error);
      return null;
    }
  }, [
    clients, 
    schedule,
    hasEntryConflict,
    onClientLongPress, 
    getSecurityLevelColor, 
    renderBuildingRow
  ]);

  // Early return for empty state with error handling
  if (!Array.isArray(clientBuildings) || clientBuildings.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="business" size={48} style={{ color: colors.textSecondary }} />
        <Text style={styles.emptyText}>No buildings found</Text>
        <Text style={styles.emptySubtext}>Add clients and buildings to start scheduling</Text>
      </View>
    );
  }

  try {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.container}>
          {/* Enhanced drag overlay with conflict preview */}
          {isDragging && (
            <View style={[
              styles.dragOverlay,
              { backgroundColor: previewConflicts.length > 0 ? colors.danger + '20' : colors.primary + '20' }
            ]}>
              <Icon 
                name={previewConflicts.length > 0 ? "warning" : "move"} 
                size={20} 
                style={{ color: previewConflicts.length > 0 ? colors.danger : colors.primary }} 
              />
              <Text style={[
                styles.dragOverlayText,
                { color: previewConflicts.length > 0 ? colors.danger : colors.primary }
              ]}>
                {previewConflicts.length > 0 
                  ? `⚠️ Will create ${previewConflicts.length} conflict(s)` 
                  : "Drop on a cell to move the entry"
                }
              </Text>
            </View>
          )}

          {/* Conflict summary header */}
          {hasConflicts && (
            <View style={styles.conflictSummaryHeader}>
              <Icon name="warning" size={20} style={{ color: colors.danger }} />
              <Text style={styles.conflictSummaryText}>
                {conflictSummary.total} conflicts detected • {conflictSummary.critical + conflictSummary.high} high priority
              </Text>
            </View>
          )}
          
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
                {/* Enhanced Header Row */}
                <View style={styles.headerRow}>
                  <View style={[styles.buildingHeaderCell, { width: buildingColumnWidth }]}>
                    <Text style={styles.headerText}>Buildings</Text>
                    {bulkMode && (
                      <Text style={styles.bulkModeIndicator}>Bulk Mode</Text>
                    )}
                    {hasConflicts && (
                      <Text style={styles.conflictIndicatorText}>
                        {conflictSummary.critical > 0 && `${conflictSummary.critical} Critical`}
                        {conflictSummary.high > 0 && ` ${conflictSummary.high} High`}
                      </Text>
                    )}
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
                {Array.from(buildingsByClient.entries()).map(([clientName, buildings]) =>
                  renderClientSection(clientName, buildings)
                )}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </GestureHandlerRootView>
    );
  } catch (error) {
    console.error('Error rendering DragDropScheduleGrid:', error);
    return (
      <View style={styles.errorState}>
        <Icon name="warning-outline" size={48} style={{ color: colors.danger }} />
        <Text style={styles.errorText}>Error loading schedule grid</Text>
        <Text style={styles.errorSubtext}>Please try refreshing the page</Text>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dragOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dragOverlayText: {
    ...typography.body,
    fontWeight: '600',
  },
  conflictSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.danger + '10',
    borderBottomWidth: 1,
    borderBottomColor: colors.danger + '30',
    gap: spacing.sm,
  },
  conflictSummaryText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
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
  bulkModeIndicator: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  conflictIndicatorText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  clientName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  clientConflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  clientConflictText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
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
  entryCount: {
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
  buildingCellBulkMode: {
    backgroundColor: colors.backgroundAlt,
  },
  buildingCellWithConflicts: {
    backgroundColor: colors.danger + '05',
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  buildingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  buildingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  buildingName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
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
  selectedCell: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  draggedCell: {
    opacity: 0.5,
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    zIndex: 1,
  },
  dragIndicator: {
    position: 'absolute',
    bottom: -spacing.xs,
    right: -spacing.xs,
    zIndex: 1,
  },
  cleanerNamesContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  cleanerName: {
    ...typography.small,
    fontWeight: '600',
    textAlign: 'center',
  },
  additionalCleaners: {
    ...typography.small,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
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
  conflictIndicator: {
    position: 'absolute',
    top: -spacing.xs,
    left: -spacing.xs,
    borderRadius: 8,
    padding: 2,
  },
  previewConflictIndicator: {
    position: 'absolute',
    top: -spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.warning,
    borderRadius: 6,
    padding: 1,
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
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    ...typography.h3,
    color: colors.danger,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

DragDropScheduleGrid.displayName = 'DragDropScheduleGrid';

export default DragDropScheduleGrid;
