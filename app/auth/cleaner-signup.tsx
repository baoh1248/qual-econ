
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
  const [verificationStep, setVerificationStep] = useState<'signup' | 'verify'>('signup');
  const [verificationCode, setVerificationCode] = useState('');

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
    
    // Email is optional, but if provided, validate format
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }
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
      
      const phoneNumber = formData.phoneNumber.trim();

      console.log('Signing up with:', {
        phone: phoneNumber,
        email: formData.email.trim() || 'Not provided',
        fullName: formData.fullName,
        employeeId
      });

      // Sign up the user with Supabase Auth using phone number
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: phoneNumber,
        password: formData.password,
        options: {
          data: {
            role: 'cleaner',
            full_name: formData.fullName.trim(),
            email: formData.email.trim() || null,
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        
        // Handle specific error cases
        if (authError.message.includes('Phone signups are disabled') || 
            authError.message.includes('phone_provider_disabled')) {
          showToast(
            'Phone authentication is not enabled. Please contact your administrator or use email signup.',
            'error'
          );
          Alert.alert(
            'Phone Authentication Disabled',
            'Phone number sign-up is currently disabled in the system. Please contact your supervisor to enable phone authentication or use an alternative sign-up method.\n\nError: Phone provider is not configured.',
            [{ text: 'OK' }]
          );
        } else if (authError.message.includes('User already registered')) {
          showToast('This phone number is already registered. Please sign in instead.', 'error');
        } else {
          showToast(authError.message || 'Failed to sign up', 'error');
        }
        return;
      }

      if (!authData.user) {
        console.error('No user data returned from signup');
        showToast('Failed to create account', 'error');
        return;
      }

      console.log('Auth user created:', authData.user.id);

      // Check if phone confirmation is required
      if (authData.user.phone_confirmed_at === null) {
        console.log('Phone verification required');
        setVerificationStep('verify');
        showToast('Please enter the verification code sent to your phone', 'info');
        return;
      }

      // If no verification needed, create cleaner record immediately
      await createCleanerRecord(authData.user.id, phoneNumber);

    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      showToast(error?.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Verifying OTP...');

      const phoneNumber = formData.phoneNumber.trim();

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: verificationCode,
        type: 'sms',
      });

      if (error) {
        console.error('OTP verification error:', error);
        showToast(error.message || 'Invalid verification code', 'error');
        return;
      }

      if (!data.user) {
        showToast('Verification failed', 'error');
        return;
      }

      console.log('Phone verified successfully');

      // Create cleaner record after verification
      await createCleanerRecord(data.user.id, phoneNumber);

    } catch (error: any) {
      console.error('Unexpected verification error:', error);
      showToast(error?.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createCleanerRecord = async (userId: string, phoneNumber: string) => {
    try {
      const employeeId = `EMP-${Date.now().toString().slice(-6)}`;
      const cleanerId = `cleaner-${userId}`;

      const { error: cleanerError } = await supabase
        .from('cleaners')
        .insert({
          id: cleanerId,
          user_id: userId,
          name: formData.fullName.trim(),
          phone_number: phoneNumber,
          email: formData.email.trim() || null,
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
      } else {
        console.log('Cleaner record created successfully');
      }

      // Show success message
      Alert.alert(
        'Welcome!',
        'Registration successful! Your supervisor will complete your profile setup and assign you to jobs.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/cleaner-signin')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating cleaner record:', error);
      showToast('Profile setup failed. Please contact your supervisor.', 'error');
    }
  };

  const resendCode = async () => {
    try {
      setIsLoading(true);
      const phoneNumber = formData.phoneNumber.trim();

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) {
        showToast(error.message || 'Failed to resend code', 'error');
      } else {
        showToast('Verification code resent!', 'success');
      }
    } catch (error: any) {
      showToast('Failed to resend code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationStep === 'verify') {
    return (
      <View style={commonStyles.container}>
        <Toast {...toast} onHide={hideToast} />
        
        {/* Header */}
        <View style={commonStyles.header}>
          <TouchableOpacity onPress={() => setVerificationStep('signup')}>
            <Icon name="arrow-back" size={24} style={{ color: colors.background }} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <CompanyLogo size="small" showText={false} variant="light" />
            <Text style={commonStyles.headerTitle}>Verify Phone</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Verify Your Phone</Text>
            <Text style={styles.subtitleText}>
              Enter the 6-digit code sent to {formData.phoneNumber}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <Button
              text={isLoading ? 'Verifying...' : 'Verify Code'}
              onPress={handleVerifyCode}
              variant="primary"
              disabled={isLoading || verificationCode.length !== 6}
              style={styles.signupButton}
            />

            <TouchableOpacity 
              onPress={resendCode}
              disabled={isLoading}
              style={styles.resendContainer}
            >
              <Text style={styles.resendText}>
                Didn&apos;t receive the code? <Text style={styles.resendLink}>Resend</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
            <Text style={styles.inputHint}>
              You&apos;ll use this phone number to sign in
            </Text>

            <Text style={styles.label}>Email (Optional)</Text>
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
              Optional - for receiving email notifications
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
                After signing up, you may need to verify your phone number. Then your supervisor will:
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '600',
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
  resendContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  resendText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
