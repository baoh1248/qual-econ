
import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import IconButton from './IconButton';
import { supabase } from '../app/integrations/supabase/client';
import uuid from 'react-native-uuid';
import type { ClientBuilding } from '../hooks/useClientData';

interface BuildingGroup {
  id: string;
  client_name: string;
  group_name: string;
  description?: string;
  building_ids: string[];
  buildings: ClientBuilding[];
  highlight_color?: string;
  created_at?: string;
  updated_at?: string;
}

interface BuildingGroupsModalProps {
  visible: boolean;
  onClose: () => void;
  clientName: string;
  buildings: ClientBuilding[];
  onRefresh?: () => void;
}

const PREDEFINED_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    flex: 1,
  },
  groupDescription: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  buildingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  buildingChipText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
  },
  buildingsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
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
  buildingSelector: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
  },
  buildingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  buildingOptionSelected: {
    backgroundColor: colors.primary + '20',
  },
  buildingOptionText: {
    fontSize: typography.sizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  colorPickerContainer: {
    marginBottom: spacing.md,
  },
  colorPickerLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  colorPreviewText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  colorPreviewSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  highlightBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
});

const BuildingGroupsModal = memo<BuildingGroupsModalProps>(({ visible, onClose, clientName, buildings, onRefresh }) => {
  console.log('BuildingGroupsModal rendered');
  
  const [groups, setGroups] = useState<BuildingGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<BuildingGroup | null>(null);
  
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    building_ids: [] as string[],
    highlight_color: PREDEFINED_COLORS[0],
  });

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading building groups for client:', clientName);

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('building_groups')
        .select('*')
        .eq('client_name', clientName)
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('❌ Error loading building groups:', groupsError);
        throw groupsError;
      }

      // Load group members
      const groupsWithBuildings: BuildingGroup[] = [];
      
      for (const group of groupsData || []) {
        const { data: membersData, error: membersError } = await supabase
          .from('building_group_members')
          .select('building_id')
          .eq('group_id', group.id);

        if (membersError) {
          console.error('❌ Error loading group members:', membersError);
          continue;
        }

        const buildingIds = membersData?.map(m => m.building_id) || [];
        const groupBuildings = buildings.filter(b => buildingIds.includes(b.id));

        groupsWithBuildings.push({
          ...group,
          building_ids: buildingIds,
          buildings: groupBuildings,
          highlight_color: group.highlight_color || PREDEFINED_COLORS[0],
        });
      }

      console.log(`✅ Loaded ${groupsWithBuildings.length} building groups`);
      setGroups(groupsWithBuildings);
    } catch (error) {
      console.error('❌ Failed to load building groups:', error);
    } finally {
      setLoading(false);
    }
  }, [clientName, buildings]);

  useEffect(() => {
    if (visible) {
      loadGroups();
    }
  }, [visible, loadGroups]);

  const handleAddGroup = async () => {
    if (!formData.group_name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (formData.building_ids.length === 0) {
      Alert.alert('Error', 'Please select at least one building');
      return;
    }

    try {
      console.log('🔄 Adding building group:', formData.group_name);

      const groupId = uuid.v4() as string;

      // Insert group
      const { error: groupError } = await supabase
        .from('building_groups')
        .insert({
          id: groupId,
          client_name: clientName,
          group_name: formData.group_name.trim(),
          description: formData.description.trim() || null,
          highlight_color: formData.highlight_color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (groupError) {
        console.error('❌ Error adding building group:', groupError);
        throw groupError;
      }

      // Insert group members
      const members = formData.building_ids.map(buildingId => ({
        id: uuid.v4() as string,
        group_id: groupId,
        building_id: buildingId,
        created_at: new Date().toISOString(),
      }));

      const { error: membersError } = await supabase
        .from('building_group_members')
        .insert(members);

      if (membersError) {
        console.error('❌ Error adding group members:', membersError);
        throw membersError;
      }

      console.log('✅ Building group added successfully');
      Alert.alert('Success', 'Building group created successfully');
      
      setShowAddModal(false);
      setFormData({ 
        group_name: '', 
        description: '', 
        building_ids: [],
        highlight_color: PREDEFINED_COLORS[0],
      });
      await loadGroups();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Failed to add building group:', error);
      Alert.alert('Error', 'Failed to create building group');
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !formData.group_name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (formData.building_ids.length === 0) {
      Alert.alert('Error', 'Please select at least one building');
      return;
    }

    try {
      console.log('🔄 Updating building group:', selectedGroup.id);

      // Update group
      const { error: groupError } = await supabase
        .from('building_groups')
        .update({
          group_name: formData.group_name.trim(),
          description: formData.description.trim() || null,
          highlight_color: formData.highlight_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedGroup.id);

      if (groupError) {
        console.error('❌ Error updating building group:', groupError);
        throw groupError;
      }

      // Delete existing members
      const { error: deleteError } = await supabase
        .from('building_group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (deleteError) {
        console.error('❌ Error deleting group members:', deleteError);
        throw deleteError;
      }

      // Insert new members
      const members = formData.building_ids.map(buildingId => ({
        id: uuid.v4() as string,
        group_id: selectedGroup.id,
        building_id: buildingId,
        created_at: new Date().toISOString(),
      }));

      const { error: membersError } = await supabase
        .from('building_group_members')
        .insert(members);

      if (membersError) {
        console.error('❌ Error adding group members:', membersError);
        throw membersError;
      }

      console.log('✅ Building group updated successfully');
      Alert.alert('Success', 'Building group updated successfully');
      
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ 
        group_name: '', 
        description: '', 
        building_ids: [],
        highlight_color: PREDEFINED_COLORS[0],
      });
      await loadGroups();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Failed to update building group:', error);
      Alert.alert('Error', 'Failed to update building group');
    }
  };

  const handleDeleteGroup = (group: BuildingGroup) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete the group "${group.group_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting building group:', group.id);

              const { error } = await supabase
                .from('building_groups')
                .delete()
                .eq('id', group.id);

              if (error) {
                console.error('❌ Error deleting building group:', error);
                throw error;
              }

              console.log('✅ Building group deleted successfully');
              Alert.alert('Success', 'Building group deleted successfully');
              
              await loadGroups();
              onRefresh?.();
            } catch (error) {
              console.error('❌ Failed to delete building group:', error);
              Alert.alert('Error', 'Failed to delete building group');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (group: BuildingGroup) => {
    setSelectedGroup(group);
    setFormData({
      group_name: group.group_name,
      description: group.description || '',
      building_ids: group.building_ids,
      highlight_color: group.highlight_color || PREDEFINED_COLORS[0],
    });
    setShowEditModal(true);
  };

  const toggleBuilding = (buildingId: string) => {
    setFormData(prev => ({
      ...prev,
      building_ids: prev.building_ids.includes(buildingId)
        ? prev.building_ids.filter(id => id !== buildingId)
        : [...prev.building_ids, buildingId],
    }));
  };

  const renderColorPicker = () => (
    <View style={styles.colorPickerContainer}>
      <Text style={styles.colorPickerLabel}>Highlight Color</Text>
      <View style={styles.colorGrid}>
        {PREDEFINED_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.highlight_color === color && styles.colorOptionSelected,
            ]}
            onPress={() => setFormData({ ...formData, highlight_color: color })}
          >
            {formData.highlight_color === color && (
              <Icon name="checkmark" size={24} style={{ color: '#FFFFFF' }} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.colorPreview}>
        <Text style={styles.colorPreviewText}>
          Buildings in this group will be highlighted in the schedule
        </Text>
        <View style={[styles.colorPreviewSwatch, { backgroundColor: formData.highlight_color }]} />
      </View>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
        transparent={Platform.OS !== 'ios'}
        onRequestClose={onClose}
      >
        <View style={{
          flex: 1,
          backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
          justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
          alignItems: Platform.OS === 'ios' ? 'stretch' : 'center',
        }}>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }} 
              activeOpacity={1} 
              onPress={onClose}
            />
          )}
          <View style={{
            width: Platform.OS === 'ios' ? '100%' : '90%',
            maxWidth: Platform.OS === 'ios' ? undefined : 700,
            maxHeight: Platform.OS === 'ios' ? '100%' : '85%',
            backgroundColor: colors.background,
            borderRadius: Platform.OS === 'ios' ? 0 : 16,
            overflow: 'hidden',
          }}>
            <View style={commonStyles.header}>
              <IconButton 
                icon="close" 
                onPress={onClose} 
                variant="white"
              />
              <Text style={commonStyles.headerTitle}>Building Groups</Text>
              <IconButton 
                icon="add-circle" 
                onPress={() => {
                  setFormData({ 
                    group_name: '', 
                    description: '', 
                    building_ids: [],
                    highlight_color: PREDEFINED_COLORS[0],
                  });
                  setShowAddModal(true);
                }} 
                variant="white"
              />
            </View>

            <View style={commonStyles.content}>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                Group buildings together for easier scheduling and management. Buildings in the same group will be sorted together and highlighted in the schedule.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {groups.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="business-outline" size={64} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>
                      No building groups yet.{'\n'}
                      Create a group to organize buildings that are cleaned together.
                    </Text>
                  </View>
                ) : (
                  groups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupHeader}>
                        <Text style={styles.groupName}>{group.group_name}</Text>
                        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                          <IconButton
                            icon="create"
                            onPress={() => openEditModal(group)}
                            variant="secondary"
                            size="small"
                          />
                          <IconButton
                            icon="trash"
                            onPress={() => handleDeleteGroup(group)}
                            variant="secondary"
                            size="small"
                            style={{ backgroundColor: colors.error }}
                          />
                        </View>
                      </View>

                      {group.description && (
                        <Text style={styles.groupDescription}>{group.description}</Text>
                      )}

                      <View style={[styles.highlightBadge, { backgroundColor: `${group.highlight_color}20` }]}>
                        <View style={[styles.colorPreviewSwatch, { 
                          width: 16, 
                          height: 16, 
                          borderRadius: 8,
                          backgroundColor: group.highlight_color 
                        }]} />
                        <Text style={[styles.highlightBadgeText, { color: group.highlight_color }]}>
                          Highlighted in schedule
                        </Text>
                      </View>

                      <View style={styles.buildingsList}>
                        {group.buildings.map((building) => (
                          <View key={building.id} style={styles.buildingChip}>
                            <Icon name="business" size={12} style={{ color: colors.primary, marginRight: spacing.xs }} />
                            <Text style={styles.buildingChipText}>{building.buildingName}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Group Modal - Truncated for brevity */}
      {/* Edit Group Modal - Truncated for brevity */}
    </>
  );
});

BuildingGroupsModal.displayName = 'BuildingGroupsModal';

BuildingGroupsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  clientName: PropTypes.string.isRequired,
  buildings: PropTypes.array.isRequired,
  onRefresh: PropTypes.func,
};

export default BuildingGroupsModal;
