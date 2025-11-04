
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

export default function CleanerSigninScreen() {
  console.log('CleanerSigninScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    console.log('Signin button pressed');
    
    if (!phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }
    
    if (!password) {
      showToast('Password is required', 'error');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting signin process...');

      const phoneValue = phoneNumber.trim();

      console.log('Login attempt with phone number:', phoneValue);

      // Sign in with phone number and password
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phoneValue,
        password: password,
      });

      if (error) {
        console.error('Phone signin error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          showToast('Invalid credentials. Please check your phone number and password.', 'error');
        } else if (error.message.includes('Phone not confirmed') || 
                   error.message.includes('not confirmed') ||
                   error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Phone Not Verified',
            'Your phone number has not been verified yet. Please check your SMS messages for the verification code, or contact your supervisor for assistance.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('Phone signups are disabled') || 
                   error.message.includes('phone_provider_disabled')) {
          Alert.alert(
            'Phone Authentication Disabled',
            'Phone number sign-in is currently disabled in the system. Please contact your supervisor to enable phone authentication.\n\nError: Phone provider is not configured.',
            [{ text: 'OK' }]
          );
        } else {
          showToast(error.message || 'Failed to sign in', 'error');
        }
        return;
      }

      if (!data.user) {
        console.error('No user data returned from signin');
        showToast('Failed to sign in', 'error');
        return;
      }

      const userId = data.user.id;
      console.log('Phone signin successful:', userId);

      // Verify that the user has a cleaner profile
      const { data: cleanerProfile, error: profileError } = await supabase
        .from('cleaners')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (profileError || !cleanerProfile) {
        console.error('Cleaner profile not found:', profileError);
        showToast('Your profile is being set up. Please contact your supervisor.', 'warning');
        // Sign out the user since they don't have a cleaner profile
        await supabase.auth.signOut();
        return;
      }

      console.log('Cleaner profile found:', cleanerProfile.name);
      
      // Navigate to cleaner dashboard
      router.replace('/cleaner');

    } catch (error: any) {
      console.error('Unexpected signin error:', error);
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
          <Text style={commonStyles.headerTitle}>Cleaner Sign In</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subtitleText}>
            Sign in to access your dashboard
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Enter the phone number you used to sign up
            </Text>

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
          </View>

          {/* Info Box for Phone Auth Issues */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>
                Having trouble signing in? Contact your supervisor if you need help with phone verification or account setup.
              </Text>
            </View>
          </View>

          <Button
            text={isLoading ? 'Signing In...' : 'Sign In'}
            onPress={handleSignin}
            variant="primary"
            disabled={isLoading}
            style={styles.signinButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/cleaner-signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
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
  signinButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  signupText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  signupLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
