
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';
import DraggableButton from '../DraggableButton';

interface ScheduleActionButtonProps {
  themeColor: string;
  onAddShift: () => void;
  onCreateRecurringTask: () => void;
  onScheduleBuildingGroup: () => void;
}

const ScheduleActionButton: React.FC<ScheduleActionButtonProps> = ({
  themeColor,
  onAddShift,
  onCreateRecurringTask,
  onScheduleBuildingGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    {
      icon: 'add',
      label: 'Add New Shift',
      color: themeColor,
      onPress: () => {
        setShowMenu(false);
        onAddShift();
      },
    },
    {
      icon: 'repeat',
      label: 'Create Recurring Task',
      color: colors.warning,
      onPress: () => {
        setShowMenu(false);
        onCreateRecurringTask();
      },
    },
    {
      icon: 'albums',
      label: 'Schedule Building Group',
      color: colors.success,
      onPress: () => {
        setShowMenu(false);
        onScheduleBuildingGroup();
      },
    },
  ];

  return (
    <>
      <DraggableButton
        icon={showMenu ? 'close' : 'add'}
        iconSize={28}
        iconColor={colors.textInverse}
        backgroundColor={themeColor}
        size={56}
        onPress={() => setShowMenu(!showMenu)}
      />

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Schedule Actions</Text>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                    <Icon name={item.icon} size={24} style={{ color: item.color }} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Icon name="chevron-forward" size={20} style={{ color: colors.textSecondary }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9998,
    }),
  },
  menuContainer: {
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.select({
      ios: spacing.xl + 20,
      android: spacing.xl,
      default: spacing.xl,
    }),
  },
  menuContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: colors.backgroundAlt,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
});

export default ScheduleActionButton;
