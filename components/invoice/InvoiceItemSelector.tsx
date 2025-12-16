
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { supabase } from '../../app/integrations/supabase/client';
import { colors, spacing, typography } from '../../styles/commonStyles';
import Icon from '../Icon';

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  cost: number;
  category: string;
}

interface InvoiceItemSelectorProps {
  visible: boolean;
  onSelect: (item: InventoryItem) => void;
  onClose: () => void;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.lg,
  },
  itemCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  itemLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  itemValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
  },
  stockStatus: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  lowStock: {
    color: colors.error,
  },
  goodStock: {
    color: colors.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
});

export default function InvoiceItemSelector({
  visible,
  onSelect,
  onClose,
}: InvoiceItemSelectorProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadItems();
    }
  }, [visible]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    onSelect(item);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Item from Inventory</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />

          <ScrollView>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No items found' : 'No items available'}
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => handleSelectItem(item)}
                >
                  <Text style={styles.itemName}>{item.name}</Text>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>Category</Text>
                    <Text style={styles.itemValue}>{item.category}</Text>
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>Unit Price</Text>
                    <Text style={styles.itemValue}>${item.cost.toFixed(2)}</Text>
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>Unit</Text>
                    <Text style={styles.itemValue}>{item.unit}</Text>
                  </View>

                  <Text
                    style={[
                      styles.stockStatus,
                      item.current_stock < 10 ? styles.lowStock : styles.goodStock,
                    ]}
                  >
                    Stock: {item.current_stock} {item.unit}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
