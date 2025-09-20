
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { commonStyles, colors, spacing, typography, buttonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import IconButton from '../../components/IconButton';

interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  currentStock: number;
  minStock: number;
  unit: string;
  lastUpdated: Date;
  location: string;
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
  console.log('InventoryScreen rendered');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'All-Purpose Cleaner',
      category: 'cleaning-supplies',
      currentStock: 15,
      minStock: 10,
      unit: 'bottles',
      lastUpdated: new Date(),
      location: 'Storage Room A',
    },
    {
      id: '2',
      name: 'Vacuum Cleaner',
      category: 'equipment',
      currentStock: 3,
      minStock: 2,
      unit: 'units',
      lastUpdated: new Date(),
      location: 'Equipment Room',
    },
    {
      id: '3',
      name: 'Disinfectant Spray',
      category: 'cleaning-supplies',
      currentStock: 8,
      minStock: 12,
      unit: 'bottles',
      lastUpdated: new Date(),
      location: 'Storage Room A',
    },
    {
      id: '4',
      name: 'Safety Gloves',
      category: 'safety',
      currentStock: 25,
      minStock: 20,
      unit: 'pairs',
      lastUpdated: new Date(),
      location: 'Safety Cabinet',
    },
    {
      id: '5',
      name: 'Microfiber Cloths',
      category: 'cleaning-supplies',
      currentStock: 45,
      minStock: 30,
      unit: 'pieces',
      lastUpdated: new Date(),
      location: 'Storage Room B',
    },
  ]);

  // Store the original inventory state when component mounts
  const originalInventory = useRef<InventoryItem[]>([]);

  useEffect(() => {
    // Store the original inventory state on mount
    originalInventory.current = inventory.map(item => ({ ...item }));
    console.log('Original inventory stored:', originalInventory.current);
  }, [inventory]);

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

  // Calculate inventory changes
  const getInventoryChanges = (): InventoryChange[] => {
    const changes: InventoryChange[] = [];
    
    inventory.forEach(currentItem => {
      const originalItem = originalInventory.current.find(item => item.id === currentItem.id);
      if (originalItem && originalItem.currentStock !== currentItem.currentStock) {
        const difference = currentItem.currentStock - originalItem.currentStock;
        changes.push({
          itemId: currentItem.id,
          itemName: currentItem.name,
          originalStock: originalItem.currentStock,
          newStock: currentItem.currentStock,
          difference,
          unit: currentItem.unit,
        });
      }
    });

    console.log('Inventory changes calculated:', changes);
    return changes;
  };

  const hasChanges = () => {
    return getInventoryChanges().length > 0;
  };

  const handleBackPress = () => {
    console.log('Back button pressed, checking for changes');
    if (hasChanges()) {
      setShowExitConfirmation(true);
    } else {
      router.back();
    }
  };

  const confirmExit = () => {
    console.log('Exit confirmed, navigating back');
    setShowExitConfirmation(false);
    router.back();
  };

  const cancelExit = () => {
    console.log('Exit cancelled');
    setShowExitConfirmation(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.minStock) {
      return { status: 'low', color: colors.danger, text: 'Low Stock' };
    } else if (item.currentStock <= item.minStock * 1.5) {
      return { status: 'medium', color: colors.warning, text: 'Medium Stock' };
    } else {
      return { status: 'good', color: colors.success, text: 'Good Stock' };
    }
  };

  const requestRestock = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      Alert.alert(
        'Request Restock',
        `Request restock for ${item.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Request', 
            onPress: () => {
              console.log(`Restock requested for ${item.name}`);
              Alert.alert('Request Sent', 'Restock request has been sent to supervisors');
            }
          },
        ]
      );
    }
  };

  const updateStock = (itemId: string, newStock: number) => {
    setInventory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, currentStock: newStock, lastUpdated: new Date() }
        : item
    ));
    console.log(`Stock updated for item ${itemId}: ${newStock}`);
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || 'cube';
  };

  const formatChangeText = (change: InventoryChange) => {
    const sign = change.difference > 0 ? '+' : '';
    return `${sign}${change.difference} ${change.itemName}`;
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
                        color: change.difference > 0 ? colors.success : colors.danger 
                      }} 
                    />
                    <Text style={styles.changeText}>
                      {change.itemName}
                    </Text>
                    <Text style={[
                      styles.changeAmount,
                      change.difference > 0 ? styles.positiveChange : styles.negativeChange
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
              />
              <Button
                title="Confirm & Exit"
                onPress={confirmExit}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.header}>
        <IconButton 
          icon="arrow-back" 
          onPress={handleBackPress} 
          variant="white"
        />
        <Text style={commonStyles.headerTitle}>Inventory Management</Text>
        <IconButton 
          icon="qr-code" 
          onPress={() => Alert.alert('Scan QR', 'QR code scanner would open here')}
          variant="primary"
        />
      </View>

      <View style={commonStyles.content}>
        {/* Search */}
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
                color: colors.textSecondary 
              }} 
            />
            <TextInput
              style={[
                commonStyles.textInput,
                { paddingLeft: spacing.xl + spacing.md, flex: 1 }
              ]}
              placeholder="Search inventory..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Filter */}
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
                  selectedCategory === category.id ? buttonStyles.filterButtonActive : buttonStyles.filterButton
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
                      marginRight: spacing.xs 
                    }} 
                  />
                  <Text style={[
                    typography.caption,
                    { 
                      color: selectedCategory === category.id 
                        ? colors.background 
                        : colors.text,
                      fontWeight: selectedCategory === category.id ? '700' : '600'
                    }
                  ]}>
                    {category.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Changes Indicator */}
        {hasChanges() && (
          <View style={[
            commonStyles.card,
            { 
              backgroundColor: colors.warning + '20',
              borderColor: colors.warning,
              borderWidth: 2,
              marginBottom: spacing.md 
            }
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

        {/* Inventory List */}
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
                      style={{ color: colors.primary, marginRight: spacing.md }} 
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
                    { backgroundColor: stockStatus.color + '20', borderColor: stockStatus.color }
                  ]}>
                    <Text style={[
                      typography.small,
                      { color: stockStatus.color, fontWeight: '600' }
                    ]}>
                      {stockStatus.text}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.md }]}>
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Current Stock</Text>
                    <Text style={[typography.h3, { color: colors.text }]}>
                      {item.currentStock} {item.unit}
                    </Text>
                  </View>
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Min Stock</Text>
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                      {item.minStock} {item.unit}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, { gap: spacing.sm }]}>
                  <IconButton
                    icon="remove"
                    onPress={() => updateStock(item.id, Math.max(0, item.currentStock - 1))}
                    variant="primary"
                    size="small"
                    style={{ flex: 1 }}
                  />

                  <View style={[
                    {
                      flex: 2,
                      paddingVertical: spacing.sm,
                      backgroundColor: colors.backgroundAlt,
                      borderRadius: 8,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: colors.border,
                    }
                  ]}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {item.currentStock}
                    </Text>
                  </View>

                  <IconButton
                    icon="add"
                    onPress={() => updateStock(item.id, item.currentStock + 1)}
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

                <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                  Last updated: {item.lastUpdated.toLocaleString()}
                </Text>
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
    </View>
  );
}
