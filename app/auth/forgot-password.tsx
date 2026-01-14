import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../integrations/supabase/client';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import {
  hashPassword,
  cleanPhoneNumber,
  isValidPhoneNumber,
} from '../utils/auth';

export default function ForgotPasswordScreen() {
  const { toast, showToast, hideToast } = useToast();

  const [step, setStep] = useState<'verify' | 'reset'>('verify');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    // Validate inputs
    if (!phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    if (!employeeId.trim()) {
      showToast('Employee ID is required', 'error');
      return;
    }

    const cleanedPhone = cleanPhoneNumber(phoneNumber);

    if (!isValidPhoneNumber(cleanedPhone)) {
      showToast('Please enter a valid 10-digit phone number', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Look up user by phone number and employee ID
      const { data: userData, error: lookupError } = await supabase
        .from('cleaners')
        .select('id, name, phone_number, employee_id, is_active, employment_status')
        .eq('phone_number', cleanedPhone)
        .eq('employee_id', employeeId.trim())
        .maybeSingle();

      if (lookupError) {
        console.error('User lookup error:', lookupError);
        showToast('Failed to verify account. Please try again.', 'error');
        return;
      }

      if (!userData) {
        showToast('No account found with this phone number and employee ID combination.', 'error');
        return;
      }

      // Check if account is active
      if (!userData.is_active || userData.employment_status !== 'active') {
        showToast('Your account is not currently active. Please contact your administrator.', 'error');
        return;
      }

      // Verification successful
      setUserId(userData.id);
      setUserName(userData.name);
      setStep('reset');
      showToast('Verification successful! Please set your new password.', 'success');

    } catch (error: any) {
      console.error('Unexpected error:', error);
      showToast(error?.message || 'An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    // Validate password
    if (!newPassword.trim()) {
      showToast('Password is required', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Store password as plain text (trim to remove any whitespace)
      const trimmedPassword = newPassword.trim();

      // Update password in database
      const { data, error } = await supabase
        .from('cleaners')
        .update({
          password_hash: trimmedPassword,
        })
        .eq('id', userId)
        .select();

      if (error) {
        showToast(`Database error: ${error.message}`, 'error');
        return;
      }

      if (!data || data.length === 0) {
        showToast('Failed to update password. User not found.', 'error');
        return;
      }

      showToast(`Password set! Use: "${trimmedPassword}" to log in`, 'success');

      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);

    } catch (error: any) {
      showToast(error?.message || 'Failed to reset password. Please try again.', 'error');
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
          <Text style={commonStyles.headerTitle}>Reset Password</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          {step === 'verify' ? (
            <>
              <Text style={styles.title}>Verify Your Identity</Text>
              <Text style={styles.subtitle}>
                Enter your phone number and employee ID to verify your account
              </Text>

              {/* Phone Number Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                />
              </View>

              {/* Employee ID Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your employee ID"
                  value={employeeId}
                  onChangeText={setEmployeeId}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isLoading}
                  onSubmitEditing={handleVerify}
                  returnKeyType="go"
                />
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoText}>
                    Your employee ID can be found on your employee badge or by contacting your supervisor.
                  </Text>
                </View>
              </View>

              <Button
                text={isLoading ? 'Verifying...' : 'Verify Identity'}
                onPress={handleVerify}
                variant="primary"
                disabled={isLoading}
                style={styles.actionButton}
              />
            </>
          ) : (
            <>
              <View style={styles.successHeader}>
                <Icon name="checkmark-circle" size={48} style={{ color: colors.success }} />
                <Text style={styles.title}>Hello, {userName}!</Text>
                <Text style={styles.subtitle}>Create your new password</Text>
              </View>

              {/* New Password Input */}
              <View style={styles.section}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      style={{ color: colors.textSecondary }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.section}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    onSubmitEditing={handleResetPassword}
                    returnKeyType="go"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={24}
                      style={{ color: colors.textSecondary }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                <Text style={styles.requirementItem}>• At least 6 characters long</Text>
                <Text style={styles.requirementItem}>• Mix of letters and numbers recommended</Text>
              </View>

              <Button
                text={isLoading ? 'Resetting...' : 'Reset Password'}
                onPress={handleResetPassword}
                variant="primary"
                disabled={isLoading}
                style={styles.actionButton}
              />
            </>
          )}

          {/* Back to Login Link */}
          <TouchableOpacity
            style={styles.backContainer}
            onPress={() => router.replace('/auth/login')}
            disabled={isLoading}
          >
            <Icon name="arrow-back" size={16} style={{ color: colors.primary }} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
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
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  requirementsBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  requirementItem: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  actionButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  backContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
