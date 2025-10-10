
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
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
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      showToast('Full name is required', 'error');
      return false;
    }
    
    if (!formData.email.trim()) {
      showToast('Email is required', 'error');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return false;
    }
    
    if (!formData.password) {
      showToast('Password is required', 'error');
      return false;
    }
    if (formData.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
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

      // Generate a unique employee ID
      const employeeId = `EMP-${Date.now().toString().slice(-6)}`;
      
      const emailToUse = formData.email.trim();

      console.log('Signing up with:', {
        email: emailToUse,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || 'Not provided',
        employeeId
      });

      // Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToUse,
        password: formData.password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            role: 'cleaner',
            full_name: formData.fullName.trim(),
            phone_number: formData.phoneNumber.trim() || null,
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        showToast(authError.message || 'Failed to sign up', 'error');
        return;
      }

      if (!authData.user) {
        console.error('No user data returned from signup');
        showToast('Failed to create account', 'error');
        return;
      }

      console.log('Auth user created:', authData.user.id);

      // Create cleaner record in the database
      const cleanerId = `cleaner-${authData.user.id}`;
      const { error: cleanerError } = await supabase
        .from('cleaners')
        .insert({
          id: cleanerId,
          user_id: authData.user.id,
          name: formData.fullName.trim(),
          phone_number: formData.phoneNumber.trim() || null,
          email: formData.email.trim(),
          employee_id: employeeId,
          security_level: 'low',
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
          specialties: [],
          default_hourly_rate: 15.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (cleanerError) {
        console.error('Cleaner record creation error:', cleanerError);
        showToast('Account created but profile setup failed. Please contact your supervisor.', 'warning');
        // Still proceed to show success since auth user was created
      } else {
        console.log('Cleaner record created successfully');
      }

      // Show success message
      Alert.alert(
        'Welcome!',
        'Registration successful! Please check your email to verify your account before signing in.\n\nYour supervisor will complete your profile setup and assign you to jobs.',
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
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              You&apos;ll use this email to sign in and receive important notifications
            </Text>

            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
            <Text style={styles.inputHint}>
              Optional - for contact purposes only
            </Text>
          </View>

          {/* Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="At least 6 characters"
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  style={{ color: colors.textSecondary }}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  style={{ color: colors.textSecondary }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={24} style={{ color: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                After signing up, you&apos;ll need to verify your email. Then your supervisor will:
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
            <TouchableOpacity onPress={() => router.push('/auth/cleaner-signin')}>
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
  passwordContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    padding: spacing.xs,
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
