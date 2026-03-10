
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import { commonStyles, colors, spacing, typography, buttonStyles } from '../../styles/commonStyles';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import IconButton from '../../components/IconButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../integrations/supabase/client';
import uuid from 'react-native-uuid';

interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: number;
  min_stock: number;
  unit: string;
  location: string;
  updated_at?: string;
}

interface InventoryChange {
  itemId: string;
  itemName: string;
  originalStock: number;
  newStock: number;
  difference: number;
  unit: string;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    }),
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.lg,
    maxHeight: '80%',
    minWidth: '85%',
    ...(Platform.OS === 'web' && {
      zIndex: 10000,
      position: 'relative' as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  changeText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  changeAmount: {
    ...typography.body,
    fontWeight: '600',
  },
  positiveChange: {
    color: colors.success,
  },
  negativeChange: {
    color: colors.danger,
  },
  noChangesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export default function InventoryScreen() {
  const { themeColor } = useTheme();
  const { toast, showToast, hideToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cleanerName, setCleanerName] = useState('');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // Snapshot stored once on load — never updated on state changes
  const originalInventory = useRef<InventoryItem[]>([]);

  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);

      const { getSession } = await import('../utils/auth');
      const session = await getSession();
      if (session) setCleanerName(session.name);

      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, category, current_stock, min_stock, unit, location, updated_at')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading inventory:', error);
        showToast('Failed to load inventory', 'error');
        return;
      }

      const items: InventoryItem[] = data || [];
      setInventory(items);
      originalInventory.current = items.map(item => ({ ...item }));
    } catch (err) {
      console.error('Error in loadInventory:', err);
      showToast('Failed to load inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  const categories = [
    { id: 'all', name: 'All Items', icon: 'apps' },
    { id: 'cleaning-supplies', name: 'Cleaning Supplies', icon: 'flask' },
    { id: 'equipment', name: 'Equipment', icon: 'construct' },
    { id: 'safety', name: 'Safety', icon: 'shield-checkmark' },
  ];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getInventoryChanges = (): InventoryChange[] => {
    const changes: InventoryChange[] = [];

    inventory.forEach(currentItem => {
      const originalItem = originalInventory.current.find(item => item.id === currentItem.id);
      if (originalItem && originalItem.current_stock !== currentItem.current_stock) {
        const difference = currentItem.current_stock - originalItem.current_stock;
        changes.push({
          itemId: currentItem.id,
          itemName: currentItem.name,
          originalStock: originalItem.current_stock,
          newStock: currentItem.current_stock,
          difference,
          unit: currentItem.unit,
        });
      }
    });

    return changes;
  };

  const hasChanges = () => getInventoryChanges().length > 0;

  const handleBackPress = () => {
    if (hasChanges()) {
      setShowExitConfirmation(true);
    } else {
      router.back();
    }
  };

  const confirmExit = async () => {
    const changes = getInventoryChanges();

    if (changes.length > 0) {
      try {
        setIsSaving(true);

        for (const change of changes) {
          const { error } = await supabase
            .from('inventory_items')
            .update({
              current_stock: change.newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', change.itemId);

          if (error) {
            console.error('Error saving stock change:', error);
            showToast('Failed to save changes', 'error');
            return;
          }

          // Log the adjustment to inventory_transactions
          try {
            await supabase.from('inventory_transactions').insert({
              id: uuid.v4() as string,
              item_id: change.itemId,
              item_name: change.itemName,
              transaction_type: change.difference > 0 ? 'in' : 'out',
              quantity: Math.abs(change.difference),
              previous_stock: change.originalStock,
              new_stock: change.newStock,
              reason: 'Stock count adjustment by cleaner',
              performed_by: 'Cleaner',
              created_at: new Date().toISOString(),
            });
          } catch (logErr) {
            console.warn('⚠️ Failed to log stock adjustment (non-critical):', logErr);
          }
        }

        showToast('Inventory updated', 'success');
      } catch (err) {
        console.error('Error saving inventory changes:', err);
        showToast('Failed to save changes', 'error');
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setShowExitConfirmation(false);
    router.back();
  };

  const cancelExit = () => {
    setShowExitConfirmation(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= item.min_stock) {
      return { status: 'low', color: colors.danger, text: 'Low Stock' };
    } else if (item.current_stock <= item.min_stock * 1.5) {
      return { status: 'medium', color: colors.warning, text: 'Medium Stock' };
    } else {
      return { status: 'good', color: colors.success, text: 'Good Stock' };
    }
  };

  const requestRestock = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    Alert.alert(
      'Request Restock',
      `Request restock for ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const restockQty = Math.max(item.min_stock - item.current_stock, 1);
              const { error } = await supabase.from('restock_requests').insert({
                id: uuid.v4() as string,
                item_id: item.id,
                item_name: item.name,
                requested_by: cleanerName || 'Cleaner',
                requested_at: new Date().toISOString(),
                quantity: restockQty,
                priority: item.current_stock === 0 ? 'high' : 'medium',
                status: 'pending',
                notes: 'Restock requested via cleaner app',
              });

              if (error) throw error;
              showToast('Restock request sent to supervisors', 'success');
            } catch (err) {
              console.error('Error requesting restock:', err);
              showToast('Failed to send request', 'error');
            }
          },
        },
      ]
    );
  };

  const updateStock = (itemId: string, newStock: number) => {
    setInventory(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, current_stock: newStock }
        : item
    ));
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || 'cube';
  };

  const formatChangeText = (change: InventoryChange) => {
    const sign = change.difference > 0 ? '+' : '';
    return `${sign}${change.difference} ${change.unit}`;
  };

  const renderExitConfirmationModal = () => {
    const changes = getInventoryChanges();

    return (
      <Modal
        visible={showExitConfirmation}
        transparent
        animationType="fade"
        onRequestClose={cancelExit}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={cancelExit}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="warning" size={24} style={{ color: colors.warning }} />
              <Text style={styles.modalTitle}>Confirm Inventory Changes</Text>
            </View>

            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              You have made the following changes to the inventory:
            </Text>

            <ScrollView style={{ maxHeight: 300 }}>
              {changes.length > 0 ? (
                changes.map((change, index) => (
                  <View key={index} style={styles.changeItem}>
                    <Icon
                      name={change.difference > 0 ? 'add-circle' : 'remove-circle'}
                      size={20}
                      style={{
                        color: change.difference > 0 ? colors.success : colors.danger,
                      }}
                    />
                    <Text style={styles.changeText}>
                      {change.itemName}
                    </Text>
                    <Text style={[
                      styles.changeAmount,
                      change.difference > 0 ? styles.positiveChange : styles.negativeChange,
                    ]}>
                      {formatChangeText(change)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noChangesText}>
                  No changes detected
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={cancelExit}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Saving...' : 'Confirm & Save'}
                onPress={confirmExit}
                variant="primary"
                style={{ flex: 1 }}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, { backgroundColor: themeColor }]}>
        <IconButton
          icon="arrow-back"
          onPress={handleBackPress}
          variant="white"
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <CompanyLogo size="small" showText={false} variant="light" />
          <Text style={commonStyles.headerTitle}>Inventory</Text>
        </View>
        <IconButton
          icon="refresh"
          onPress={loadInventory}
          variant="white"
        />
      </View>

      <View style={commonStyles.content}>
        <View style={{ marginBottom: spacing.md }}>
          <View style={[commonStyles.row, { position: 'relative' }]}>
            <Icon
              name="search"
              size={20}
              style={{
                position: 'absolute',
                left: spacing.md,
                top: spacing.sm + 2,
                zIndex: 1,
                color: colors.textSecondary,
              }}
            />
            <TextInput
              style={[
                commonStyles.textInput,
                { paddingLeft: spacing.xl + spacing.md, flex: 1 },
              ]}
              placeholder="Search inventory..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.md }}
        >
          <View style={[commonStyles.row, { gap: spacing.sm, paddingHorizontal: spacing.xs }]}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  selectedCategory === category.id
                    ? [buttonStyles.filterButtonActive, { backgroundColor: themeColor }]
                    : buttonStyles.filterButton,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View style={commonStyles.row}>
                  <Icon
                    name={category.icon as any}
                    size={16}
                    style={{
                      color: selectedCategory === category.id
                        ? colors.background
                        : colors.text,
                      marginRight: spacing.xs,
                    }}
                  />
                  <Text style={[
                    typography.caption,
                    {
                      color: selectedCategory === category.id
                        ? colors.background
                        : colors.text,
                      fontWeight: selectedCategory === category.id ? '700' : '600',
                    },
                  ]}>
                    {category.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {hasChanges() && (
          <View style={[
            commonStyles.card,
            {
              backgroundColor: colors.warning + '20',
              borderColor: colors.warning,
              borderWidth: 2,
              marginBottom: spacing.md,
            },
          ]}>
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <Icon name="warning" size={20} style={{ color: colors.warning, marginRight: spacing.sm }} />
              <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
                You have unsaved inventory changes
              </Text>
              <TouchableOpacity
                onPress={() => setShowExitConfirmation(true)}
                style={[buttonStyles.iconButtonWarning]}
              >
                <Text style={[typography.caption, { color: colors.background, fontWeight: '700' }]}>
                  Review
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredInventory.map(item => {
            const stockStatus = getStockStatus(item);
            return (
              <View key={item.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <View style={[commonStyles.row, { flex: 1 }]}>
                    <Icon
                      name={getCategoryIcon(item.category) as any}
                      size={24}
                      style={{ color: themeColor, marginRight: spacing.md }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                        {item.name}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {item.location}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    commonStyles.statusBadge,
                    { backgroundColor: stockStatus.color + '20', borderColor: stockStatus.color },
                  ]}>
                    <Text style={[
                      typography.small,
                      { color: stockStatus.color, fontWeight: '600' },
                    ]}>
                      {stockStatus.text}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Current Stock</Text>
                    <Text style={[typography.h3, { color: colors.text }]}>
                      {item.current_stock} {item.unit}
                    </Text>
                  </View>
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Min Stock</Text>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                      {item.min_stock} {item.unit}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, { gap: spacing.sm }]}>
                  <IconButton
                    icon="remove"
                    onPress={() => updateStock(item.id, Math.max(0, item.current_stock - 1))}
                    variant="primary"
                    size="small"
                    style={{ flex: 1 }}
                  />

                  <View style={{
                    flex: 2,
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.backgroundAlt,
                    borderRadius: 8,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.border,
                  }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {item.current_stock}
                    </Text>
                  </View>

                  <IconButton
                    icon="add"
                    onPress={() => updateStock(item.id, item.current_stock + 1)}
                    variant="primary"
                    size="small"
                    style={{ flex: 1 }}
                  />

                  {stockStatus.status === 'low' && (
                    <TouchableOpacity
                      style={[buttonStyles.iconButtonDanger, { flex: 2 }]}
                      onPress={() => requestRestock(item.id)}
                    >
                      <Text style={[typography.caption, { color: colors.background, fontWeight: '700' }]}>
                        Request
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.updated_at && (
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                    Last updated: {new Date(item.updated_at).toLocaleString()}
                  </Text>
                )}
              </View>
            );
          })}

          {filteredInventory.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Icon name="cube" size={48} style={{ color: colors.textSecondary, marginBottom: spacing.md }} />
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                No items found
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                Try adjusting your search or filter
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {renderExitConfirmationModal()}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </View>
  );
}
