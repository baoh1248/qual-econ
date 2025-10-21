
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useClientData, type Cleaner } from '../../hooks/useClientData';
import { useTheme } from '../../hooks/useTheme';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';

export default function CleanersScreen() {
  const { themeColor } = useTheme();
  const { showToast } = useToast();
  const { executeQuery, config, syncStatus } = useDatabase();
  const { cleaners, refreshData } = useClientData();

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    securityLevel: 'low' as 'low' | 'medium' | 'high',
    defaultHourlyRate: '15',
    isActive: true,
  });

  const loadCleaners = useCallback(async () => {
    try {
      setIsLoading(true);
      await refreshData();
    } catch (error) {
      console.error('Error loading cleaners:', error);
      showToast('Failed to load cleaners', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [refreshData, showToast]);

  useEffect(() => {
    loadCleaners();
  }, [loadCleaners]);

  // ... rest of the component remains the same
  
  if (isLoading) {
    return <LoadingSpinner message="Loading cleaners..." />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Text>Cleaners Screen</Text>
      <Toast />
    </View>
  );
}
