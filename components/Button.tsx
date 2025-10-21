
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/commonStyles';
import { useTheme } from '../hooks/useTheme';
import Icon from './Icon';

interface ButtonProps {
  text?: string;
  title?: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconSize?: number;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export default function Button({
  text,
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  icon,
  iconSize,
  iconPosition = 'left',
  fullWidth = false,
}: ButtonProps) {
  const { themeColor } = useTheme();
  const buttonText = text || title || '';

  const getVariantStyles = () => {
    switch (variant) {
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
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: themeColor,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {
          backgroundColor: themeColor,
          ...shadows.sm,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xxl,
          minHeight: 52,
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          minHeight: 44,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary' || variant === 'ghost') {
      return colors.text;
    }
    if (variant === 'outline') {
      return themeColor;
    }
    return colors.textInverse;
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

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator 
          size="small" 
          color={getTextColor()} 
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Icon 
            name={icon as any} 
            size={getIconSize()} 
            style={{ 
              color: getTextColor(), 
              marginRight: spacing.sm 
            }} 
          />
        )}
        <Text
          style={[
            styles.text,
            { color: getTextColor() },
            size === 'small' && styles.smallText,
            size === 'large' && styles.largeText,
            textStyle,
          ]}
        >
          {buttonText}
        </Text>
        {icon && iconPosition === 'right' && (
          <Icon 
            name={icon as any} 
            size={getIconSize()} 
            style={{ 
              color: getTextColor(), 
              marginLeft: spacing.sm 
            }} 
          />
        )}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.bodyMedium,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    ...typography.captionMedium,
    fontWeight: '600',
  },
  largeText: {
    ...typography.h4,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
