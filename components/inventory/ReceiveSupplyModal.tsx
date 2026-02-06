
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { colors, spacing, typography, commonStyles, buttonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import { logInventoryTransfer, type InventoryTransferItem, formatCurrency } from '../../utils/inventoryTracking';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  category: string;
  cost?: number;
  location?: string;
}

interface ReceiveSupplyModalProps {
  visible: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onReceive: (itemIds: string[], quantities: number[], costs: number[]) => void;
  onSuccess?: () => void;
  warehouses?: string[];
}

interface SelectedItem extends InventoryTransferItem {
  id: string;
}

const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
};

const ReceiveSupplyModal = memo<ReceiveSupplyModalProps>(({ visible, onClose, inventory, onReceive, onSuccess, warehouses }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(warehouses && warehouses.length > 0 ? warehouses[0] : 'Warehouse');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showItemSearch, setShowItemSearch] = useState(false);

  // Local editing state so numeric fields can be freely typed without reformatting mid-keystroke
  const [editingQuantities, setEditingQuantities] = useState<Record<string, string>>({});
  const [editingCosts, setEditingCosts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      // Auto-generate order number when modal opens
      setOrderNumber(generateOrderNumber());
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setSelectedWarehouse(warehouses && warehouses.length > 0 ? warehouses[0] : 'Warehouse');
    } else {
      // Reset form when modal closes
      setOrderNumber('');
      setSupplierName('');
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setSelectedWarehouse(warehouses && warehouses.length > 0 ? warehouses[0] : 'Warehouse');
      setSelectedItems([]);
      setNotes('');
      setSearchQuery('');
      setShowItemSearch(false);
    }
  }, [visible]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const notSelected = !selectedItems.some(selected => selected.id === item.id);
    const matchesWarehouse = !warehouses || !warehouses.length || item.location === selectedWarehouse;
    return matchesSearch && notSelected && matchesWarehouse;
  });

  const addItem = (item: InventoryItem) => {
    const newItem: SelectedItem = {
      id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.unit,
      unitCost: item.cost || 0,
      totalCost: item.cost || 0,
    };
    setSelectedItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setShowItemSearch(false);
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, quantity);
        return {
          ...item,
          quantity: newQuantity,
          totalCost: (item.unitCost || 0) * newQuantity,
        };
      }
      return item;
    }));
  };

  const updateItemUnitCost = (itemId: string, cost: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newCost = Math.max(0, cost);
        return {
          ...item,
          unitCost: newCost,
          totalCost: newCost * item.quantity,
        };
      }
      return item;
    }));
  };

  const handleReceiveSupply = async () => {
    if (!supplierName.trim()) {
      Alert.alert('Error', 'Please enter a supplier name');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    try {
      setProcessing(true);

      console.log('=== RECEIVING SUPPLY ===');
      console.log('Order Number:', orderNumber);
      console.log('Supplier:', supplierName);
      console.log('Date:', receiveDate);
      console.log('Items:', selectedItems);

      const totalValue = selectedItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);

      // Log the incoming transfer
      await logInventoryTransfer({
        items: selectedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
        destination: selectedWarehouse, // Incoming supplies go to selected warehouse
        timestamp: new Date(receiveDate).toISOString(),
        transferredBy: 'Supervisor',
        notes: notes.trim() || undefined,
        totalValue: totalValue,
        type: 'incoming',
        source: supplierName,
        orderNumber: orderNumber,
      });

      // Call the onReceive callback to update inventory
      const itemIds = selectedItems.map(item => item.id);
      const quantities = selectedItems.map(item => item.quantity);
      const costs = selectedItems.map(item => item.unitCost || 0);

      await onReceive(itemIds, quantities, costs);

      const itemSummary = selectedItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ');

      onClose();

      setTimeout(() => {
        Alert.alert(
          'Supply Received Successfully',
          `Order ${orderNumber}\n\n${itemSummary}\n\nTotal: ${formatCurrency(totalValue)}`,
          [{ text: 'OK', onPress: () => onSuccess?.() }]
        );
      }, 300);

    } catch (error) {
      console.error('Failed to receive supply:', error);
      Alert.alert('Error', 'Failed to record supply receipt. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = selectedItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: Platform.OS === 'ios' ? colors.background : 'rgba(0,0,0,0.5)',
        justifyContent: Platform.OS === 'ios' ? 'flex-start' : 'center',
        alignItems: Platform.OS === 'ios' ? 'stretch' : 'center',
        ...(Platform.OS === 'web' && {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }),
      }}>
        {Platform.OS !== 'ios' && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            activeOpacity={1}
            onPress={onClose}
          />
        )}
        <View style={{
          width: Platform.OS === 'ios' ? '100%' : '90%',
          maxWidth: Platform.OS === 'ios' ? undefined : 600,
          maxHeight: Platform.OS === 'ios' ? '100%' : '90%',
          backgroundColor: colors.background,
          borderRadius: Platform.OS === 'ios' ? 0 : 16,
          overflow: 'hidden',
          ...(Platform.OS === 'web' && {
            zIndex: 10000,
            position: 'relative' as any,
          }),
        }}>
          <View style={[commonStyles.header, { backgroundColor: colors.success }]}>
            <IconButton
              icon="close"
              onPress={onClose}
              variant="white"
            />
            <Text style={commonStyles.headerTitle}>Receive Supply</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            {/* Order Number */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionLabel}>Order Number</Text>
              <View style={[commonStyles.row, { gap: spacing.sm }]}>
                <TextInput
                  style={[commonStyles.textInput, { flex: 1 }]}
                  placeholder="Enter order/invoice number"
                  placeholderTextColor={colors.textSecondary}
                  value={orderNumber}
                  onChangeText={setOrderNumber}
                />
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => setOrderNumber(generateOrderNumber())}
                >
                  <Icon name="refresh" size={20} color={colors.background} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Supplier Name */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionLabel}>Supplier Name *</Text>
              <TextInput
                style={commonStyles.textInput}
                placeholder="Enter supplier name"
                placeholderTextColor={colors.textSecondary}
                value={supplierName}
                onChangeText={setSupplierName}
              />
            </View>

            {/* Date */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionLabel}>Date Received</Text>
              <TextInput
                style={commonStyles.textInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={receiveDate}
                onChangeText={setReceiveDate}
              />
            </View>

            {/* Receive Into Warehouse */}
            {warehouses && warehouses.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionLabel}>Receive Into Warehouse *</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {warehouses.map((wh) => (
                    <TouchableOpacity
                      key={wh}
                      style={{
                        flex: 1,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.md,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedWarehouse === wh ? colors.success : colors.border,
                        backgroundColor: selectedWarehouse === wh ? colors.success + '15' : colors.surface,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setSelectedWarehouse(wh);
                        setSelectedItems([]);
                      }}
                    >
                      <Icon
                        name="business"
                        size={20}
                        style={{ color: selectedWarehouse === wh ? colors.success : colors.textSecondary, marginBottom: spacing.xs }}
                      />
                      <Text style={{
                        fontSize: 13,
                        color: selectedWarehouse === wh ? colors.success : colors.text,
                        fontWeight: selectedWarehouse === wh ? '700' : '500',
                        textAlign: 'center',
                      }}>
                        {wh}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <Text style={styles.sectionLabel}>
                    Items Received ({totalItems} total)
                  </Text>
                  <Text style={[typography.body, { color: colors.success, fontWeight: '700' }]}>
                    {formatCurrency(totalValue)}
                  </Text>
                </View>

                {selectedItems.map(item => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>
                        {item.name}
                      </Text>
                      <IconButton
                        icon="close"
                        onPress={() => removeItem(item.id)}
                        variant="secondary"
                        size="small"
                        style={{ backgroundColor: colors.danger }}
                      />
                    </View>

                    {/* Quantity Row */}
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Quantity:</Text>
                      <View style={[commonStyles.row, { alignItems: 'center', gap: spacing.sm }]}>
                        <IconButton
                          icon="remove"
                          onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                          variant="secondary"
                          size="small"
                          disabled={item.quantity <= 1}
                          style={{ backgroundColor: item.quantity <= 1 ? colors.backgroundAlt : colors.primary }}
                        />
                        <TextInput
                          style={styles.quantityInput}
                          value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : item.quantity.toString()}
                          onFocus={() => setEditingQuantities(prev => ({ ...prev, [item.id]: item.quantity.toString() }))}
                          onChangeText={(text) => {
                            // Allow free typing - only keep digits
                            const cleaned = text.replace(/[^0-9]/g, '');
                            setEditingQuantities(prev => ({ ...prev, [item.id]: cleaned }));
                          }}
                          onBlur={() => {
                            const qty = parseInt(editingQuantities[item.id]) || 1;
                            updateItemQuantity(item.id, qty);
                            setEditingQuantities(prev => { const next = { ...prev }; delete next[item.id]; return next; });
                          }}
                          selectTextOnFocus
                          keyboardType="numeric"
                        />
                        <Text style={[typography.caption, { color: colors.textSecondary }]}>{item.unit}</Text>
                        <IconButton
                          icon="add"
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                          variant="secondary"
                          size="small"
                          style={{ backgroundColor: colors.primary }}
                        />
                      </View>
                    </View>

                    {/* Unit Cost Row */}
                    <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>Unit Cost:</Text>
                      <View style={[commonStyles.row, { alignItems: 'center' }]}>
                        <Text style={[typography.body, { color: colors.text, marginRight: spacing.xs }]}>$</Text>
                        <TextInput
                          style={styles.costInput}
                          value={editingCosts[item.id] !== undefined ? editingCosts[item.id] : (item.unitCost || 0).toFixed(2)}
                          onFocus={() => setEditingCosts(prev => ({ ...prev, [item.id]: (item.unitCost || 0).toFixed(2) }))}
                          onChangeText={(text) => {
                            // Allow free typing - only keep digits and one decimal point
                            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                            setEditingCosts(prev => ({ ...prev, [item.id]: cleaned }));
                          }}
                          onBlur={() => {
                            const cost = parseFloat(editingCosts[item.id]) || 0;
                            updateItemUnitCost(item.id, cost);
                            setEditingCosts(prev => { const next = { ...prev }; delete next[item.id]; return next; });
                          }}
                          selectTextOnFocus
                          keyboardType="decimal-pad"
                        />
                        <Text style={[typography.caption, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
                          /{item.unit}
                        </Text>
                      </View>
                    </View>

                    {/* Total Cost Row */}
                    <View style={[commonStyles.row, commonStyles.spaceBetween, styles.totalRow]}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>Item Total:</Text>
                      <Text style={[typography.body, { color: colors.success, fontWeight: '700' }]}>
                        {formatCurrency(item.totalCost || 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add Items */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.sectionLabel}>Add Items</Text>

              <TouchableOpacity
                style={styles.addItemButton}
                onPress={() => setShowItemSearch(!showItemSearch)}
              >
                <Icon name="add-circle" size={24} color={colors.success} />
                <Text style={[typography.body, { color: colors.success, fontWeight: '600', marginLeft: spacing.sm }]}>
                  Add Item to Order
                </Text>
              </TouchableOpacity>

              {showItemSearch && (
                <View style={{ marginTop: spacing.sm }}>
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
                      style={[commonStyles.textInput, { paddingLeft: spacing.xl + spacing.md, flex: 1 }]}
                      placeholder="Search inventory items..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                  </View>

                  <ScrollView style={{ maxHeight: 250, marginTop: spacing.sm }} showsVerticalScrollIndicator={false}>
                    {filteredInventory.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[commonStyles.card, { marginBottom: spacing.xs }]}
                        onPress={() => addItem(item)}
                      >
                        <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                              {item.name}
                            </Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>
                              Current stock: {item.current_stock} {item.unit}
                              {item.cost ? ` • Last cost: $${item.cost.toFixed(2)}` : ''}
                            </Text>
                          </View>
                          <Icon name="add-circle" size={28} color={colors.success} />
                        </View>
                      </TouchableOpacity>
                    ))}

                    {filteredInventory.length === 0 && searchQuery && (
                      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                        No items found matching "{searchQuery}"
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={styles.sectionLabel}>Notes (Optional)</Text>
              <TextInput
                style={[commonStyles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any notes about this delivery..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Total Summary */}
            {selectedItems.length > 0 && (
              <View style={styles.summaryCard}>
                <View style={[commonStyles.row, commonStyles.spaceBetween, { marginBottom: spacing.sm }]}>
                  <Text style={[typography.body, { color: colors.text }]}>Total Items:</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{totalItems}</Text>
                </View>
                <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                  <Text style={[typography.h3, { color: colors.text }]}>Total Value:</Text>
                  <Text style={[typography.h2, { color: colors.success }]}>{formatCurrency(totalValue)}</Text>
                </View>
              </View>
            )}

            <Button
              text={processing ? 'Processing...' : `Receive Supply (${formatCurrency(totalValue)})`}
              onPress={handleReceiveSupply}
              disabled={processing || !supplierName.trim() || selectedItems.length === 0}
              variant="primary"
              style={{ marginBottom: spacing.lg, backgroundColor: colors.success }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  generateButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 60,
    textAlign: 'center',
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  costInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 80,
    textAlign: 'right',
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  totalRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
    borderStyle: 'dashed',
  },
  summaryCard: {
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
});

ReceiveSupplyModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    current_stock: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    cost: PropTypes.number,
  }).isRequired).isRequired,
  onReceive: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  warehouses: PropTypes.arrayOf(PropTypes.string),
};

ReceiveSupplyModal.displayName = 'ReceiveSupplyModal';

export default ReceiveSupplyModal;
