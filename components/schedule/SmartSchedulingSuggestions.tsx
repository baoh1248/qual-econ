
import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { ClientBuilding, Client, Cleaner } from '../../hooks/useClientData';

interface SchedulingSuggestion {
  id: string;
  type: 'optimization' | 'conflict' | 'efficiency' | 'workload';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestedChanges: {
    entryId?: string;
    newCleaner?: string;
    newDay?: string;
    newTime?: string;
    action: 'move' | 'reassign' | 'split' | 'merge';
  }[];
  estimatedSavings?: {
    time: number;
    cost: number;
  };
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
  console.log('SmartSchedulingSuggestions rendered');

  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Optimized suggestions generation with memoization and early returns
  const suggestions = useMemo((): SchedulingSuggestion[] => {
    if (schedule.length === 0) return [];
    
    const generatedSuggestions: SchedulingSuggestion[] = [];

    // 1. Detect conflicts with optimized algorithm
    const conflicts = detectConflictsOptimized(schedule);
    for (let i = 0; i < Math.min(conflicts.length, 3); i++) {
      const conflict = conflicts[i];
      const alternativeCleaner = findAlternativeCleanerOptimized(conflict.entries[1], cleaners, schedule);
      
      if (alternativeCleaner) {
        generatedSuggestions.push({
          id: `conflict-${i}`,
          type: 'conflict',
          title: 'Scheduling Conflict Detected',
          description: `${conflict.cleanerName} is scheduled for multiple jobs on ${conflict.day}`,
          impact: 'high',
          suggestedChanges: [{
            entryId: conflict.entries[1].id,
            newCleaner: alternativeCleaner,
            action: 'reassign',
          }],
          estimatedSavings: { time: 30, cost: 50 }
        });
      }
    }

    // 2. Optimize travel time (simplified for performance)
    const travelOptimizations = optimizeTravelTimeOptimized(schedule, clientBuildings);
    for (let i = 0; i < Math.min(travelOptimizations.length, 2); i++) {
      const optimization = travelOptimizations[i];
      generatedSuggestions.push({
        id: `travel-${i}`,
        type: 'optimization',
        title: 'Optimize Travel Time',
        description: `Group nearby locations for ${optimization.cleanerName} on ${optimization.day}`,
        impact: 'medium',
        suggestedChanges: optimization.changes,
        estimatedSavings: {
          time: optimization.timeSaved,
          cost: optimization.costSaved,
        }
      });
    }

    // 3. Balance workload (simplified)
    const workloadSuggestions = balanceWorkloadOptimized(schedule, cleaners);
    for (let i = 0; i < Math.min(workloadSuggestions.length, 2); i++) {
      const suggestion = workloadSuggestions[i];
      generatedSuggestions.push({
        id: `workload-${i}`,
        type: 'workload',
        title: 'Balance Workload',
        description: suggestion.description,
        impact: 'medium',
        suggestedChanges: suggestion.changes,
        estimatedSavings: { time: 0, cost: suggestion.costSaved }
      });
    }

    return generatedSuggestions.slice(0, 5); // Limit to top 5 for performance
  }, [schedule, cleaners, clientBuildings]);

  // Optimized helper functions
  function detectConflictsOptimized(schedule: ScheduleEntry[]) {
    const conflicts: { cleanerName: string; day: string; entries: ScheduleEntry[] }[] = [];
    const cleanerDayMap = new Map<string, ScheduleEntry[]>();

    for (const entry of schedule) {
      const key = `${entry.cleanerName}|${entry.day}`;
      if (!cleanerDayMap.has(key)) {
        cleanerDayMap.set(key, []);
      }
      cleanerDayMap.get(key)!.push(entry);
    }

    for (const [key, entries] of cleanerDayMap) {
      if (entries.length > 1) {
        const [cleanerName, day] = key.split('|');
        conflicts.push({ cleanerName, day, entries });
      }
    }

    return conflicts;
  }

  function findAlternativeCleanerOptimized(entry: ScheduleEntry, cleaners: Cleaner[], schedule: ScheduleEntry[]): string | null {
    const busyCleaners = new Set(
      schedule
        .filter(s => s.day === entry.day && s.id !== entry.id)
        .map(s => s.cleanerName)
    );

    const availableCleaners = cleaners.filter(cleaner => 
      cleaner.isActive && !busyCleaners.has(cleaner.name)
    );

    return availableCleaners.length > 0 ? availableCleaners[0].name : null;
  }

  function optimizeTravelTimeOptimized(schedule: ScheduleEntry[], buildings: ClientBuilding[]) {
    const optimizations: any[] = [];
    const cleanerDayGroups = new Map<string, ScheduleEntry[]>();

    for (const entry of schedule) {
      const key = `${entry.cleanerName}|${entry.day}`;
      if (!cleanerDayGroups.has(key)) {
        cleanerDayGroups.set(key, []);
      }
      cleanerDayGroups.get(key)!.push(entry);
    }

    for (const [key, entries] of cleanerDayGroups) {
      if (entries.length > 1) {
        const [cleanerName, day] = key.split('|');
        const clientGroups = new Map<string, ScheduleEntry[]>();
        
        for (const entry of entries) {
          if (!clientGroups.has(entry.clientName)) {
            clientGroups.set(entry.clientName, []);
          }
          clientGroups.get(entry.clientName)!.push(entry);
        }

        for (const [clientName, clientEntries] of clientGroups) {
          if (clientEntries.length > 1) {
            optimizations.push({
              cleanerName,
              day,
              timeSaved: 15 * (clientEntries.length - 1),
              costSaved: 10 * (clientEntries.length - 1),
              changes: clientEntries.map(entry => ({
                entryId: entry.id,
                action: 'move' as const,
              })),
            });
          }
        }
      }
    }

    return optimizations.slice(0, 3);
  }

  function balanceWorkloadOptimized(schedule: ScheduleEntry[], cleaners: Cleaner[]) {
    const workloadMap = new Map<string, { hours: number; entries: ScheduleEntry[] }>();
    
    for (const cleaner of cleaners) {
      workloadMap.set(cleaner.name, { hours: 0, entries: [] });
    }

    for (const entry of schedule) {
      const current = workloadMap.get(entry.cleanerName);
      if (current) {
        current.hours += entry.hours;
        current.entries.push(entry);
      }
    }

    const suggestions: any[] = [];
    const workloads = Array.from(workloadMap.entries());
    const avgWorkload = workloads.reduce((sum, [_, data]) => sum + data.hours, 0) / workloads.length;

    const overloaded = workloads.filter(([_, data]) => data.hours > avgWorkload * 1.2);
    const underloaded = workloads.filter(([_, data]) => data.hours < avgWorkload * 0.8);

    for (let i = 0; i < Math.min(overloaded.length, 2); i++) {
      const [overloadedCleaner, overloadedData] = overloaded[i];
      if (underloaded.length > 0 && overloadedData.entries.length > 0) {
        const [underloadedCleaner] = underloaded[0];
        const entryToMove = overloadedData.entries[0];
        
        suggestions.push({
          description: `Move ${entryToMove.hours}h job from ${overloadedCleaner} to ${underloadedCleaner}`,
          costSaved: 25,
          changes: [{
            entryId: entryToMove.id,
            newCleaner: underloadedCleaner,
            action: 'reassign' as const,
          }],
        });
      }
    }

    return suggestions;
  }

  // Memoized color functions
  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  }, []);

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'conflict': return 'warning';
      case 'optimization': return 'speedometer';
      case 'efficiency': return 'trending-up';
      case 'workload': return 'scale';
      default: return 'bulb';
    }
  }, []);

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="checkmark-circle" size={48} style={{ color: colors.success }} />
        <Text style={styles.emptyText}>All Good!</Text>
        <Text style={styles.emptySubtext}>No scheduling improvements needed at this time.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="bulb" size={24} style={{ color: colors.primary }} />
        <Text style={styles.headerTitle}>Smart Suggestions</Text>
        <Text style={styles.suggestionCount}>{suggestions.length}</Text>
      </View>

      <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
        {suggestions.map((suggestion) => (
          <View key={suggestion.id} style={styles.suggestionCard}>
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
                    style={{ color: getImpactColor(suggestion.impact) }} 
                  />
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <View style={[styles.impactBadge, { backgroundColor: getImpactColor(suggestion.impact) }]}>
                    <Text style={styles.impactText}>{suggestion.impact.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                {suggestion.estimatedSavings && (
                  <View style={styles.savingsRow}>
                    <View style={styles.savingsItem}>
                      <Icon name="time" size={14} style={{ color: colors.textSecondary }} />
                      <Text style={styles.savingsText}>{suggestion.estimatedSavings.time}min</Text>
                    </View>
                    <View style={styles.savingsItem}>
                      <Icon name="cash" size={14} style={{ color: colors.textSecondary }} />
                      <Text style={styles.savingsText}>${suggestion.estimatedSavings.cost}</Text>
                    </View>
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
                    <Icon name="arrow-forward" size={16} style={{ color: colors.primary }} />
                    <Text style={styles.changeText}>
                      {change.action === 'reassign' && `Reassign to ${change.newCleaner}`}
                      {change.action === 'move' && `Move to ${change.newDay || 'different time'}`}
                      {change.action === 'split' && 'Split into multiple shifts'}
                      {change.action === 'merge' && 'Merge with nearby shifts'}
                    </Text>
                  </View>
                ))}
                
                <View style={styles.suggestionActions}>
                  <Button
                    text="Dismiss"
                    onPress={() => onDismissSuggestion(suggestion.id)}
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
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  suggestionCount: {
    ...typography.small,
    color: colors.background,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    fontWeight: '600',
  },
  suggestionsList: {
    maxHeight: 400,
  },
  suggestionCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  savingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  savingsText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
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
