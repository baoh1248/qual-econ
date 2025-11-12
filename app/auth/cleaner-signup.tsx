
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../integrations/supabase/client';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

export default function CleanerSignupScreen() {
  console.log('CleanerSignupScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      showToast('Full name is required', 'error');
      return false;
    }
    
    if (!formData.phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return false;
    }
    
    // Validate phone number format (basic validation)
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      showToast('Please enter a valid phone number', 'error');
      return false;
    }
    
    return true;
  };

  const handleSignup = async () => {
    console.log('Signup button pressed');
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      console.log('Starting signup process...');

      const phoneNumber = formData.phoneNumber.trim();

      console.log('Signing up with:', {
        phone: phoneNumber,
        fullName: formData.fullName,
      });

      // Check if phone number is already in use
      const { data: existingCleaner, error: checkError } = await supabase
        .from('cleaners')
        .select('id, phone_number')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing phone:', checkError);
        showToast('Failed to check phone number. Please try again.', 'error');
        return;
      }

      if (existingCleaner) {
        showToast('This phone number is already registered. Please sign in instead.', 'error');
        return;
      }

      // Generate a unique employee ID
      const employeeId = `EMP-${Date.now().toString().slice(-6)}`;
      const cleanerId = `cleaner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('Creating cleaner record...');

      // Create cleaner record directly without authentication
      const { error: cleanerError } = await supabase
        .from('cleaners')
        .insert({
          id: cleanerId,
          name: formData.fullName.trim(),
          phone_number: phoneNumber,
          employee_id: employeeId,
          security_level: 'low',
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
          specialties: [],
          default_hourly_rate: 15.00,
          employment_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (cleanerError) {
        console.error('Cleaner record creation error:', cleanerError);
        showToast('Failed to create account. Please try again.', 'error');
        return;
      }

      console.log('Cleaner record created successfully');

      // Show success message
      Alert.alert(
        'Welcome!',
        'Registration successful! Your supervisor will complete your profile setup and assign you to jobs. You can now sign in with your phone number.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/cleaner-signin')
          }
        ]
      );

    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      showToast(error?.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={commonStyles.headerTitle}>Cleaner Sign Up</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Join Our Cleaning Team</Text>
          <Text style={styles.subtitleText}>
            Create your account to get started. Your supervisor will complete your profile setup.
          </Text>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              editable={!isLoading}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
            <Text style={styles.inputHint}>
              You&apos;ll use this phone number to sign in
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={24} style={{ color: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                After signing up, your supervisor will:
              </Text>
              <Text style={styles.infoText}>• Complete your profile with additional details</Text>
              <Text style={styles.infoText}>• Assign your security clearance level</Text>
              <Text style={styles.infoText}>• Add you to job schedules</Text>
              <Text style={styles.infoText}>• Set your hourly rate and specialties</Text>
            </View>
          </View>

          {/* Sign Up Button */}
          <Button
            text={isLoading ? 'Creating Account...' : 'Sign Up'}
            onPress={handleSignup}
            variant="primary"
            disabled={isLoading}
            style={styles.signupButton}
          />

          {/* Sign In Link */}
          <View style={styles.signinContainer}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <TouchableOpacity 
              onPress={() => router.push('/auth/cleaner-signin')}
              disabled={isLoading}
            >
              <Text style={styles.signinLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: spacing.lg,
  },
  welcomeText: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitleText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  label: {
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
  inputHint: {
    ...typography.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  signupButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  signinText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  signinLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
