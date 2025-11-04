
import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Icon from './Icon';
import Button from './Button';
import IconButton from './IconButton';
import { supabase } from '../app/integrations/supabase/client';
import uuid from 'react-native-uuid';
import type { Cleaner } from '../hooks/useClientData';

interface CleanerGroup {
  id: string;
  group_name: string;
  description?: string;
  cleaner_ids: string[];
  cleaners: Cleaner[];
  highlight_color?: string;
  created_at?: string;
  updated_at?: string;
}

interface CleanerGroupsModalProps {
  visible: boolean;
  onClose: () => void;
  cleaners: Cleaner[];
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
  cleanerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  cleanerChipText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
  },
  cleanersList: {
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
  cleanerSelector: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
  },
  cleanerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  cleanerOptionSelected: {
    backgroundColor: colors.primary + '20',
  },
  cleanerOptionText: {
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

const CleanerGroupsModal = memo<CleanerGroupsModalProps>(({ visible, onClose, cleaners, onRefresh }) => {
  console.log('CleanerGroupsModal rendered');
  
  const [groups, setGroups] = useState<CleanerGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CleanerGroup | null>(null);
  
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    cleaner_ids: [] as string[],
    highlight_color: PREDEFINED_COLORS[0],
  });

  useEffect(() => {
    if (visible) {
      loadGroups();
    }
  }, [visible]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading cleaner groups');

      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('cleaner_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) {
        console.error('❌ Error loading cleaner groups:', groupsError);
        throw groupsError;
      }

      // Load group members
      const groupsWithCleaners: CleanerGroup[] = [];
      
      for (const group of groupsData || []) {
        const { data: membersData, error: membersError } = await supabase
          .from('cleaner_group_members')
          .select('cleaner_id')
          .eq('group_id', group.id);

        if (membersError) {
          console.error('❌ Error loading group members:', membersError);
          continue;
        }

        const cleanerIds = membersData?.map(m => m.cleaner_id) || [];
        const groupCleaners = cleaners.filter(c => cleanerIds.includes(c.id));

        groupsWithCleaners.push({
          ...group,
          cleaner_ids: cleanerIds,
          cleaners: groupCleaners,
          highlight_color: group.highlight_color || PREDEFINED_COLORS[0],
        });
      }

      console.log(`✅ Loaded ${groupsWithCleaners.length} cleaner groups`);
      setGroups(groupsWithCleaners);
    } catch (error) {
      console.error('❌ Failed to load cleaner groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!formData.group_name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (formData.cleaner_ids.length === 0) {
      Alert.alert('Error', 'Please select at least one cleaner');
      return;
    }

    try {
      console.log('🔄 Adding cleaner group:', formData.group_name);

      const groupId = uuid.v4() as string;

      // Insert group
      const { error: groupError } = await supabase
        .from('cleaner_groups')
        .insert({
          id: groupId,
          group_name: formData.group_name.trim(),
          description: formData.description.trim() || null,
          highlight_color: formData.highlight_color,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (groupError) {
        console.error('❌ Error adding cleaner group:', groupError);
        throw groupError;
      }

      // Insert group members
      const members = formData.cleaner_ids.map(cleanerId => ({
        id: uuid.v4() as string,
        group_id: groupId,
        cleaner_id: cleanerId,
        created_at: new Date().toISOString(),
      }));

      const { error: membersError } = await supabase
        .from('cleaner_group_members')
        .insert(members);

      if (membersError) {
        console.error('❌ Error adding group members:', membersError);
        throw membersError;
      }

      console.log('✅ Cleaner group added successfully');
      Alert.alert('Success', 'Cleaner group created successfully');
      
      setShowAddModal(false);
      setFormData({ 
        group_name: '', 
        description: '', 
        cleaner_ids: [],
        highlight_color: PREDEFINED_COLORS[0],
      });
      await loadGroups();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Failed to add cleaner group:', error);
      Alert.alert('Error', 'Failed to create cleaner group');
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !formData.group_name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (formData.cleaner_ids.length === 0) {
      Alert.alert('Error', 'Please select at least one cleaner');
      return;
    }

    try {
      console.log('🔄 Updating cleaner group:', selectedGroup.id);

      // Update group
      const { error: groupError } = await supabase
        .from('cleaner_groups')
        .update({
          group_name: formData.group_name.trim(),
          description: formData.description.trim() || null,
          highlight_color: formData.highlight_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedGroup.id);

      if (groupError) {
        console.error('❌ Error updating cleaner group:', groupError);
        throw groupError;
      }

      // Delete existing members
      const { error: deleteError } = await supabase
        .from('cleaner_group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      if (deleteError) {
        console.error('❌ Error deleting group members:', deleteError);
        throw deleteError;
      }

      // Insert new members
      const members = formData.cleaner_ids.map(cleanerId => ({
        id: uuid.v4() as string,
        group_id: selectedGroup.id,
        cleaner_id: cleanerId,
        created_at: new Date().toISOString(),
      }));

      const { error: membersError } = await supabase
        .from('cleaner_group_members')
        .insert(members);

      if (membersError) {
        console.error('❌ Error adding group members:', membersError);
        throw membersError;
      }

      console.log('✅ Cleaner group updated successfully');
      Alert.alert('Success', 'Cleaner group updated successfully');
      
      setShowEditModal(false);
      setSelectedGroup(null);
      setFormData({ 
        group_name: '', 
        description: '', 
        cleaner_ids: [],
        highlight_color: PREDEFINED_COLORS[0],
      });
      await loadGroups();
      onRefresh?.();
    } catch (error) {
      console.error('❌ Failed to update cleaner group:', error);
      Alert.alert('Error', 'Failed to update cleaner group');
    }
  };

  const handleDeleteGroup = (group: CleanerGroup) => {
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
              console.log('🔄 Deleting cleaner group:', group.id);

              const { error } = await supabase
                .from('cleaner_groups')
                .delete()
                .eq('id', group.id);

              if (error) {
                console.error('❌ Error deleting cleaner group:', error);
                throw error;
              }

              console.log('✅ Cleaner group deleted successfully');
              Alert.alert('Success', 'Cleaner group deleted successfully');
              
              await loadGroups();
              onRefresh?.();
            } catch (error) {
              console.error('❌ Failed to delete cleaner group:', error);
              Alert.alert('Error', 'Failed to delete cleaner group');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (group: CleanerGroup) => {
    setSelectedGroup(group);
    setFormData({
      group_name: group.group_name,
      description: group.description || '',
      cleaner_ids: group.cleaner_ids,
      highlight_color: group.highlight_color || PREDEFINED_COLORS[0],
    });
    setShowEditModal(true);
  };

  const toggleCleaner = (cleanerId: string) => {
    setFormData(prev => ({
      ...prev,
      cleaner_ids: prev.cleaner_ids.includes(cleanerId)
        ? prev.cleaner_ids.filter(id => id !== cleanerId)
        : [...prev.cleaner_ids, cleanerId],
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
          Cleaners in this group will be highlighted in the schedule
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
              <Text style={commonStyles.headerTitle}>Cleaner Groups</Text>
              <IconButton 
                icon="add-circle" 
                onPress={() => {
                  setFormData({ 
                    group_name: '', 
                    description: '', 
                    cleaner_ids: [],
                    highlight_color: PREDEFINED_COLORS[0],
                  });
                  setShowAddModal(true);
                }} 
                variant="white"
              />
            </View>

            <View style={commonStyles.content}>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                Group cleaners together by location or team. For example, create a &quot;Sparks Team&quot; for cleaners who work in the Sparks area, or an &quot;Out-of-City Team&quot; for cleaners who travel to other cities.
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {groups.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="people-outline" size={64} color={colors.textSecondary} />
                    <Text style={styles.emptyStateText}>
                      No cleaner groups yet.{'\n'}
                      Create a group to organize cleaners by location or team.
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

                      <View style={styles.cleanersList}>
                        {group.cleaners.map((cleaner) => (
                          <View key={cleaner.id} style={styles.cleanerChip}>
                            <Icon name="person" size={12} style={{ color: colors.primary, marginRight: spacing.xs }} />
                            <Text style={styles.cleanerChipText}>{cleaner.name}</Text>
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

      {/* Add Group Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 500,
            maxHeight: '80%',
          }}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Create Cleaner Group
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Group Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Sparks Team, Out-of-City Team"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.group_name}
                  onChangeText={(text) => setFormData({ ...formData, group_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="e.g., Cleaners who primarily work in the Sparks area"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                />
              </View>

              {renderColorPicker()}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Cleaners *</Text>
                <ScrollView style={styles.cleanerSelector} showsVerticalScrollIndicator={false}>
                  {cleaners.map((cleaner) => (
                    <TouchableOpacity
                      key={cleaner.id}
                      style={[
                        styles.cleanerOption,
                        formData.cleaner_ids.includes(cleaner.id) && styles.cleanerOptionSelected,
                      ]}
                      onPress={() => toggleCleaner(cleaner.id)}
                    >
                      <Icon 
                        name={formData.cleaner_ids.includes(cleaner.id) ? 'checkbox' : 'square-outline'} 
                        size={24} 
                        style={{ color: formData.cleaner_ids.includes(cleaner.id) ? colors.primary : colors.textSecondary }} 
                      />
                      <Text style={styles.cleanerOptionText}>{cleaner.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Button
                text="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setFormData({ 
                    group_name: '', 
                    description: '', 
                    cleaner_ids: [],
                    highlight_color: PREDEFINED_COLORS[0],
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                text="Create Group"
                onPress={handleAddGroup}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Group Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}>
          <View style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 500,
            maxHeight: '80%',
          }}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.lg }]}>
              Edit Cleaner Group
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Group Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Sparks Team, Out-of-City Team"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.group_name}
                  onChangeText={(text) => setFormData({ ...formData, group_name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="e.g., Cleaners who primarily work in the Sparks area"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                />
              </View>

              {renderColorPicker()}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Cleaners *</Text>
                <ScrollView style={styles.cleanerSelector} showsVerticalScrollIndicator={false}>
                  {cleaners.map((cleaner) => (
                    <TouchableOpacity
                      key={cleaner.id}
                      style={[
                        styles.cleanerOption,
                        formData.cleaner_ids.includes(cleaner.id) && styles.cleanerOptionSelected,
                      ]}
                      onPress={() => toggleCleaner(cleaner.id)}
                    >
                      <Icon 
                        name={formData.cleaner_ids.includes(cleaner.id) ? 'checkbox' : 'square-outline'} 
                        size={24} 
                        style={{ color: formData.cleaner_ids.includes(cleaner.id) ? colors.primary : colors.textSecondary }} 
                      />
                      <Text style={styles.cleanerOptionText}>{cleaner.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <Button
                text="Cancel"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedGroup(null);
                  setFormData({ 
                    group_name: '', 
                    description: '', 
                    cleaner_ids: [],
                    highlight_color: PREDEFINED_COLORS[0],
                  });
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                text="Save Changes"
                onPress={handleEditGroup}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

CleanerGroupsModal.displayName = 'CleanerGroupsModal';

export default CleanerGroupsModal;
