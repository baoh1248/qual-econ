
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  iconBackground?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  style?: ViewStyle;
  index?: number;
}

const StatCard = memo(({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  iconBackground = colors.primary + '15',
  trend,
  trendValue,
  style,
  index = 0,
}: StatCardProps) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50).duration(300).springify()}
      style={[styles.container, style]}
    >
      <View style={styles.content}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBackground }]}>
            <Icon name={icon as any} size={24} style={{ color: iconColor }} />
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            {trend && trendValue && (
              <View style={[styles.trendBadge, { backgroundColor: getTrendColor() + '15' }]}>
                <Icon 
                  name={getTrendIcon() as any} 
                  size={12} 
                  style={{ color: getTrendColor(), marginRight: spacing.xs }} 
                />
                <Text style={[styles.trendText, { color: getTrendColor() }]}>
                  {trendValue}
                </Text>
              </View>
            )}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Animated.View>
  );
});

StatCard.displayName = 'StatCard';

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
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  trendText: {
    ...typography.tiny,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.small,
    color: colors.textTertiary,
  },
});

export default StatCard;
