
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CompanyLogo from '../../components/CompanyLogo';
import Button from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import AnimatedCard from '../../components/AnimatedCard';
import { supabase } from '../integrations/supabase/client';
import DatabaseSetup from '../../components/DatabaseSetup';
import { useDatabase } from '../../hooks/useDatabase';

const PRESET_COLORS = [
  { name: 'Blue', color: '#0066FF' },
  { name: 'Purple', color: '#5243AA' },
  { name: 'Cyan', color: '#00B8D9' },
  { name: 'Green', color: '#00875A' },
  { name: 'Orange', color: '#FF991F' },
  { name: 'Red', color: '#DE350B' },
  { name: 'Pink', color: '#E91E63' },
  { name: 'Indigo', color: '#3F51B5' },
  { name: 'Teal', color: '#009688' },
  { name: 'Amber', color: '#FFC107' },
  { name: 'Deep Purple', color: '#673AB7' },
  { name: 'Light Blue', color: '#03A9F4' },
];

export default function SettingsScreen() {
  const { themeColor, setThemeColor } = useTheme();
  const { toast, showToast } = useToast();
  const { config, syncStatus } = useDatabase();
  const [selectedColor, setSelectedColor] = useState(themeColor);
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false);

  const handleColorSelect = async (color: string) => {
    setSelectedColor(color);
    await setThemeColor(color);
    showToast('Theme color updated!', 'success');
  };

  const handleLogout = async () => {
    try {
      const { clearSession } = await import('../utils/auth');
      await clearSession();
      router.replace('/');
    } catch (error) {
      console.error('Error logging out:', error);
      showToast('Failed to logout', 'error');
    }
  };

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[buttonStyles.backButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[commonStyles.headerTitle, { color: '#FFFFFF', marginLeft: spacing.md }]}>
            Settings
          </Text>
        </View>
        <CompanyLogo size={40} />
      </View>

      <ScrollView style={commonStyles.content}>
        {/* Theme Color Section */}
        <AnimatedCard delay={0}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="palette" size={24} color={themeColor} />
              <Text style={styles.sectionTitle}>Theme Color</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose your preferred theme color. This will update the primary color throughout the app.
            </Text>

            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    { backgroundColor: preset.color },
                    selectedColor === preset.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => handleColorSelect(preset.color)}
                >
                  {selectedColor === preset.color && (
                    <Icon name="check" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.colorPreview}>
              <Text style={styles.colorPreviewLabel}>Current Theme Color:</Text>
              <View style={styles.colorPreviewBox}>
                <View style={[styles.colorPreviewSwatch, { backgroundColor: themeColor }]} />
                <Text style={styles.colorPreviewText}>{themeColor}</Text>
              </View>
            </View>
          </View>
        </AnimatedCard>

        {/* Database Section */}
        <AnimatedCard delay={50}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon 
                name={config.useSupabase && syncStatus.isOnline ? "cloud-done" : "cloud-offline"} 
                size={24} 
                color={config.useSupabase && syncStatus.isOnline ? colors.success : colors.warning} 
              />
              <Text style={styles.sectionTitle}>Database</Text>
            </View>
            <Text style={styles.sectionDescription}>
              {config.useSupabase && syncStatus.isOnline 
                ? 'Connected to Supabase - Your data is synced to the cloud' 
                : 'Using local storage - Data is stored on this device only'
              }
            </Text>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowDatabaseSetup(true)}
            >
              <View style={styles.settingItemLeft}>
                <Icon name="server" size={20} color={colors.textSecondary} />
                <Text style={styles.settingItemText}>Database Setup</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {syncStatus.lastSync && (
              <Text style={styles.lastSyncText}>
                Last sync: {syncStatus.lastSync.toLocaleString()}
              </Text>
            )}
          </View>
        </AnimatedCard>

        {/* Account Section */}
        <AnimatedCard delay={100}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="user" size={24} color={themeColor} />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <Icon name="user" size={20} color={colors.textSecondary} />
                <Text style={styles.settingItemText}>Profile</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <Icon name="lock" size={20} color={colors.textSecondary} />
                <Text style={styles.settingItemText}>Change Password</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* App Settings Section */}
        <AnimatedCard delay={200}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="settings" size={24} color={themeColor} />
              <Text style={styles.sectionTitle}>App Settings</Text>
            </View>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <Icon name="bell" size={20} color={colors.textSecondary} />
                <Text style={styles.settingItemText}>Notifications</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <Icon name="globe" size={20} color={colors.textSecondary} />
                <Text style={styles.settingItemText}>Language</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Logout Section */}
        <AnimatedCard delay={300}>
          <View style={styles.section}>
            <Button
              title="Logout"
              onPress={handleLogout}
              variant="danger"
              icon="log-out"
            />
          </View>
        </AnimatedCard>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      {/* Database Setup Modal */}
      <Modal
        visible={showDatabaseSetup}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <DatabaseSetup onClose={() => setShowDatabaseSetup(false)} />
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
    transform: [{ scale: 1.1 }],
  },
  colorPreview: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
  },
  colorPreviewLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  colorPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  colorPreviewSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPreviewText: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingItemText: {
    ...typography.body,
    color: colors.text,
  },
  lastSyncText: {
    ...typography.small,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
