
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
import ProjectModal from '../../components/ProjectModal';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import uuid from 'react-native-uuid';

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
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | undefined>(undefined);

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

  const handleAddProject = useCallback(() => {
    setSelectedProject(undefined);
    setShowProjectModal(true);
  }, []);

  const handleEditProject = useCallback((project: ClientProject) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  }, []);

  const handleSaveProject = useCallback(async (project: ClientProject) => {
    try {
      if (selectedProject?.id) {
        // Update existing project
        console.log('Updating project...');
        await executeQuery(
          'update',
          'client_projects',
          {
            client_name: project.client_name,
            building_name: project.building_name || null,
            project_name: project.project_name,
            description: project.description || null,
            frequency: project.frequency,
            is_included_in_contract: project.is_included_in_contract,
            billing_amount: project.billing_amount,
            status: project.status,
            next_scheduled_date: project.next_scheduled_date || null,
            notes: project.notes || null,
            work_order_number: project.work_order_number || null,
            invoice_number: project.invoice_number || null,
            is_recurring: project.is_recurring,
            updated_at: new Date().toISOString(),
          },
          { id: selectedProject.id }
        );
        console.log('✓ Project updated successfully');
        showToast('Project updated successfully', 'success');
      } else {
        // Create new project
        console.log('Creating new project...');
        const newProject = {
          id: uuid.v4() as string,
          client_name: project.client_name,
          building_name: project.building_name || null,
          project_name: project.project_name,
          description: project.description || null,
          frequency: project.frequency,
          is_included_in_contract: project.is_included_in_contract,
          billing_amount: project.billing_amount,
          status: project.status,
          next_scheduled_date: project.next_scheduled_date || null,
          notes: project.notes || null,
          work_order_number: project.work_order_number || null,
          invoice_number: project.invoice_number || null,
          is_recurring: project.is_recurring,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await executeQuery('insert', 'client_projects', newProject);
        console.log('✓ Project created successfully');
        showToast('Project created successfully', 'success');
      }

      await loadProjects();
      setShowProjectModal(false);
      setSelectedProject(undefined);
    } catch (error: any) {
      console.error('Error saving project:', error);
      showToast(`Failed to save project: ${error?.message || 'Unknown error'}`, 'error');
      throw error;
    }
  }, [selectedProject, executeQuery, showToast, loadProjects]);

  const handleCompleteProject = useCallback(async (project: ClientProject) => {
    Alert.alert(
      'Complete Project',
      `Mark "${project.project_name}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            try {
              console.log('Marking project as completed...');

              await executeQuery(
                'update',
                'client_projects',
                {
                  status: 'completed',
                  last_completed_date: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                { id: project.id }
              );

              console.log('✓ Project marked as completed');
              showToast('Project marked as completed', 'success');

              await loadProjects();
            } catch (error: any) {
              console.error('Error completing project:', error);
              showToast(`Failed to complete project: ${error?.message || 'Unknown error'}`, 'error');
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
      backgroundColor: '#F5F7FA',
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      backgroundColor: themeColor,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      ...commonStyles.shadow,
      elevation: 8,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      marginTop: spacing.xs,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
      ...commonStyles.shadow,
      elevation: 2,
    },
    searchIcon: {
      color: themeColor,
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    filtersContainer: {
      marginTop: -spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    filterScrollView: {
      flexGrow: 0,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#E0E6ED',
      ...commonStyles.shadow,
      elevation: 2,
    },
    filterChipActive: {
      backgroundColor: themeColor,
      borderColor: themeColor,
      elevation: 4,
    },
    filterChipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: spacing.md,
      alignItems: 'center',
      ...commonStyles.shadow,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: themeColor,
    },
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: themeColor + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    statValue: {
      fontSize: 24,
      color: colors.text,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 80,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    emptyStateIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: themeColor + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyStateText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    projectCard: {
      marginBottom: spacing.md,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      overflow: 'hidden',
      ...commonStyles.shadow,
      elevation: 4,
    },
    projectCardHeader: {
      padding: spacing.md,
      backgroundColor: themeColor + '08',
      borderLeftWidth: 4,
      borderLeftColor: themeColor,
    },
    projectTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    projectNameContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    projectName: {
      fontSize: 18,
      color: colors.text,
      fontWeight: '700',
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    clientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    clientName: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    projectBody: {
      padding: spacing.md,
    },
    projectDescription: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    detailsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      backgroundColor: '#F5F7FA',
      borderWidth: 1,
      borderColor: '#E0E6ED',
    },
    detailChipIcon: {
      opacity: 0.7,
    },
    detailChipText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    projectFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#F0F3F7',
      backgroundColor: '#FAFBFC',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRightWidth: 1,
      borderRightColor: '#F0F3F7',
    },
    actionButtonLast: {
      borderRightWidth: 0,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fab: {
      position: 'absolute',
      right: spacing.lg,
      bottom: spacing.xl,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: themeColor,
      alignItems: 'center',
      justifyContent: 'center',
      ...commonStyles.shadow,
      elevation: 8,
      shadowColor: themeColor,
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="white"
          />
          <View style={styles.headerTitleContainer}>
            <Icon name="briefcase" size={32} style={{ color: '#FFFFFF' }} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View>
          <Text style={styles.headerTitle}>Client Projects</Text>
          <Text style={styles.headerSubtitle}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} • {projects.filter(p => p.status === 'active').length} active
          </Text>
        </View>

        {/* Search Bar in Header */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={22} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollView}
        >
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
                All Status
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'active' && styles.filterChipActive]}
              onPress={() => setFilterStatus('active')}
            >
              <Text style={[styles.filterChipText, filterStatus === 'active' && styles.filterChipTextActive]}>
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
              onPress={() => setFilterStatus('completed')}
            >
              <Text style={[styles.filterChipText, filterStatus === 'completed' && styles.filterChipTextActive]}>
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterBilling === 'included' && styles.filterChipActive]}
              onPress={() => setFilterBilling('included')}
            >
              <Text style={[styles.filterChipText, filterBilling === 'included' && styles.filterChipTextActive]}>
                Included
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterBilling === 'billable' && styles.filterChipActive]}
              onPress={() => setFilterBilling('billable')}
            >
              <Text style={[styles.filterChipText, filterBilling === 'billable' && styles.filterChipTextActive]}>
                Billable
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Enhanced Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="checkmark-circle" size={24} style={{ color: themeColor }} />
          </View>
          <Text style={styles.statValue}>{projects.filter((p) => p.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="documents" size={24} style={{ color: themeColor }} />
          </View>
          <Text style={styles.statValue}>{projects.filter((p) => p.is_included_in_contract).length}</Text>
          <Text style={styles.statLabel}>Included</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Icon name="cash" size={24} style={{ color: themeColor }} />
          </View>
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
            <View style={styles.emptyStateIconContainer}>
              <Icon name="folder-open-outline" size={64} style={{ color: themeColor }} />
            </View>
            <Text style={styles.emptyStateText}>
              {projects.length === 0 ? 'No Projects Yet' : 'No Matching Projects'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {projects.length === 0
                ? 'Start by creating your first project to track work orders and billing'
                : 'Try adjusting your filters to find what you\'re looking for'}
            </Text>
            {projects.length === 0 && (
              <Button
                text="Create First Project"
                onPress={handleAddProject}
                variant="primary"
              />
            )}
          </View>
        ) : (
          <>
            {filteredProjects.length > 0 && (
              <Text style={styles.sectionTitle}>
                {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
              </Text>
            )}
            {filteredProjects.map((project) => (
              <AnimatedCard key={project.id} style={styles.projectCard}>
                {/* Card Header */}
                <View style={styles.projectCardHeader}>
                  <View style={styles.projectTitleRow}>
                    <View style={styles.projectNameContainer}>
                      {project.is_recurring && (
                        <Icon name="repeat" size={22} style={{ color: themeColor }} />
                      )}
                      <Text style={styles.projectName}>{project.project_name}</Text>
                    </View>
                    <View
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                        {project.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.clientRow}>
                    <Icon name="business" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.clientName}>
                      {project.client_name}
                      {project.building_name && ` • ${project.building_name}`}
                    </Text>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.projectBody}>
                  {project.description && (
                    <Text style={styles.projectDescription} numberOfLines={2}>
                      {project.description}
                    </Text>
                  )}

                  <View style={styles.detailsGrid}>
                    {project.work_order_number && (
                      <View style={styles.detailChip}>
                        <Icon name="document-text" size={16} style={[{ color: themeColor }, styles.detailChipIcon]} />
                        <Text style={styles.detailChipText}>WO: {project.work_order_number}</Text>
                      </View>
                    )}

                    {project.invoice_number && (
                      <View style={styles.detailChip}>
                        <Icon name="receipt" size={16} style={[{ color: colors.warning }, styles.detailChipIcon]} />
                        <Text style={styles.detailChipText}>INV: {project.invoice_number}</Text>
                      </View>
                    )}

                    <View style={styles.detailChip}>
                      <Icon name="time" size={16} style={[{ color: colors.textSecondary }, styles.detailChipIcon]} />
                      <Text style={styles.detailChipText}>{getFrequencyLabel(project.frequency)}</Text>
                    </View>

                    <View style={[styles.detailChip, {
                      backgroundColor: project.is_included_in_contract ? colors.success + '15' : colors.warning + '15',
                      borderColor: project.is_included_in_contract ? colors.success + '30' : colors.warning + '30'
                    }]}>
                      <Icon
                        name={project.is_included_in_contract ? 'checkmark-circle' : 'cash'}
                        size={16}
                        style={{
                          color: project.is_included_in_contract ? colors.success : colors.warning,
                        }}
                      />
                      <Text style={[styles.detailChipText, {
                        color: project.is_included_in_contract ? colors.success : colors.warning,
                        fontWeight: '700',
                      }]}>
                        {project.is_included_in_contract ? 'Included' : `$${project.billing_amount.toFixed(2)}`}
                      </Text>
                    </View>

                    {project.next_scheduled_date && (
                      <View style={styles.detailChip}>
                        <Icon name="calendar" size={16} style={[{ color: themeColor }, styles.detailChipIcon]} />
                        <Text style={styles.detailChipText}>{formatDate(project.next_scheduled_date)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Card Footer - Action Buttons */}
                <View style={styles.projectFooter}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCompleteProject(project)}
                  >
                    <Icon name="checkmark-done" size={18} style={{ color: colors.success }} />
                    <Text style={[styles.actionButtonText, { color: colors.success }]}>Complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditProject(project)}
                  >
                    <Icon name="create" size={18} style={{ color: colors.warning }} />
                    <Text style={[styles.actionButtonText, { color: colors.warning }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonLast]}
                    onPress={() => handleDeleteProject(project.id)}
                  >
                    <Icon name="trash" size={18} style={{ color: colors.danger }} />
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </AnimatedCard>
            ))}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddProject}>
        <Icon name="add" size={32} style={{ color: '#FFFFFF' }} />
      </TouchableOpacity>

      <ProjectModal
        visible={showProjectModal}
        onClose={() => {
          setShowProjectModal(false);
          setSelectedProject(undefined);
        }}
        onSave={handleSaveProject}
        project={selectedProject}
        clients={clients}
        themeColor={themeColor}
      />

      <Toast />
    </View>
  );
};

export default ProjectsScreen;
