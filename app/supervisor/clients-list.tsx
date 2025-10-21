
import { useClientData } from '../../hooks/useClientData';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Switch, Alert } from 'react-native';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useDatabase } from '../../hooks/useDatabase';
import CompanyLogo from '../../components/CompanyLogo';
import { supabase } from '../integrations/supabase/client';
import uuid from 'react-native-uuid';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import LoadingSpinner from '../../components/LoadingSpinner';

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

interface ClientWithProjects {
  clientName: string;
  buildingCount: number;
  projectCount: number;
  activeProjects: number;
  totalRevenue: number;
  buildings: string[];
}

interface Client {
  id: string;
  name: string;
  security_level: 'low' | 'medium' | 'high';
  security?: string;
  is_active: boolean;
  color?: string;
}

interface ClientFormData {
  name: string;
  security_level: 'low' | 'medium' | 'high';
  security: string;
  is_active: boolean;
  color: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  clientCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  clientName: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    color: colors.text,
    flex: 1,
  },
  clientActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clientInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: typography.tiny.fontSize,
    fontWeight: typography.tiny.fontWeight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.captionMedium.fontWeight,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.h4.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

const PREDEFINED_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export default function ClientsListScreen() {
  const { clients, clientBuildings, refreshData, isLoading } = useClientData();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    security_level: 'medium',
    security: '',
    is_active: true,
    color: '#3B82F6',
  });

  // Load projects from Supabase
  const loadProjects = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setLoadingProjects(true);
      console.log('🔄 Loading projects from Supabase...');

      const { data, error } = await supabase
        .from('client_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading projects:', error);
        throw error;
      }

      console.log(`✅ Loaded ${data?.length || 0} projects`);
      setProjects(data || []);
    } catch (error) {
      console.error('❌ Failed to load projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, [config.useSupabase, showToast]);

  // Load data on mount
  useEffect(() => {
    console.log('🔄 ClientsListScreen mounted, loading data...');
    loadProjects();
  }, [loadProjects]);

  // Aggregate client data with projects
  const clientsWithProjects = useMemo(() => {
    const aggregated: { [key: string]: ClientWithProjects } = {};

    clients.forEach(client => {
      if (!aggregated[client.name]) {
        aggregated[client.name] = {
          clientName: client.name,
          buildingCount: 0,
          projectCount: 0,
          activeProjects: 0,
          totalRevenue: 0,
          buildings: [],
        };
      }
    });

    clientBuildings.forEach(building => {
      if (aggregated[building.clientName]) {
        aggregated[building.clientName].buildingCount++;
        if (!aggregated[building.clientName].buildings.includes(building.buildingName)) {
          aggregated[building.clientName].buildings.push(building.buildingName);
        }
      }
    });

    projects.forEach(project => {
      if (aggregated[project.client_name]) {
        aggregated[project.client_name].projectCount++;
        if (project.status === 'active') {
          aggregated[project.client_name].activeProjects++;
        }
        aggregated[project.client_name].totalRevenue += project.billing_amount || 0;
      }
    });

    return Object.values(aggregated);
  }, [clients, clientBuildings, projects]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientsWithProjects;

    const query = searchQuery.toLowerCase();
    return clientsWithProjects.filter(client =>
      client.clientName.toLowerCase().includes(query)
    );
  }, [clientsWithProjects, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.isActive).length,
      totalBuildings: clientBuildings.length,
      totalProjects: projects.length,
    };
  }, [clients, clientBuildings, projects]);

  const handleClientPress = (clientName: string) => {
    router.push({
      pathname: '/supervisor/contract-details',
      params: { clientName },
    });
  };

  const handleAddClient = async () => {
    if (!formData.name.trim()) {
      showToast('Please enter a client name', 'error');
      return;
    }

    try {
      console.log('🔄 Adding new client:', formData.name);

      const newClient = {
        id: uuid.v4() as string,
        name: formData.name.trim(),
        security_level: formData.security_level,
        security: formData.security.trim() || null,
        is_active: formData.is_active,
        color: formData.color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('clients')
        .insert(newClient);

      if (error) {
        console.error('❌ Error adding client:', error);
        throw error;
      }

      console.log('✅ Client added successfully');
      showToast('Client added successfully', 'success');
      
      // Refresh data to show the new client
      await refreshData();
      
      setShowAddModal(false);
      setFormData({
        name: '',
        security_level: 'medium',
        security: '',
        is_active: true,
        color: '#3B82F6',
      });
    } catch (error) {
      console.error('❌ Failed to add client:', error);
      showToast('Failed to add client', 'error');
    }
  };

  const handleEditClient = async () => {
    if (!selectedClient || !formData.name.trim()) {
      showToast('Please enter a client name', 'error');
      return;
    }

    try {
      console.log('🔄 Updating client:', selectedClient.id);

      const updates = {
        name: formData.name.trim(),
        security_level: formData.security_level,
        security: formData.security.trim() || null,
        is_active: formData.is_active,
        color: formData.color,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', selectedClient.id);

      if (error) {
        console.error('❌ Error updating client:', error);
        throw error;
      }

      console.log('✅ Client updated successfully');
      showToast('Client updated successfully', 'success');
      
      // Refresh data to show the updated client
      await refreshData();
      
      setShowEditModal(false);
      setSelectedClient(null);
      setFormData({
        name: '',
        security_level: 'medium',
        security: '',
        is_active: true,
        color: '#3B82F6',
      });
    } catch (error) {
      console.error('❌ Failed to update client:', error);
      showToast('Failed to update client', 'error');
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${clientName}? This will also delete all associated buildings and projects.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting client:', clientId);

              // Delete associated buildings
              const { error: buildingsError } = await supabase
                .from('client_buildings')
                .delete()
                .eq('client_name', clientName);

              if (buildingsError) {
                console.error('❌ Error deleting buildings:', buildingsError);
              }

              // Delete associated projects
              const { error: projectsError } = await supabase
                .from('client_projects')
                .delete()
                .eq('client_name', clientName);

              if (projectsError) {
                console.error('❌ Error deleting projects:', projectsError);
              }

              // Delete client
              const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

              if (error) {
                console.error('❌ Error deleting client:', error);
                throw error;
              }

              console.log('✅ Client deleted successfully');
              showToast('Client deleted successfully', 'success');
              
              // Refresh data to remove the deleted client
              await refreshData();
              await loadProjects();
            } catch (error) {
              console.error('❌ Failed to delete client:', error);
              showToast('Failed to delete client', 'error');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (clientName: string) => {
    const client = clients.find(c => c.name === clientName);
    if (!client) return;

    setSelectedClient({
      id: client.id,
      name: client.name,
      security_level: client.securityLevel,
      security: client.security || '',
      is_active: client.isActive,
      color: client.color || '#3B82F6',
    });

    setFormData({
      name: client.name,
      security_level: client.securityLevel,
      security: client.security || '',
      is_active: client.isActive,
      color: client.color || '#3B82F6',
    });

    setShowEditModal(true);
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  if (isLoading || loadingProjects) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CompanyLogo />
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="add-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeClients}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalBuildings}</Text>
          <Text style={styles.statLabel}>Buildings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalProjects}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </Text>
          </View>
        ) : (
          filteredClients.map((client) => {
            const clientData = clients.find(c => c.name === client.clientName);
            return (
              <TouchableOpacity
                key={client.clientName}
                onPress={() => handleClientPress(client.clientName)}
              >
                <AnimatedCard style={styles.clientCard}>
                  <View style={styles.clientHeader}>
                    <Text style={styles.clientName}>{client.clientName}</Text>
                    <View style={styles.clientActions}>
                      <TouchableOpacity onPress={() => openEditModal(client.clientName)}>
                        <Icon name="create" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteClient(clientData?.id || '', client.clientName)}
                      >
                        <Icon name="trash" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.clientInfo}>
                    <View style={styles.infoItem}>
                      <Icon name="business" size={16} color={colors.textSecondary} />
                      <Text style={styles.infoText}>
                        {client.buildingCount} {client.buildingCount === 1 ? 'Building' : 'Buildings'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Icon name="folder" size={16} color={colors.textSecondary} />
                      <Text style={styles.infoText}>
                        {client.projectCount} {client.projectCount === 1 ? 'Project' : 'Projects'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Icon name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.infoText}>
                        {client.activeProjects} Active
                      </Text>
                    </View>
                    {clientData && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: getSecurityLevelColor(clientData.securityLevel) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: getSecurityLevelColor(clientData.securityLevel) },
                          ]}
                        >
                          {clientData.securityLevel.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </AnimatedCard>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Client Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Security Level</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          formData.security_level === level
                            ? colors.primary
                            : colors.background,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, security_level: level as any })
                    }
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            formData.security_level === level
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Security Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Enter security requirements..."
                placeholderTextColor={colors.textSecondary}
                value={formData.security}
                onChangeText={(text) => setFormData({ ...formData, security: text })}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorPicker}>
                {PREDEFINED_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value })
                }
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setFormData({
                    name: '',
                    security_level: 'medium',
                    security: '',
                    is_active: true,
                    color: '#3B82F6',
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Add Client"
                onPress={handleAddClient}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Client Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Client</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Security Level</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          formData.security_level === level
                            ? colors.primary
                            : colors.background,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, security_level: level as any })
                    }
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            formData.security_level === level
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Security Notes</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Enter security requirements..."
                placeholderTextColor={colors.textSecondary}
                value={formData.security}
                onChangeText={(text) => setFormData({ ...formData, security: text })}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorPicker}>
                {PREDEFINED_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      formData.color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, color })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Active</Text>
              <Switch
                value={formData.is_active}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_active: value })
                }
              />
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                  setFormData({
                    name: '',
                    security_level: 'medium',
                    security: '',
                    is_active: true,
                    color: '#3B82F6',
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleEditClient}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}
