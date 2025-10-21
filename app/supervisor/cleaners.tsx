
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform, Switch, Image } from 'react-native';
import { router } from 'expo-router';
import Icon from '../../components/Icon';
import { useToast } from '../../hooks/useToast';
import { useClientData, type Cleaner, type EmploymentHistory } from '../../hooks/useClientData';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import { useDatabase } from '../../hooks/useDatabase';
import CompanyLogo from '../../components/CompanyLogo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../hooks/useTheme';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CompensationRecord {
  id: string;
  employee_id: string;
  pay_type: 'hourly' | 'salary' | 'contract';
  rate: number;
  effective_date: string;
  end_date?: string;
  notes?: string;
}

export default function CleanersScreen() {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery, config, syncStatus } = useDatabase();
  const { cleaners, addCleaner, updateCleaner, deleteCleaner, loadData } = useClientData();

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'hireDate' | 'termDate' | 'rehireDate' | 'dob' | null>(null);
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>([]);
  const [compensationHistory, setCompensationHistory] = useState<CompensationRecord[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    go_by: '',
    dob: '',
    employeeId: '',
    securityLevel: 'low' as 'low' | 'medium' | 'high',
    phoneNumber: '',
    email: '',
    defaultHourlyRate: '15',
    hireDate: '',
    termDate: '',
    rehireDate: '',
    employment_status: 'active' as 'active' | 'terminated' | 'on-leave' | 'suspended',
    pay_type: 'hourly' as 'hourly' | 'salary' | 'contract',
    specialties: [] as string[],
    isActive: true,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    notes: '',
    photo_url: '',
  });

  const loadCleaners = useCallback(async () => {
    try {
      setIsLoading(true);
      await loadData();
    } catch (error) {
      console.error('Error loading cleaners:', error);
      showToast('Failed to load cleaners', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showToast]);

  const loadEmploymentHistory = useCallback(async (cleanerId: string) => {
    try {
      const history = await executeQuery<EmploymentHistory>('select', 'employment_history', {
        filters: { cleaner_id: cleanerId }
      });
      setEmploymentHistory(history || []);
    } catch (error) {
      console.error('Error loading employment history:', error);
      setEmploymentHistory([]);
    }
  }, [executeQuery]);

  const loadCompensationHistory = useCallback(async (cleanerId: string) => {
    try {
      const history = await executeQuery<CompensationRecord>('select', 'compensation', {
        filters: { cleaner_id: cleanerId }
      });
      setCompensationHistory(history || []);
    } catch (error) {
      console.error('Error loading compensation history:', error);
      setCompensationHistory([]);
    }
  }, [executeQuery]);

  useEffect(() => {
    loadCleaners();
  }, [loadCleaners]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      legal_name: '',
      go_by: '',
      dob: '',
      employeeId: '',
      securityLevel: 'low',
      phoneNumber: '',
      email: '',
      defaultHourlyRate: '15',
      hireDate: '',
      termDate: '',
      rehireDate: '',
      employment_status: 'active',
      pay_type: 'hourly',
      specialties: [],
      isActive: true,
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      notes: '',
      photo_url: '',
    });
  }, []);

  const handleAddCleaner = useCallback(async () => {
    try {
      if (!formData.name.trim()) {
        showToast('Please enter a name', 'error');
        return;
      }

      console.log('Adding cleaner...');

      const newCleaner: Omit<Cleaner, 'id'> = {
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || undefined,
        go_by: formData.go_by.trim() || undefined,
        dob: formData.dob || undefined,
        employeeId: formData.employeeId.trim() || `EMP-${Date.now()}`,
        securityLevel: formData.securityLevel,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        defaultHourlyRate: parseFloat(formData.defaultHourlyRate) || 15,
        hireDate: formData.hireDate || undefined,
        term_date: formData.termDate || undefined,
        rehire_date: formData.rehireDate || undefined,
        employment_status: formData.employment_status,
        pay_type: formData.pay_type,
        specialties: formData.specialties,
        isActive: formData.isActive,
        emergencyContact: formData.emergencyContactName.trim() ? {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relationship: formData.emergencyContactRelationship.trim() || undefined,
        } : undefined,
        notes: formData.notes.trim() || undefined,
        photo_url: formData.photo_url.trim() || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addCleaner(newCleaner);

      console.log('✓ Cleaner added successfully');
      showToast('Cleaner added successfully', 'success');
      
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding cleaner:', error);
      showToast(`Failed to add cleaner: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [formData, addCleaner, showToast, resetForm]);

  const handleUpdateCleaner = useCallback(async () => {
    try {
      if (!selectedCleaner || !formData.name.trim()) {
        showToast('Please enter a name', 'error');
        return;
      }

      console.log('Updating cleaner...');

      const updates: Partial<Cleaner> = {
        name: formData.name.trim(),
        legal_name: formData.legal_name.trim() || undefined,
        go_by: formData.go_by.trim() || undefined,
        dob: formData.dob || undefined,
        employeeId: formData.employeeId.trim(),
        securityLevel: formData.securityLevel,
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        defaultHourlyRate: parseFloat(formData.defaultHourlyRate) || 15,
        hireDate: formData.hireDate || undefined,
        term_date: formData.termDate || undefined,
        rehire_date: formData.rehireDate || undefined,
        employment_status: formData.employment_status,
        pay_type: formData.pay_type,
        specialties: formData.specialties,
        isActive: formData.isActive,
        emergencyContact: formData.emergencyContactName.trim() ? {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relationship: formData.emergencyContactRelationship.trim() || undefined,
        } : undefined,
        notes: formData.notes.trim() || undefined,
        photo_url: formData.photo_url.trim() || undefined,
        updatedAt: new Date(),
      };

      await updateCleaner(selectedCleaner.id, updates);

      console.log('✓ Cleaner updated successfully');
      showToast('Cleaner updated successfully', 'success');
      
      setShowEditModal(false);
      setSelectedCleaner(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating cleaner:', error);
      showToast(`Failed to update cleaner: ${error?.message || 'Unknown error'}`, 'error');
    }
  }, [selectedCleaner, formData, updateCleaner, showToast, resetForm]);

  const handleDeleteCleaner = useCallback(async (cleanerId: string) => {
    Alert.alert(
      'Delete Cleaner',
      'Are you sure you want to delete this cleaner? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting cleaner...');
              
              await deleteCleaner(cleanerId);
              
              console.log('✓ Cleaner deleted successfully');
              showToast('Cleaner deleted successfully', 'success');
            } catch (error: any) {
              console.error('Error deleting cleaner:', error);
              showToast(`Failed to delete cleaner: ${error?.message || 'Unknown error'}`, 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [deleteCleaner, showToast]);

  const openEditModal = useCallback((cleaner: Cleaner) => {
    console.log('Opening edit modal for cleaner:', cleaner.id);
    setSelectedCleaner(cleaner);
    
    setFormData({
      name: cleaner.name,
      legal_name: cleaner.legal_name || '',
      go_by: cleaner.go_by || '',
      dob: cleaner.dob || '',
      employeeId: cleaner.employeeId,
      securityLevel: cleaner.securityLevel,
      phoneNumber: cleaner.phoneNumber,
      email: cleaner.email || '',
      defaultHourlyRate: (cleaner.defaultHourlyRate || 15).toString(),
      hireDate: cleaner.hireDate || '',
      termDate: cleaner.term_date || '',
      rehireDate: cleaner.rehire_date || '',
      employment_status: cleaner.employment_status || 'active',
      pay_type: cleaner.pay_type || 'hourly',
      specialties: cleaner.specialties || [],
      isActive: cleaner.isActive,
      emergencyContactName: cleaner.emergencyContact?.name || '',
      emergencyContactPhone: cleaner.emergencyContact?.phone || '',
      emergencyContactRelationship: cleaner.emergencyContact?.relationship || '',
      notes: cleaner.notes || '',
      photo_url: cleaner.photo_url || '',
    });
    setShowEditModal(true);
  }, []);

  const openDetailsModal = useCallback(async (cleaner: Cleaner) => {
    console.log('Opening details modal for cleaner:', cleaner.id);
    setSelectedCleaner(cleaner);
    await loadEmploymentHistory(cleaner.id);
    await loadCompensationHistory(cleaner.id);
    setShowDetailsModal(true);
  }, [loadEmploymentHistory, loadCompensationHistory]);

  const toggleSpecialty = useCallback((specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  }, []);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate && datePickerField) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      if (datePickerField === 'hireDate') {
        setFormData(prev => ({ ...prev, hireDate: dateStr }));
      } else if (datePickerField === 'termDate') {
        setFormData(prev => ({ ...prev, termDate: dateStr }));
      } else if (datePickerField === 'rehireDate') {
        setFormData(prev => ({ ...prev, rehireDate: dateStr }));
      } else if (datePickerField === 'dob') {
        setFormData(prev => ({ ...prev, dob: dateStr }));
      }
      
      setDatePickerField(null);
    }
  }, [datePickerField]);

  const filteredCleaners = cleaners.filter(cleaner => {
    const matchesSearch = cleaner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cleaner.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (cleaner.email && cleaner.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && cleaner.isActive) ||
                         (filterStatus === 'inactive' && !cleaner.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getEmploymentStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'terminated':
        return colors.danger;
      case 'on-leave':
        return colors.warning;
      case 'suspended':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading cleaners..." />;
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
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputContainer: {
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
    cleanerCard: {
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cleanerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    cleanerHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    cleanerPhoto: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.border,
    },
    cleanerName: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    badgeContainer: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    securityBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
    },
    badgeText: {
      ...typography.small,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    cleanerDetails: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    detailText: {
      ...typography.small,
      color: colors.textSecondary,
    },
    specialtiesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    specialtyChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 8,
      backgroundColor: themeColor + '20',
    },
    specialtyText: {
      ...typography.small,
      color: themeColor,
      fontWeight: '500',
    },
    cleanerActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    actionButtonText: {
      ...typography.small,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: spacing.lg,
      ...commonStyles.shadow,
    },
    modalTitle: {
      ...typography.h2,
      color: colors.text,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    inputLabel: {
      ...typography.body,
      color: colors.text,
      fontWeight: '500',
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    modalButton: {
      flex: 1,
    },
    sectionHeader: {
      ...typography.h3,
      color: colors.text,
      fontWeight: '600',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    specialtySelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    specialtyOption: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    specialtyOptionActive: {
      backgroundColor: themeColor,
      borderColor: themeColor,
    },
    specialtyOptionText: {
      ...typography.small,
      color: colors.text,
      fontWeight: '500',
    },
    specialtyOptionTextActive: {
      color: colors.background,
      fontWeight: '600',
    },
    dateButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
    },
    dateButtonText: {
      ...typography.body,
      color: colors.text,
    },
    historySection: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: 8,
    },
    historyItem: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyItemLast: {
      borderBottomWidth: 0,
    },
    historyTitle: {
      ...typography.bodyMedium,
      color: colors.text,
      fontWeight: '600',
    },
    historySubtitle: {
      ...typography.small,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
  });

  const specialtyOptions = [
    'Office Cleaning',
    'Deep Cleaning',
    'Medical Facilities',
    'Sanitization',
    'Industrial',
    'Equipment Maintenance',
    'Floor Care',
    'Window Cleaning',
    'Carpet Cleaning',
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Cleaners</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log('Add button pressed');
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Icon name="add" size={24} style={{ color: colors.background }} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cleaners..."
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
              All
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

      {/* Cleaners List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredCleaners.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} style={{ color: colors.textSecondary }} />
            <Text style={styles.emptyStateText}>No cleaners found</Text>
            <Button 
              text="Add Cleaner" 
              onPress={() => {
                console.log('Add Cleaner button pressed');
                resetForm();
                setShowAddModal(true);
              }} 
              variant="primary" 
            />
          </View>
        ) : (
          filteredCleaners.map((cleaner) => (
            <AnimatedCard key={cleaner.id} style={styles.cleanerCard}>
              <View style={styles.cleanerHeader}>
                <View style={styles.cleanerHeaderLeft}>
                  {cleaner.photo_url ? (
                    <Image source={{ uri: cleaner.photo_url }} style={styles.cleanerPhoto} />
                  ) : (
                    <View style={styles.cleanerPhoto}>
                      <Icon name="person" size={30} style={{ color: colors.textSecondary, alignSelf: 'center', marginTop: 10 }} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                    {cleaner.legal_name && cleaner.legal_name !== cleaner.name && (
                      <Text style={styles.detailText}>Legal: {cleaner.legal_name}</Text>
                    )}
                    {cleaner.go_by && cleaner.go_by !== cleaner.name && (
                      <Text style={styles.detailText}>Goes by: {cleaner.go_by}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.badgeContainer}>
                  <View
                    style={[styles.securityBadge, { backgroundColor: getSecurityLevelColor(cleaner.securityLevel) + '20' }]}
                  >
                    <Text style={[styles.badgeText, { color: getSecurityLevelColor(cleaner.securityLevel) }]}>
                      {cleaner.securityLevel}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: getEmploymentStatusColor(cleaner.employment_status || 'active') + '20' }]}
                  >
                    <Text style={[styles.badgeText, { color: getEmploymentStatusColor(cleaner.employment_status || 'active') }]}>
                      {cleaner.employment_status || 'active'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cleanerDetails}>
                <View style={styles.detailRow}>
                  <Icon name="card" size={16} style={{ color: colors.textSecondary }} />
                  <Text style={styles.detailText}>ID: {cleaner.employeeId}</Text>
                </View>

                {cleaner.dob && (
                  <View style={styles.detailRow}>
                    <Icon name="calendar" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>DOB: {new Date(cleaner.dob).toLocaleDateString()}</Text>
                  </View>
                )}

                {cleaner.phoneNumber && (
                  <View style={styles.detailRow}>
                    <Icon name="call" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>{cleaner.phoneNumber}</Text>
                  </View>
                )}

                {cleaner.email && (
                  <View style={styles.detailRow}>
                    <Icon name="mail" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>{cleaner.email}</Text>
                  </View>
                )}

                {cleaner.hireDate && (
                  <View style={styles.detailRow}>
                    <Icon name="briefcase" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>Hired: {new Date(cleaner.hireDate).toLocaleDateString()}</Text>
                  </View>
                )}

                {cleaner.term_date && (
                  <View style={styles.detailRow}>
                    <Icon name="exit" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>Terminated: {new Date(cleaner.term_date).toLocaleDateString()}</Text>
                  </View>
                )}

                {cleaner.rehire_date && (
                  <View style={styles.detailRow}>
                    <Icon name="refresh" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>Rehired: {new Date(cleaner.rehire_date).toLocaleDateString()}</Text>
                  </View>
                )}

                {cleaner.defaultHourlyRate && (
                  <View style={styles.detailRow}>
                    <Icon name="cash" size={16} style={{ color: colors.textSecondary }} />
                    <Text style={styles.detailText}>
                      {cleaner.pay_type === 'hourly' ? `$${cleaner.defaultHourlyRate.toFixed(2)}/hr` : 
                       cleaner.pay_type === 'salary' ? `$${cleaner.defaultHourlyRate.toFixed(2)}/yr` :
                       `$${cleaner.defaultHourlyRate.toFixed(2)}`}
                    </Text>
                  </View>
                )}
              </View>

              {cleaner.specialties && cleaner.specialties.length > 0 && (
                <View style={styles.specialtiesContainer}>
                  {cleaner.specialties.map((specialty, index) => (
                    <View key={index} style={styles.specialtyChip}>
                      <Text style={styles.specialtyText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.cleanerActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    console.log('View button pressed for cleaner:', cleaner.id);
                    openDetailsModal(cleaner);
                  }}
                >
                  <Icon name="eye" size={20} style={{ color: colors.primary }} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    console.log('Edit button pressed for cleaner:', cleaner.id);
                    openEditModal(cleaner);
                  }}
                >
                  <Icon name="create" size={20} style={{ color: colors.warning }} />
                  <Text style={[styles.actionButtonText, { color: colors.warning }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => {
                    console.log('Delete button pressed for cleaner:', cleaner.id);
                    handleDeleteCleaner(cleaner.id);
                  }}
                >
                  <Icon name="trash" size={20} style={{ color: colors.danger }} />
                  <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add Cleaner' : 'Edit Cleaner'}
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeader}>Employee Data Info</Text>

              <Text style={styles.inputLabel}>Legal Name</Text>
              <TextInput
                style={styles.input}
                value={formData.legal_name}
                onChangeText={(text) => setFormData({ ...formData, legal_name: text })}
                placeholder="Enter legal name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Go-By (Preferred Name) *</Text>
              <TextInput
                style={styles.input}
                value={formData.go_by || formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, go_by: text, name: text });
                }}
                placeholder="Enter preferred name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerField('dob');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {formData.dob ? new Date(formData.dob).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Employee ID</Text>
              <TextInput
                style={styles.input}
                value={formData.employeeId}
                onChangeText={(text) => setFormData({ ...formData, employeeId: text })}
                placeholder="Auto-generated if empty"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Enter email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Hire Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerField('hireDate');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {formData.hireDate ? new Date(formData.hireDate).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Term Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerField('termDate');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {formData.termDate ? new Date(formData.termDate).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Rehire Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerField('rehireDate');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  {formData.rehireDate ? new Date(formData.rehireDate).toLocaleDateString() : 'Select date'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Employment Status</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                {['active', 'terminated', 'on-leave', 'suspended'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      formData.employment_status === status && styles.filterChipActive
                    ]}
                    onPress={() => setFormData({ ...formData, employment_status: status as any })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      formData.employment_status === status && styles.filterChipTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Enter notes"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <Text style={styles.inputLabel}>Photo URL</Text>
              <TextInput
                style={styles.input}
                value={formData.photo_url}
                onChangeText={(text) => setFormData({ ...formData, photo_url: text })}
                placeholder="Enter photo URL"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.sectionHeader}>Compensation</Text>

              <Text style={styles.inputLabel}>Pay Type</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                {['hourly', 'salary', 'contract'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      formData.pay_type === type && styles.filterChipActive
                    ]}
                    onPress={() => setFormData({ ...formData, pay_type: type as any })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      formData.pay_type === type && styles.filterChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                {formData.pay_type === 'hourly' ? 'Hourly Rate ($)' :
                 formData.pay_type === 'salary' ? 'Annual Salary ($)' :
                 'Contract Amount ($)'}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.defaultHourlyRate}
                onChangeText={(text) => setFormData({ ...formData, defaultHourlyRate: text })}
                placeholder="15.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Security Level</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.filterChip,
                      formData.securityLevel === level && styles.filterChipActive
                    ]}
                    onPress={() => setFormData({ ...formData, securityLevel: level as any })}
                  >
                    <Text style={[
                      styles.filterChipText,
                      formData.securityLevel === level && styles.filterChipTextActive
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionHeader}>Specialties</Text>
              <View style={styles.specialtySelector}>
                {specialtyOptions.map((specialty) => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.specialtyOption,
                      formData.specialties.includes(specialty) && styles.specialtyOptionActive
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text style={[
                      styles.specialtyOptionText,
                      formData.specialties.includes(specialty) && styles.specialtyOptionTextActive
                    ]}>
                      {specialty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionHeader}>Emergency Contact</Text>
              
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContactName}
                onChangeText={(text) => setFormData({ ...formData, emergencyContactName: text })}
                placeholder="Enter emergency contact name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContactPhone}
                onChangeText={(text) => setFormData({ ...formData, emergencyContactPhone: text })}
                placeholder="Enter emergency contact phone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContactRelationship}
                onChangeText={(text) => setFormData({ ...formData, emergencyContactRelationship: text })}
                placeholder="e.g., Spouse, Parent, Sibling"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{ false: colors.border, true: themeColor }}
                  thumbColor={colors.background}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                text="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                text={showAddModal ? 'Add' : 'Update'}
                onPress={() => {
                  if (showAddModal) {
                    handleAddCleaner();
                  } else {
                    handleUpdateCleaner();
                  }
                }}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Employee Details</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCleaner && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                    {selectedCleaner.photo_url ? (
                      <Image source={{ uri: selectedCleaner.photo_url }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                    ) : (
                      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                        <Icon name="person" size={50} style={{ color: colors.textSecondary }} />
                      </View>
                    )}
                    <Text style={[styles.modalTitle, { marginTop: spacing.sm, marginBottom: 0 }]}>{selectedCleaner.name}</Text>
                    {selectedCleaner.legal_name && selectedCleaner.legal_name !== selectedCleaner.name && (
                      <Text style={styles.detailText}>Legal: {selectedCleaner.legal_name}</Text>
                    )}
                  </View>

                  <Text style={styles.sectionHeader}>Employee Data Info</Text>
                  <View style={styles.cleanerDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>Employee ID: {selectedCleaner.employeeId}</Text>
                    </View>
                    {selectedCleaner.dob && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>DOB: {new Date(selectedCleaner.dob).toLocaleDateString()}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>Phone: {selectedCleaner.phoneNumber}</Text>
                    </View>
                    {selectedCleaner.email && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>Email: {selectedCleaner.email}</Text>
                      </View>
                    )}
                    {selectedCleaner.hireDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>Hire Date: {new Date(selectedCleaner.hireDate).toLocaleDateString()}</Text>
                      </View>
                    )}
                    {selectedCleaner.term_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>Term Date: {new Date(selectedCleaner.term_date).toLocaleDateString()}</Text>
                      </View>
                    )}
                    {selectedCleaner.rehire_date && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>Rehire Date: {new Date(selectedCleaner.rehire_date).toLocaleDateString()}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailText}>Status: {selectedCleaner.employment_status || 'active'}</Text>
                    </View>
                    {selectedCleaner.notes && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>Notes: {selectedCleaner.notes}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.sectionHeader}>Employment History</Text>
                  {employmentHistory.length > 0 ? (
                    <View style={styles.historySection}>
                      {employmentHistory.map((record, index) => (
                        <View key={record.id} style={[styles.historyItem, index === employmentHistory.length - 1 && styles.historyItemLast]}>
                          <Text style={styles.historyTitle}>
                            {new Date(record.start_date).toLocaleDateString()} - {record.end_date ? new Date(record.end_date).toLocaleDateString() : 'Present'}
                          </Text>
                          {record.position && (
                            <Text style={styles.historySubtitle}>Position: {record.position}</Text>
                          )}
                          {record.termination_reason && (
                            <Text style={styles.historySubtitle}>Reason: {record.termination_reason}</Text>
                          )}
                          {record.notes && (
                            <Text style={styles.historySubtitle}>{record.notes}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.detailText}>No employment history records</Text>
                  )}

                  <Text style={styles.sectionHeader}>Compensation</Text>
                  {compensationHistory.length > 0 ? (
                    <View style={styles.historySection}>
                      {compensationHistory.map((record, index) => (
                        <View key={record.id} style={[styles.historyItem, index === compensationHistory.length - 1 && styles.historyItemLast]}>
                          <Text style={styles.historyTitle}>
                            {record.pay_type.charAt(0).toUpperCase() + record.pay_type.slice(1)}: ${record.rate.toFixed(2)}
                            {record.pay_type === 'hourly' ? '/hr' : record.pay_type === 'salary' ? '/yr' : ''}
                          </Text>
                          <Text style={styles.historySubtitle}>
                            {new Date(record.effective_date).toLocaleDateString()} - {record.end_date ? new Date(record.end_date).toLocaleDateString() : 'Present'}
                          </Text>
                          {record.notes && (
                            <Text style={styles.historySubtitle}>{record.notes}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.historySection}>
                      <View style={styles.historyItem}>
                        <Text style={styles.historyTitle}>
                          {selectedCleaner.pay_type?.charAt(0).toUpperCase() + (selectedCleaner.pay_type?.slice(1) || 'hourly')}: ${(selectedCleaner.defaultHourlyRate || 15).toFixed(2)}
                          {selectedCleaner.pay_type === 'hourly' ? '/hr' : selectedCleaner.pay_type === 'salary' ? '/yr' : ''}
                        </Text>
                        <Text style={styles.historySubtitle}>Current Rate</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                text="Close"
                onPress={() => setShowDetailsModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                text="Edit"
                onPress={() => {
                  setShowDetailsModal(false);
                  if (selectedCleaner) {
                    openEditModal(selectedCleaner);
                  }
                }}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Toast />
    </View>
  );
}
