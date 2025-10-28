
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InventoryAlert {
  id: string;
  itemId: string;
  itemName: string;
  type: 'low-stock' | 'out-of-stock' | 'auto-reorder' | 'expiring';
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  acknowledged: boolean;
}

interface AlertSettings {
  enableLowStockAlerts: boolean;
  enableAutoReorderAlerts: boolean;
  enableExpirationAlerts: boolean;
  lowStockThreshold: number; // percentage
  alertFrequency: 'immediate' | 'hourly' | 'daily';
}

const STORAGE_KEYS = {
  ALERTS: '@inventory_alerts',
  SETTINGS: '@alert_settings',
} as const;

const DEFAULT_SETTINGS: AlertSettings = {
  enableLowStockAlerts: true,
  enableAutoReorderAlerts: true,
  enableExpirationAlerts: true,
  lowStockThreshold: 20, // 20% of max stock
  alertFrequency: 'immediate',
};

export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Load alerts and settings from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [alertsData, settingsData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ALERTS),
          AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        ]);

        if (alertsData) {
          const parsedAlerts = JSON.parse(alertsData).map((alert: any) => ({
            ...alert,
            timestamp: new Date(alert.timestamp),
          }));
          setAlerts(parsedAlerts);
        }

        if (settingsData) {
          setSettings(JSON.parse(settingsData));
        }
      } catch (error) {
        console.error('Error loading inventory alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save alerts to storage
  const saveAlerts = useCallback(async (newAlerts: InventoryAlert[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(newAlerts));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: AlertSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving alert settings:', error);
    }
  }, []);

  // Create a new alert
  const createAlert = useCallback((
    itemId: string,
    itemName: string,
    type: InventoryAlert['type'],
    message: string,
    priority: InventoryAlert['priority'] = 'medium'
  ) => {
    const newAlert: InventoryAlert = {
      id: Date.now().toString(),
      itemId,
      itemName,
      type,
      message,
      priority,
      timestamp: new Date(),
      acknowledged: false,
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      saveAlerts(updated);
      return updated;
    });

    console.log(`Inventory alert created: ${message}`);
    return newAlert;
  }, [saveAlerts]);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => {
      const updated = prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      );
      saveAlerts(updated);
      return updated;
    });
  }, [saveAlerts]);

  // Acknowledge all alerts
  const acknowledgeAllAlerts = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.map(alert => ({ ...alert, acknowledged: true }));
      saveAlerts(updated);
      return updated;
    });
  }, [saveAlerts]);

  // Clear old alerts (older than 7 days)
  const clearOldAlerts = useCallback(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    setAlerts(prev => {
      const updated = prev.filter(alert => alert.timestamp > sevenDaysAgo);
      saveAlerts(updated);
      return updated;
    });
  }, [saveAlerts]);

  // Update alert settings
  const updateSettings = useCallback((newSettings: Partial<AlertSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  }, [settings, saveSettings]);

  // Check inventory for alerts
  const checkInventoryAlerts = useCallback((inventory: any[]) => {
    if (!settings.enableLowStockAlerts) return;

    inventory.forEach(item => {
      const stockPercentage = (item.currentStock / item.maxStock) * 100;
      
      // Check for low stock
      if (stockPercentage <= settings.lowStockThreshold && item.currentStock > 0) {
        const existingAlert = alerts.find(alert => 
          alert.itemId === item.id && 
          alert.type === 'low-stock' && 
          !alert.acknowledged
        );

        if (!existingAlert) {
          createAlert(
            item.id,
            item.name,
            'low-stock',
            `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
            'medium'
          );
        }
      }

      // Check for out of stock
      if (item.currentStock === 0) {
        const existingAlert = alerts.find(alert => 
          alert.itemId === item.id && 
          alert.type === 'out-of-stock' && 
          !alert.acknowledged
        );

        if (!existingAlert) {
          createAlert(
            item.id,
            item.name,
            'out-of-stock',
            `${item.name} is out of stock`,
            'high'
          );
        }
      }

      // Check for auto-reorder trigger
      if (settings.enableAutoReorderAlerts && item.autoReorderEnabled && item.currentStock <= item.minStock) {
        const existingAlert = alerts.find(alert => 
          alert.itemId === item.id && 
          alert.type === 'auto-reorder' && 
          !alert.acknowledged
        );

        if (!existingAlert) {
          createAlert(
            item.id,
            item.name,
            'auto-reorder',
            `Auto-reorder triggered for ${item.name} (${item.reorderQuantity} ${item.unit})`,
            'low'
          );
        }
      }
    });
  }, [settings, alerts, createAlert]);

  // Get unacknowledged alerts
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  
  // Get alerts by priority
  const highPriorityAlerts = unacknowledgedAlerts.filter(alert => alert.priority === 'high');
  const mediumPriorityAlerts = unacknowledgedAlerts.filter(alert => alert.priority === 'medium');
  const lowPriorityAlerts = unacknowledgedAlerts.filter(alert => alert.priority === 'low');

  return {
    alerts,
    settings,
    loading,
    unacknowledgedAlerts,
    highPriorityAlerts,
    mediumPriorityAlerts,
    lowPriorityAlerts,
    createAlert,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearOldAlerts,
    updateSettings,
    checkInventoryAlerts,
  };
}
