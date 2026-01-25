
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
import { enhancedStyles } from '../../styles/enhancedStyles';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import BuildingGroupsModal from '../../components/BuildingGroupsModal';

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

interface BuildingFormData {
  building_name: string;
  security_level: 'low' | 'medium' | 'high';
  security: string;
  address: string;
}

const styles = StyleSheet.create({
  clientCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buildingsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F7',
  },
  buildingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buildingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  buildingName: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  buildingActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buildingActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    gap: spacing.xs,
  },
  buildingActionButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
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
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
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
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { config } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showEditBuildingModal, setShowEditBuildingModal] = useState(false);
  const [showBuildingGroupsModal, setShowBuildingGroupsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientForBuilding, setSelectedClientForBuilding] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<{ id: string; clientName: string } | null>(null);
  const [selectedClientForGroups, setSelectedClientForGroups] = useState<string>('');
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    security_level: 'medium',
    security: '',
    is_active: true,
    color: '#3B82F6',
  });

  const [buildingFormData, setBuildingFormData] = useState<BuildingFormData>({
    building_name: '',
    security_level: 'medium',
    security: '',
    address: '',
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

  const toggleClientExpansion = (clientName: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  };

  const handleClientPress = (clientName: string) => {
    router.push({
      pathname: '/supervisor/contract-details',
      params: { clientName },
    });
  };

  const handleBuildingPress = (buildingId: string, buildingName: string) => {
    console.log('🔄 Navigating to building detail:', { buildingId, buildingName });
    try {
      router.push(`/supervisor/building-detail?buildingId=${buildingId}`);
      console.log('✅ Navigation initiated successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      showToast('Failed to open building details', 'error');
    }
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

  const openAddBuildingModal = (clientName: string) => {
    setSelectedClientForBuilding(clientName);
    setBuildingFormData({
      building_name: '',
      security_level: 'medium',
      security: '',
      address: '',
    });
    setShowAddBuildingModal(true);
  };

  const openBuildingGroupsModal = (clientName: string) => {
    setSelectedClientForGroups(clientName);
    setShowBuildingGroupsModal(true);
  };

  const handleAddBuilding = async () => {
    if (!buildingFormData.building_name.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    if (!selectedClientForBuilding) {
      showToast('Please select a client', 'error');
      return;
    }

    try {
      console.log('🔄 Adding new building:', buildingFormData.building_name);

      const newBuilding = {
        id: uuid.v4() as string,
        client_name: selectedClientForBuilding,
        building_name: buildingFormData.building_name.trim(),
        security_level: buildingFormData.security_level,
        security: buildingFormData.security.trim() || null,
        address: buildingFormData.address.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('client_buildings')
        .insert(newBuilding);

      if (error) {
        console.error('❌ Error adding building:', error);
        throw error;
      }

      console.log('✅ Building added successfully');
      showToast('Building added successfully', 'success');
      
      // Refresh data to show the new building
      await refreshData();
      
      setShowAddBuildingModal(false);
      setSelectedClientForBuilding('');
      setBuildingFormData({
        building_name: '',
        security_level: 'medium',
        security: '',
        address: '',
      });
    } catch (error) {
      console.error('❌ Failed to add building:', error);
      showToast('Failed to add building', 'error');
    }
  };

  const openEditBuildingModal = (building: any) => {
    setSelectedBuilding({ id: building.id, clientName: building.clientName });
    setBuildingFormData({
      building_name: building.buildingName,
      security_level: building.securityLevel || 'medium',
      security: building.security || '',
      address: building.address || '',
    });
    setShowEditBuildingModal(true);
  };

  const handleEditBuilding = async () => {
    if (!buildingFormData.building_name.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    if (!selectedBuilding) {
      showToast('No building selected', 'error');
      return;
    }

    try {
      console.log('🔄 Updating building:', selectedBuilding.id);

      const updates = {
        building_name: buildingFormData.building_name.trim(),
        security_level: buildingFormData.security_level,
        security: buildingFormData.security.trim() || null,
        address: buildingFormData.address.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('client_buildings')
        .update(updates)
        .eq('id', selectedBuilding.id);

      if (error) {
        console.error('❌ Error updating building:', error);
        throw error;
      }

      console.log('✅ Building updated successfully');
      showToast('Building updated successfully', 'success');

      await refreshData();

      setShowEditBuildingModal(false);
      setSelectedBuilding(null);
      setBuildingFormData({
        building_name: '',
        security_level: 'medium',
        security: '',
        address: '',
      });
    } catch (error) {
      console.error('❌ Failed to update building:', error);
      showToast('Failed to update building', 'error');
    }
  };

  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;

    Alert.alert(
      'Delete Building',
      `Are you sure you want to delete "${buildingFormData.building_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting building:', selectedBuilding.id);

              const { error } = await supabase
                .from('client_buildings')
                .delete()
                .eq('id', selectedBuilding.id);

              if (error) {
                console.error('❌ Error deleting building:', error);
                throw error;
              }

              console.log('✅ Building deleted successfully');
              showToast('Building deleted successfully', 'success');

              await refreshData();

              setShowEditBuildingModal(false);
              setSelectedBuilding(null);
              setBuildingFormData({
                building_name: '',
                security_level: 'medium',
                security: '',
                address: '',
              });
            } catch (error) {
              console.error('❌ Failed to delete building:', error);
              showToast('Failed to delete building', 'error');
            }
          },
        },
      ]
    );
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
    <View style={enhancedStyles.screenContainer}>
      {/* Modern Header */}
      <View style={[enhancedStyles.modernHeader, { backgroundColor: themeColor }]}>
        <View style={enhancedStyles.headerTop}>
          <IconButton icon="arrow-back" onPress={() => router.back()} variant="white" />
          <View style={enhancedStyles.headerTitleContainer}>
            <Icon name="people" size={32} style={{ color: '#FFFFFF' }} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View>
          <Text style={enhancedStyles.headerTitle}>Clients</Text>
          <Text style={enhancedStyles.headerSubtitle}>
            {stats.activeClients} active · {stats.totalBuildings} buildings · {stats.totalProjects} projects
          </Text>
        </View>

        {/* Search in header */}
        <View style={enhancedStyles.searchContainer}>
          <Icon name="search" size={22} style={{ color: themeColor }} />
          <TextInput
            style={enhancedStyles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={enhancedStyles.statsContainer}>
        <View style={[enhancedStyles.statCard, { borderLeftColor: themeColor }]}>
          <View style={[enhancedStyles.statIconContainer, { backgroundColor: themeColor + '15' }]}>
            <Icon name="people" size={24} style={{ color: themeColor }} />
          </View>
          <Text style={enhancedStyles.statValue}>{stats.totalClients}</Text>
          <Text style={enhancedStyles.statLabel}>Total</Text>
        </View>
        <View style={[enhancedStyles.statCard, { borderLeftColor: colors.success }]}>
          <View style={[enhancedStyles.statIconContainer, { backgroundColor: colors.success + '15' }]}>
            <Icon name="checkmark-circle" size={24} style={{ color: colors.success }} />
          </View>
          <Text style={enhancedStyles.statValue}>{stats.activeClients}</Text>
          <Text style={enhancedStyles.statLabel}>Active</Text>
        </View>
        <View style={[enhancedStyles.statCard, { borderLeftColor: '#8B5CF6' }]}>
          <View style={[enhancedStyles.statIconContainer, { backgroundColor: '#8B5CF615' }]}>
            <Icon name="business" size={24} style={{ color: '#8B5CF6' }} />
          </View>
          <Text style={enhancedStyles.statValue}>{stats.totalBuildings}</Text>
          <Text style={enhancedStyles.statLabel}>Buildings</Text>
        </View>
        <View style={[enhancedStyles.statCard, { borderLeftColor: '#F59E0B' }]}>
          <View style={[enhancedStyles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
            <Icon name="folder" size={24} style={{ color: '#F59E0B' }} />
          </View>
          <Text style={enhancedStyles.statValue}>{stats.totalProjects}</Text>
          <Text style={enhancedStyles.statLabel}>Projects</Text>
        </View>
      </View>

      <ScrollView style={enhancedStyles.scrollContainer}>
        {filteredClients.length === 0 ? (
          <View style={enhancedStyles.emptyState}>
            <View style={[enhancedStyles.emptyStateIconContainer, { backgroundColor: themeColor + '10' }]}>
              <Icon name="business" size={64} style={{ color: themeColor }} />
            </View>
            <Text style={enhancedStyles.emptyStateText}>
              {searchQuery ? 'No Clients Found' : 'No Clients Yet'}
            </Text>
            <Text style={enhancedStyles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add your first client to get started'}
            </Text>
            {!searchQuery && (
              <Button text="Add Client" onPress={() => setShowAddModal(true)} variant="primary" />
            )}
          </View>
        ) : (
          filteredClients.map((client) => {
            const clientData = clients.find(c => c.name === client.clientName);
            const isExpanded = expandedClients.has(client.clientName);
            const clientBuildingsList = clientBuildings.filter(b => b.clientName === client.clientName);
            const statusColor = clientData?.isActive ? colors.success : colors.textSecondary;

            return (
              <AnimatedCard key={client.clientName} style={enhancedStyles.modernCard}>
                {/* Card Header */}
                <TouchableOpacity onPress={() => handleClientPress(client.clientName)}>
                  <View style={[enhancedStyles.cardHeader, {
                    backgroundColor: themeColor + '08',
                    borderLeftColor: themeColor
                  }]}>
                    <View style={styles.clientCardTitleRow}>
                      <Text style={enhancedStyles.titleText}>{client.clientName}</Text>
                      <View style={styles.clientActions}>
                        <TouchableOpacity onPress={() => openEditModal(client.clientName)}>
                          <Icon name="create" size={20} color={themeColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteClient(clientData?.id || '', client.clientName)}
                        >
                          <Icon name="trash" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={enhancedStyles.cardBody}>
                    <View style={enhancedStyles.detailsGrid}>
                      <View style={enhancedStyles.detailChip}>
                        <Icon name="business" size={16} style={{ color: themeColor }} />
                        <Text style={enhancedStyles.detailChipText}>
                          {client.buildingCount} {client.buildingCount === 1 ? 'Building' : 'Buildings'}
                        </Text>
                      </View>
                      <View style={enhancedStyles.detailChip}>
                        <Icon name="folder" size={16} style={{ color: themeColor }} />
                        <Text style={enhancedStyles.detailChipText}>
                          {client.projectCount} {client.projectCount === 1 ? 'Project' : 'Projects'}
                        </Text>
                      </View>
                      <View style={enhancedStyles.detailChip}>
                        <Icon name="checkmark-circle" size={16} style={{ color: colors.success }} />
                        <Text style={enhancedStyles.detailChipText}>
                          {client.activeProjects} Active
                        </Text>
                      </View>
                      {clientData && (
                        <View style={[enhancedStyles.statusBadgeModern, {
                          backgroundColor: getSecurityLevelColor(clientData.securityLevel) + '20'
                        }]}>
                          <View style={[enhancedStyles.statusDot, {
                            backgroundColor: getSecurityLevelColor(clientData.securityLevel)
                          }]} />
                          <Text style={[enhancedStyles.statusText, {
                            color: getSecurityLevelColor(clientData.securityLevel)
                          }]}>
                            {clientData.securityLevel.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Buildings Section */}
                <View style={styles.buildingsSection}>
                  <View style={styles.buildingsSectionHeader}>
                    <TouchableOpacity
                      onPress={() => toggleClientExpansion(client.clientName)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                    >
                      <Icon
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        color={colors.text}
                      />
                      <Text style={styles.buildingsSectionTitle}>
                        Buildings ({client.buildingCount})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openAddBuildingModal(client.clientName)}>
                      <Icon name="add-circle-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {isExpanded && (
                    <View>
                      {clientBuildingsList.length === 0 ? (
                        <Text style={[styles.infoText, { marginLeft: spacing.lg }]}>
                          No buildings yet
                        </Text>
                      ) : (
                        <>
                          {clientBuildingsList.map((building) => (
                            <TouchableOpacity
                              key={building.id}
                              style={styles.buildingItem}
                              onPress={() => openEditBuildingModal(building)}
                            >
                              <Icon name="business-outline" size={16} color={colors.textSecondary} />
                              <Text style={styles.buildingName}>{building.buildingName}</Text>
                              {building.address && (
                                <Text style={[styles.infoText, { marginLeft: spacing.xs }]} numberOfLines={1}>
                                  - {building.address}
                                </Text>
                              )}
                              <Icon name="create-outline" size={16} color={themeColor} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                          ))}
                          
                          {/* Building Actions */}
                          <View style={styles.buildingActionsRow}>
                            <TouchableOpacity
                              style={styles.buildingActionButton}
                              onPress={() => openBuildingGroupsModal(client.clientName)}
                            >
                              <Icon name="git-merge" size={16} color={colors.primary} />
                              <Text style={styles.buildingActionButtonText}>Manage Groups</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </AnimatedCard>
            );
          })
        )}
      </ScrollView>

      {/* FAB - Add Client */}
      <TouchableOpacity
        style={[enhancedStyles.fab, { backgroundColor: themeColor, shadowColor: themeColor }]}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" size={32} style={{ color: '#FFFFFF' }} />
      </TouchableOpacity>

      {/* Building Groups Modal */}
      <BuildingGroupsModal
        visible={showBuildingGroupsModal}
        onClose={() => {
          setShowBuildingGroupsModal(false);
          setSelectedClientForGroups('');
        }}
        clientName={selectedClientForGroups}
        buildings={clientBuildings.filter(b => b.clientName === selectedClientForGroups)}
        onRefresh={() => refreshData()}
      />

      {/* Add Client Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>

            <ScrollView>
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
            </ScrollView>

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

            <ScrollView>
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
            </ScrollView>

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

      {/* Add Building Modal */}
      <Modal visible={showAddBuildingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Building to {selectedClientForBuilding}</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building name"
                  placeholderTextColor={colors.textSecondary}
                  value={buildingFormData.building_name}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, building_name: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building address"
                  placeholderTextColor={colors.textSecondary}
                  value={buildingFormData.address}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, address: text })
                  }
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
                            buildingFormData.security_level === level
                              ? colors.primary
                              : colors.background,
                        },
                      ]}
                      onPress={() =>
                        setBuildingFormData({
                          ...buildingFormData,
                          security_level: level as any,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              buildingFormData.security_level === level
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
                  value={buildingFormData.security}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, security: text })
                  }
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddBuildingModal(false);
                  setSelectedClientForBuilding('');
                  setBuildingFormData({
                    building_name: '',
                    security_level: 'medium',
                    security: '',
                    address: '',
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Add Building"
                onPress={handleAddBuilding}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Building Modal */}
      <Modal visible={showEditBuildingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={styles.modalTitle}>Edit Building</Text>
              <TouchableOpacity onPress={handleDeleteBuilding}>
                <Icon name="trash-outline" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building name"
                  placeholderTextColor={colors.textSecondary}
                  value={buildingFormData.building_name}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, building_name: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building address"
                  placeholderTextColor={colors.textSecondary}
                  value={buildingFormData.address}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, address: text })
                  }
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
                            buildingFormData.security_level === level
                              ? colors.primary
                              : colors.background,
                        },
                      ]}
                      onPress={() =>
                        setBuildingFormData({
                          ...buildingFormData,
                          security_level: level as any,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              buildingFormData.security_level === level
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
                  value={buildingFormData.security}
                  onChangeText={(text) =>
                    setBuildingFormData({ ...buildingFormData, security: text })
                  }
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditBuildingModal(false);
                  setSelectedBuilding(null);
                  setBuildingFormData({
                    building_name: '',
                    security_level: 'medium',
                    security: '',
                    address: '',
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleEditBuilding}
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
