
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface CompanyLogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export default function CompanyLogo({ 
  size = 'medium', 
  style, 
  showText = true,
  variant = 'light'
}: CompanyLogoProps) {
  console.log('CompanyLogo rendered:', size, variant);

  try {
    const getSizeStyles = () => {
      switch (size) {
        case 'small':
          return {
            iconSize: 24,
            fontSize: typography.caption.fontSize,
            containerPadding: spacing.sm,
          };
        case 'large':
          return {
            iconSize: 48,
            fontSize: typography.h2.fontSize,
            containerPadding: spacing.lg,
          };
        default: // medium
          return {
            iconSize: 32,
            fontSize: typography.body.fontSize,
            containerPadding: spacing.md,
          };
      }
    };

    const sizeStyles = getSizeStyles();
    const textColor = variant === 'light' ? colors.background : colors.text;

    return (
      <View style={[styles.container, { padding: sizeStyles.containerPadding }, style]}>
        <View style={styles.logoContainer}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Icon 
              name="business" 
              size={sizeStyles.iconSize} 
              style={{ color: colors.background }} 
            />
          </View>
          {showText && (
            <Text style={[
              styles.companyText, 
              { 
                color: textColor,
                fontSize: sizeStyles.fontSize,
                fontWeight: '700'
              }
            ]}>
              QualEcon
            </Text>
          )}
        </View>
      </View>
    );
  } catch (error) {
    console.error('Error rendering CompanyLogo:', error);
    // Fallback to simple text
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.companyText, { color: colors.text }]}>
          QualEcon
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
