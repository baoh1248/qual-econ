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
import {
  hashPassword,
  saveSession,
  cleanPhoneNumber,
  isValidPhoneNumber,
  ROLE_LEVELS
} from '../utils/auth';

export default function LoginScreen() {
  const { toast, showToast, hideToast } = useToast();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // Validate inputs
    if (!phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    if (!password.trim()) {
      showToast('Password is required', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Try to find user with the phone number (try multiple formats)
      const cleanedPhone = cleanPhoneNumber(phoneNumber);

      // First try with cleaned phone
      let { data: userData, error: lookupError } = await supabase
        .from('cleaners')
        .select('id, name, phone_number, is_active, employment_status, password_hash, role_id')
        .eq('phone_number', cleanedPhone)
        .maybeSingle();

      // If not found, try with original phone number
      if (!userData && !lookupError) {
        const result = await supabase
          .from('cleaners')
          .select('id, name, phone_number, is_active, employment_status, password_hash, role_id')
          .eq('phone_number', phoneNumber.trim())
          .maybeSingle();

        userData = result.data;
        lookupError = result.error;
      }

      // If still not found, try searching with LIKE to be more flexible
      if (!userData && !lookupError) {
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        const result = await supabase
          .from('cleaners')
          .select('id, name, phone_number, is_active, employment_status, password_hash, role_id')
          .like('phone_number', `%${phoneDigits.slice(-10)}%`)
          .maybeSingle();

        userData = result.data;
        lookupError = result.error;
      }

      if (lookupError) {
        showToast('Failed to look up account. Please try again.', 'error');
        return;
      }

      if (!userData) {
        showToast('Invalid phone number or password', 'error');
        return;
      }

      // Check if password is set
      if (!userData.password_hash) {
        Alert.alert(
          'Password Not Set',
          'Your account does not have a password set. Please use the "Forgot Password" feature to set one.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Verify password (plain text comparison)
      const enteredPassword = password.trim();
      const isPasswordValid = enteredPassword === userData.password_hash;

      if (!isPasswordValid) {
        showToast('Invalid phone number or password', 'error');
        return;
      }

      // Check if account is active
      if (!userData.is_active || userData.employment_status !== 'active') {
        Alert.alert(
          'Account Inactive',
          'Your account is not currently active. Please contact your administrator for assistance.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get role information if role_id exists
      let roleInfo = null;
      if (userData.role_id) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id, name, display_name, level')
          .eq('id', userData.role_id)
          .maybeSingle();

        roleInfo = roleData;
      }

      // Use role info if available, otherwise default to cleaner
      const roleName = roleInfo?.name || 'cleaner';
      const roleLevel = roleInfo?.level || ROLE_LEVELS.CLEANER;
      const roleId = userData.role_id || '';

      // Save session
      await saveSession({
        id: userData.id,
        name: userData.name,
        phone: userData.phone_number,
        role: roleName,
        roleLevel: roleLevel,
        roleId: roleId,
        lastLogin: new Date().toISOString(),
      });

      showToast(`Welcome back, ${userData.name}!`, 'success');

      // Route based on role level
      setTimeout(() => {
        if (roleLevel === ROLE_LEVELS.CLEANER) {
          router.replace('/cleaner');
        } else {
          router.replace('/supervisor');
        }
      }, 500);

    } catch (error: any) {
      showToast(error?.message || 'An unexpected error occurred. Please try again.', 'error');
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
          <Text style={commonStyles.headerTitle}>Sign In</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subtitleText}>
            Sign in to access your account
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

          {/* Password Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
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

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>
                Use your registered phone number and password to sign in.
              </Text>
              <Text style={[styles.infoText, { marginTop: spacing.xs }]}>
                If you&apos;re having trouble signing in, please contact your administrator.
              </Text>
            </View>
          </View>

          <Button
            text={isLoading ? 'Signing In...' : 'Sign In'}
            onPress={handleLogin}
            variant="primary"
            disabled={isLoading}
            style={styles.loginButton}
          />

          {/* Forgot Password Link */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            disabled={isLoading}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
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
  loginButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
