
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useClientData } from '../../hooks/useClientData';
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

interface ClientWithProjects {
  clientName: string;
  buildingCount: number;
  projectCount: number;
  activeProjects: number;
  totalRevenue: number;
  buildings: string[];
}

const ClientsListScreen = () => {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery } = useDatabase();
  const { clients: allClients } = useClientData();

  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Load projects from database
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading projects for clients list...');

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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Group projects by client
  const clientsWithProjects = useMemo<ClientWithProjects[]>(() => {
    const clientMap = new Map<string, ClientWithProjects>();

    projects.forEach((project) => {
      const existing = clientMap.get(project.client_name);
      
      if (existing) {
        existing.projectCount += 1;
        if (project.status === 'active') {
          existing.activeProjects += 1;
        }
        if (!project.is_included_in_contract) {
          existing.totalRevenue += project.billing_amount;
        }
        if (project.building_name && !existing.buildings.includes(project.building_name)) {
          existing.buildings.push(project.building_name);
          existing.buildingCount = existing.buildings.length;
        }
      } else {
        clientMap.set(project.client_name, {
          clientName: project.client_name,
          buildingCount: project.building_name ? 1 : 0,
          projectCount: 1,
          activeProjects: project.status === 'active' ? 1 : 0,
          totalRevenue: project.is_included_in_contract ? 0 : project.billing_amount,
          buildings: project.building_name ? [project.building_name] : [],
        });
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => 
      a.clientName.localeCompare(b.clientName)
    );
  }, [projects]);

  // Filter clients
  const filteredClients = useMemo(() => {
    let filtered = [...clientsWithProjects];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((client) =>
        client.clientName.toLowerCase().includes(query) ||
        client.buildings.some(b => b.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((client) => client.activeProjects > 0);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((client) => client.activeProjects === 0);
    }

    return filtered;
  }, [clientsWithProjects, searchQuery, filterStatus]);

  const handleClientPress = (clientName: string) => {
    router.push({
      pathname: '/supervisor/contract-details',
      params: { clientName },
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading clients..." />;
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
    clientCard: {
      marginBottom: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clientHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    clientName: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    chevronIcon: {
      color: colors.textSecondary,
    },
    clientStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statItemText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    statItemValue: {
      ...typography.small,
      color: colors.text,
      fontWeight: '600',
    },
    buildingsList: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    buildingsTitle: {
      ...typography.small,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    buildingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      marginRight: spacing.xs,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buildingChipText: {
      ...typography.small,
      color: colors.text,
      marginLeft: spacing.xs,
    },
    buildingsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
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
          <Text style={styles.headerTitle}>Clients</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients or buildings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
              All Clients
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
            style={[styles.filterChip, filterStatus === 'inactive' && styles.filterChipActive]}
            onPress={() => setFilterStatus('inactive')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'inactive' && styles.filterChipTextActive]}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{clientsWithProjects.length}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {clientsWithProjects.reduce((sum, c) => sum + c.activeProjects, 0)}
          </Text>
          <Text style={styles.statLabel}>Active Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            ${clientsWithProjects.reduce((sum, c) => sum + c.totalRevenue, 0).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Clients List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No clients found</Text>
          </View>
        ) : (
          filteredClients.map((client) => (
            <AnimatedCard key={client.clientName}>
              <TouchableOpacity
                style={styles.clientCard}
                onPress={() => handleClientPress(client.clientName)}
                activeOpacity={0.7}
              >
                <View style={styles.clientHeader}>
                  <Text style={styles.clientName}>{client.clientName}</Text>
                  <Icon name="chevron-forward" size={24} style={styles.chevronIcon} />
                </View>

                <View style={styles.clientStats}>
                  <View style={styles.statItem}>
                    <Icon name="business" size={16} style={{ color: themeColor }} />
                    <Text style={styles.statItemText}>
                      <Text style={styles.statItemValue}>{client.buildingCount}</Text> Buildings
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Icon name="briefcase" size={16} style={{ color: colors.warning }} />
                    <Text style={styles.statItemText}>
                      <Text style={styles.statItemValue}>{client.projectCount}</Text> Projects
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Icon name="checkmark-circle" size={16} style={{ color: colors.success }} />
                    <Text style={styles.statItemText}>
                      <Text style={styles.statItemValue}>{client.activeProjects}</Text> Active
                    </Text>
                  </View>

                  {client.totalRevenue > 0 && (
                    <View style={styles.statItem}>
                      <Icon name="cash" size={16} style={{ color: colors.success }} />
                      <Text style={styles.statItemText}>
                        <Text style={styles.statItemValue}>${client.totalRevenue.toFixed(2)}</Text>
                      </Text>
                    </View>
                  )}
                </View>

                {client.buildings.length > 0 && (
                  <View style={styles.buildingsList}>
                    <Text style={styles.buildingsTitle}>Buildings:</Text>
                    <View style={styles.buildingsRow}>
                      {client.buildings.map((building, index) => (
                        <View key={index} style={styles.buildingChip}>
                          <Icon name="location" size={12} style={{ color: themeColor }} />
                          <Text style={styles.buildingChipText}>{building}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      <Toast />
    </View>
  );
};

export default ClientsListScreen;
