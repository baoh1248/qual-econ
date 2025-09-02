import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '../styles/commonStyles';

interface ButtonProps {
  text: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  success: {
    backgroundColor: colors.success,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  text: {
    ...typography.body,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.background,
  },
  secondaryText: {
    color: colors.text,
  },
  disabledText: {
    color: colors.background,
  },
});

export default function Button({ 
  text, 
  onPress, 
  style, 
  textStyle, 
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  console.log('Button rendered:', text);

  const getButtonStyle = () => {
    if (disabled) return [styles.button, styles.disabled];
    
    switch (variant) {
      case 'secondary': return [styles.button, styles.secondary];
      case 'success': return [styles.button, styles.success];
      case 'danger': return [styles.button, styles.danger];
      default: return [styles.button, styles.primary];
    }
  };

  const getTextStyle = () => {
    if (disabled) return [styles.text, styles.disabledText];
    
    switch (variant) {
      case 'secondary': return [styles.text, styles.secondaryText];
      default: return [styles.text, styles.primaryText];
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[getTextStyle(), textStyle]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}