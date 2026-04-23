
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import AnimatedCard from '../../components/AnimatedCard';
import Button from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { supabase } from '../integrations/supabase/client';

interface CleanerProfile {
  id: string;
  name: string;
  legal_name: string | null;
  go_by: string | null;
  email: string | null;
  phone_number: string;
  employee_id: string;
  hire_date: string | null;
  employment_status: string;
  pay_type: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

export default function ProfileScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [goBy, setGoBy] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('cleaners')
        .select('id, name, legal_name, go_by, email, phone_number, employee_id, hire_date, employment_status, pay_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
        .eq('email', session.user.email)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!data) return;

      setProfile(data);
      setGoBy(data.go_by || '');
      setPhone(data.phone_number || '');
      setEmail(data.email || '');
      setEmergencyName(data.emergency_contact_name || '');
      setEmergencyPhone(data.emergency_contact_phone || '');
      setEmergencyRelation(data.emergency_contact_relationship || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    if (!profile) return;
    if (!phone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('cleaners')
        .update({
          go_by: goBy.trim() || null,
          phone_number: phone.trim(),
          email: email.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relationship: emergencyRelation.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      showToast('Profile updated successfully', 'success');
      setEditing(false);
      loadProfile();
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setGoBy(profile.go_by || '');
    setPhone(profile.phone_number || '');
    setEmail(profile.email || '');
    setEmergencyName(profile.emergency_contact_name || '');
    setEmergencyPhone(profile.emergency_contact_phone || '');
    setEmergencyRelation(profile.emergency_contact_relationship || '');
    setEditing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={commonStyles.container}>
        <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>Profile</Text>
          </View>
        </View>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ ...typography.body, color: colors.textSecondary }}>Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
            My Profile
          </Text>
        </View>
        <CompanyLogo size="small" />
      </View>

      <ScrollView style={commonStyles.content}>
        {/* Profile Header */}
        <AnimatedCard delay={0}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: themeColor }]}>
              <Text style={styles.avatarText}>
                {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              {profile.go_by && <Text style={styles.profileGoBy}>Goes by: {profile.go_by}</Text>}
              <View style={styles.employeeIdRow}>
                <Icon name="id-card-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.employeeIdText}>ID: {profile.employee_id}</Text>
              </View>
            </View>
            {!editing && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: themeColor }]}
                onPress={() => setEditing(true)}
              >
                <Icon name="create-outline" size={18} color={themeColor} />
                <Text style={[styles.editBtnText, { color: themeColor }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </AnimatedCard>

        {/* Employment Info (read-only) */}
        <AnimatedCard delay={100}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="briefcase-outline" size={20} color={themeColor} />
              <Text style={styles.sectionTitle}>Employment</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: profile.employment_status === 'active' ? colors.success + '15' : colors.warning + '15' }]}>
                  <Text style={[styles.statusText, { color: profile.employment_status === 'active' ? colors.success : colors.warning }]}>
                    {profile.employment_status.charAt(0).toUpperCase() + profile.employment_status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pay Type</Text>
                <Text style={styles.infoValue}>{profile.pay_type.charAt(0).toUpperCase() + profile.pay_type.slice(1)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Hire Date</Text>
                <Text style={styles.infoValue}>{formatDate(profile.hire_date)}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Contact Info */}
        <AnimatedCard delay={200}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="call-outline" size={20} color={themeColor} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Preferred Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={goBy}
                  onChangeText={setGoBy}
                  placeholder="How you'd like to be called"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.go_by || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.phone_number}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.email || 'Not set'}</Text>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* Emergency Contact */}
        <AnimatedCard delay={300}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="medkit-outline" size={20} color={colors.danger} />
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  placeholder="Emergency contact name"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.emergency_contact_name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="Emergency contact phone"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.emergency_contact_phone || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Relationship</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={emergencyRelation}
                  onChangeText={setEmergencyRelation}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={styles.fieldValue}>{profile.emergency_contact_relationship || 'Not set'}</Text>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* Action Buttons */}
        {editing && (
          <AnimatedCard delay={400}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelEditBtn} onPress={handleCancel}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Button
                  title={saving ? 'Saving...' : 'Save Changes'}
                  onPress={handleSave}
                  variant="primary"
                  disabled={saving}
                />
              </View>
            </View>
          </AnimatedCard>
        )}

        <View style={{ height: spacing.xxxl * 2 }} />
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 2,
  },
  profileGoBy: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  employeeIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeIdText: {
    ...typography.small,
    color: colors.textTertiary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  editBtnText: {
    ...typography.caption,
    fontWeight: '600',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    gap: spacing.xs,
  },
  infoLabel: {
    ...typography.small,
    color: colors.textTertiary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fieldValue: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  cancelEditBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  cancelEditText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
