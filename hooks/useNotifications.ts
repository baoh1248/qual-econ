
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notification_settings';

interface NotificationSettings {
  enableInventoryAlerts: boolean;
  enableScheduleAlerts: boolean;
  enableTaskAlerts: boolean;
  enablePayrollAlerts: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  enableQuietHours: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enableInventoryAlerts: true,
  enableScheduleAlerts: true,
  enableTaskAlerts: true,
  enablePayrollAlerts: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  enableQuietHours: false,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Load settings from storage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }, []);

  // Register for push notifications
  const registerForPushNotificationsAsync = useCallback(async () => {
    let token = '';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create channels for different notification types
      await Notifications.setNotificationChannelAsync('inventory', {
        name: 'Inventory Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });

      await Notifications.setNotificationChannelAsync('schedule', {
        name: 'Schedule Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#4ECDC4',
      });

      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Task Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#95E1D3',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }, []);

  // Initialize notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotificationsAsync]);

  // Check if we're in quiet hours
  const isQuietHours = useCallback(() => {
    if (!settings.enableQuietHours) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    return currentTime >= start && currentTime <= end;
  }, [settings]);

  // Schedule a local notification
  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput,
    channelId: string = 'default'
  ) => {
    // Don't send notifications during quiet hours
    if (isQuietHours()) {
      console.log('Notification suppressed due to quiet hours');
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null,
      });
      
      console.log('Notification scheduled:', id);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, [isQuietHours]);

  // Send inventory alert
  const sendInventoryAlert = useCallback(async (
    itemName: string,
    currentStock: number,
    unit: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    if (!settings.enableInventoryAlerts) return;

    const title = priority === 'high' ? '🚨 Critical Stock Alert' : '⚠️ Low Stock Alert';
    const body = currentStock === 0 
      ? `${itemName} is out of stock!`
      : `${itemName} is running low (${currentStock} ${unit} remaining)`;

    return await scheduleNotification(title, body, {
      type: 'inventory',
      itemName,
      currentStock,
      priority,
    }, undefined, 'inventory');
  }, [settings.enableInventoryAlerts, scheduleNotification]);

  // Send schedule alert
  const sendScheduleAlert = useCallback(async (
    title: string,
    message: string,
    scheduleData?: any
  ) => {
    if (!settings.enableScheduleAlerts) return;

    return await scheduleNotification(
      title,
      message,
      { type: 'schedule', ...scheduleData },
      undefined,
      'schedule'
    );
  }, [settings.enableScheduleAlerts, scheduleNotification]);

  // Send task alert
  const sendTaskAlert = useCallback(async (
    title: string,
    message: string,
    taskData?: any
  ) => {
    if (!settings.enableTaskAlerts) return;

    return await scheduleNotification(
      title,
      message,
      { type: 'task', ...taskData },
      undefined,
      'tasks'
    );
  }, [settings.enableTaskAlerts, scheduleNotification]);

  // Send daily inventory digest
  const scheduleDailyInventoryDigest = useCallback(async (lowStockItems: any[]) => {
    if (!settings.enableInventoryAlerts || lowStockItems.length === 0) return;

    const title = '📊 Daily Inventory Report';
    const body = `${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} need attention`;

    // Schedule for 9 AM tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    return await scheduleNotification(
      title,
      body,
      {
        type: 'inventory_digest',
        items: lowStockItems,
      },
      { date: tomorrow },
      'inventory'
    );
  }, [settings.enableInventoryAlerts, scheduleNotification]);

  // Cancel a scheduled notification
  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  // Get badge count
  const getBadgeCount = useCallback(async () => {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number) => {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }, []);

  return {
    expoPushToken,
    notification,
    settings,
    loading,
    saveSettings,
    scheduleNotification,
    sendInventoryAlert,
    sendScheduleAlert,
    sendTaskAlert,
    scheduleDailyInventoryDigest,
    cancelNotification,
    cancelAllNotifications,
    getBadgeCount,
    setBadgeCount,
  };
}
