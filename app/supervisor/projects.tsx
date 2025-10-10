
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useClientData } from '../../hooks/useClientData';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';

interface ClientProject {
  id: string;
  client_name: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date?: string;
  last_completed_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectCompletion {
  id: string;
  project_id: string;
  completed_date: string;
  completed_by?: string;
  hours_spent: number;
  notes?: string;
  photos_count: number;
  created_at?: string;
}

interface ProjectFormData {
  client_name: string;
  project_name: string;
  description: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: string;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date: string;
  notes: string;
}

const ProjectsScreen = () => {
  const { showToast } = useToast();
  const { executeQuery, config, syncStatus } = useDatabase();
  const { clients } = useClientData();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ClientProject | null>(null);
  const [projectCompletions, setProjectCompletions] = useState<ProjectCompletion[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled' | 'on-hold'>('all');
  const [filterBilling, setFilterBilling] = useState<'all' | 'included' | 'billable'>('all');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form states
  const [formData, setFormData] = useState<ProjectFormData>({
    client_name: '',
    project_name: '',
    description: '',
    frequency: 'monthly',
    is_included_in_contract: false,
    billing_amount: '0',
    status: 'active',
    next_scheduled_date: '',
    notes: '',
  });

  // Completion form states
  const [completionData, setCompletionData] = useState({
    completed_by: '',
    hours_spent: '',
    notes: '',
    photos_count: '0',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchQuery, filterStatus, filterBilling]);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('╔════════════════════════════════════════╗');
      console.log('║   LOADING PROJECTS                    ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Using Supabase:', config.useSupabase);
      console.log('Is Online:', syncStatus.isOnline);

      const result = await executeQuery<ClientProject>('select', 'client_projects');
      console.log('✓ Loaded projects:', result.length);
      setProjects(result);
    } catch (error) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   PROJECT LOAD FAILED                 ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, syncStatus.isOnline, executeQuery, showToast]);

  const loadProjectCompletions = useCallback(async (projectId: string) => {
    try {
      console.log('Loading completions for project:', projectId);

      const result = await executeQuery<ProjectCompletion>(
        'select',
        'project_completions',
        undefined,
        { project_id: projectId }
      );
      
      console.log(`✓ Loaded ${result.length} completions`);
      setProjectCompletions(result);
    } catch (error) {
      console.error('Error loading project completions:', error);
      showToast('Failed to load project history', 'error');
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

  const resetForm = useCallback(() => {
    setFormData({
      client_name: '',
      project_name: '',
      description: '',
      frequency: 'monthly',
      is_included_in_contract: false,
      billing_amount: '0',
      status: 'active',
      next_scheduled_date: '',
      notes: '',
    });
  }, []);

  // FIXED: Add project handler - using proper executeQuery API
  const handleAddProject = useCallback(async () => {
    try {
      if (!formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('╔════════════════════════════════════════╗');
      console.log('║   ADDING PROJECT                      ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Client:', formData.client_name);
      console.log('Project:', formData.project_name);

      const newProject: ClientProject = {
        id: `project-${Date.now()}`,
        client_name: formData.client_name,
        project_name: formData.project_name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        is_included_in_contract: formData.is_included_in_contract,
        billing_amount: parseFloat(formData.billing_amount) || 0,
        status: formData.status,
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Inserting project:', JSON.stringify(newProject, null, 2));

      // Use proper executeQuery API instead of raw SQL
      await executeQuery<ClientProject>('insert', 'client_projects', newProject);

      console.log('✓ Project added successfully');
      showToast('Project added successfully', 'success');
      
      // Reload projects to get fresh data
      await loadProjects();
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   PROJECT ADD FAILED                  ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast(`Failed to add project: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [formData, executeQuery, showToast, loadProjects, resetForm]);

  // FIXED: Update project handler - using proper executeQuery API
  const handleUpdateProject = useCallback(async () => {
    try {
      if (!selectedProject || !formData.client_name || !formData.project_name) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      console.log('╔════════════════════════════════════════╗');
      console.log('║   UPDATING PROJECT                    ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Project ID:', selectedProject.id);

      const updatedProject = {
        client_name: formData.client_name,
        project_name: formData.project_name,
        description: formData.description || undefined,
        frequency: formData.frequency,
        is_included_in_contract: formData.is_included_in_contract,
        billing_amount: parseFloat(formData.billing_amount) || 0,
        status: formData.status,
        next_scheduled_date: formData.next_scheduled_date || undefined,
        notes: formData.notes || undefined,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating with:', JSON.stringify(updatedProject, null, 2));

      // Use proper executeQuery API
      await executeQuery<ClientProject>(
        'update',
        'client_projects',
        updatedProject,
        { id: selectedProject.id }
      );

      console.log('✓ Project updated successfully');
      showToast('Project updated successfully', 'success');
      
      // Reload projects
      await loadProjects();
      
      setShowEditModal(false);
      setSelectedProject(null);
      resetForm();
    } catch (error: any) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   PROJECT UPDATE FAILED               ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast(`Failed to update project: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedProject, formData, executeQuery, showToast, loadProjects, resetForm]);

  // FIXED: Delete project handler - using proper executeQuery API
  const handleDeleteProject = useCallback(async (projectId: string) => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   DELETE PROJECT BUTTON PRESSED       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('Project ID:', projectId);
    
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            console.log('Delete cancelled by user');
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('╔════════════════════════════════════════╗');
              console.log('║   STARTING PROJECT DELETION           ║');
              console.log('╚════════════════════════════════════════╝');
              console.log('Target Project ID:', projectId);
              
              // Use proper executeQuery API
              await executeQuery<ClientProject>(
                'delete',
                'client_projects',
                undefined,
                { id: projectId }
              );
              
              console.log('✓ Database delete successful');
              
              // Update local state
              setProjects(currentProjects => {
                const updated = currentProjects.filter(p => p.id !== projectId);
                console.log('✓ State updated. Previous count:', currentProjects.length, 'New count:', updated.length);
                return updated;
              });
              
              showToast('Project deleted successfully', 'success');
              setShowDetailsModal(false);
              setSelectedProject(null);
              
              console.log('╔════════════════════════════════════════╗');
              console.log('║   DELETION COMPLETED SUCCESSFULLY     ║');
              console.log('╚════════════════════════════════════════╝');
            } catch (error: any) {
              console.error('╔════════════════════════════════════════╗');
              console.error('║   DELETION FAILED                     ║');
              console.error('╚════════════════════════════════════════╝');
              console.error('Error:', error);
              showToast(`Failed to delete project: ${error?.message || 'Unknown error'}`, 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [executeQuery, showToast]);

  // FIXED: Mark complete handler - using proper executeQuery API
  const handleMarkComplete = useCallback(async () => {
    try {
      if (!selectedProject) return;

      const completionId = `completion-${Date.now()}`;
      const completedDate = new Date().toISOString().split('T')[0];

      console.log('╔════════════════════════════════════════╗');
      console.log('║   MARKING PROJECT COMPLETE            ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Project ID:', selectedProject.id);

      // Add completion record
      const newCompletion: ProjectCompletion = {
        id: completionId,
        project_id: selectedProject.id,
        completed_date: completedDate,
        completed_by: completionData.completed_by || undefined,
        hours_spent: parseFloat(completionData.hours_spent) || 0,
        notes: completionData.notes || undefined,
        photos_count: parseInt(completionData.photos_count) || 0,
        created_at: new Date().toISOString(),
      };

      await executeQuery<ProjectCompletion>('insert', 'project_completions', newCompletion);

      // Update project's last completed date
      await executeQuery<ClientProject>(
        'update',
        'client_projects',
        { 
          last_completed_date: completedDate,
          updated_at: new Date().toISOString()
        },
        { id: selectedProject.id }
      );

      console.log('✓ Project marked as complete');
      showToast('Project marked as complete', 'success');
      
      // Reload projects
      await loadProjects();
      
      setShowCompletionModal(false);
      setCompletionData({
        completed_by: '',
        hours_spent: '',
        notes: '',
        photos_count: '0',
      });
    } catch (error: any) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   MARK COMPLETE FAILED                ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast(`Failed to mark project complete: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedProject, completionData, executeQuery, showToast, loadProjects]);

  const openEditModal = useCallback((project: ClientProject) => {
    setSelectedProject(project);
    setFormData({
      client_name: project.client_name,
      project_name: project.project_name,
      description: project.description || '',
      frequency: project.frequency,
      is_included_in_contract: project.is_included_in_contract,
      billing_amount: project.billing_amount.toString(),
      status: project.status,
      next_scheduled_date: project.next_scheduled_date || '',
      notes: project.notes || '',
    });
    setShowEditModal(true);
  }, []);

  const openDetailsModal = useCallback((project: ClientProject) => {
    setSelectedProject(project);
    loadProjectCompletions(project.id);
    setShowDetailsModal(true);
  }, [loadProjectCompletions]);

  const openCompletionModal = useCallback((project: ClientProject) => {
    setSelectedProject(project);
    setShowCompletionModal(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'completed':
        return colors.primary;
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Client Projects</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Icon name="add" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
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
            <Text style={styles.emptyStateText}>No projects found</Text>
            <Button text="Add Project" onPress={() => setShowAddModal(true)} variant="primary" />
          </View>
        ) : (
          filteredProjects.map((project) => (
            <AnimatedCard key={project.id} style={styles.projectCard}>
              <TouchableOpacity onPress={() => openDetailsModal(project)} activeOpacity={0.7}>
                <View style={styles.projectHeader}>
                  <View style={styles.projectTitleRow}>
                    <Text style={styles.projectName}>{project.project_name}</Text>
                    <View
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                        {project.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.clientName}>{project.client_name}</Text>
                </View>

                {project.description && (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                )}

                <View style={styles.projectDetails}>
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
                      <Icon name="calendar" size={16} style={{ color: colors.textSecondary }} />
                      <Text style={styles.detailText}>{formatDate(project.next_scheduled_date)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.projectActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openCompletionModal(project)}
                  >
                    <Icon name="checkmark-done" size={20} style={{ color: colors.success }} />
                    <Text style={[styles.actionButtonText, { color: colors.success }]}>Complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(project)}>
                    <Icon name="create" size={20} style={{ color: colors.primary }} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProject(project.id)}
                  >
                    <Icon name="trash" size={20} style={{ color: colors.danger }} />
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Project Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{showAddModal ? 'Add New Project' : 'Edit Project'}</Text>

              <Text style={styles.inputLabel}>Client *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[styles.inputText, !formData.client_name && styles.placeholderText]}>
                  {formData.client_name || 'Select client'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>

              {showClientDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {clients.map((client, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, client_name: client.name });
                          setShowClientDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{client.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Project Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Floor Polishing & Shine"
                value={formData.project_name}
                onChangeText={(text) => setFormData({ ...formData, project_name: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the project..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Frequency *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
              >
                <Text style={styles.inputText}>{getFrequencyLabel(formData.frequency)}</Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>

              {showFrequencyDropdown && (
                <View style={styles.dropdown}>
                  {['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'].map((freq, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData({ ...formData, frequency: freq as any });
                        setShowFrequencyDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>{getFrequencyLabel(freq)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Included in Contract</Text>
                <TouchableOpacity
                  style={[
                    styles.switch,
                    formData.is_included_in_contract && styles.switchActive,
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      is_included_in_contract: !formData.is_included_in_contract,
                    })
                  }
                >
                  <View
                    style={[
                      styles.switchThumb,
                      formData.is_included_in_contract && styles.switchThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {!formData.is_included_in_contract && (
                <>
                  <Text style={styles.inputLabel}>Billing Amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={formData.billing_amount}
                    onChangeText={(text) => setFormData({ ...formData, billing_amount: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Status</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
              >
                <Text style={styles.inputText}>
                  {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>

              {showStatusDropdown && (
                <View style={styles.dropdown}>
                  {['active', 'completed', 'cancelled', 'on-hold'].map((status, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setFormData({ ...formData, status: status as any });
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Next Scheduled Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.next_scheduled_date}
                onChangeText={(text) => setFormData({ ...formData, next_scheduled_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.modalActions}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  text={showAddModal ? 'Add Project' : 'Save Changes'}
                  onPress={showAddModal ? handleAddProject : handleUpdateProject}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Project Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedProject && (
                <>
                  <Text style={styles.modalTitle}>{selectedProject.project_name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedProject.client_name}</Text>

                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(selectedProject.status) + '20' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: getStatusColor(selectedProject.status) }]}>
                          {selectedProject.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Frequency:</Text>
                      <Text style={styles.detailValue}>{getFrequencyLabel(selectedProject.frequency)}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Billing:</Text>
                      <Text style={styles.detailValue}>
                        {selectedProject.is_included_in_contract
                          ? 'Included in Contract'
                          : `$${selectedProject.billing_amount.toFixed(2)}`}
                      </Text>
                    </View>

                    {selectedProject.next_scheduled_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Next Scheduled:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedProject.next_scheduled_date)}
                        </Text>
                      </View>
                    )}

                    {selectedProject.last_completed_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last Completed:</Text>
                        <Text style={styles.detailValue}>
                          {formatDate(selectedProject.last_completed_date)}
                        </Text>
                      </View>
                    )}

                    {selectedProject.description && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={styles.detailValue}>{selectedProject.description}</Text>
                      </View>
                    )}

                    {selectedProject.notes && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Notes:</Text>
                        <Text style={styles.detailValue}>{selectedProject.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Completion History */}
                  {projectCompletions.length > 0 && (
                    <View style={styles.historySection}>
                      <Text style={styles.sectionTitle}>Completion History</Text>
                      {projectCompletions.map((completion) => (
                        <View key={completion.id} style={styles.historyItem}>
                          <View style={styles.historyHeader}>
                            <Text style={styles.historyDate}>{formatDate(completion.completed_date)}</Text>
                            {completion.completed_by && (
                              <Text style={styles.historyBy}>by {completion.completed_by}</Text>
                            )}
                          </View>
                          {completion.hours_spent > 0 && (
                            <Text style={styles.historyDetail}>Hours: {completion.hours_spent}</Text>
                          )}
                          {completion.photos_count > 0 && (
                            <Text style={styles.historyDetail}>Photos: {completion.photos_count}</Text>
                          )}
                          {completion.notes && (
                            <Text style={styles.historyNotes}>{completion.notes}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <Button
                      text="Close"
                      onPress={() => setShowDetailsModal(false)}
                      variant="secondary"
                      style={styles.modalButton}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mark Complete Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Mark Project Complete</Text>
              {selectedProject && (
                <Text style={styles.modalSubtitle}>{selectedProject.project_name}</Text>
              )}

              <Text style={styles.inputLabel}>Completed By</Text>
              <TextInput
                style={styles.input}
                placeholder="Cleaner name"
                value={completionData.completed_by}
                onChangeText={(text) => setCompletionData({ ...completionData, completed_by: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Hours Spent</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={completionData.hours_spent}
                onChangeText={(text) => setCompletionData({ ...completionData, hours_spent: text })}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Photos Count</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={completionData.photos_count}
                onChangeText={(text) => setCompletionData({ ...completionData, photos_count: text })}
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Completion notes..."
                value={completionData.notes}
                onChangeText={(text) => setCompletionData({ ...completionData, notes: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.modalActions}>
                <Button
                  text="Cancel"
                  onPress={() => setShowCompletionModal(false)}
                  variant="secondary"
                  style={styles.modalButton}
                />
                <Button
                  text="Mark Complete"
                  onPress={handleMarkComplete}
                  variant="primary"
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
};

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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    color: colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    ...commonStyles.shadow,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownText: {
    ...typography.body,
    color: colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.success,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  detailsSection: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
  historySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  historyItem: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyDate: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  historyBy: {
    ...typography.small,
    color: colors.textSecondary,
  },
  historyDetail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyNotes: {
    ...typography.small,
    color: colors.text,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default ProjectsScreen;
