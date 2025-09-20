
import React, { memo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import type { ConflictDetails, ConflictResolution } from '../../hooks/useConflictDetection';

interface ConflictResolutionPanelProps {
  conflicts: ConflictDetails[];
  onApplyResolution: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  onDismissConflict: (conflictId: string) => void;
  isLoading?: boolean;
}

const ConflictResolutionPanel = memo(({
  conflicts,
  onApplyResolution,
  onDismissConflict,
  isLoading = false
}: ConflictResolutionPanelProps) => {
  console.log('ConflictResolutionPanel rendered with', conflicts.length, 'conflicts');

  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [applyingResolution, setApplyingResolution] = useState<string | null>(null);

  const getSeverityColor = useCallback((severity: ConflictDetails['severity']) => {
    switch (severity) {
      case 'critical': return colors.danger;
      case 'high': return '#FF6B35';
      case 'medium': return colors.warning;
      case 'low': return '#4ECDC4';
      default: return colors.textSecondary;
    }
  }, []);

  const getSeverityIcon = useCallback((severity: ConflictDetails['severity']) => {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  }, []);

  const getTypeIcon = useCallback((type: ConflictDetails['type']) => {
    switch (type) {
      case 'cleaner_double_booking': return 'person-circle';
      case 'location_overlap': return 'location';
      case 'time_conflict': return 'time';
      case 'workload_imbalance': return 'scale';
      default: return 'warning';
    }
  }, []);

  const handleApplyResolution = useCallback(async (conflict: ConflictDetails, resolution: ConflictResolution) => {
    try {
      setApplyingResolution(resolution.id);
      
      Alert.alert(
        'Apply Resolution',
        `Are you sure you want to apply this resolution?\n\n${resolution.description}\n\nEstimated benefit: ${resolution.estimatedBenefit.timeSaved}min saved, $${resolution.estimatedBenefit.costReduction} cost reduction`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: async () => {
              try {
                await onApplyResolution(conflict.id, resolution);
                console.log('Resolution applied successfully:', resolution.id);
              } catch (error) {
                console.error('Error applying resolution:', error);
                Alert.alert('Error', 'Failed to apply resolution. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleApplyResolution:', error);
    } finally {
      setApplyingResolution(null);
    }
  }, [onApplyResolution]);

  const handleDismissConflict = useCallback((conflictId: string) => {
    Alert.alert(
      'Dismiss Conflict',
      'Are you sure you want to dismiss this conflict? It will be hidden from the list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => onDismissConflict(conflictId)
        }
      ]
    );
  }, [onDismissConflict]);

  const renderConflictCard = useCallback((conflict: ConflictDetails) => {
    const isExpanded = expandedConflict === conflict.id;
    const severityColor = getSeverityColor(conflict.severity);

    return (
      <View key={conflict.id} style={[styles.conflictCard, { borderLeftColor: severityColor }]}>
        <TouchableOpacity
          style={styles.conflictHeader}
          onPress={() => setExpandedConflict(isExpanded ? null : conflict.id)}
          activeOpacity={0.7}
        >
          <View style={styles.conflictInfo}>
            <View style={styles.conflictTitleRow}>
              <Icon 
                name={getTypeIcon(conflict.type)} 
                size={20} 
                style={{ color: severityColor }} 
              />
              <Text style={styles.conflictTitle}>{conflict.title}</Text>
              <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                <Icon 
                  name={getSeverityIcon(conflict.severity)} 
                  size={12} 
                  style={{ color: colors.background }} 
                />
                <Text style={styles.severityText}>{conflict.severity.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.conflictDescription}>{conflict.description}</Text>
            
            <View style={styles.impactRow}>
              <View style={styles.impactItem}>
                <Icon name="time" size={14} style={{ color: colors.textSecondary }} />
                <Text style={styles.impactText}>{conflict.estimatedImpact.timeWasted}min wasted</Text>
              </View>
              <View style={styles.impactItem}>
                <Icon name="cash" size={14} style={{ color: colors.textSecondary }} />
                <Text style={styles.impactText}>${conflict.estimatedImpact.costIncrease} extra cost</Text>
              </View>
              <View style={styles.impactItem}>
                <Icon name="trending-down" size={14} style={{ color: colors.textSecondary }} />
                <Text style={styles.impactText}>{conflict.estimatedImpact.efficiencyLoss}% efficiency loss</Text>
              </View>
            </View>
          </View>
          
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            style={{ color: colors.textSecondary }} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.conflictDetails}>
            {/* Affected Entries */}
            <View style={styles.affectedEntriesSection}>
              <Text style={styles.sectionTitle}>Affected Schedule Entries:</Text>
              {conflict.affectedEntries.map((entry, index) => (
                <View key={entry.id} style={styles.affectedEntry}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryBuilding}>{entry.buildingName}</Text>
                    <Text style={styles.entryDetails}>
                      {entry.cleanerName} • {entry.day} • {entry.hours}h
                      {entry.startTime && ` • ${entry.startTime}`}
                    </Text>
                  </View>
                  <View style={[styles.entryStatus, { backgroundColor: getSeverityColor(conflict.severity) + '20' }]}>
                    <Text style={[styles.entryStatusText, { color: severityColor }]}>
                      {entry.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Resolution Options */}
            {conflict.suggestedResolutions.length > 0 && (
              <View style={styles.resolutionsSection}>
                <Text style={styles.sectionTitle}>Suggested Resolutions:</Text>
                {conflict.suggestedResolutions.map((resolution, index) => (
                  <View key={resolution.id} style={styles.resolutionCard}>
                    <View style={styles.resolutionHeader}>
                      <View style={styles.resolutionInfo}>
                        <Text style={styles.resolutionTitle}>{resolution.title}</Text>
                        <Text style={styles.resolutionDescription}>{resolution.description}</Text>
                        
                        <View style={styles.benefitRow}>
                          <View style={styles.benefitItem}>
                            <Icon name="time" size={12} style={{ color: colors.success }} />
                            <Text style={styles.benefitText}>{resolution.estimatedBenefit.timeSaved}min saved</Text>
                          </View>
                          <View style={styles.benefitItem}>
                            <Icon name="cash" size={12} style={{ color: colors.success }} />
                            <Text style={styles.benefitText}>${resolution.estimatedBenefit.costReduction} saved</Text>
                          </View>
                          <View style={styles.benefitItem}>
                            <Icon name="trending-up" size={12} style={{ color: colors.success }} />
                            <Text style={styles.benefitText}>+{resolution.estimatedBenefit.efficiencyGain}% efficiency</Text>
                          </View>
                        </View>
                      </View>
                      
                      <Button
                        text={applyingResolution === resolution.id ? "Applying..." : "Apply"}
                        onPress={() => handleApplyResolution(conflict, resolution)}
                        variant="primary"
                        style={styles.applyButton}
                        disabled={isLoading || applyingResolution === resolution.id}
                      />
                    </View>

                    {/* Show changes */}
                    {resolution.changes.length > 0 && (
                      <View style={styles.changesSection}>
                        <Text style={styles.changesTitle}>Changes:</Text>
                        {resolution.changes.map((change, changeIndex) => (
                          <View key={changeIndex} style={styles.changeItem}>
                            <Icon name="arrow-forward" size={14} style={{ color: colors.primary }} />
                            <Text style={styles.changeText}>
                              {change.newCleaner && `Assign to ${change.newCleaner}`}
                              {change.newDay && `Move to ${change.newDay}`}
                              {change.newTime && `Reschedule to ${change.newTime}`}
                              {change.newHours && `Adjust to ${change.newHours}h`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.conflictActions}>
              <Button
                text="Dismiss"
                onPress={() => handleDismissConflict(conflict.id)}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                text="View Details"
                onPress={() => {
                  // Could navigate to a detailed view or show more info
                  console.log('View conflict details:', conflict.id);
                }}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </View>
        )}
      </View>
    );
  }, [
    expandedConflict, 
    getSeverityColor, 
    getTypeIcon, 
    getSeverityIcon, 
    applyingResolution, 
    isLoading, 
    handleApplyResolution, 
    handleDismissConflict
  ]);

  if (conflicts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name="checkmark-circle" size={48} style={{ color: colors.success }} />
        <Text style={styles.emptyTitle}>No Conflicts Detected</Text>
        <Text style={styles.emptyDescription}>
          Your schedule is optimized and conflict-free!
        </Text>
      </View>
    );
  }

  // Group conflicts by severity
  const conflictsBySeverity = {
    critical: conflicts.filter(c => c.severity === 'critical'),
    high: conflicts.filter(c => c.severity === 'high'),
    medium: conflicts.filter(c => c.severity === 'medium'),
    low: conflicts.filter(c => c.severity === 'low')
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="warning" size={24} style={{ color: colors.danger }} />
          <Text style={styles.headerTitle}>Schedule Conflicts</Text>
        </View>
        <View style={styles.conflictSummary}>
          {conflictsBySeverity.critical.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: colors.danger }]}>
              <Text style={styles.summaryText}>{conflictsBySeverity.critical.length} Critical</Text>
            </View>
          )}
          {conflictsBySeverity.high.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: '#FF6B35' }]}>
              <Text style={styles.summaryText}>{conflictsBySeverity.high.length} High</Text>
            </View>
          )}
          {conflictsBySeverity.medium.length > 0 && (
            <View style={[styles.summaryBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.summaryText}>{conflictsBySeverity.medium.length} Medium</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.conflictsList} showsVerticalScrollIndicator={false}>
        {/* Critical conflicts first */}
        {conflictsBySeverity.critical.map(renderConflictCard)}
        {conflictsBySeverity.high.map(renderConflictCard)}
        {conflictsBySeverity.medium.map(renderConflictCard)}
        {conflictsBySeverity.low.map(renderConflictCard)}
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
  conflictSummary: {
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
  conflictsList: {
    maxHeight: 500,
  },
  conflictCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  conflictTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
    flex: 1,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  severityText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
    fontSize: 10,
  },
  conflictDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  impactRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  impactText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  conflictDetails: {
    padding: spacing.lg,
    paddingTop: 0,
    backgroundColor: colors.backgroundAlt,
  },
  affectedEntriesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  affectedEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryInfo: {
    flex: 1,
  },
  entryBuilding: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  entryDetails: {
    ...typography.small,
    color: colors.textSecondary,
  },
  entryStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  entryStatusText: {
    ...typography.small,
    fontWeight: '600',
    fontSize: 10,
  },
  resolutionsSection: {
    marginBottom: spacing.lg,
  },
  resolutionCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  resolutionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  resolutionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resolutionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  benefitText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '500',
  },
  applyButton: {
    minWidth: 80,
  },
  changesSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changesTitle: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  changeText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  conflictActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

ConflictResolutionPanel.displayName = 'ConflictResolutionPanel';

export default ConflictResolutionPanel;
