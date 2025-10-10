
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../styles/commonStyles';
import Icon from './Icon';

interface IconButtonProps {
  icon?: string; // Made optional since we're using a single image now
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'white' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  iconSize?: number;
  children?: React.ReactNode;
}

export default function IconButton({
  icon,
  onPress,
  style,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  iconSize,
  children,
}: IconButtonProps) {
  console.log('IconButton rendered with variant:', variant);

  const getVariantStyles = () => {
    switch (variant) {
      case 'white':
        return {
          backgroundColor: colors.background, // White background
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'secondary':
        return {
          backgroundColor: colors.primary, // Blue background for consistency
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger, // Red background
          shadowColor: colors.danger,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'success':
        return {
          backgroundColor: colors.success, // Green background
          shadowColor: colors.success,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning, // Orange background
          shadowColor: colors.warning,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
      default: // 'primary'
        return {
          backgroundColor: colors.primary, // Blue background
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 3,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: spacing.sm,
          borderRadius: 8,
          minWidth: 36,
          minHeight: 36,
        };
      case 'large':
        return {
          padding: spacing.lg,
          borderRadius: 12,
          minWidth: 56,
          minHeight: 56,
        };
      default:
        return {
          padding: spacing.md,
          borderRadius: 10,
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
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    // If background is white, icon should be black
    // If background is colored, icon should be white
    switch (variant) {
      case 'white':
        return colors.text; // Black icon on white background
      default:
        return colors.background; // White icon on colored background
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
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && (
        <Icon 
          name={icon} 
          size={getIconSize()} 
          style={{ 
            color: getIconColor(),
          }} 
        />
      )}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
});
