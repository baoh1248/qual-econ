
import React, { memo, useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { colors, spacing, typography, commonStyles, buttonStyles, getContrastColor } from '../../styles/commonStyles';
import Icon from '../Icon';
import Button from '../Button';
import IconButton from '../IconButton';
import { logInventoryTransfer, type InventoryTransferItem } from '../../utils/inventoryTracking';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  category: string;
}

interface SendItemsModalProps {
  visible: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onSend: (itemIds: string[], quantities: number[]) => void;
  onSuccess?: () => void;
}

interface SelectedItem extends InventoryTransferItem {
  id: string;
  maxQuantity: number;
}

const SendItemsModal = memo<SendItemsModalProps>(({ visible, onClose, inventory, onSend, onSuccess }) => {
  console.log('SendItemsModal rendered');
  
  const [destination, setDestination] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // Common destinations for quick selection
  const commonDestinations = [
    'TechCorp Main Office',
    'Downtown Mall Food Court',
    'City Hospital',
    'University Campus',
    'Shopping Center',
    'Office Complex A',
    'Retail Store Chain',
    'Medical Center',
  ];

  useEffect(() => {
    if (!visible) {
      // Reset form when modal closes
      setDestination('');
      setSelectedItems([]);
      setNotes('');
      setSearchQuery('');
    }
  }, [visible]);

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    item.current_stock > 0 &&
    !selectedItems.some(selected => selected.id === item.id)
  );

  const addItem = (item: InventoryItem) => {
    const newItem: SelectedItem = {
      id: item.id,
      name: item.name,
      quantity: 1,
      unit: item.unit,
      maxQuantity: item.current_stock,
    };
    setSelectedItems(prev => [...prev, newItem]);
    setSearchQuery('');
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity)) }
        : item
    ));
  };

  const handleSendItems = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to send');
      return;
    }

    try {
      setSending(true);
      
      // Log the transfer
      await logInventoryTransfer({
        items: selectedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
        })),
        destination: destination.trim(),
        timestamp: new Date().toISOString(),
        transferredBy: 'Supervisor', // In a real app, this would be the current user
        notes: notes.trim() || undefined,
      });

      // Update inventory quantities
      const itemIds = selectedItems.map(item => item.id);
      const quantities = selectedItems.map(item => item.quantity);
      onSend(itemIds, quantities);

      // Show success message
      const itemSummary = selectedItems.map(item => `${item.quantity} ${item.name}`).join(', ');
      Alert.alert(
        'Items Sent Successfully',
        `${itemSummary} have been sent to ${destination}`,
        [{ text: 'OK', onPress: () => {
          onSuccess?.();
          onClose();
        }}]
      );

    } catch (error) {
      console.error('Failed to send items:', error);
      Alert.alert('Error', 'Failed to send items. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

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
          maxHeight: Platform.OS === 'ios' ? '100%' : '85%',
          backgroundColor: colors.background,
          borderRadius: Platform.OS === 'ios' ? 0 : 16,
          overflow: 'hidden',
          ...(Platform.OS === 'web' && {
            zIndex: 10000,
            position: 'relative' as any,
          }),
        }}>
          <View style={commonStyles.header}>
            <IconButton 
              icon="close" 
              onPress={onClose} 
              variant="white"
            />
            <Text style={commonStyles.headerTitle}>Send Items</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
            {/* Destination Input */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Destination
              </Text>
              <TextInput
                style={[commonStyles.textInput, { marginBottom: spacing.sm }]}
                placeholder="Enter destination (e.g., TechCorp Main Office)"
                placeholderTextColor={colors.textSecondary}
                value={destination}
                onChangeText={setDestination}
              />
              
              {/* Quick destination buttons */}
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Quick Select:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[commonStyles.row, { gap: spacing.sm, paddingHorizontal: spacing.xs }]}>
                  {commonDestinations.map(dest => (
                    <TouchableOpacity
                      key={dest}
                      style={[
                        destination === dest ? buttonStyles.quickSelectButtonActive : buttonStyles.quickSelectButton,
                        { borderWidth: 0 } // Remove outline
                      ]}
                      onPress={() => setDestination(dest)}
                    >
                      <Text style={[
                        typography.caption,
                        { 
                          color: destination === dest 
                            ? getContrastColor(colors.primary) 
                            : getContrastColor(colors.background),
                          fontWeight: destination === dest ? '700' : '500'
                        }
                      ]}>
                        {dest}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Selected Items */}
            {selectedItems.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                  Selected Items ({totalItems} total)
                </Text>
                {selectedItems.map(item => (
                  <View key={item.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
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
                    
                    <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                      <View style={[commonStyles.row, { alignItems: 'center', gap: spacing.sm }]}>
                        <IconButton
                          icon="remove"
                          onPress={() => updateItemQuantity(item.id, item.quantity - 1)}
                          variant="secondary"
                          size="small"
                          disabled={item.quantity <= 1}
                          style={{ backgroundColor: item.quantity <= 1 ? colors.backgroundAlt : colors.danger }}
                        />
                        
                        <Text style={[typography.body, { color: colors.text, minWidth: 60, textAlign: 'center' }]}>
                          {item.quantity} {item.unit}
                        </Text>
                        
                        <IconButton
                          icon="add"
                          onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
                          variant="secondary"
                          size="small"
                          disabled={item.quantity >= item.maxQuantity}
                          style={{ backgroundColor: item.quantity >= item.maxQuantity ? colors.backgroundAlt : colors.success }}
                        />
                      </View>
                      
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Max: {item.maxQuantity} {item.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Add Items */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Add Items
              </Text>
              
              <View style={[commonStyles.row, { position: 'relative', marginBottom: spacing.sm }]}>
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

              {searchQuery.length > 0 && (
                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {filteredInventory.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[commonStyles.card, { marginBottom: spacing.sm }]}
                      onPress={() => addItem(item)}
                    >
                      <View style={[commonStyles.row, commonStyles.spaceBetween]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                            {item.name}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textSecondary }]}>
                            Available: {item.current_stock} {item.unit}
                          </Text>
                        </View>
                        <IconButton
                          icon="add-circle"
                          onPress={() => addItem(item)}
                          variant="secondary"
                          style={{ backgroundColor: colors.success }}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {filteredInventory.length === 0 && (
                    <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>
                      No available items found
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>

            {/* Notes */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginBottom: spacing.sm }]}>
                Notes (Optional)
              </Text>
              <TextInput
                style={[commonStyles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add any additional notes about this transfer..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Send Button */}
            <Button
              text={sending ? 'Sending...' : `Send ${totalItems} Item${totalItems !== 1 ? 's' : ''}`}
              onPress={handleSendItems}
              disabled={sending || !destination.trim() || selectedItems.length === 0}
              variant="primary"
              style={{ marginBottom: spacing.lg }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

SendItemsModal.displayName = 'SendItemsModal';

export default SendItemsModal;
