
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import Toast from '../../components/Toast';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';

interface ClientProject {
  id: string;
  client_name: string;
  building_name?: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  work_order_number?: string;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
}

interface BuildingProjects {
  buildingName: string;
  projects: ClientProject[];
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
}

const ContractDetailsScreen = () => {
  const { clientName } = useLocalSearchParams<{ clientName: string }>();
  const { themeColor } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { executeQuery } = useDatabase();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);

  // Load projects for this client
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading projects for client:', clientName);

      const result = await executeQuery<ClientProject>(
        'select',
        'client_projects',
        undefined,
        { client_name: clientName }
      );
      
      console.log('✓ Loaded projects:', result.length);
      setProjects(result);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [clientName, executeQuery, showToast]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Group projects by building
  const buildingProjects = useMemo<BuildingProjects[]>(() => {
    const buildingMap = new Map<string, BuildingProjects>();

    projects.forEach((project) => {
      const building = project.building_name || 'No Building Specified';
      
      const existing = buildingMap.get(building);
      
      if (existing) {
        existing.projects.push(project);
        existing.totalProjects += 1;
        if (project.status === 'active') {
          existing.activeProjects += 1;
        }
        if (!project.is_included_in_contract) {
          existing.totalRevenue += project.billing_amount;
        }
      } else {
        buildingMap.set(building, {
          buildingName: building,
          projects: [project],
          totalProjects: 1,
          activeProjects: project.status === 'active' ? 1 : 0,
          totalRevenue: project.is_included_in_contract ? 0 : project.billing_amount,
        });
      }
    });

    return Array.from(buildingMap.values()).sort((a, b) => 
      a.buildingName.localeCompare(b.buildingName)
    );
  }, [projects]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const includedProjects = projects.filter(p => p.is_included_in_contract).length;
    const billableProjects = projects.filter(p => !p.is_included_in_contract).length;
    const totalRevenue = projects
      .filter(p => !p.is_included_in_contract)
      .reduce((sum, p) => sum + p.billing_amount, 0);

    return {
      totalProjects,
      activeProjects,
      includedProjects,
      billableProjects,
      totalRevenue,
    };
  }, [projects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return themeColor;
      case 'cancelled':
        return colors.danger;
      case 'on-hold':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'one-time':
        return 'One Time';
      case 'weekly':
        return 'Weekly';
      case 'bi-weekly':
        return 'Bi-Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return frequency;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toggleBuilding = (buildingName: string) => {
    setExpandedBuilding(expandedBuilding === buildingName ? null : buildingName);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading contract details..." />;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: themeColor,
    },
    headerTitle: {
      ...typography.h2,
      color: colors.background,
      fontWeight: '600',
    },
    clientNameHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      backgroundColor: colors.backgroundAlt,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    clientName: {
      ...typography.h1,
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    clientSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statCard: {
      flex: 1,
      minWidth: '30%',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    statValue: {
      ...typography.h2,
      color: themeColor,
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    statLabel: {
      ...typography.small,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
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
      marginVertical: spacing.lg,
    },
    buildingCard: {
      marginBottom: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    buildingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    buildingHeaderLeft: {
      flex: 1,
    },
    buildingName: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    buildingStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    buildingStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    buildingStatText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    buildingStatValue: {
      ...typography.small,
      color: colors.text,
      fontWeight: '600',
    },
    chevronIcon: {
      color: colors.textSecondary,
    },
    projectsList: {
      padding: spacing.md,
      backgroundColor: colors.backgroundAlt,
    },
    projectCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    projectName: {
      ...typography.body,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusText: {
      ...typography.small,
      fontWeight: '600',
      fontSize: 10,
      textTransform: 'capitalize',
    },
    projectDescription: {
      ...typography.small,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    projectDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    detailText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    contractSection: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    contractTitle: {
      ...typography.small,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    contractDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    contractDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    contractDetailLabel: {
      ...typography.small,
      color: colors.textSecondary,
    },
    contractDetailValue: {
      ...typography.small,
      color: colors.text,
      fontWeight: '600',
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={styles.headerTitle}>Contract Details</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Client Name Header */}
      <View style={styles.clientNameHeader}>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.clientSubtitle}>
          {buildingProjects.length} {buildingProjects.length === 1 ? 'Building' : 'Buildings'} • {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
        </Text>
      </View>

      {/* Overall Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overallStats.totalProjects}</Text>
          <Text style={styles.statLabel}>Total Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {overallStats.activeProjects}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overallStats.includedProjects}</Text>
          <Text style={styles.statLabel}>Included</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overallStats.billableProjects}</Text>
          <Text style={styles.statLabel}>Billable</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ${overallStats.totalRevenue.toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Buildings and Projects List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {buildingProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No projects found for this client</Text>
          </View>
        ) : (
          buildingProjects.map((building) => (
            <AnimatedCard key={building.buildingName} style={styles.buildingCard}>
              <TouchableOpacity
                style={styles.buildingHeader}
                onPress={() => toggleBuilding(building.buildingName)}
                activeOpacity={0.7}
              >
                <View style={styles.buildingHeaderLeft}>
                  <Text style={styles.buildingName}>{building.buildingName}</Text>
                  <View style={styles.buildingStats}>
                    <View style={styles.buildingStatItem}>
                      <Icon name="briefcase" size={16} style={{ color: themeColor }} />
                      <Text style={styles.buildingStatText}>
                        <Text style={styles.buildingStatValue}>{building.totalProjects}</Text> Projects
                      </Text>
                    </View>

                    <View style={styles.buildingStatItem}>
                      <Icon name="checkmark-circle" size={16} style={{ color: colors.success }} />
                      <Text style={styles.buildingStatText}>
                        <Text style={styles.buildingStatValue}>{building.activeProjects}</Text> Active
                      </Text>
                    </View>

                    {building.totalRevenue > 0 && (
                      <View style={styles.buildingStatItem}>
                        <Icon name="cash" size={16} style={{ color: colors.success }} />
                        <Text style={styles.buildingStatText}>
                          <Text style={styles.buildingStatValue}>${building.totalRevenue.toFixed(2)}</Text>
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Icon
                  name={expandedBuilding === building.buildingName ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  style={styles.chevronIcon}
                />
              </TouchableOpacity>

              {expandedBuilding === building.buildingName && (
                <View style={styles.projectsList}>
                  {building.projects.map((project) => (
                    <View key={project.id} style={styles.projectCard}>
                      <View style={styles.projectHeader}>
                        <Text style={styles.projectName}>{project.project_name}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(project.status) + '20' },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                            {project.status}
                          </Text>
                        </View>
                      </View>

                      {project.description && (
                        <Text style={styles.projectDescription} numberOfLines={2}>
                          {project.description}
                        </Text>
                      )}

                      <View style={styles.projectDetails}>
                        {project.work_order_number && (
                          <View style={styles.detailItem}>
                            <Icon name="document-text" size={14} style={{ color: themeColor }} />
                            <Text style={styles.detailText}>WO: {project.work_order_number}</Text>
                          </View>
                        )}

                        {project.invoice_number && (
                          <View style={styles.detailItem}>
                            <Icon name="receipt" size={14} style={{ color: colors.warning }} />
                            <Text style={styles.detailText}>INV: {project.invoice_number}</Text>
                          </View>
                        )}

                        <View style={styles.detailItem}>
                          <Icon name="repeat" size={14} style={{ color: colors.textSecondary }} />
                          <Text style={styles.detailText}>{getFrequencyLabel(project.frequency)}</Text>
                        </View>
                      </View>

                      {/* Contract Details Section */}
                      <View style={styles.contractSection}>
                        <Text style={styles.contractTitle}>Contract Details:</Text>
                        <View style={styles.contractDetails}>
                          <View style={styles.contractDetailItem}>
                            <Icon
                              name={project.is_included_in_contract ? 'checkmark-circle' : 'cash'}
                              size={14}
                              style={{
                                color: project.is_included_in_contract ? colors.success : colors.warning,
                              }}
                            />
                            <Text style={styles.contractDetailLabel}>Billing:</Text>
                            <Text style={styles.contractDetailValue}>
                              {project.is_included_in_contract
                                ? 'Included in Contract'
                                : `$${project.billing_amount.toFixed(2)}`}
                            </Text>
                          </View>

                          <View style={styles.contractDetailItem}>
                            <Icon name="calendar" size={14} style={{ color: themeColor }} />
                            <Text style={styles.contractDetailLabel}>Frequency:</Text>
                            <Text style={styles.contractDetailValue}>
                              {getFrequencyLabel(project.frequency)}
                            </Text>
                          </View>

                          {project.next_scheduled_date && (
                            <View style={styles.contractDetailItem}>
                              <Icon name="time" size={14} style={{ color: colors.warning }} />
                              <Text style={styles.contractDetailLabel}>Next:</Text>
                              <Text style={styles.contractDetailValue}>
                                {formatDate(project.next_scheduled_date)}
                              </Text>
                            </View>
                          )}

                          {project.last_completed_date && (
                            <View style={styles.contractDetailItem}>
                              <Icon name="checkmark-done" size={14} style={{ color: colors.success }} />
                              <Text style={styles.contractDetailLabel}>Last:</Text>
                              <Text style={styles.contractDetailValue}>
                                {formatDate(project.last_completed_date)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {project.notes && (
                          <>
                            <View style={styles.sectionDivider} />
                            <Text style={styles.contractDetailLabel}>Notes:</Text>
                            <Text style={styles.contractDetailValue}>{project.notes}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
};

export default ContractDetailsScreen;
