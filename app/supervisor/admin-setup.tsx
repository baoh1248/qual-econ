/**
 * Admin Setup Page
 * Allows administrators to set up passwords and roles for existing users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../integrations/supabase/client';
import { commonStyles, colors, spacing, typography } from '../../styles/commonStyles';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { hashPassword } from '../utils/auth';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Cleaner {
  id: string;
  name: string;
  phone_number: string;
  employee_id: string;
  password_hash: string | null;
  role_id: string | null;
  roles?: { name: string; display_name: string };
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
}

export default function AdminSetupScreen() {
  const { toast, showToast, hideToast } = useToast();

  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all cleaners
      const { data: cleanersData, error: cleanersError } = await supabase
        .from('cleaners')
        .select('id, name, phone_number, employee_id, password_hash, role_id, roles(name, display_name)')
        .order('name');

      if (cleanersError) throw cleanersError;

      // Load all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('level');

      if (rolesError) throw rolesError;

      setCleaners(cleanersData || []);
      setRoles(rolesData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showToast(error?.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCleaner = (cleaner: Cleaner) => {
    setSelectedCleaner(cleaner);
    setPassword('');
    setConfirmPassword('');
    setSelectedRole(cleaner.role_id || '');
  };

  const handleSave = async () => {
    if (!selectedCleaner) return;

    // Validate inputs
    if (password && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password && password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (!selectedRole) {
      showToast('Please select a role', 'error');
      return;
    }

    try {
      setSaving(true);

      const updates: any = {
        role_id: selectedRole,
      };

      // Only update password if provided
      if (password) {
        const passwordHash = await hashPassword(password);
        updates.password_hash = passwordHash;
      }

      const { error } = await supabase
        .from('cleaners')
        .update(updates)
        .eq('id', selectedCleaner.id);

      if (error) throw error;

      showToast('User updated successfully!', 'success');

      // Reload data
      await loadData();
      setSelectedCleaner(null);
      setPassword('');
      setConfirmPassword('');
      setSelectedRole('');
    } catch (error: any) {
      console.error('Error saving:', error);
      showToast(error?.message || 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
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
        <Text style={commonStyles.headerTitle}>Admin Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={commonStyles.content}>
        <View style={styles.container}>
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={20} style={{ color: colors.warning }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>
                Use this page to set up passwords and assign roles for all users in the system.
              </Text>
            </View>
          </View>

          {/* User List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select User to Configure</Text>
            {cleaners.map((cleaner) => (
              <TouchableOpacity
                key={cleaner.id}
                style={[
                  styles.cleanerCard,
                  selectedCleaner?.id === cleaner.id && styles.cleanerCardSelected,
                ]}
                onPress={() => handleSelectCleaner(cleaner)}
              >
                <View style={styles.cleanerInfo}>
                  <Text style={styles.cleanerName}>{cleaner.name}</Text>
                  <Text style={styles.cleanerPhone}>{cleaner.phone_number}</Text>
                  <View style={styles.cleanerStatus}>
                    <View style={[styles.statusBadge, cleaner.password_hash ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>
                        {cleaner.password_hash ? 'Password Set' : 'No Password'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, cleaner.role_id ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>
                        {cleaner.roles?.display_name || 'No Role'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Icon
                  name="chevron-forward"
                  size={20}
                  style={{ color: colors.textSecondary }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Edit Form */}
          {selectedCleaner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configure: {selectedCleaner.name}</Text>

              {/* Role Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Role *</Text>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOption,
                      selectedRole === role.id && styles.roleOptionSelected,
                    ]}
                    onPress={() => setSelectedRole(role.id)}
                  >
                    <View style={styles.radioButton}>
                      {selectedRole === role.id && <View style={styles.radioButtonInner} />}
                    </View>
                    <View>
                      <Text style={styles.roleTitle}>{role.display_name}</Text>
                      <Text style={styles.roleDescription}>Level {role.level}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Password Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {selectedCleaner.password_hash ? 'Change Password (optional)' : 'Set Password *'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  text="Cancel"
                  onPress={() => {
                    setSelectedCleaner(null);
                    setPassword('');
                    setConfirmPassword('');
                    setSelectedRole('');
                  }}
                  variant="secondary"
                  style={{ flex: 1 }}
                  disabled={saving}
                />
                <Button
                  text={saving ? 'Saving...' : 'Save Changes'}
                  onPress={handleSave}
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={saving}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.warning + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
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
  cleanerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cleanerCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  cleanerInfo: {
    flex: 1,
  },
  cleanerName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cleanerPhone: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cleanerStatus: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusInactive: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    ...typography.tiny,
    color: colors.text,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  roleTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  roleDescription: {
    ...typography.small,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
