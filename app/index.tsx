
import { Redirect, router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from './integrations/supabase/client';
import CompanyLogo from '../components/CompanyLogo';
import Button from '../components/Button';
import { commonStyles, colors, spacing, typography } from '../styles/commonStyles';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
      </View>
    );
  }

  // If user is logged in, redirect based on their role
  if (session?.user) {
    const userRole = session.user.user_metadata?.role;
    
    if (userRole === 'cleaner') {
      return <Redirect href="/cleaner" />;
    } else {
      return <Redirect href="/supervisor" />;
    }
  }

  // Show welcome screen with options
  return (
    <View style={commonStyles.container}>
      <View style={styles.content}>
        <CompanyLogo size="large" showText={true} />
        
        <Text style={styles.title}>Commercial Cleaning Management</Text>
        <Text style={styles.subtitle}>
          Streamline your cleaning operations with our comprehensive management system
        </Text>

        <View style={styles.buttonContainer}>
          <Text style={styles.sectionTitle}>Cleaners</Text>
          <Button
            text="Cleaner Sign In"
            onPress={() => router.push('/auth/cleaner-signin')}
            variant="primary"
            style={styles.button}
          />
          <Button
            text="Cleaner Sign Up"
            onPress={() => router.push('/auth/cleaner-signup')}
            variant="secondary"
            style={styles.button}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Supervisors</Text>
          <Button
            text="Supervisor Dashboard"
            onPress={() => router.push('/supervisor')}
            variant="primary"
            style={styles.button}
          />
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Features</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>• Task Management & Photo Documentation</Text>
            <Text style={styles.featureItem}>• Time Tracking with GPS</Text>
            <Text style={styles.featureItem}>• Real-time Communication</Text>
            <Text style={styles.featureItem}>• Inventory Management</Text>
            <Text style={styles.featureItem}>• Advanced Analytics & Reporting</Text>
            <Text style={styles.featureItem}>• Team Scheduling & Route Optimization</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 400,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  button: {
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  features: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.lg,
  },
  featuresTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureItem: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
