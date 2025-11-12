
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
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CleanerSigninScreen() {
  console.log('CleanerSigninScreen rendered');
  
  const { toast, showToast, hideToast } = useToast();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    console.log('Signin button pressed');
    
    if (!phoneNumber.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Starting signin process...');

      const phoneValue = phoneNumber.trim();
      console.log('Looking up user by phone number:', phoneValue);

      // Look up user by phone number
      const { data: cleanerData, error: lookupError } = await supabase
        .from('cleaners')
        .select('id, name, phone_number, is_active, employment_status')
        .eq('phone_number', phoneValue)
        .maybeSingle();

      console.log('Cleaner lookup result:', { cleanerData, lookupError });

      if (lookupError) {
        console.error('Phone lookup error:', lookupError);
        showToast('Failed to look up account. Please try again.', 'error');
        return;
      }

      if (!cleanerData) {
        console.log('No cleaner found with phone number:', phoneValue);
        showToast('No account found with this phone number. Please check your phone number or sign up.', 'error');
        return;
      }

      // Check if the cleaner account is active
      if (!cleanerData.is_active || cleanerData.employment_status !== 'active') {
        console.log('Cleaner account is not active:', cleanerData);
        Alert.alert(
          'Account Inactive',
          'Your account is not currently active. Please contact your supervisor for assistance.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Cleaner account found and active:', cleanerData.name);

      // Store cleaner info in AsyncStorage for session management
      await AsyncStorage.setItem('cleaner_id', cleanerData.id);
      await AsyncStorage.setItem('cleaner_name', cleanerData.name);
      await AsyncStorage.setItem('cleaner_phone', cleanerData.phone_number);

      console.log('Session data stored successfully');
      showToast(`Welcome back, ${cleanerData.name}!`, 'success');
      
      // Small delay to show success message
      setTimeout(() => {
        router.replace('/cleaner');
      }, 500);

    } catch (error: any) {
      console.error('Unexpected signin error:', error);
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
              editable={!isLoading}
              onSubmitEditing={handleSignin}
              returnKeyType="go"
            />
            <Text style={styles.inputHint}>
              Enter the phone number you used to sign up
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} style={{ color: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>
                Simply enter your phone number to access your account. No password required!
              </Text>
              <Text style={[styles.infoText, { marginTop: spacing.xs }]}>
                If you&apos;re having trouble signing in, please contact your supervisor.
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
            <TouchableOpacity 
              onPress={() => router.push('/auth/cleaner-signup')}
              disabled={isLoading}
            >
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
