
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  icon?: string;
  style?: ViewStyle;
}

const SectionHeader = memo(({
  title,
  subtitle,
  actionText,
  onActionPress,
  icon,
  style,
}: SectionHeaderProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftContent}>
        {icon && (
          <View style={styles.iconContainer}>
            <Icon name={icon as any} size={20} style={{ color: colors.primary }} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {actionText && onActionPress && (
        <TouchableOpacity 
          onPress={onActionPress}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionText}</Text>
          <Icon name="chevron-forward" size={16} style={{ color: colors.primary, marginLeft: spacing.xs }} />
        </TouchableOpacity>
      )}
    </View>
  );
});

SectionHeader.displayName = 'SectionHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
  },
  actionText: {
    ...typography.captionBold,
    color: colors.primary,
  },
});

export default SectionHeader;
