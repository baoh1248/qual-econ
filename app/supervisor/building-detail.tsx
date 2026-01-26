
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import Button from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AnimatedCard from '../../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import { useClientData } from '../../hooks/useClientData';
import LoadingSpinner from '../../components/LoadingSpinner';

interface BuildingFormData {
  building_name: string;
  security_level: 'low' | 'medium' | 'high';
  security: string;
  address: string;
}

export default function BuildingDetailScreen() {
  const { buildingId } = useLocalSearchParams<{ buildingId: string }>();
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const { clientBuildings, refreshData, isLoading: isDataLoading } = useClientData();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState<any>(null);
  const [formData, setFormData] = useState<BuildingFormData>({
    building_name: '',
    security_level: 'medium',
    security: '',
    address: '',
  });

  // Wait for clientBuildings to load before trying to find the building
  useEffect(() => {
    // Don't try to find building while data is still loading
    if (isDataLoading) {
      return;
    }

    console.log('🔄 Loading building data for ID:', buildingId);
    console.log('📦 Available buildings:', clientBuildings.length);

    const foundBuilding = clientBuildings.find(b => b.id === buildingId);

    if (foundBuilding) {
      console.log('✅ Building found:', foundBuilding);
      setBuilding(foundBuilding);
      setFormData({
        building_name: foundBuilding.buildingName,
        security_level: foundBuilding.securityLevel,
        security: foundBuilding.security || '',
        address: foundBuilding.address || '',
      });
      setLoading(false);
    } else if (clientBuildings.length > 0) {
      // Only show error if we have loaded buildings but couldn't find the one we're looking for
      console.log('❌ Building not found');
      showToast('Building not found', 'error');
      router.back();
    }
  }, [buildingId, clientBuildings, isDataLoading, showToast]);

  const handleSave = async () => {
    if (!formData.building_name.trim()) {
      showToast('Please enter a building name', 'error');
      return;
    }

    try {
      setSaving(true);
      console.log('🔄 Updating building:', buildingId);

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
        .eq('id', buildingId);

      if (error) {
        console.error('❌ Error updating building:', error);
        throw error;
      }

      console.log('✅ Building updated successfully');
      showToast('Building updated successfully', 'success');
      
      // Refresh data
      await refreshData();
      
      // Go back after a short delay
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (error) {
      console.error('❌ Failed to update building:', error);
      showToast('Failed to update building', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Building',
      `Are you sure you want to delete ${building?.buildingName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting building:', buildingId);

              // Delete associated schedule entries
              const { error: scheduleError } = await supabase
                .from('schedule_entries')
                .delete()
                .eq('building_name', building.buildingName)
                .eq('client_name', building.clientName);

              if (scheduleError) {
                console.error('❌ Error deleting schedule entries:', scheduleError);
              }

              // Delete building
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
              
              // Refresh data
              await refreshData();
              
              // Go back
              router.back();
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!building) {
    return (
      <View style={commonStyles.container}>
        <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF' }]}>Building Not Found</Text>
          <CompanyLogo size={40} />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
            Building Details
          </Text>
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView style={commonStyles.content}>
        {/* Building Info Card */}
        <AnimatedCard delay={0}>
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Icon name="business" size={32} color={themeColor} />
              <View style={styles.infoHeaderText}>
                <Text style={styles.buildingName}>{building.buildingName}</Text>
                <Text style={styles.clientName}>{building.clientName}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Edit Form */}
        <AnimatedCard delay={100}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="create" size={24} color={themeColor} />
              <Text style={styles.sectionTitle}>Edit Building</Text>
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
              <View style={styles.securityLevelButtons}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.securityLevelButton,
                      {
                        backgroundColor:
                          formData.security_level === level
                            ? getSecurityLevelColor(level)
                            : colors.backgroundAlt,
                        borderColor: getSecurityLevelColor(level),
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, security_level: level as any })
                    }
                  >
                    <Text
                      style={[
                        styles.securityLevelButtonText,
                        {
                          color:
                            formData.security_level === level
                              ? '#FFFFFF'
                              : getSecurityLevelColor(level),
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
                style={[styles.input, styles.textArea]}
                placeholder="Enter security requirements..."
                placeholderTextColor={colors.textSecondary}
                value={formData.security}
                onChangeText={(text) => setFormData({ ...formData, security: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <Button
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={saving}
              icon="checkmark"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </AnimatedCard>

        {/* Danger Zone */}
        <AnimatedCard delay={200}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="warning" size={24} color={colors.error} />
              <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerText}>
              Deleting this building will remove all associated schedule entries and cannot be undone.
            </Text>
            <Button
              title="Delete Building"
              onPress={handleDelete}
              variant="danger"
              icon="trash"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </AnimatedCard>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSection: {
    gap: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoHeaderText: {
    flex: 1,
  },
  buildingName: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  clientName: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  formGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  securityLevelButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  securityLevelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  securityLevelButtonText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  dangerText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
