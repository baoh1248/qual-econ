
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { colors, spacing, typography } from '../styles/commonStyles';
import Icon from './Icon';
import { supabase } from '../app/integrations/supabase/client';
import Button from './Button';

interface ShiftNotification {
  id: string;
  notification_type: 'unassigned_shift' | 'time_off_approved' | 'time_off_declined';
  shift_id?: string;
  shift_date?: string;
  building_name?: string;
  client_name?: string;
  time_off_request_id?: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface UnassignedShiftNotificationsProps {
  themeColor: string;
  onAssignShift?: (notification: ShiftNotification) => void;
  onRemoveShift?: (notification: ShiftNotification) => void;
}

export default function UnassignedShiftNotifications({
  themeColor,
  onAssignShift,
  onRemoveShift,
}: UnassignedShiftNotificationsProps) {
  const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shift_notifications')
        .select('*')
        .eq('is_dismissed', false)
        .eq('notification_type', 'unassigned_shift')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel('shift_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('shift_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('shift_notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleNotificationPress = (notification: ShiftNotification) => {
    markAsRead(notification.id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: themeColor }]}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="alert-circle" size={20} color={colors.textInverse} />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: themeColor }]}>
              <Text style={styles.modalTitle}>Unassigned Shifts</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textInverse} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.is_read && styles.unreadNotification,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(notification)}
                    style={styles.notificationContent}
                  >
                    <View style={styles.notificationHeader}>
                      <Icon
                        name="alert-circle"
                        size={20}
                        color={notification.is_read ? colors.textSecondary : themeColor}
                      />
                      <Text style={styles.notificationDate}>
                        {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <Text style={styles.notificationMessage}>{notification.message}</Text>

                    {notification.shift_date && (
                      <View style={styles.shiftInfo}>
                        <Icon name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={styles.shiftInfoText}>
                          {new Date(notification.shift_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                    )}

                    {notification.building_name && (
                      <View style={styles.shiftInfo}>
                        <Icon name="business" size={14} color={colors.textSecondary} />
                        <Text style={styles.shiftInfoText}>
                          {notification.client_name} - {notification.building_name}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.notificationActions}>
                    {onAssignShift && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: themeColor }]}
                        onPress={() => {
                          onAssignShift(notification);
                          setModalVisible(false);
                        }}
                      >
                        <Icon name="person-add" size={16} color={colors.textInverse} />
                        <Text style={styles.actionButtonText}>Assign</Text>
                      </TouchableOpacity>
                    )}

                    {onRemoveShift && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() => {
                          onRemoveShift(notification);
                          dismissNotification(notification.id);
                        }}
                      >
                        <Icon name="trash" size={16} color={colors.textInverse} />
                        <Text style={styles.actionButtonText}>Remove</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.dismissButton]}
                      onPress={() => dismissNotification(notification.id)}
                    >
                      <Icon name="close" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    ...typography.small,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing.lg,
  },
  notificationCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadNotification: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  notificationContent: {
    marginBottom: spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationDate: {
    ...typography.small,
    color: colors.textSecondary,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  shiftInfoText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  removeButton: {
    backgroundColor: colors.danger,
  },
  dismissButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 0,
    paddingHorizontal: spacing.sm,
  },
  actionButtonText: {
    ...typography.small,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
