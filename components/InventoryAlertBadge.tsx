
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';

interface InventoryAlertBadgeProps {
  count: number;
  priority: 'low' | 'medium' | 'high';
  onPress: () => void;
}

export default function InventoryAlertBadge({ count, priority, onPress }: InventoryAlertBadgeProps) {
  if (count === 0) return null;

  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getPriorityIcon = () => {
    switch (priority) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      case 'low': return 'information-circle';
      default: return 'notifications';
    }
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: getPriorityColor() + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: getPriorityColor() + '40',
      }}
      onPress={onPress}
    >
      <Icon 
        name={getPriorityIcon() as any} 
        size={16} 
        style={{ color: getPriorityColor(), marginRight: spacing.xs }} 
      />
      <Text style={[
        typography.caption,
        { color: getPriorityColor(), fontWeight: '600' }
      ]}>
        {count} {priority} priority
      </Text>
    </TouchableOpacity>
  );
}
