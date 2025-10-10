
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import { useClientData, type Cleaner } from '../../hooks/useClientData';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CleanerFormData {
  name: string;
  employeeId: string;
  securityLevel: 'low' | 'medium' | 'high';
  phoneNumber: string;
  email: string;
  specialties: string[];
  hireDate: string;
  defaultHourlyRate: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
}

interface CleanerVacation {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  start_date: string;
  end_date: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

const initialFormData: CleanerFormData = {
  name: '',
  employeeId: '',
  securityLevel: 'low',
  phoneNumber: '',
  email: '',
  specialties: [],
  hireDate: new Date().toISOString().split('T')[0],
  defaultHourlyRate: '15.00',
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
  const { executeQuery, config, syncStatus } = useDatabase();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSecurityLevel, setFilterSecurityLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [formData, setFormData] = useState<CleanerFormData>(initialFormData);
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [showSpecialtiesModal, setShowSpecialtiesModal] = useState(false);
  
  // Vacation management states
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [cleanerVacations, setCleanerVacations] = useState<CleanerVacation[]>([]);
  const [vacationStartDate, setVacationStartDate] = useState(new Date());
  const [vacationEndDate, setVacationEndDate] = useState(new Date());
  const [vacationReason, setVacationReason] = useState('');
  const [vacationNotes, setVacationNotes] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editingVacation, setEditingVacation] = useState<CleanerVacation | null>(null);
  const [isLoadingVacations, setIsLoadingVacations] = useState(false);

  // Filter cleaners based on search and security level
  const filteredCleaners = cleaners.filter(cleaner => {
    const matchesSearch = cleaner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cleaner.employeeId.includes(searchQuery) ||
                         cleaner.phoneNumber.includes(searchQuery);
    const matchesSecurityLevel = filterSecurityLevel === 'all' || cleaner.securityLevel === filterSecurityLevel;
    return matchesSearch && matchesSecurityLevel;
  });

  // FIXED: Load vacations for selected cleaner
  const loadCleanerVacations = useCallback(async (cleanerId: string) => {
    if (!config.useSupabase || !syncStatus.isOnline) {
      console.log('Supabase not available, skipping vacation load');
      return;
    }

    try {
      setIsLoadingVacations(true);
      console.log('╔════════════════════════════════════════╗');
      console.log('║   LOADING VACATIONS FOR CLEANER       ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Cleaner ID:', cleanerId);
      
      const result = await executeQuery<CleanerVacation>(
        'select',
        'cleaner_vacations',
        undefined,
        { cleaner_id: cleanerId }
      );
      
      console.log('✓ Vacations loaded from database:', result.length);
      console.log('Vacation data:', JSON.stringify(result, null, 2));
      
      // Update state with fresh data from database
      setCleanerVacations(result);
    } catch (error) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   VACATION LOAD FAILED                ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast('Failed to load vacations', 'error');
    } finally {
      setIsLoadingVacations(false);
    }
  }, [config.useSupabase, syncStatus.isOnline, executeQuery, showToast]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedCleaner(null);
    setCleanerVacations([]);
  }, []);

  const resetVacationForm = useCallback(() => {
    setVacationStartDate(new Date());
    setVacationEndDate(new Date());
    setVacationReason('');
    setVacationNotes('');
    setEditingVacation(null);
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
        defaultHourlyRate: parseFloat(formData.defaultHourlyRate) || 15.00,
        emergencyContact: formData.emergencyContact.name ? {
          name: formData.emergencyContact.name,
          phone: formData.emergencyContact.phone,
          relationship: ''
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
        defaultHourlyRate: parseFloat(formData.defaultHourlyRate) || 15.00,
        emergencyContact: formData.emergencyContact.name ? {
          name: formData.emergencyContact.name,
          phone: formData.emergencyContact.phone,
          relationship: ''
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

  const openEditModal = useCallback(async (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setFormData({
      name: cleaner.name,
      employeeId: cleaner.employeeId,
      securityLevel: cleaner.securityLevel,
      phoneNumber: cleaner.phoneNumber,
      email: cleaner.email || '',
      specialties: cleaner.specialties || [],
      hireDate: cleaner.hireDate || new Date().toISOString().split('T')[0],
      defaultHourlyRate: (cleaner.defaultHourlyRate || 15.00).toString(),
      emergencyContact: {
        name: cleaner.emergencyContact?.name || '',
        phone: cleaner.emergencyContact?.phone || ''
      }
    });
    
    // Load vacations for this cleaner
    await loadCleanerVacations(cleaner.id);
    
    setShowEditModal(true);
  }, [loadCleanerVacations]);

  // FIXED: Add vacation handler - properly updates state after insert
  const handleAddVacation = useCallback(async () => {
    if (!selectedCleaner) {
      showToast('No cleaner selected', 'error');
      return;
    }

    if (vacationEndDate < vacationStartDate) {
      showToast('End date must be after start date', 'error');
      return;
    }

    if (!config.useSupabase || !syncStatus.isOnline) {
      showToast('Supabase not available. Please check your connection.', 'error');
      return;
    }

    try {
      // Format dates properly as YYYY-MM-DD (DATE type in PostgreSQL)
      const startDateStr = vacationStartDate.toISOString().split('T')[0];
      const endDateStr = vacationEndDate.toISOString().split('T')[0];
      
      console.log('╔════════════════════════════════════════╗');
      console.log('║   ADDING VACATION                     ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Cleaner:', selectedCleaner.name);
      console.log('Cleaner ID:', selectedCleaner.id);
      console.log('Start Date:', startDateStr);
      console.log('End Date:', endDateStr);
      console.log('Reason:', vacationReason);

      const vacationId = `vacation-${Date.now()}`;
      
      const newVacation: CleanerVacation = {
        id: vacationId,
        cleaner_id: selectedCleaner.id,
        cleaner_name: selectedCleaner.name,
        start_date: startDateStr,
        end_date: endDateStr,
        reason: vacationReason.trim() || undefined,
        notes: vacationNotes.trim() || undefined,
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Inserting vacation:', JSON.stringify(newVacation, null, 2));

      // Insert into database
      await executeQuery<CleanerVacation>(
        'insert',
        'cleaner_vacations',
        newVacation
      );

      console.log('✓ Vacation added to database successfully');
      
      // FIXED: Update local state immediately with the new vacation
      setCleanerVacations(prevVacations => [...prevVacations, newVacation]);
      
      showToast('Vacation added successfully', 'success');
      setShowVacationModal(false);
      resetVacationForm();
    } catch (error: any) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   VACATION ADD FAILED                 ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast(`Failed to add vacation: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedCleaner, vacationStartDate, vacationEndDate, vacationReason, vacationNotes, config.useSupabase, syncStatus.isOnline, executeQuery, showToast, resetVacationForm]);

  const handleUpdateVacation = useCallback(async () => {
    if (!editingVacation || !selectedCleaner) {
      showToast('No vacation selected', 'error');
      return;
    }

    if (vacationEndDate < vacationStartDate) {
      showToast('End date must be after start date', 'error');
      return;
    }

    if (!config.useSupabase || !syncStatus.isOnline) {
      showToast('Supabase not available. Please check your connection.', 'error');
      return;
    }

    try {
      // Format dates properly as YYYY-MM-DD (DATE type in PostgreSQL)
      const startDateStr = vacationStartDate.toISOString().split('T')[0];
      const endDateStr = vacationEndDate.toISOString().split('T')[0];
      
      console.log('╔════════════════════════════════════════╗');
      console.log('║   UPDATING VACATION                   ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('Vacation ID:', editingVacation.id);
      console.log('Start Date:', startDateStr);
      console.log('End Date:', endDateStr);

      const updatedVacation = {
        start_date: startDateStr,
        end_date: endDateStr,
        reason: vacationReason.trim() || undefined,
        notes: vacationNotes.trim() || undefined,
        updated_at: new Date().toISOString(),
      };

      await executeQuery<CleanerVacation>(
        'update',
        'cleaner_vacations',
        updatedVacation,
        { id: editingVacation.id }
      );

      console.log('✓ Vacation updated successfully');
      
      // FIXED: Update local state immediately
      setCleanerVacations(prevVacations => 
        prevVacations.map(v => 
          v.id === editingVacation.id 
            ? { ...v, ...updatedVacation }
            : v
        )
      );
      
      showToast('Vacation updated successfully', 'success');
      setShowVacationModal(false);
      resetVacationForm();
    } catch (error: any) {
      console.error('╔════════════════════════════════════════╗');
      console.error('║   VACATION UPDATE FAILED              ║');
      console.error('╚════════════════════════════════════════╝');
      console.error('Error:', error);
      showToast(`Failed to update vacation: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [editingVacation, selectedCleaner, vacationStartDate, vacationEndDate, vacationReason, vacationNotes, config.useSupabase, syncStatus.isOnline, executeQuery, showToast, resetVacationForm]);

  const handleDeleteVacation = useCallback(async (vacation: CleanerVacation) => {
    if (!config.useSupabase || !syncStatus.isOnline) {
      showToast('Supabase not available. Please check your connection.', 'error');
      return;
    }

    Alert.alert(
      'Delete Vacation',
      'Are you sure you want to delete this vacation period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('╔════════════════════════════════════════╗');
              console.log('║   DELETING VACATION                   ║');
              console.log('╚════════════════════════════════════════╝');
              console.log('Vacation ID:', vacation.id);
              
              await executeQuery<CleanerVacation>(
                'delete',
                'cleaner_vacations',
                undefined,
                { id: vacation.id }
              );

              console.log('✓ Vacation deleted successfully');
              
              // FIXED: Update local state immediately
              setCleanerVacations(prevVacations => 
                prevVacations.filter(v => v.id !== vacation.id)
              );
              
              showToast('Vacation deleted successfully', 'success');
            } catch (error: any) {
              console.error('╔════════════════════════════════════════╗');
              console.error('║   VACATION DELETE FAILED              ║');
              console.error('╚════════════════════════════════════════╝');
              console.error('Error:', error);
              showToast(`Failed to delete vacation: ${error?.message || 'Unknown error'}`, 'error');
            }
          }
        }
      ]
    );
  }, [config.useSupabase, syncStatus.isOnline, executeQuery, showToast]);

  const openVacationModal = useCallback((vacation?: CleanerVacation) => {
    if (vacation) {
      setEditingVacation(vacation);
      // Parse date strings properly (they're in YYYY-MM-DD format)
      setVacationStartDate(new Date(vacation.start_date + 'T12:00:00'));
      setVacationEndDate(new Date(vacation.end_date + 'T12:00:00'));
      setVacationReason(vacation.reason || '');
      setVacationNotes(vacation.notes || '');
    } else {
      resetVacationForm();
    }
    setShowVacationModal(true);
  }, [resetVacationForm]);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getVacationStatus = (vacation: CleanerVacation) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(vacation.start_date + 'T12:00:00');
    const end = new Date(vacation.end_date + 'T12:00:00');
    
    if (vacation.status === 'cancelled') return 'Cancelled';
    if (today < start) return 'Upcoming';
    if (today > end) return 'Past';
    return 'Active';
  };

  const getVacationStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return colors.success;
      case 'Upcoming': return colors.primary;
      case 'Past': return colors.textSecondary;
      case 'Cancelled': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  // Handle date picker changes for native platforms
  const handleStartDateChange = useCallback((event: any, selectedDate?: Date) => {
    console.log('Start date picker event:', event.type, selectedDate);
    
    setShowStartDatePicker(Platform.OS === 'ios');
    
    if (selectedDate && event.type !== 'dismissed') {
      setVacationStartDate(selectedDate);
      console.log('Start date set to:', selectedDate.toISOString().split('T')[0]);
    }
  }, []);

  const handleEndDateChange = useCallback((event: any, selectedDate?: Date) => {
    console.log('End date picker event:', event.type, selectedDate);
    
    setShowEndDatePicker(Platform.OS === 'ios');
    
    if (selectedDate && event.type !== 'dismissed') {
      setVacationEndDate(selectedDate);
      console.log('End date set to:', selectedDate.toISOString().split('T')[0]);
    }
  }, []);

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
                    {cleaner.defaultHourlyRate && (
                      <View style={styles.hourlyRateBadge}>
                        <Icon name="cash" size={12} style={{ color: colors.success }} />
                        <Text style={styles.hourlyRateText}>
                          ${cleaner.defaultHourlyRate.toFixed(2)}/hr
                        </Text>
                      </View>
                    )}
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

                  <Text style={styles.inputLabel}>Default Hourly Rate ($)</Text>
                  <View style={styles.hourlyRateInputContainer}>
                    <Icon name="cash" size={20} style={{ color: colors.success }} />
                    <TextInput
                      style={[styles.input, styles.hourlyRateInput]}
                      placeholder="15.00"
                      value={formData.defaultHourlyRate}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, defaultHourlyRate: text }))}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    This rate will be used by default when scheduling hourly shifts
                  </Text>

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

                {/* Vacation Management - Only show in edit mode */}
                {showEditModal && selectedCleaner && config.useSupabase && syncStatus.isOnline && (
                  <View style={styles.formSection}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Vacation Management</Text>
                      <TouchableOpacity
                        style={styles.addVacationButton}
                        onPress={() => openVacationModal()}
                      >
                        <Icon name="add-circle" size={20} style={{ color: colors.primary }} />
                        <Text style={styles.addVacationButtonText}>Add Vacation</Text>
                      </TouchableOpacity>
                    </View>

                    {isLoadingVacations ? (
                      <View style={styles.loadingVacationsContainer}>
                        <LoadingSpinner />
                        <Text style={styles.loadingVacationsText}>Loading vacations...</Text>
                      </View>
                    ) : cleanerVacations.length > 0 ? (
                      <View style={styles.vacationsList}>
                        {cleanerVacations.map((vacation) => {
                          const status = getVacationStatus(vacation);
                          const statusColor = getVacationStatusColor(status);
                          
                          return (
                            <View key={vacation.id} style={styles.vacationCard}>
                              <View style={styles.vacationHeader}>
                                <View style={[styles.vacationStatusBadge, { backgroundColor: statusColor + '20' }]}>
                                  <Text style={[styles.vacationStatusText, { color: statusColor }]}>
                                    {status}
                                  </Text>
                                </View>
                                <View style={styles.vacationActions}>
                                  <TouchableOpacity
                                    onPress={() => openVacationModal(vacation)}
                                    style={styles.vacationActionButton}
                                  >
                                    <Icon name="create" size={16} style={{ color: colors.primary }} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => handleDeleteVacation(vacation)}
                                    style={styles.vacationActionButton}
                                  >
                                    <Icon name="trash" size={16} style={{ color: colors.danger }} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              
                              <View style={styles.vacationDates}>
                                <View style={styles.vacationDateItem}>
                                  <Icon name="calendar-outline" size={14} style={{ color: colors.textSecondary }} />
                                  <Text style={styles.vacationDateText}>
                                    {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)}
                                  </Text>
                                </View>
                              </View>

                              {vacation.reason && (
                                <View style={styles.vacationDetail}>
                                  <Text style={styles.vacationDetailLabel}>Reason:</Text>
                                  <Text style={styles.vacationDetailText}>{vacation.reason}</Text>
                                </View>
                              )}

                              {vacation.notes && (
                                <View style={styles.vacationDetail}>
                                  <Text style={styles.vacationDetailLabel}>Notes:</Text>
                                  <Text style={styles.vacationDetailText}>{vacation.notes}</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.noVacationsContainer}>
                        <Icon name="calendar-outline" size={32} style={{ color: colors.textSecondary }} />
                        <Text style={styles.noVacationsText}>No vacations scheduled</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Show message if Supabase is not available */}
                {showEditModal && selectedCleaner && (!config.useSupabase || !syncStatus.isOnline) && (
                  <View style={styles.formSection}>
                    <View style={styles.offlineNotice}>
                      <Icon name="cloud-offline" size={24} style={{ color: colors.warning }} />
                      <Text style={styles.offlineNoticeText}>
                        Vacation management requires an active connection to the database.
                      </Text>
                    </View>
                  </View>
                )}

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

      {/* Vacation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showVacationModal}
        onRequestClose={() => {
          setShowVacationModal(false);
          resetVacationForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {editingVacation ? 'Edit Vacation' : 'Add Vacation'}
                </Text>

                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Start Date *</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={vacationStartDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value + 'T12:00:00');
                        if (!isNaN(date.getTime())) {
                          setVacationStartDate(date);
                        }
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: spacing.md,
                        fontSize: 16,
                        backgroundColor: colors.background,
                        color: colors.text,
                        marginBottom: spacing.md,
                        width: '100%',
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <View style={styles.inputRow}>
                        <Icon name="calendar" size={20} style={{ color: colors.primary }} />
                        <Text style={styles.inputText}>
                          {vacationStartDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.inputLabel}>End Date *</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={vacationEndDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const date = new Date(e.target.value + 'T12:00:00');
                        if (!isNaN(date.getTime())) {
                          setVacationEndDate(date);
                        }
                      }}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        padding: spacing.md,
                        fontSize: 16,
                        backgroundColor: colors.background,
                        color: colors.text,
                        marginBottom: spacing.md,
                        width: '100%',
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <View style={styles.inputRow}>
                        <Icon name="calendar" size={20} style={{ color: colors.primary }} />
                        <Text style={styles.inputText}>
                          {vacationEndDate.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.inputLabel}>Reason</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Annual Leave, Sick Leave"
                    value={vacationReason}
                    onChangeText={setVacationReason}
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Additional notes..."
                    value={vacationNotes}
                    onChangeText={setVacationNotes}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button
                    text="Cancel"
                    onPress={() => {
                      setShowVacationModal(false);
                      resetVacationForm();
                    }}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                  <Button
                    text={editingVacation ? 'Update' : 'Add'}
                    onPress={editingVacation ? handleUpdateVacation : handleAddVacation}
                    variant="primary"
                    style={styles.actionButton}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Pickers - Only for iOS and Android */}
      {Platform.OS !== 'web' && showStartDatePicker && (
        <DateTimePicker
          value={vacationStartDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS !== 'web' && showEndDatePicker && (
        <DateTimePicker
          value={vacationEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={vacationStartDate}
        />
      )}

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
  hourlyRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  hourlyRateText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '600',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  hourlyRateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  hourlyRateInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  inputHint: {
    ...typography.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
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
  addVacationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
  },
  addVacationButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingVacationsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingVacationsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  vacationsList: {
    gap: spacing.md,
  },
  vacationCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vacationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vacationStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  vacationStatusText: {
    ...typography.small,
    fontWeight: '600',
  },
  vacationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  vacationActionButton: {
    padding: spacing.xs,
  },
  vacationDates: {
    marginBottom: spacing.sm,
  },
  vacationDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vacationDateText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  vacationDetail: {
    marginTop: spacing.xs,
  },
  vacationDetailLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  vacationDetailText: {
    ...typography.body,
    color: colors.text,
  },
  noVacationsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noVacationsText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  offlineNoticeText: {
    ...typography.body,
    color: colors.warning,
    flex: 1,
  },
});
