
import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { ClientBuilding, Client, Cleaner } from '../../hooks/useClientData';
import { useConflictDetection } from '../../hooks/useConflictDetection';

interface SchedulingSuggestion {
  id: string;
  type: 'conflict_resolution' | 'optimization' | 'efficiency' | 'workload';
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  priority: number; // Higher number = higher priority
  suggestedChanges: {
    entryId?: string;
    newCleaner?: string;
    newDay?: string;
    newTime?: string;
    action: 'move' | 'reassign' | 'split' | 'merge' | 'reschedule';
  }[];
  estimatedSavings?: {
    time: number;
    cost: number;
    efficiency: number;
  };
  conflictIds?: string[]; // Related conflict IDs
}

interface SmartSchedulingSuggestionsProps {
  schedule: ScheduleEntry[];
  cleaners: Cleaner[];
  clientBuildings: ClientBuilding[];
  clients: Client[];
  onApplySuggestion: (suggestion: SchedulingSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

const SmartSchedulingSuggestions = memo(({
  schedule,
  cleaners,
  clientBuildings,
  clients,
  onApplySuggestion,
  onDismissSuggestion,
}: SmartSchedulingSuggestionsProps) => {
  console.log('SmartSchedulingSuggestions rendered with enhanced conflict resolution');

  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Enhanced conflict detection
  const { conflicts, conflictSummary } = useConflictDetection(schedule, cleaners);

  // Enhanced suggestions generation with conflict-first approach
  const suggestions = useMemo((): SchedulingSuggestion[] => {
    if (schedule.length === 0) return [];
    
    const generatedSuggestions: SchedulingSuggestion[] = [];

    // 1. PRIORITY: Conflict resolution suggestions (highest priority)
    const conflictSuggestions = generateConflictResolutionSuggestions(conflicts, cleaners, schedule);
    generatedSuggestions.push(...conflictSuggestions);

    // 2. Travel time optimization
    const travelOptimizations = optimizeTravelTimeEnhanced(schedule, clientBuildings, clients);
    generatedSuggestions.push(...travelOptimizations);

    // 3. Workload balancing
    const workloadSuggestions = balanceWorkloadEnhanced(schedule, cleaners);
    generatedSuggestions.push(...workloadSuggestions);

    // 4. Efficiency improvements
    const efficiencySuggestions = generateEfficiencySuggestions(schedule, cleaners, clientBuildings);
    generatedSuggestions.push(...efficiencySuggestions);

    // Sort by priority (conflict resolution first, then by impact and estimated savings)
    const sortedSuggestions = generatedSuggestions
      .filter(s => !dismissedSuggestions.has(s.id))
      .sort((a, b) => {
        // Conflict resolution always comes first
        if (a.type === 'conflict_resolution' && b.type !== 'conflict_resolution') return -1;
        if (b.type === 'conflict_resolution' && a.type !== 'conflict_resolution') return 1;
        
        // Then by priority score
        if (a.priority !== b.priority) return b.priority - a.priority;
        
        // Then by impact
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        if (impactDiff !== 0) return impactDiff;
        
        // Finally by estimated savings
        const aSavings = (a.estimatedSavings?.time || 0) + (a.estimatedSavings?.cost || 0);
        const bSavings = (b.estimatedSavings?.time || 0) + (b.estimatedSavings?.cost || 0);
        return bSavings - aSavings;
      });

    return sortedSuggestions.slice(0, 8); // Limit to top 8 for performance
  }, [schedule, cleaners, clientBuildings, clients, conflicts, dismissedSuggestions]);

  // Enhanced conflict resolution suggestion generator
  function generateConflictResolutionSuggestions(
    conflicts: any[], 
    cleaners: Cleaner[], 
    schedule: ScheduleEntry[]
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];

    for (const conflict of conflicts) {
      if (conflict.type === 'cleaner_double_booking') {
        // Generate suggestions for each resolution option
        for (const resolution of conflict.suggestedResolutions) {
          suggestions.push({
            id: `conflict-resolution-${conflict.id}-${resolution.id}`,
            type: 'conflict_resolution',
            title: `Resolve ${conflict.title}`,
            description: resolution.description,
            impact: conflict.severity as any,
            priority: conflict.severity === 'critical' ? 100 : conflict.severity === 'high' ? 90 : 70,
            suggestedChanges: resolution.changes.map(change => ({
              entryId: change.entryId,
              newCleaner: change.newCleaner,
              newDay: change.newDay,
              newTime: change.newTime,
              action: resolution.type === 'reassign_cleaner' ? 'reassign' : 
                     resolution.type === 'reschedule_time' ? 'reschedule' : 'move'
            })),
            estimatedSavings: {
              time: resolution.estimatedBenefit.timeSaved,
              cost: resolution.estimatedBenefit.costReduction,
              efficiency: resolution.estimatedBenefit.efficiencyGain
            },
            conflictIds: [conflict.id]
          });
        }
      } else if (conflict.type === 'time_conflict') {
        // Time overlap resolution
        suggestions.push({
          id: `time-conflict-resolution-${conflict.id}`,
          type: 'conflict_resolution',
          title: 'Resolve Time Overlap',
          description: `Reschedule overlapping shifts to prevent conflicts`,
          impact: 'high',
          priority: 85,
          suggestedChanges: conflict.suggestedResolutions.flatMap(res => 
            res.changes.map(change => ({
              entryId: change.entryId,
              newTime: change.newTime,
              action: 'reschedule' as const
            }))
          ),
          estimatedSavings: {
            time: 60,
            cost: 100,
            efficiency: 25
          },
          conflictIds: [conflict.id]
        });
      } else if (conflict.type === 'workload_imbalance') {
        // Workload balancing resolution
        suggestions.push({
          id: `workload-resolution-${conflict.id}`,
          type: 'conflict_resolution',
          title: 'Balance Workload',
          description: conflict.description,
          impact: 'medium',
          priority: 60,
          suggestedChanges: conflict.suggestedResolutions.flatMap(res => 
            res.changes.map(change => ({
              entryId: change.entryId,
              newCleaner: change.newCleaner,
              action: 'reassign' as const
            }))
          ),
          estimatedSavings: {
            time: 0,
            cost: 50,
            efficiency: 15
          },
          conflictIds: [conflict.id]
        });
      }
    }

    return suggestions;
  }

  // Enhanced travel optimization with client grouping
  function optimizeTravelTimeEnhanced(
    schedule: ScheduleEntry[], 
    buildings: ClientBuilding[], 
    clients: Client[]
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];
    const cleanerDayGroups = new Map<string, ScheduleEntry[]>();

    // Group by cleaner and day
    for (const entry of schedule) {
      const key = `${entry.cleanerName}|${entry.day}`;
      if (!cleanerDayGroups.has(key)) {
        cleanerDayGroups.set(key, []);
      }
      cleanerDayGroups.get(key)!.push(entry);
    }

    for (const [key, entries] of cleanerDayGroups) {
      if (entries.length < 2) continue;

      const [cleanerName, day] = key.split('|');
      
      // Group by client to identify travel optimization opportunities
      const clientGroups = new Map<string, ScheduleEntry[]>();
      for (const entry of entries) {
        if (!clientGroups.has(entry.clientName)) {
          clientGroups.set(entry.clientName, []);
        }
        clientGroups.get(entry.clientName)!.push(entry);
      }

      // Check for scattered client assignments
      if (clientGroups.size > 1) {
        const scatteredClients = Array.from(clientGroups.entries())
          .filter(([_, clientEntries]) => clientEntries.length > 1);

        for (const [clientName, clientEntries] of scatteredClients) {
          if (clientEntries.length > 1) {
            // Check if entries are not consecutive
            const sortedEntries = clientEntries.sort((a, b) => 
              (a.startTime || '').localeCompare(b.startTime || '')
            );

            let hasGaps = false;
            for (let i = 0; i < sortedEntries.length - 1; i++) {
              const current = sortedEntries[i];
              const next = sortedEntries[i + 1];
              
              // Check if there are other client entries between these
              const otherEntries = entries.filter(e => 
                e.clientName !== clientName &&
                e.startTime &&
                current.startTime &&
                next.startTime &&
                e.startTime > current.startTime &&
                e.startTime < next.startTime
              );

              if (otherEntries.length > 0) {
                hasGaps = true;
                break;
              }
            }

            if (hasGaps) {
              suggestions.push({
                id: `travel-optimization-${cleanerName}-${day}-${clientName}`,
                type: 'optimization',
                title: 'Group Client Locations',
                description: `Group all ${clientName} jobs for ${cleanerName} on ${day} to reduce travel time`,
                impact: 'medium',
                priority: 50,
                suggestedChanges: clientEntries.map((entry, index) => ({
                  entryId: entry.id,
                  newTime: `${8 + index * 2}:00`, // Suggest consecutive 2-hour slots
                  action: 'reschedule'
                })),
                estimatedSavings: {
                  time: (clientEntries.length - 1) * 20,
                  cost: (clientEntries.length - 1) * 15,
                  efficiency: 10
                }
              });
            }
          }
        }
      }

      // Check for geographic optimization opportunities
      const geographicSuggestion = analyzeGeographicEfficiency(entries, buildings);
      if (geographicSuggestion) {
        suggestions.push({
          id: `geographic-optimization-${cleanerName}-${day}`,
          type: 'optimization',
          title: 'Optimize Route',
          description: `Reorder ${cleanerName}'s jobs on ${day} for better geographic efficiency`,
          impact: 'low',
          priority: 30,
          suggestedChanges: geographicSuggestion.changes,
          estimatedSavings: geographicSuggestion.savings
        });
      }
    }

    return suggestions.slice(0, 3); // Limit travel suggestions
  }

  // Enhanced workload balancing
  function balanceWorkloadEnhanced(schedule: ScheduleEntry[], cleaners: Cleaner[]): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];
    const workloadMap = new Map<string, { hours: number; entries: ScheduleEntry[]; days: Set<string> }>();
    
    // Initialize cleaner workloads
    for (const cleaner of cleaners) {
      if (cleaner.isActive) {
        workloadMap.set(cleaner.name, { hours: 0, entries: [], days: new Set() });
      }
    }

    // Calculate detailed workloads
    for (const entry of schedule) {
      if (entry.status === 'cancelled') continue;
      
      const workload = workloadMap.get(entry.cleanerName);
      if (workload) {
        workload.hours += entry.hours || 0;
        workload.entries.push(entry);
        workload.days.add(entry.day);
      }
    }

    const workloads = Array.from(workloadMap.entries());
    const totalHours = workloads.reduce((sum, [_, data]) => sum + data.hours, 0);
    const avgHours = totalHours / workloads.length;
    const threshold = avgHours * 0.25; // 25% deviation threshold

    const overloaded = workloads.filter(([_, data]) => data.hours > avgHours + threshold);
    const underloaded = workloads.filter(([_, data]) => data.hours < avgHours - threshold);

    // Generate specific rebalancing suggestions
    for (const [overloadedCleaner, overloadedData] of overloaded) {
      for (const [underloadedCleaner, underloadedData] of underloaded) {
        // Find suitable entries to move
        const movableEntries = overloadedData.entries.filter(entry => {
          // Check if underloaded cleaner is available on that day
          const conflictingEntry = underloadedData.entries.find(e => e.day === entry.day);
          return !conflictingEntry;
        });

        if (movableEntries.length > 0) {
          const entryToMove = movableEntries[0]; // Move the first suitable entry
          const hoursDifference = overloadedData.hours - underloadedData.hours;
          
          suggestions.push({
            id: `workload-balance-${entryToMove.id}`,
            type: 'workload',
            title: 'Balance Workload',
            description: `Move ${entryToMove.buildingName} (${entryToMove.hours}h) from ${overloadedCleaner} to ${underloadedCleaner}`,
            impact: hoursDifference > avgHours ? 'high' : 'medium',
            priority: hoursDifference > avgHours ? 65 : 45,
            suggestedChanges: [{
              entryId: entryToMove.id,
              newCleaner: underloadedCleaner,
              action: 'reassign'
            }],
            estimatedSavings: {
              time: 0,
              cost: Math.min(hoursDifference * 5, 50), // $5 per hour difference, max $50
              efficiency: Math.min(hoursDifference * 2, 20) // 2% per hour difference, max 20%
            }
          });
        }
      }
    }

    return suggestions.slice(0, 2); // Limit workload suggestions
  }

  // New: Efficiency improvement suggestions
  function generateEfficiencySuggestions(
    schedule: ScheduleEntry[], 
    cleaners: Cleaner[], 
    buildings: ClientBuilding[]
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];

    // 1. Identify underutilized days
    const dayUtilization = new Map<string, number>();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
      const dayEntries = schedule.filter(e => e.day === day && e.status !== 'cancelled');
      dayUtilization.set(day, dayEntries.length);
    }

    const avgUtilization = Array.from(dayUtilization.values()).reduce((a, b) => a + b, 0) / days.length;
    const underutilizedDays = Array.from(dayUtilization.entries())
      .filter(([_, count]) => count < avgUtilization * 0.7)
      .map(([day]) => day);

    if (underutilizedDays.length > 0) {
      // Find entries that could be moved to underutilized days
      const overutilizedDays = Array.from(dayUtilization.entries())
        .filter(([_, count]) => count > avgUtilization * 1.3)
        .map(([day]) => day);

      for (const overDay of overutilizedDays) {
        const movableEntries = schedule.filter(e => 
          e.day === overDay && 
          e.status === 'scheduled' &&
          !e.isRecurring // Don't suggest moving recurring tasks
        );

        if (movableEntries.length > 0 && underutilizedDays.length > 0) {
          const entryToMove = movableEntries[0];
          const targetDay = underutilizedDays[0];

          suggestions.push({
            id: `efficiency-day-balance-${entryToMove.id}`,
            type: 'efficiency',
            title: 'Balance Daily Workload',
            description: `Move ${entryToMove.buildingName} from busy ${overDay} to quieter ${targetDay}`,
            impact: 'low',
            priority: 25,
            suggestedChanges: [{
              entryId: entryToMove.id,
              newDay: targetDay,
              action: 'move'
            }],
            estimatedSavings: {
              time: 15,
              cost: 20,
              efficiency: 8
            }
          });
        }
      }
    }

    // 2. Identify split shift opportunities
    const longShifts = schedule.filter(e => (e.hours || 0) > 6); // Shifts longer than 6 hours
    for (const shift of longShifts) {
      const availableCleaners = cleaners.filter(c => 
        c.isActive && 
        c.name !== shift.cleanerName &&
        !schedule.some(e => e.cleanerName === c.name && e.day === shift.day)
      );

      if (availableCleaners.length > 0) {
        suggestions.push({
          id: `efficiency-split-shift-${shift.id}`,
          type: 'efficiency',
          title: 'Split Long Shift',
          description: `Split ${shift.cleanerName}'s ${shift.hours}h shift at ${shift.buildingName} with ${availableCleaners[0].name}`,
          impact: 'low',
          priority: 20,
          suggestedChanges: [{
            entryId: shift.id,
            newCleaner: availableCleaners[0].name,
            action: 'split'
          }],
          estimatedSavings: {
            time: 0,
            cost: 0,
            efficiency: 12 // Better work quality with shorter shifts
          }
        });
      }
    }

    return suggestions.slice(0, 2); // Limit efficiency suggestions
  }

  // Helper function for geographic analysis
  function analyzeGeographicEfficiency(entries: ScheduleEntry[], buildings: ClientBuilding[]) {
    // Simplified geographic analysis - in a real app, you'd use actual coordinates
    if (entries.length < 3) return null;

    // Group by client to identify potential routing improvements
    const clientGroups = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      if (!clientGroups.has(entry.clientName)) {
        clientGroups.set(entry.clientName, []);
      }
      clientGroups.get(entry.clientName)!.push(entry);
    }

    // If there are multiple clients with multiple buildings, suggest grouping
    const multiLocationClients = Array.from(clientGroups.entries())
      .filter(([_, clientEntries]) => clientEntries.length > 1);

    if (multiLocationClients.length > 0) {
      const changes = multiLocationClients.flatMap(([_, clientEntries]) =>
        clientEntries.map((entry, index) => ({
          entryId: entry.id,
          newTime: `${9 + index}:00`, // Consecutive hours starting at 9 AM
          action: 'reschedule' as const
        }))
      );

      return {
        changes,
        savings: {
          time: multiLocationClients.length * 15,
          cost: multiLocationClients.length * 10,
          efficiency: 5
        }
      };
    }

    return null;
  }

  // Enhanced color and icon functions
  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'critical': return colors.danger;
      case 'high': return '#FF6B35';
      case 'medium': return colors.warning;
      case 'low': return '#4ECDC4';
      default: return colors.text;
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'conflict_resolution': return 'warning-outline';
      case 'optimization': return 'speedometer-outline';
      case 'efficiency': return 'trending-up-outline';
      case 'workload': return 'scale-outline';
      default: return 'bulb-outline';
    }
  }, []);

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'conflict_resolution': return colors.danger;
      case 'optimization': return colors.primary;
      case 'efficiency': return colors.success;
      case 'workload': return colors.warning;
      default: return colors.text;
    }
  }, []);

  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
    onDismissSuggestion(suggestionId);
  }, [onDismissSuggestion]);

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="checkmark-circle" size={48} style={{ color: colors.success }} />
        <Text style={styles.emptyText}>All Optimized!</Text>
        <Text style={styles.emptySubtext}>
          {conflictSummary.total === 0 
            ? "No conflicts detected and schedule is well-optimized."
            : "All conflicts have been addressed with suggestions above."
          }
        </Text>
      </View>
    );
  }

  // Group suggestions by type for better organization
  const suggestionsByType = {
    conflict_resolution: suggestions.filter(s => s.type === 'conflict_resolution'),
    optimization: suggestions.filter(s => s.type === 'optimization'),
    workload: suggestions.filter(s => s.type === 'workload'),
    efficiency: suggestions.filter(s => s.type === 'efficiency')
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="bulb" size={24} style={{ color: colors.primary }} />
          <Text style={styles.headerTitle}>Smart Suggestions</Text>
        </View>
        <View style={styles.suggestionSummary}>
          {suggestionsByType.conflict_resolution.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.summaryText}>{suggestionsByType.conflict_resolution.length} Conflicts</Text>
            </View>
          )}
          <View style={[styles.summaryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.summaryText}>{suggestions.length} Total</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
        {suggestions.map((suggestion) => (
          <View key={suggestion.id} style={[
            styles.suggestionCard,
            { borderLeftColor: getTypeColor(suggestion.type) }
          ]}>
            <TouchableOpacity
              style={styles.suggestionHeader}
              onPress={() => setExpandedSuggestion(
                expandedSuggestion === suggestion.id ? null : suggestion.id
              )}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionInfo}>
                <View style={styles.suggestionTitleRow}>
                  <Icon 
                    name={getTypeIcon(suggestion.type)} 
                    size={20} 
                    style={{ color: getTypeColor(suggestion.type) }} 
                  />
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <View style={[styles.impactBadge, { backgroundColor: getImpactColor(suggestion.impact) }]}>
                    <Text style={styles.impactText}>{suggestion.impact.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                {suggestion.estimatedSavings && (
                  <View style={styles.savingsRow}>
                    {suggestion.estimatedSavings.time > 0 && (
                      <View style={styles.savingsItem}>
                        <Icon name="time" size={14} style={{ color: colors.success }} />
                        <Text style={styles.savingsText}>{suggestion.estimatedSavings.time}min</Text>
                      </View>
                    )}
                    {suggestion.estimatedSavings.cost > 0 && (
                      <View style={styles.savingsItem}>
                        <Icon name="cash" size={14} style={{ color: colors.success }} />
                        <Text style={styles.savingsText}>${suggestion.estimatedSavings.cost}</Text>
                      </View>
                    )}
                    {suggestion.estimatedSavings.efficiency > 0 && (
                      <View style={styles.savingsItem}>
                        <Icon name="trending-up" size={14} style={{ color: colors.success }} />
                        <Text style={styles.savingsText}>+{suggestion.estimatedSavings.efficiency}%</Text>
                      </View>
                    )}
                  </View>
                )}
                {suggestion.type === 'conflict_resolution' && suggestion.conflictIds && (
                  <View style={styles.conflictInfo}>
                    <Icon name="warning" size={12} style={{ color: colors.danger }} />
                    <Text style={styles.conflictInfoText}>
                      Resolves {suggestion.conflictIds.length} conflict{suggestion.conflictIds.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              <Icon 
                name={expandedSuggestion === suggestion.id ? "chevron-up" : "chevron-down"} 
                size={20} 
                style={{ color: colors.textSecondary }} 
              />
            </TouchableOpacity>

            {expandedSuggestion === suggestion.id && (
              <View style={styles.suggestionDetails}>
                <Text style={styles.changesTitle}>Suggested Changes:</Text>
                {suggestion.suggestedChanges.map((change, index) => (
                  <View key={index} style={styles.changeItem}>
                    <Icon name="arrow-forward" size={16} style={{ color: getTypeColor(suggestion.type) }} />
                    <Text style={styles.changeText}>
                      {change.action === 'reassign' && `Reassign to ${change.newCleaner}`}
                      {change.action === 'move' && `Move to ${change.newDay || 'different location'}`}
                      {change.action === 'reschedule' && `Reschedule to ${change.newTime || 'different time'}`}
                      {change.action === 'split' && 'Split into multiple shifts'}
                      {change.action === 'merge' && 'Merge with nearby shifts'}
                    </Text>
                  </View>
                ))}
                
                <View style={styles.suggestionActions}>
                  <Button
                    text="Dismiss"
                    onPress={() => handleDismissSuggestion(suggestion.id)}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  <Button
                    text="Apply"
                    onPress={() => onApplySuggestion(suggestion)}
                    variant="primary"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    margin: spacing.md,
    ...commonStyles.shadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  suggestionSummary: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  summaryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  summaryText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  suggestionsList: {
    maxHeight: 500,
  },
  suggestionCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  suggestionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  impactText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  suggestionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  savingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  savingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  savingsText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '500',
  },
  conflictInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  conflictInfoText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '600',
  },
  suggestionDetails: {
    padding: spacing.lg,
    paddingTop: 0,
    backgroundColor: colors.backgroundAlt,
  },
  changesTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  changeText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  suggestionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

SmartSchedulingSuggestions.displayName = 'SmartSchedulingSuggestions';

export default SmartSchedulingSuggestions;
