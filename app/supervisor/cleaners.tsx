
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import { useClientData, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CleanerFormData {
  name: string;
  employeeId: string;
  securityLevel: 'low' | 'medium' | 'high';
  phoneNumber: string;
  email: string;
  specialties: string[];
  hireDate: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
}

const initialFormData: CleanerFormData = {
  name: '',
  employeeId: '',
  securityLevel: 'low',
  phoneNumber: '',
  email: '',
  specialties: [],
  hireDate: new Date().toISOString().split('T')[0],
  emergencyContact: {
    name: '',
    phone: ''
  }
};

const securityLevels = ['low', 'medium', 'high'] as const;
const specialtyOptions = [
  'Office Cleaning',
  'Deep Cleaning',
  'Medical Facilities',
  'Sanitization',
  'Industrial',
  'Equipment Maintenance',
  'Carpet Cleaning',
  'Window Cleaning',
  'Floor Care',
  'Restroom Maintenance'
];

export default function CleanersScreen() {
  console.log('CleanersScreen rendered');
  
  const { cleaners, isLoading, addCleaner, updateCleaner, deleteCleaner } = useClientData();
  const { toast, showToast, hideToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSecurityLevel, setFilterSecurityLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [formData, setFormData] = useState<CleanerFormData>(initialFormData);
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [showSpecialtiesModal, setShowSpecialtiesModal] = useState(false);

  // Filter cleaners based on search and security level
  const filteredCleaners = cleaners.filter(cleaner => {
    const matchesSearch = cleaner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cleaner.employeeId.includes(searchQuery) ||
                         cleaner.phoneNumber.includes(searchQuery);
    const matchesSecurityLevel = filterSecurityLevel === 'all' || cleaner.securityLevel === filterSecurityLevel;
    return matchesSearch && matchesSecurityLevel;
  });

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedCleaner(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      showToast('Name is required', 'error');
      return false;
    }
    if (!formData.employeeId.trim()) {
      showToast('Employee ID is required', 'error');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return false;
    }
    
    // Check for duplicate employee ID
    const existingCleaner = cleaners.find(c => 
      c.employeeId === formData.employeeId && 
      (!selectedCleaner || c.id !== selectedCleaner.id)
    );
    if (existingCleaner) {
      showToast('Employee ID already exists', 'error');
      return false;
    }
    
    return true;
  }, [formData, cleaners, selectedCleaner, showToast]);

  const handleAddCleaner = useCallback(async () => {
    console.log('Adding cleaner with data:', formData);
    
    if (!validateForm()) return;

    try {
      const newCleaner: Cleaner = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim(),
        securityLevel: formData.securityLevel,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        specialties: formData.specialties,
        hireDate: formData.hireDate,
        emergencyContact: formData.emergencyContact.name ? {
          name: formData.emergencyContact.name,
          phone: formData.emergencyContact.phone,
          relationship: '' // Keep empty since we removed relationship
        } : undefined,
        isActive: true
      };

      await addCleaner(newCleaner);
      setShowAddModal(false);
      resetForm();
      showToast('Cleaner added successfully', 'success');
    } catch (error) {
      console.error('Error adding cleaner:', error);
      showToast('Failed to add cleaner', 'error');
    }
  }, [formData, validateForm, addCleaner, resetForm, showToast]);

  const handleEditCleaner = useCallback(async () => {
    console.log('Editing cleaner with data:', formData);
    
    if (!selectedCleaner || !validateForm()) return;

    try {
      const updatedCleaner: Partial<Cleaner> = {
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim(),
        securityLevel: formData.securityLevel,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        specialties: formData.specialties,
        hireDate: formData.hireDate,
        emergencyContact: formData.emergencyContact.name ? {
          name: formData.emergencyContact.name,
          phone: formData.emergencyContact.phone,
          relationship: '' // Keep empty since we removed relationship
        } : undefined
      };

      await updateCleaner(selectedCleaner.id, updatedCleaner);
      setShowEditModal(false);
      resetForm();
      showToast('Cleaner updated successfully', 'success');
    } catch (error) {
      console.error('Error updating cleaner:', error);
      showToast('Failed to update cleaner', 'error');
    }
  }, [selectedCleaner, formData, validateForm, updateCleaner, resetForm, showToast]);

  const handleDeleteCleaner = useCallback((cleaner: Cleaner) => {
    Alert.alert(
      'Delete Cleaner',
      `Are you sure you want to delete ${cleaner.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCleaner(cleaner.id);
              showToast('Cleaner deleted successfully', 'success');
            } catch (error) {
              console.error('Error deleting cleaner:', error);
              showToast('Failed to delete cleaner', 'error');
            }
          }
        }
      ]
    );
  }, [deleteCleaner, showToast]);

  const openEditModal = useCallback((cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setFormData({
      name: cleaner.name,
      employeeId: cleaner.employeeId,
      securityLevel: cleaner.securityLevel,
      phoneNumber: cleaner.phoneNumber,
      email: cleaner.email || '',
      specialties: cleaner.specialties || [],
      hireDate: cleaner.hireDate || new Date().toISOString().split('T')[0],
      emergencyContact: {
        name: cleaner.emergencyContact?.name || '',
        phone: cleaner.emergencyContact?.phone || ''
      }
    });
    setShowEditModal(true);
  }, []);

  const toggleSpecialty = useCallback((specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  }, []);

  const addCustomSpecialty = useCallback((customSpecialty: string) => {
    if (customSpecialty.trim() && !formData.specialties.includes(customSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, customSpecialty.trim()]
      }));
    }
  }, [formData.specialties]);

  const removeSpecialty = useCallback((specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  }, []);

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return 'shield-checkmark';
      case 'medium': return 'shield-half';
      case 'low': return 'shield-outline';
      default: return 'shield-outline';
    }
  };

  const canAccessJob = (cleanerLevel: string, jobLevel: string): boolean => {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[cleanerLevel as keyof typeof levels] >= levels[jobLevel as keyof typeof levels];
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Loading cleaners...
        </Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Toast {...toast} onHide={hideToast} />
      
      {/* Header */}
      <View style={commonStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Cleaner Management</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="add" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      <View style={commonStyles.content}>
        {/* Search and Filter */}
        <AnimatedCard index={0}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} style={{ color: colors.textSecondary }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, ID, or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.filterButton, filterSecurityLevel !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowSecurityDropdown(!showSecurityDropdown)}
            >
              <Icon name="filter" size={20} style={{ color: filterSecurityLevel !== 'all' ? colors.background : colors.textSecondary }} />
            </TouchableOpacity>
          </View>

          {showSecurityDropdown && (
            <View style={styles.filterDropdown}>
              <TouchableOpacity
                style={[styles.filterOption, filterSecurityLevel === 'all' && styles.filterOptionActive]}
                onPress={() => {
                  setFilterSecurityLevel('all');
                  setShowSecurityDropdown(false);
                }}
              >
                <Text style={[styles.filterOptionText, filterSecurityLevel === 'all' && styles.filterOptionTextActive]}>
                  All Security Levels
                </Text>
              </TouchableOpacity>
              {securityLevels.map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.filterOption, filterSecurityLevel === level && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterSecurityLevel(level);
                    setShowSecurityDropdown(false);
                  }}
                >
                  <Icon 
                    name={getSecurityLevelIcon(level)} 
                    size={16} 
                    style={{ color: filterSecurityLevel === level ? colors.background : getSecurityLevelColor(level) }} 
                  />
                  <Text style={[
                    styles.filterOptionText, 
                    filterSecurityLevel === level && styles.filterOptionTextActive,
                    { color: filterSecurityLevel === level ? colors.background : getSecurityLevelColor(level) }
                  ]}>
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </AnimatedCard>

        {/* Stats */}
        <AnimatedCard index={1}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cleaners.length}</Text>
              <Text style={styles.statLabel}>Total Cleaners</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cleaners.filter(c => c.isActive).length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.danger }]}>
                {cleaners.filter(c => c.securityLevel === 'high').length}
              </Text>
              <Text style={styles.statLabel}>High Security</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {cleaners.filter(c => c.securityLevel === 'medium').length}
              </Text>
              <Text style={styles.statLabel}>Medium Security</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Cleaners List */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredCleaners.map((cleaner, index) => (
            <AnimatedCard key={cleaner.id} index={index + 2}>
              <TouchableOpacity
                style={styles.cleanerCard}
                onPress={() => openEditModal(cleaner)}
              >
                <View style={styles.cleanerHeader}>
                  <View style={styles.cleanerInfo}>
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                    <Text style={styles.cleanerEmployeeId}>ID: {cleaner.employeeId}</Text>
                  </View>
                  
                  <View style={styles.cleanerActions}>
                    <View style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(cleaner.securityLevel) + '20' }]}>
                      <Icon 
                        name={getSecurityLevelIcon(cleaner.securityLevel)} 
                        size={14} 
                        style={{ color: getSecurityLevelColor(cleaner.securityLevel) }} 
                      />
                      <Text style={[styles.securityBadgeText, { color: getSecurityLevelColor(cleaner.securityLevel) }]}>
                        {cleaner.securityLevel.toUpperCase()}
                      </Text>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCleaner(cleaner)}
                    >
                      <Icon name="trash" size={16} style={{ color: colors.danger }} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cleanerDetails}>
                  <View style={styles.detailRow}>
                    <Icon name="call" size={14} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>{cleaner.phoneNumber}</Text>
                  </View>
                  
                  {cleaner.email && (
                    <View style={styles.detailRow}>
                      <Icon name="mail" size={14} style={{ color: colors.textSecondary }} />
                      <Text style={styles.detailText}>{cleaner.email}</Text>
                    </View>
                  )}
                  
                  <View style={styles.detailRow}>
                    <Icon name="calendar" size={14} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>
                      Hired: {cleaner.hireDate ? new Date(cleaner.hireDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </View>

                {cleaner.specialties && cleaner.specialties.length > 0 && (
                  <View style={styles.specialtiesContainer}>
                    {cleaner.specialties.slice(0, 3).map((specialty, idx) => (
                      <View key={idx} style={styles.specialtyChip}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                    {cleaner.specialties.length > 3 && (
                      <View style={styles.specialtyChip}>
                        <Text style={styles.specialtyText}>+{cleaner.specialties.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Security Access Info */}
                <View style={styles.accessInfo}>
                  <Text style={styles.accessInfoTitle}>Can access jobs with security level:</Text>
                  <View style={styles.accessLevels}>
                    {securityLevels.map(level => (
                      <View
                        key={level}
                        style={[
                          styles.accessLevel,
                          {
                            backgroundColor: canAccessJob(cleaner.securityLevel, level)
                              ? getSecurityLevelColor(level) + '20'
                              : colors.textSecondary + '10'
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.accessLevelText,
                            {
                              color: canAccessJob(cleaner.securityLevel, level)
                                ? getSecurityLevelColor(level)
                                : colors.textSecondary
                            }
                          ]}
                        >
                          {level.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))}

          {filteredCleaners.length === 0 && (
            <AnimatedCard index={2}>
              <View style={styles.emptyState}>
                <Icon name="people" size={48} style={{ color: colors.textSecondary }} />
                <Text style={styles.emptyStateTitle}>No cleaners found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery || filterSecurityLevel !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Add your first cleaner to get started'
                  }
                </Text>
              </View>
            </AnimatedCard>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Cleaner Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal || showEditModal}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {showAddModal ? 'Add New Cleaner' : 'Edit Cleaner'}
                </Text>

                {/* Basic Information */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Basic Information</Text>
                  
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter full name"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Employee ID *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter employee ID"
                    value={formData.employeeId}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, employeeId: text }))}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Security Level *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowSecurityDropdown(!showSecurityDropdown)}
                  >
                    <View style={styles.inputRow}>
                      <Icon 
                        name={getSecurityLevelIcon(formData.securityLevel)} 
                        size={20} 
                        style={{ color: getSecurityLevelColor(formData.securityLevel) }} 
                      />
                      <Text style={[styles.inputText, { color: getSecurityLevelColor(formData.securityLevel) }]}>
                        {formData.securityLevel.toUpperCase()}
                      </Text>
                      <Icon name="chevron-down" size={20} style={{ color: colors.textSecondary }} />
                    </View>
                  </TouchableOpacity>

                  {showSecurityDropdown && (
                    <View style={styles.dropdown}>
                      {securityLevels.map(level => (
                        <TouchableOpacity
                          key={level}
                          style={[styles.dropdownItem, formData.securityLevel === level && styles.dropdownItemSelected]}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, securityLevel: level }));
                            setShowSecurityDropdown(false);
                          }}
                        >
                          <Icon 
                            name={getSecurityLevelIcon(level)} 
                            size={16} 
                            style={{ color: formData.securityLevel === level ? colors.background : getSecurityLevelColor(level) }} 
                          />
                          <Text style={[
                            styles.dropdownText,
                            formData.securityLevel === level && styles.dropdownTextSelected,
                            { color: formData.securityLevel === level ? colors.background : getSecurityLevelColor(level) }
                          ]}>
                            {level.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Contact Information */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                  
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (555) 123-4567"
                    value={formData.phoneNumber}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    value={formData.email}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Employment Information */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Employment Information</Text>
                  
                  <Text style={styles.inputLabel}>Hire Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={formData.hireDate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, hireDate: text }))}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Specialties</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowSpecialtiesModal(true)}
                  >
                    <Text style={[styles.inputText, formData.specialties.length === 0 && styles.placeholderText]}>
                      {formData.specialties.length > 0 
                        ? `${formData.specialties.length} specialties selected`
                        : 'Select specialties'
                      }
                    </Text>
                    <Icon name="chevron-forward" size={20} style={{ color: colors.textSecondary }} />
                  </TouchableOpacity>

                  {formData.specialties.length > 0 && (
                    <View style={styles.selectedSpecialties}>
                      {formData.specialties.map((specialty, idx) => (
                        <View key={idx} style={styles.specialtyChipWithRemove}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                          <TouchableOpacity
                            onPress={() => removeSpecialty(specialty)}
                            style={styles.removeSpecialtyButton}
                          >
                            <Icon name="close" size={14} style={{ color: colors.primary }} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Emergency Contact */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Emergency Contact</Text>
                  
                  <Text style={styles.inputLabel}>Contact Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter contact name"
                    value={formData.emergencyContact.name}
                    onChangeText={(text) => setFormData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, name: text }
                    }))}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Contact Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (555) 987-6543"
                    value={formData.emergencyContact.phone}
                    onChangeText={(text) => setFormData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, phone: text }
                    }))}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <Button
                    text="Cancel"
                    onPress={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  <Button
                    text={showAddModal ? 'Add Cleaner' : 'Save Changes'}
                    onPress={showAddModal ? handleAddCleaner : handleEditCleaner}
                    variant="primary"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Specialties Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSpecialtiesModal}
        onRequestClose={() => setShowSpecialtiesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manage Specialties</Text>
              
              <ScrollView style={styles.specialtiesScrollView}>
                <Text style={styles.sectionTitle}>Available Specialties</Text>
                {specialtyOptions.map(specialty => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.specialtyOption,
                      formData.specialties.includes(specialty) && styles.specialtyOptionSelected
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text style={[
                      styles.specialtyOptionText,
                      formData.specialties.includes(specialty) && styles.specialtyOptionTextSelected
                    ]}>
                      {specialty}
                    </Text>
                    <Icon
                      name={formData.specialties.includes(specialty) ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      style={{
                        color: formData.specialties.includes(specialty) ? colors.background : colors.textSecondary
                      }}
                    />
                  </TouchableOpacity>
                ))}

                {/* Custom Specialty Input */}
                <View style={styles.customSpecialtySection}>
                  <Text style={styles.sectionTitle}>Add Custom Specialty</Text>
                  <View style={styles.customSpecialtyInput}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, marginRight: spacing.sm }]}
                      placeholder="Enter custom specialty"
                      placeholderTextColor={colors.textSecondary}
                      onSubmitEditing={(event) => {
                        addCustomSpecialty(event.nativeEvent.text);
                        event.target.clear();
                      }}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  text="Done"
                  onPress={() => setShowSpecialtiesModal(false)}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterDropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...commonStyles.shadow,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cleanerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
  },
  cleanerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cleanerEmployeeId: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cleanerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  securityBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  cleanerDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  specialtyChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  specialtyChipWithRemove: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  specialtyText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  removeSpecialtyButton: {
    padding: 2,
  },
  accessInfo: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  accessInfoTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  accessLevels: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  accessLevel: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  accessLevelText: {
    ...typography.small,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: colors.background,
    borderRadius: 16,
    maxHeight: '90%',
    ...commonStyles.shadow,
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
  formSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  selectedSpecialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  specialtiesScrollView: {
    maxHeight: 400,
    marginBottom: spacing.lg,
  },
  specialtyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specialtyOptionSelected: {
    backgroundColor: colors.primary,
  },
  specialtyOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  specialtyOptionTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  customSpecialtySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customSpecialtyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
