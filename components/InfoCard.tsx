
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface InfoCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconBackground?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
  index?: number;
  variant?: 'default' | 'gradient' | 'outlined';
}

const InfoCard = memo(({
  title,
  subtitle,
  description,
  icon,
  iconColor = colors.primary,
  iconBackground = colors.primary + '15',
  badge,
  badgeColor = colors.success,
  onPress,
  style,
  index = 0,
  variant = 'default',
}: InfoCardProps) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'gradient':
        return [styles.container, styles.gradientContainer];
      case 'outlined':
        return [styles.container, styles.outlinedContainer];
      default:
        return styles.container;
    }
  };

  const CardContent = (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(350).springify()}
      style={[getContainerStyle(), style]}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
            <Icon name={icon as any} size={24} style={{ color: iconColor }} />
          </View>
        )}
        
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {onPress && (
          <Icon name="chevron-forward" size={20} style={{ color: colors.textTertiary }} />
        )}
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
});

InfoCard.displayName = 'InfoCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: spacing.md,
  },
  gradientContainer: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outlinedContainer: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  badgeText: {
    ...typography.tiny,
    fontWeight: '700',
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
});

export default InfoCard;
