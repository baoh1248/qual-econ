
import { Redirect, router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import CompanyLogo from '../components/CompanyLogo';
import Button from '../components/Button';
import { commonStyles, colors, spacing, typography } from '../styles/commonStyles';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSession, ROLE_LEVELS } from './utils/auth';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const session = await getSession();
      console.log('Current session:', session);
      setUserSession(session);
      setIsLoading(false);
    };

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <View style={[commonStyles.container, commonStyles.centerContent]}>
        <LoadingSpinner />
      </View>
    );
  }

  // If user is logged in, redirect based on their role
  if (userSession) {
    if (userSession.roleLevel === ROLE_LEVELS.CLEANER) {
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
          <Button
            text="Sign In"
            onPress={() => router.push('/auth/login')}
            variant="primary"
            style={styles.button}
          />

          <Text style={styles.helpText}>
            Contact your administrator if you need help accessing your account
          </Text>
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
    alignItems: 'center',
  },
  button: {
    marginBottom: spacing.md,
    width: '100%',
  },
  helpText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
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
