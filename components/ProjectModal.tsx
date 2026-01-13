import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Switch } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../styles/commonStyles';
import Button from './Button';
import Icon from './Icon';
import DateInput from './DateInput';

interface ClientProject {
  id?: string;
  client_name: string;
  building_name?: string;
  project_name: string;
  description?: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_included_in_contract: boolean;
  billing_amount: number;
  status: 'active' | 'completed' | 'cancelled' | 'on-hold';
  next_scheduled_date?: string;
  notes?: string;
  work_order_number?: string;
  invoice_number?: string;
  is_recurring?: boolean;
}

interface ProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (project: ClientProject) => Promise<void>;
  project?: ClientProject;
  clients: Array<{ clientName: string; buildings?: Array<{ buildingName: string }> }>;
  themeColor: string;
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  visible,
  onClose,
  onSave,
  project,
  clients,
  themeColor,
}) => {
  const isEditMode = !!project;

  const [formData, setFormData] = useState<ClientProject>({
    client_name: '',
    building_name: '',
    project_name: '',
    description: '',
    frequency: 'one-time',
    is_included_in_contract: false,
    billing_amount: 0,
    status: 'active',
    next_scheduled_date: '',
    notes: '',
    work_order_number: '',
    invoice_number: '',
    is_recurring: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        building_name: project.building_name || '',
        description: project.description || '',
        next_scheduled_date: project.next_scheduled_date || '',
        notes: project.notes || '',
        work_order_number: project.work_order_number || '',
        invoice_number: project.invoice_number || '',
      });
    } else {
      resetForm();
    }
  }, [project, visible]);

  const resetForm = () => {
    setFormData({
      client_name: '',
      building_name: '',
      project_name: '',
      description: '',
      frequency: 'one-time',
      is_included_in_contract: false,
      billing_amount: 0,
      status: 'active',
      next_scheduled_date: '',
      notes: '',
      work_order_number: '',
      invoice_number: '',
      is_recurring: false,
    });
  };

  const handleSave = async () => {
    if (!formData.client_name.trim() || !formData.project_name.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
      if (!isEditMode) {
        resetForm();
      }
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isEditMode) {
      resetForm();
    }
    onClose();
  };

  const getClientBuildings = () => {
    const client = clients.find(c => c.clientName === formData.client_name);
    return client?.buildings || [];
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Icon name="briefcase" size={24} style={{ color: themeColor }} />
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Edit Project' : 'Add New Project'}
                </Text>
              </View>

              {/* Client Selection */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Client *</Text>
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Client Name:</Text>
                  <View style={styles.pickerWrapper}>
                    {clients.map((client) => (
                      <TouchableOpacity
                        key={client.clientName}
                        style={[
                          styles.chipButton,
                          formData.client_name === client.clientName && {
                            backgroundColor: themeColor,
                            borderColor: themeColor,
                          },
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, client_name: client.clientName, building_name: '' })
                        }
                      >
                        <Text
                          style={[
                            styles.chipButtonText,
                            formData.client_name === client.clientName && styles.chipButtonTextActive,
                          ]}
                        >
                          {client.clientName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Building Selection */}
                {formData.client_name && getClientBuildings().length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>Building (Optional)</Text>
                    <View style={styles.pickerContainer}>
                      <View style={styles.pickerWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.chipButton,
                            !formData.building_name && {
                              backgroundColor: themeColor,
                              borderColor: themeColor,
                            },
                          ]}
                          onPress={() => setFormData({ ...formData, building_name: '' })}
                        >
                          <Text
                            style={[
                              styles.chipButtonText,
                              !formData.building_name && styles.chipButtonTextActive,
                            ]}
                          >
                            No Building
                          </Text>
                        </TouchableOpacity>
                        {getClientBuildings().map((building) => (
                          <TouchableOpacity
                            key={building.buildingName}
                            style={[
                              styles.chipButton,
                              formData.building_name === building.buildingName && {
                                backgroundColor: themeColor,
                                borderColor: themeColor,
                              },
                            ]}
                            onPress={() =>
                              setFormData({ ...formData, building_name: building.buildingName })
                            }
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                formData.building_name === building.buildingName &&
                                  styles.chipButtonTextActive,
                              ]}
                            >
                              {building.buildingName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Project Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project Details</Text>

                <Text style={styles.inputLabel}>Project Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter project name"
                  value={formData.project_name}
                  onChangeText={(text) => setFormData({ ...formData, project_name: text })}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter project description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>Work Order Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter work order number"
                  value={formData.work_order_number}
                  onChangeText={(text) => setFormData({ ...formData, work_order_number: text })}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.inputLabel}>Invoice Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter invoice number"
                  value={formData.invoice_number}
                  onChangeText={(text) => setFormData({ ...formData, invoice_number: text })}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Frequency & Billing */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Frequency & Billing</Text>

                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.chipContainer}>
                  {['one-time', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.chipButton,
                        formData.frequency === freq && {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        },
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          frequency: freq as ClientProject['frequency'],
                          is_recurring: freq !== 'one-time',
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.chipButtonText,
                          formData.frequency === freq && styles.chipButtonTextActive,
                        ]}
                      >
                        {freq
                          .split('-')
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Included in Contract</Text>
                  <Switch
                    value={formData.is_included_in_contract}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        is_included_in_contract: value,
                        billing_amount: value ? 0 : formData.billing_amount,
                      })
                    }
                    trackColor={{ false: colors.border, true: themeColor + '40' }}
                    thumbColor={formData.is_included_in_contract ? themeColor : colors.textSecondary}
                  />
                </View>

                {!formData.is_included_in_contract && (
                  <>
                    <Text style={styles.inputLabel}>Billing Amount</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      value={formData.billing_amount.toString()}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          billing_amount: parseFloat(text) || 0,
                        })
                      }
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </>
                )}
              </View>

              {/* Status & Schedule */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status & Schedule</Text>

                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.chipContainer}>
                  {['active', 'completed', 'cancelled', 'on-hold'].map((stat) => (
                    <TouchableOpacity
                      key={stat}
                      style={[
                        styles.chipButton,
                        formData.status === stat && {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        },
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, status: stat as ClientProject['status'] })
                      }
                    >
                      <Text
                        style={[
                          styles.chipButtonText,
                          formData.status === stat && styles.chipButtonTextActive,
                        ]}
                      >
                        {stat.charAt(0).toUpperCase() + stat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <DateInput
                  label="Next Scheduled Date"
                  value={formData.next_scheduled_date}
                  onChangeText={(text) => setFormData({ ...formData, next_scheduled_date: text })}
                  placeholder="YYYY-MM-DD"
                  themeColor={themeColor}
                />
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  text="Cancel"
                  onPress={handleClose}
                  variant="secondary"
                  style={styles.actionButton}
                  disabled={isSaving}
                />
                <Button
                  text={isEditMode ? 'Save Changes' : 'Add Project'}
                  onPress={handleSave}
                  variant="primary"
                  style={styles.actionButton}
                  disabled={
                    isSaving ||
                    !formData.client_name.trim() ||
                    !formData.project_name.trim()
                  }
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '95%',
    maxWidth: 600,
    backgroundColor: colors.background,
    borderRadius: 16,
    ...commonStyles.shadow,
    maxHeight: '90%',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  pickerLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  chipButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

export default ProjectModal;
