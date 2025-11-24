
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useClientData } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
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
  client_status?: string;
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  work_order_number?: string;
  invoice_number?: string;
  is_recurring?: boolean;
  created_at?: string;
  updated_at?: string;
}

const ProjectsScreen = () => {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery } = useDatabase();
  const { clients } = useClientData();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'on-hold'>('all');
  const [filterBilling, setFilterBilling] = useState<'all' | 'included' | 'billable'>('all');

  // Load projects from database
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading projects...');

      const result = await executeQuery<ClientProject>('select', 'client_projects');
      console.log('✓ Loaded projects:', result.length);
      
      setProjects(result);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [executeQuery, showToast]);

  const applyFilters = useCallback(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.project_name.toLowerCase().includes(query) ||
          project.client_name.toLowerCase().includes(query) ||
          (project.description && project.description.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((project) => project.status === filterStatus);
    }

    // Billing filter
    if (filterBilling === 'included') {
      filtered = filtered.filter((project) => project.is_included_in_contract);
    } else if (filterBilling === 'billable') {
      filtered = filtered.filter((project) => !project.is_included_in_contract);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, filterStatus, filterBilling]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting project...');
              
              // Delete related resources
              await executeQuery('delete', 'project_labor', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_equipment', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_vehicles', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_supplies', undefined, { project_id: projectId });
              await executeQuery('delete', 'project_completions', undefined, { project_id: projectId });
              
              await executeQuery<ClientProject>(
                'delete',
                'client_projects',
                undefined,
                { id: projectId }
              );
              
              console.log('✓ Project deleted successfully');
              showToast('Project deleted successfully', 'success');
              
              await loadProjects();
            } catch (error: any) {
              console.error('Error deleting project:', error);
              showToast(`Failed to delete project: ${error?.message || 'Unknown error'}`, 'error');
            }
          },
        },
      ]
    );
  }, [executeQuery, showToast, loadProjects]);

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

  if (isLoading) {
    return <LoadingSpinner message="Loading projects..." />;
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
    filtersContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    searchIcon: {
      color: colors.textSecondary,
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: themeColor,
      borderColor: themeColor,
    },
    filterChipText: {
      ...typography.small,
      color: colors.text,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: colors.background,
      fontWeight: '600',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statCard: {
      flex: 1,
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
    projectCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    projectHeader: {
      marginBottom: spacing.sm,
    },
    projectTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    projectName: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    clientName: {
      ...typography.body,
      color: colors.textSecondary,
    },
    projectDescription: {
      ...typography.body,
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
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusText: {
      ...typography.small,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    projectActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    actionButtonText: {
      ...typography.small,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton 
          icon="arrow-back" 
          onPress={() => router.back()} 
          variant="white"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Client Projects</Text>
        </View>
        <IconButton
          icon="add"
          onPress={() => {
            console.log('Add button pressed - Feature coming soon!');
            showToast('Add project feature coming soon!', 'info');
          }}
          variant="white"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus !== 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
          >
            <Text style={[styles.filterChipText, filterStatus !== 'all' && styles.filterChipTextActive]}>
              {filterStatus === 'all' ? 'All Status' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterBilling !== 'all' && styles.filterChipActive]}
            onPress={() => {
              if (filterBilling === 'all') setFilterBilling('included');
              else if (filterBilling === 'included') setFilterBilling('billable');
              else setFilterBilling('all');
            }}
          >
            <Text style={[styles.filterChipText, filterBilling !== 'all' && styles.filterChipTextActive]}>
              {filterBilling === 'all' ? 'All Projects' : filterBilling === 'included' ? 'Included' : 'Billable'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => p.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => p.is_included_in_contract).length}</Text>
          <Text style={styles.statLabel}>Included</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{projects.filter((p) => !p.is_included_in_contract).length}</Text>
          <Text style={styles.statLabel}>Billable</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ${projects.filter((p) => !p.is_included_in_contract).reduce((sum, p) => sum + p.billing_amount, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Projects List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>
              {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
            </Text>
            <Button 
              text="Add Your First Project" 
              onPress={() => showToast('Add project feature coming soon!', 'info')} 
              variant="primary" 
            />
          </View>
        ) : (
          filteredProjects.map((project) => (
            <AnimatedCard key={project.id} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <View style={styles.projectTitleRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    {project.is_recurring && (
                      <Icon name="repeat" size={20} style={{ color: themeColor }} />
                    )}
                    <Text style={[styles.projectName, { flex: 1 }]}>{project.project_name}</Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                      {project.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.clientName}>
                  {project.client_name}
                  {project.building_name && ` • ${project.building_name}`}
                </Text>
              </View>

              {project.description && (
                <Text style={styles.projectDescription} numberOfLines={2}>
                  {project.description}
                </Text>
              )}

              <View style={styles.projectDetails}>
                {project.work_order_number && (
                  <View style={styles.detailItem}>
                    <Icon name="document-text" size={16} style={{ color: themeColor }} />
                    <Text style={styles.detailText}>WO: {project.work_order_number}</Text>
                  </View>
                )}

                {project.invoice_number && (
                  <View style={styles.detailItem}>
                    <Icon name="receipt" size={16} style={{ color: colors.warning }} />
                    <Text style={styles.detailText}>INV: {project.invoice_number}</Text>
                  </View>
                )}

                <View style={styles.detailItem}>
                  <Icon name="repeat" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>{getFrequencyLabel(project.frequency)}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Icon
                    name={project.is_included_in_contract ? 'checkmark-circle' : 'cash'}
                    size={16}
                    style={{
                      color: project.is_included_in_contract ? colors.success : colors.warning,
                    }}
                  />
                  <Text style={styles.detailText}>
                    {project.is_included_in_contract ? 'Included' : `$${project.billing_amount.toFixed(2)}`}
                  </Text>
                </View>
                
                {project.next_scheduled_date && (
                  <View style={styles.detailItem}>
                    <Icon name="calendar" size={16} style={{ color: themeColor }} />
                    <Text style={styles.detailText}>{formatDate(project.next_scheduled_date)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.projectActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => showToast('Mark complete feature coming soon!', 'info')}
                >
                  <Icon name="checkmark-done" size={20} style={{ color: colors.success }} />
                  <Text style={[styles.actionButtonText, { color: colors.success }]}>Complete</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => showToast('Edit feature coming soon!', 'info')}
                >
                  <Icon name="create" size={20} style={{ color: colors.warning }} />
                  <Text style={[styles.actionButtonText, { color: colors.warning }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleDeleteProject(project.id)}
                >
                  <Icon name="trash" size={20} style={{ color: colors.danger }} />
                  <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast />
    </View>
  );
};

export default ProjectsScreen;
