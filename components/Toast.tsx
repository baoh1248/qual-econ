
import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  runOnJS
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function Toast({ message, type, visible, onHide, duration = 3000 }: ToastProps) {
  console.log('Toast rendered:', { message, type, visible });
  
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
      
      const timer = setTimeout(() => {
        translateY.value = withSpring(-100);
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onHide)();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: colors.success, icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: colors.danger, icon: 'close-circle' };
      case 'warning':
        return { backgroundColor: colors.warning, icon: 'warning' };
      case 'info':
        return { backgroundColor: colors.primary, icon: 'information-circle' };
      default:
        return { backgroundColor: colors.primary, icon: 'information-circle' };
    }
  };

  const toastStyle = getToastStyle();

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.container,
      { backgroundColor: toastStyle.backgroundColor },
      animatedStyle
    ]}>
      <Icon 
        name={toastStyle.icon} 
        size={20} 
        style={{ color: colors.background, marginRight: spacing.sm }} 
      />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    zIndex: 1000,
    boxShadow: `0 4px 12px ${colors.shadow}`,
    elevation: 8,
  },
  message: {
    ...typography.body,
    color: colors.background,
    flex: 1,
  },
});
