
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal, Switch, Alert } from 'react-native';
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
import { useClientData } from '../../hooks/useClientData';
import BuildingGroupsModal from '../../components/BuildingGroupsModal';

interface BuildingFormData {
  building_name: string;
  security_level: 'low' | 'medium' | 'high';
  security: string;
  address: string;
  client_name: string;
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
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: -spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  clientSection: {
    marginBottom: spacing.lg,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  clientHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  clientName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    flex: 1,
  },
  buildingCount: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  buildingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buildingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  buildingName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    flex: 1,
  },
  buildingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buildingInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
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
  clientActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginLeft: spacing.lg,
  },
  clientActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  clientActionButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
});

export default function BuildingsScreen() {
  const { clients, clientBuildings, refreshData, isLoading } = useClientData();
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { config } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBuildingGroupsModal, setShowBuildingGroupsModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [selectedClientForGroups, setSelectedClientForGroups] = useState<string>('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<BuildingFormData>({
    building_name: '',
    security_level: 'medium',
    security: '',
    address: '',
    client_name: '',
  });

  // Group buildings by client
  const buildingsByClient = useMemo(() => {
    const grouped: { [key: string]: typeof clientBuildings } = {};
    
    clientBuildings.forEach(building => {
      if (!grouped[building.clientName]) {
        grouped[building.clientName] = [];
      }
      grouped[building.clientName].push(building);
    });

    return grouped;
  }, [clientBuildings]);

  // Filter buildings based on search
  const filteredBuildingsByClient = useMemo(() => {
    if (!searchQuery.trim()) return buildingsByClient;

    const query = searchQuery.toLowerCase();
    const filtered: { [key: string]: typeof clientBuildings } = {};

    Object.entries(buildingsByClient).forEach(([clientName, buildings]) => {
      const matchingBuildings = buildings.filter(
        building =>
          building.buildingName.toLowerCase().includes(query) ||
          building.clientName.toLowerCase().includes(query) ||
          building.address?.toLowerCase().includes(query)
      );

      if (matchingBuildings.length > 0) {
        filtered[clientName] = matchingBuildings;
      }
    });

    return filtered;
  }, [buildingsByClient, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBuildings = clientBuildings.length;
    const totalClients = Object.keys(buildingsByClient).length;
    const avgBuildingsPerClient = totalClients > 0 ? (totalBuildings / totalClients).toFixed(1) : '0';

    return {
      totalBuildings,
      totalClients,
      avgBuildingsPerClient,
    };
  }, [clientBuildings, buildingsByClient]);

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

  const handleAddBuilding = async () => {
    if (!formData.building_name.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    if (!formData.client_name) {
      showToast('Please select a client', 'error');
      return;
    }

    try {
      console.log('🔄 Adding new building:', formData.building_name);

      const newBuilding = {
        id: uuid.v4() as string,
        client_name: formData.client_name,
        building_name: formData.building_name.trim(),
        security_level: formData.security_level,
        security: formData.security.trim() || null,
        address: formData.address.trim() || null,
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
      
      await refreshData();
      
      setShowAddModal(false);
      setFormData({
        building_name: '',
        security_level: 'medium',
        security: '',
        address: '',
        client_name: '',
      });
    } catch (error) {
      console.error('❌ Failed to add building:', error);
      showToast('Failed to add building', 'error');
    }
  };

  const handleEditBuilding = async () => {
    if (!selectedBuilding || !formData.building_name.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    try {
      console.log('🔄 Updating building:', selectedBuilding.id);

      const updates = {
        building_name: formData.building_name.trim(),
        security_level: formData.security_level,
        security: formData.security.trim() || null,
        address: formData.address.trim() || null,
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
      
      setShowEditModal(false);
      setSelectedBuilding(null);
      setFormData({
        building_name: '',
        security_level: 'medium',
        security: '',
        address: '',
        client_name: '',
      });
    } catch (error) {
      console.error('❌ Failed to update building:', error);
      showToast('Failed to update building', 'error');
    }
  };

  const handleDeleteBuilding = async (buildingId: string, buildingName: string) => {
    Alert.alert(
      'Delete Building',
      `Are you sure you want to delete ${buildingName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting building:', buildingId);

              const { error } = await supabase
                .from('client_buildings')
                .delete()
                .eq('id', buildingId);

              if (error) {
                console.error('❌ Error deleting building:', error);
                throw error;
              }

              console.log('✅ Building deleted successfully');
              showToast('Building deleted successfully', 'success');
              
              await refreshData();
            } catch (error) {
              console.error('❌ Failed to delete building:', error);
              showToast('Failed to delete building', 'error');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (building: any) => {
    setSelectedBuilding(building);
    setFormData({
      building_name: building.buildingName,
      security_level: building.securityLevel,
      security: building.security || '',
      address: building.address || '',
      client_name: building.clientName,
    });
    setShowEditModal(true);
  };

  const openBuildingGroupsModal = (clientName: string) => {
    setSelectedClientForGroups(clientName);
    setShowBuildingGroupsModal(true);
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

  if (isLoading) {
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
        <Text style={styles.headerTitle}>Buildings</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="add-circle" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search buildings..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalBuildings}</Text>
          <Text style={styles.statLabel}>Total Buildings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.avgBuildingsPerClient}</Text>
          <Text style={styles.statLabel}>Avg per Client</Text>
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {Object.keys(filteredBuildingsByClient).length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="business" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No buildings found' : 'No buildings yet'}
            </Text>
          </View>
        ) : (
          Object.entries(filteredBuildingsByClient).map(([clientName, buildings]) => {
            const isExpanded = expandedClients.has(clientName);

            return (
              <View key={clientName} style={styles.clientSection}>
                <TouchableOpacity
                  style={styles.clientHeader}
                  onPress={() => toggleClientExpansion(clientName)}
                >
                  <View style={styles.clientHeaderLeft}>
                    <Icon
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={24}
                      color={colors.text}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>{clientName}</Text>
                      <Text style={styles.buildingCount}>
                        {buildings.length} {buildings.length === 1 ? 'Building' : 'Buildings'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => openBuildingGroupsModal(clientName)}>
                    <Icon name="git-merge" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    {buildings.map((building) => (
                      <TouchableOpacity
                        key={building.id}
                        onPress={() => router.push(`/supervisor/building-detail?buildingId=${building.id}`)}
                      >
                        <AnimatedCard style={styles.buildingCard}>
                          <View style={styles.buildingHeader}>
                            <Text style={styles.buildingName}>{building.buildingName}</Text>
                            <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                          </View>

                          <View style={styles.buildingInfo}>
                            {building.address && (
                              <View style={styles.infoItem}>
                                <Icon name="location" size={16} color={colors.textSecondary} />
                                <Text style={styles.infoText}>{building.address}</Text>
                              </View>
                            )}
                            <View
                              style={[
                                styles.badge,
                                { backgroundColor: getSecurityLevelColor(building.securityLevel) + '20' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: getSecurityLevelColor(building.securityLevel) },
                                ]}
                              >
                                {building.securityLevel.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          {building.security && (
                            <View style={{ marginTop: spacing.sm }}>
                              <Text style={[styles.infoText, { fontStyle: 'italic' }]}>
                                {building.security}
                              </Text>
                            </View>
                          )}
                        </AnimatedCard>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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

      {/* Add Building Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Building</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Client *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {clients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            formData.client_name === client.name
                              ? colors.primary
                              : colors.background,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, client_name: client.name })}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              formData.client_name === client.name
                                ? '#FFFFFF'
                                : colors.text,
                          },
                        ]}
                      >
                        {client.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.building_name}
                  onChangeText={(text) => setFormData({ ...formData, building_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building address"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
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
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setFormData({
                    building_name: '',
                    security_level: 'medium',
                    security: '',
                    address: '',
                    client_name: '',
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
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Building</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Client</Text>
                <Text style={[styles.input, { color: colors.textSecondary }]}>
                  {formData.client_name}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building name"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.building_name}
                  onChangeText={(text) => setFormData({ ...formData, building_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building address"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
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
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedBuilding(null);
                  setFormData({
                    building_name: '',
                    security_level: 'medium',
                    security: '',
                    address: '',
                    client_name: '',
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

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}
