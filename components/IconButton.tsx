
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../styles/commonStyles';
import Icon from './Icon';

interface IconButtonProps {
  icon?: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'white' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  iconSize?: number;
  children?: React.ReactNode;
}

export default function IconButton({
  icon,
  onPress,
  style,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  iconSize,
  children,
}: IconButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'white':
        return {
          backgroundColor: colors.card,
          ...shadows.sm,
        };
      case 'secondary':
        return {
          backgroundColor: colors.backgroundAlt,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          ...shadows.sm,
        };
      case 'success':
        return {
          backgroundColor: colors.success,
          ...shadows.sm,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          ...shadows.sm,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {
          backgroundColor: colors.primary,
          ...shadows.sm,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: spacing.sm,
          borderRadius: borderRadius.sm,
          minWidth: 36,
          minHeight: 36,
        };
      case 'large':
        return {
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          minWidth: 56,
          minHeight: 56,
        };
      default:
        return {
          padding: spacing.md,
          borderRadius: borderRadius.md,
          minWidth: 44,
          minHeight: 44,
        };
    }
  };

  const getIconSize = () => {
    if (iconSize) return iconSize;
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'white':
      case 'secondary':
      case 'ghost':
        return colors.text;
      default:
        return colors.textInverse;
    }
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
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          {icon && (
            <Icon 
              name={icon} 
              size={getIconSize()} 
              style={{ color: getIconColor() }} 
            />
          )}
          {children}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
