
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface ButtonProps {
  text?: string;
  title?: string; // Keep for backward compatibility
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconSize?: number;
}

export default function Button({
  text,
  title, // Keep for backward compatibility
  onPress,
  style,
  textStyle,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  iconSize = 16,
}: ButtonProps) {
  const buttonText = text || title || '';
  console.log('Button rendered:', buttonText);

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.primary, // Blue background for consistency
          borderWidth: 0,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderWidth: 0,
          shadowColor: colors.danger,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          borderWidth: 0,
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          borderWidth: 0,
          shadowColor: colors.warning,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      default:
        return {
          backgroundColor: colors.primary, // Blue background
          borderWidth: 0,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 52,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          minHeight: 44,
        };
    }
  };

  const getContrastingColor = () => {
    // Always return white text for all button variants for better contrast
    return colors.background; // White text
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && (
        <Icon 
          name={icon as any} 
          size={iconSize} 
          style={{ 
            color: getContrastingColor(), 
            marginRight: spacing.sm 
          }} 
        />
      )}
      <Text
        style={[
          styles.text,
          { color: getContrastingColor() },
          size === 'small' && styles.smallText,
          size === 'large' && styles.largeText,
          disabled && styles.disabledText,
          textStyle,
        ]}
      >
        {buttonText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  text: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  smallText: {
    ...typography.caption,
    fontWeight: '700',
  },
  largeText: {
    ...typography.h3,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    opacity: 0.8,
  },
});
