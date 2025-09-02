
import React, { memo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { colors, spacing, typography, commonStyles } from '../../styles/commonStyles';
import Button from '../Button';
import Icon from '../Icon';
import type { ScheduleEntry } from '../../hooks/useScheduleStorage';
import type { Client, ClientBuilding, Cleaner } from '../../hooks/useClientData';

type ModalType = 'add' | 'edit' | 'add-client' | 'add-building' | 'add-cleaner' | 'details' | 'edit-client' | 'edit-building' | null;

interface ScheduleModalProps {
  visible: boolean;
  modalType: ModalType;
  selectedEntry: ScheduleEntry | null;
  selectedClient: Client | null;
  selectedClientBuilding: ClientBuilding | null;
  cleaners: Cleaner[];
  clients: Client[];
  
  // Form states
  cleanerName: string;
  hours: string;
  startTime: string;
  newClientName: string;
  newClientSecurity: string;
  newClientSecurityLevel: 'low' | 'medium' | 'high';
  newBuildingName: string;
  newBuildingSecurity: string;
  newBuildingSecurityLevel: 'low' | 'medium' | 'high';
  newBuildingPriority: 'low' | 'medium' | 'high';
  selectedClientForBuilding: string;
  newCleanerName: string;
  showClientDropdown: boolean;
  showCleanerDropdown: boolean;
  showSecurityLevelDropdown: boolean;
  showPriorityDropdown: boolean;

  // Setters
  setCleanerName: (value: string) => void;
  setHours: (value: string) => void;
  setStartTime: (value: string) => void;
  setNewClientName: (value: string) => void;
  setNewClientSecurity: (value: string) => void;
  setNewClientSecurityLevel: (value: 'low' | 'medium' | 'high') => void;
  setNewBuildingName: (value: string) => void;
  setNewBuildingSecurity: (value: string) => void;
  setNewBuildingSecurityLevel: (value: 'low' | 'medium' | 'high') => void;
  setNewBuildingPriority: (value: 'low' | 'medium' | 'high') => void;
  setSelectedClientForBuilding: (value: string) => void;
  setNewCleanerName: (value: string) => void;
  setShowClientDropdown: (value: boolean) => void;
  setShowCleanerDropdown: (value: boolean) => void;
  setShowSecurityLevelDropdown: (value: boolean) => void;
  setShowPriorityDropdown: (value: boolean) => void;

  // Actions
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAddClient: () => void;
  onAddBuilding: () => void;
  onAddCleaner: () => void;
  onEditClient: () => void;
  onEditBuilding: () => void;
  onSwitchToEdit: () => void;
}

const ScheduleModal = memo(({
  visible,
  modalType,
  selectedEntry,
  selectedClient,
  selectedClientBuilding,
  cleaners,
  clients,
  cleanerName,
  hours,
  startTime,
  newClientName,
  newClientSecurity,
  newClientSecurityLevel,
  newBuildingName,
  newBuildingSecurity,
  newBuildingSecurityLevel,
  newBuildingPriority,
  selectedClientForBuilding,
  newCleanerName,
  showClientDropdown,
  showCleanerDropdown,
  showSecurityLevelDropdown,
  showPriorityDropdown,
  setCleanerName,
  setHours,
  setStartTime,
  setNewClientName,
  setNewClientSecurity,
  setNewClientSecurityLevel,
  setNewBuildingName,
  setNewBuildingSecurity,
  setNewBuildingSecurityLevel,
  setNewBuildingPriority,
  setSelectedClientForBuilding,
  setNewCleanerName,
  setShowClientDropdown,
  setShowCleanerDropdown,
  setShowSecurityLevelDropdown,
  setShowPriorityDropdown,
  onClose,
  onSave,
  onDelete,
  onAddClient,
  onAddBuilding,
  onAddCleaner,
  onEditClient,
  onEditBuilding,
  onSwitchToEdit,
}: ScheduleModalProps) => {
  console.log('ScheduleModal rendered with type:', modalType);

  if (!visible) return null;

  const securityLevels = ['low', 'medium', 'high'];
  const priorityLevels = ['low', 'medium', 'high'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return colors.primary;
      case 'in-progress': return colors.warning;
      case 'completed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.text;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.text;
    }
  };

  const renderDropdown = (items: string[], selectedValue: string, onSelect: (value: string) => void, placeholder: string) => (
    <View style={styles.dropdownContainer}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled>
        <TouchableOpacity
          style={[styles.dropdownItem, selectedValue === '' && styles.dropdownItemSelected]}
          onPress={() => onSelect('')}
        >
          <Text style={[styles.dropdownText, selectedValue === '' && styles.dropdownTextSelected]}>
            {placeholder}
          </Text>
        </TouchableOpacity>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dropdownItem, selectedValue === item && styles.dropdownItemSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.dropdownText, selectedValue === item && styles.dropdownTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    switch (modalType) {
      case 'details':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Details</Text>
            {selectedEntry && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.clientName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Building:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.buildingName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cleaner:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.cleanerName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hours:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.hours} hrs</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEntry.startTime} - {selectedEntry.endTime}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedEntry.status) }]}>
                    <Text style={styles.statusText}>{selectedEntry.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Week:</Text>
                  <Text style={styles.detailValue}>{selectedEntry.weekId}</Text>
                </View>
                <View style={styles.modalActions}>
                  <Button 
                    text="Edit" 
                    onPress={onSwitchToEdit} 
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  <Button 
                    text="Delete" 
                    onPress={onDelete} 
                    variant="danger"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}
          </View>
        );

      case 'add':
      case 'edit':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'add' ? 'Add New Shift' : 'Edit Shift'}
            </Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Cleaner *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowCleanerDropdown(!showCleanerDropdown)}
              >
                <Text style={[styles.inputText, !cleanerName && styles.placeholderText]}>
                  {cleanerName || 'Select cleaner'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showCleanerDropdown && renderDropdown(
                cleaners.filter(c => c.isActive).map(c => c.name),
                cleanerName,
                (value) => {
                  setCleanerName(value);
                  setShowCleanerDropdown(false);
                },
                'Select cleaner'
              )}
              
              <Text style={styles.inputLabel}>Hours *</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
              />
              
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                value={startTime}
                onChangeText={setStartTime}
              />
              
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Save" 
                  onPress={onSave} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'add-client':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newClientSecurityLevel) }]}>
                  {newClientSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newClientSecurityLevel,
                (value) => {
                  setNewClientSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Badge required, ID check, etc."
                value={newClientSecurity}
                onChangeText={setNewClientSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Client" 
                  onPress={onAddClient} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'add-building':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Building</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Select Client *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={[styles.inputText, !selectedClientForBuilding && styles.placeholderText]}>
                  {selectedClientForBuilding || 'Select client'}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showClientDropdown && renderDropdown(
                clients.filter(c => c.isActive).map(c => c.name),
                selectedClientForBuilding,
                (value) => {
                  setSelectedClientForBuilding(value);
                  setShowClientDropdown(false);
                },
                'Select client'
              )}
              
              <Text style={styles.inputLabel}>Building Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter building name"
                value={newBuildingName}
                onChangeText={setNewBuildingName}
              />
              
              <Text style={styles.inputLabel}>Priority Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPriorityDropdown(!showPriorityDropdown)}
              >
                <Text style={[styles.inputText, { color: getPriorityColor(newBuildingPriority) }]}>
                  {newBuildingPriority.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showPriorityDropdown && renderDropdown(
                priorityLevels,
                newBuildingPriority,
                (value) => {
                  setNewBuildingPriority(value as 'low' | 'medium' | 'high');
                  setShowPriorityDropdown(false);
                },
                'Select priority level'
              )}
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newBuildingSecurityLevel) }]}>
                  {newBuildingSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newBuildingSecurityLevel,
                (value) => {
                  setNewBuildingSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key code, access requirements, etc."
                value={newBuildingSecurity}
                onChangeText={setNewBuildingSecurity}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Building" 
                  onPress={onAddBuilding} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'add-cleaner':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Cleaner</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Cleaner Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter cleaner name"
                value={newCleanerName}
                onChangeText={setNewCleanerName}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Add Cleaner" 
                  onPress={onAddCleaner} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'edit-client':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Client</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Client Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client name"
                value={newClientName}
                onChangeText={setNewClientName}
              />
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newClientSecurityLevel) }]}>
                  {newClientSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newClientSecurityLevel,
                (value) => {
                  setNewClientSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Badge required, ID check, etc."
                value={newClientSecurity}
                onChangeText={setNewClientSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Save Changes" 
                  onPress={onEditClient} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      case 'edit-building':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Building</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Building Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter building name"
                value={newBuildingName}
                onChangeText={setNewBuildingName}
              />
              
              <Text style={styles.inputLabel}>Priority Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPriorityDropdown(!showPriorityDropdown)}
              >
                <Text style={[styles.inputText, { color: getPriorityColor(newBuildingPriority) }]}>
                  {newBuildingPriority.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showPriorityDropdown && renderDropdown(
                priorityLevels,
                newBuildingPriority,
                (value) => {
                  setNewBuildingPriority(value as 'low' | 'medium' | 'high');
                  setShowPriorityDropdown(false);
                },
                'Select priority level'
              )}
              
              <Text style={styles.inputLabel}>Security Level *</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSecurityLevelDropdown(!showSecurityLevelDropdown)}
              >
                <Text style={[styles.inputText, { color: getSecurityLevelColor(newBuildingSecurityLevel) }]}>
                  {newBuildingSecurityLevel.toUpperCase()}
                </Text>
                <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
              </TouchableOpacity>
              {showSecurityLevelDropdown && renderDropdown(
                securityLevels,
                newBuildingSecurityLevel,
                (value) => {
                  setNewBuildingSecurityLevel(value as 'low' | 'medium' | 'high');
                  setShowSecurityLevelDropdown(false);
                },
                'Select security level'
              )}
              
              <Text style={styles.inputLabel}>Security Information</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Key code, access requirements, etc."
                value={newBuildingSecurity}
                onChangeText={setNewBuildingSecurity}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <Button 
                  text="Cancel" 
                  onPress={onClose} 
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button 
                  text="Save Changes" 
                  onPress={onEditBuilding} 
                  variant="primary"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 16,
    ...commonStyles.shadow,
    maxHeight: '80%',
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  dropdownContainer: {
    marginBottom: spacing.md,
  },
  dropdown: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdownTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  detailsContainer: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    ...typography.small,
    color: colors.background,
    fontWeight: '600',
  },
});

ScheduleModal.displayName = 'ScheduleModal';

export default ScheduleModal;
