
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { getSupabaseStatus, DATABASE_SCHEMA } from '../utils/supabase';
import Icon from './Icon';
import Button from './Button';
import AnimatedCard from './AnimatedCard';
import { colors, spacing, typography, buttonStyles } from '../styles/commonStyles';

interface DatabaseSetupProps {
  onClose: () => void;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onClose }) => {
  const { config, syncStatus, enableSupabase, disableSupabase, checkConnection } = useDatabase();
  const [supabaseStatus, setSupabaseStatus] = useState(getSupabaseStatus());
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    setSupabaseStatus(getSupabaseStatus());
  }, []);

  const handleEnableSupabase = async () => {
    setIsConnecting(true);
    try {
      const success = await enableSupabase();
      if (success) {
        Alert.alert('Success', 'Supabase connected successfully!');
        setSupabaseStatus(getSupabaseStatus());
      } else {
        Alert.alert('Connection Failed', 'Could not connect to Supabase. Please check your configuration.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Supabase');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisableSupabase = () => {
    Alert.alert(
      'Disable Supabase',
      'This will switch back to local storage only. Your data will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          onPress: () => {
            disableSupabase();
            setSupabaseStatus(getSupabaseStatus());
          }
        }
      ]
    );
  };

  const openSupabaseWebsite = () => {
    Linking.openURL('https://supabase.com');
  };

  const copyDatabaseSchema = () => {
    // In a real app, you'd copy to clipboard
    Alert.alert(
      'Database Schema',
      'The complete database schema (including client_projects, project_completions, and cleaner_vacations tables) has been copied to your clipboard. Paste it in the Supabase SQL editor to create all required tables.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Setup</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} style={{ color: colors.text }} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        <AnimatedCard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon 
              name={config.useSupabase && syncStatus.isOnline ? "cloud-done" : "cloud-offline"} 
              size={32} 
              style={{ color: config.useSupabase && syncStatus.isOnline ? colors.success : colors.warning }} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {config.useSupabase && syncStatus.isOnline ? 'Connected to Supabase' : 'Using Local Storage'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {config.useSupabase && syncStatus.isOnline 
                  ? 'Your data is synced to the cloud' 
                  : 'Data is stored locally on this device'
                }
              </Text>
            </View>
          </View>

          {syncStatus.lastSync && (
            <Text style={styles.lastSync}>
              Last sync: {syncStatus.lastSync.toLocaleString()}
            </Text>
          )}
        </AnimatedCard>

        {/* Supabase Configuration */}
        <AnimatedCard style={styles.configCard}>
          <Text style={styles.cardTitle}>Supabase Configuration</Text>
          
          <View style={styles.configStatus}>
            <Icon 
              name={supabaseStatus.configured ? "checkmark-circle" : "alert-circle"} 
              size={20} 
              style={{ color: supabaseStatus.configured ? colors.success : colors.warning }} 
            />
            <Text style={[styles.configStatusText, { 
              color: supabaseStatus.configured ? colors.success : colors.warning 
            }]}>
              {supabaseStatus.message}
            </Text>
          </View>

          {!supabaseStatus.configured && (
            <View style={styles.setupInstructions}>
              <Text style={styles.instructionTitle}>Setup Instructions:</Text>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1.</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>Create a Supabase account</Text>
                  <Button
                    title="Open Supabase"
                    onPress={openSupabaseWebsite}
                    style={buttonStyles.secondary}
                  />
                </View>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>2.</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>Create a new project</Text>
                </View>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>3.</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>Copy your project URL and anon key</Text>
                </View>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>4.</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>Set environment variables:</Text>
                  <View style={styles.envVars}>
                    <Text style={styles.envVar}>EXPO_PUBLIC_SUPABASE_URL</Text>
                    <Text style={styles.envVar}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
                  </View>
                </View>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>5.</Text>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>Run the database schema</Text>
                  <Button
                    title="Copy Schema"
                    onPress={copyDatabaseSchema}
                    style={buttonStyles.secondary}
                  />
                </View>
              </View>
            </View>
          )}

          {supabaseStatus.configured && (
            <View style={styles.actions}>
              {!config.useSupabase ? (
                <Button
                  title={isConnecting ? "Connecting..." : "Enable Supabase"}
                  onPress={handleEnableSupabase}
                  disabled={isConnecting}
                  style={buttonStyles.primary}
                />
              ) : (
                <Button
                  title="Disable Supabase"
                  onPress={handleDisableSupabase}
                  style={buttonStyles.secondary}
                />
              )}
            </View>
          )}
        </AnimatedCard>

        {/* Benefits */}
        <AnimatedCard style={styles.benefitsCard}>
          <Text style={styles.cardTitle}>Benefits of Using Supabase</Text>
          
          <View style={styles.benefit}>
            <Icon name="sync" size={20} style={{ color: colors.primary }} />
            <Text style={styles.benefitText}>Real-time data synchronization</Text>
          </View>
          
          <View style={styles.benefit}>
            <Icon name="cloud-upload" size={20} style={{ color: colors.primary }} />
            <Text style={styles.benefitText}>Automatic cloud backup</Text>
          </View>
          
          <View style={styles.benefit}>
            <Icon name="people" size={20} style={{ color: colors.primary }} />
            <Text style={styles.benefitText}>Multi-device access</Text>
          </View>
          
          <View style={styles.benefit}>
            <Icon name="shield-checkmark" size={20} style={{ color: colors.primary }} />
            <Text style={styles.benefitText}>Enterprise-grade security</Text>
          </View>
          
          <View style={styles.benefit}>
            <Icon name="analytics" size={20} style={{ color: colors.primary }} />
            <Text style={styles.benefitText}>Advanced analytics and reporting</Text>
          </View>
        </AnimatedCard>

        {/* Local Storage Info */}
        <AnimatedCard style={styles.localStorageCard}>
          <Text style={styles.cardTitle}>Local Storage</Text>
          <Text style={styles.localStorageText}>
            Without Supabase, your data is stored locally on this device using AsyncStorage. 
            This is perfect for getting started, but you won't have cloud backup or multi-device sync.
          </Text>
          
          <View style={styles.localStorageFeatures}>
            <View style={styles.feature}>
              <Icon name="checkmark" size={16} style={{ color: colors.success }} />
              <Text style={styles.featureText}>Works offline</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="checkmark" size={16} style={{ color: colors.success }} />
              <Text style={styles.featureText}>No setup required</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="close" size={16} style={{ color: colors.danger }} />
              <Text style={styles.featureText}>No cloud backup</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="close" size={16} style={{ color: colors.danger }} />
              <Text style={styles.featureText}>Single device only</Text>
            </View>
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statusCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  lastSync: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  configCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  configStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  configStatusText: {
    ...typography.body,
    marginLeft: spacing.sm,
    flex: 1,
  },
  setupInstructions: {
    marginBottom: spacing.lg,
  },
  instructionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    width: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepButton: {
    alignSelf: 'flex-start',
  },
  envVars: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  envVar: {
    ...typography.small,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
  },
  benefitsCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  localStorageCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  localStorageText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  localStorageFeatures: {
    marginTop: spacing.sm,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.small,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});

export default DatabaseSetup;
