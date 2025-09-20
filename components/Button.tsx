
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

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

// Helper function to get contrasting color
const getContrastColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? colors.text : colors.background;
};

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
          backgroundColor: colors.background,
          // Remove all borders and outlines
          borderWidth: 0,
          // Enhanced shadow for better visibility
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          // Remove all borders and outlines
          borderWidth: 0,
          // Enhanced shadow
          shadowColor: colors.danger,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          // Remove all borders and outlines
          borderWidth: 0,
          // Enhanced shadow
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          // Remove all borders and outlines
          borderWidth: 0,
          // Enhanced shadow
          shadowColor: colors.warning,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        };
      default:
        return {
          backgroundColor: colors.primary,
          // Remove all borders and outlines
          borderWidth: 0,
          // Enhanced shadow for primary buttons
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

  const getBackgroundColor = () => {
    const variantStyles = getVariantStyles();
    return variantStyles.backgroundColor;
  };

  const getContrastingColor = () => {
    const backgroundColor = getBackgroundColor();
    return getContrastColor(backgroundColor);
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
