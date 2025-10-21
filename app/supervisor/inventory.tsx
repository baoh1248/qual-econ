
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useToast } from '../../hooks/useToast';
import { useDatabase } from '../../hooks/useDatabase';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../integrations/supabase/client';
import Toast from '../../components/Toast';
import Button from '../../components/Button';
import AnimatedCard from '../../components/AnimatedCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyLogo from '../../components/CompanyLogo';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import SendItemsModal from '../../components/inventory/SendItemsModal';
import TransferHistoryModal from '../../components/inventory/TransferHistoryModal';
import uuid from 'react-native-uuid';
import { commonStyles, colors, spacing, typography, buttonStyles, getContrastColor } from '../../styles/commonStyles';

interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  location: string;
  cost: number;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: number;
  created_at?: string;
  updated_at?: string;
}

interface RestockRequest {
  id: string;
  item_id: string;
  item_name: string;
  requested_by: string;
  requested_at: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'ordered' | 'delivered';
  notes: string;
  approved_by?: string;
  approved_at?: string;
}

interface NewItemForm {
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: string;
  min_stock: string;
  max_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
}

interface EditItemForm {
  name: string;
  category: 'cleaning-supplies' | 'equipment' | 'safety';
  current_stock: string;
  min_stock: string;
  max_stock: string;
  unit: string;
  location: string;
  cost: string;
  supplier: string;
  auto_reorder_enabled: boolean;
  reorder_quantity: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.background,
    fontWeight: typography.weights.semibold as any,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  stockBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold as any,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default function SupervisorInventoryScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { config, syncStatus } = useDatabase();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'cleaning-supplies' | 'equipment' | 'safety'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [newItemForm, setNewItemForm] = useState<NewItemForm>({
    name: '',
    category: 'cleaning-supplies',
    current_stock: '0',
    min_stock: '10',
    max_stock: '100',
    unit: 'units',
    location: 'Main Storage',
    cost: '0',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '50',
  });

  const [editItemForm, setEditItemForm] = useState<EditItemForm>({
    name: '',
    category: 'cleaning-supplies',
    current_stock: '0',
    min_stock: '10',
    max_stock: '100',
    unit: 'units',
    location: 'Main Storage',
    cost: '0',
    supplier: '',
    auto_reorder_enabled: false,
    reorder_quantity: '50',
  });

  // Load inventory data from Supabase
  const loadInventoryData = useCallback(async () => {
    if (!config.useSupabase) return;

    try {
      setIsLoading(true);
      console.log('🔄 Loading inventory data from Supabase...');

      // Load inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (itemsError) {
        console.error('❌ Error loading inventory items:', itemsError);
        throw itemsError;
      }

      console.log(`✅ Loaded ${itemsData?.length || 0} inventory items`);
      setItems(itemsData || []);

      // Load restock requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('restock_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (requestsError) {
        console.error('❌ Error loading restock requests:', requestsError);
        throw requestsError;
      }

      console.log(`✅ Loaded ${requestsData?.length || 0} restock requests`);
      setRestockRequests(requestsData || []);
    } catch (error) {
      console.error('❌ Failed to load inventory data:', error);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [config.useSupabase, showToast]);

  // Sync to Supabase when online
  const syncToSupabase = useCallback(async () => {
    if (!config.useSupabase || !syncStatus.isOnline) return;

    console.log('🔄 Syncing inventory to Supabase...');
    await loadInventoryData();
  }, [config.useSupabase, syncStatus.isOnline, loadInventoryData]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  useEffect(() => {
    if (syncStatus.isOnline && config.useSupabase) {
      syncToSupabase();
    }
  }, [syncStatus.isOnline, config.useSupabase, syncToSupabase]);

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock <= item.min_stock) {
      return { status: 'low', color: colors.error, label: 'Low Stock' };
    } else if (item.current_stock >= item.max_stock) {
      return { status: 'high', color: colors.warning, label: 'Overstocked' };
    } else {
      return { status: 'normal', color: colors.success, label: 'Normal' };
    }
  };

  const handleAddItem = async () => {
    if (!newItemForm.name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    try {
      console.log('🔄 Adding new inventory item:', newItemForm.name);

      const newItem: InventoryItem = {
        id: uuid.v4() as string,
        name: newItemForm.name.trim(),
        category: newItemForm.category,
        current_stock: parseInt(newItemForm.current_stock) || 0,
        min_stock: parseInt(newItemForm.min_stock) || 10,
        max_stock: parseInt(newItemForm.max_stock) || 100,
        unit: newItemForm.unit.trim(),
        location: newItemForm.location.trim(),
        cost: parseFloat(newItemForm.cost) || 0,
        supplier: newItemForm.supplier.trim(),
        auto_reorder_enabled: newItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(newItemForm.reorder_quantity) || 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('inventory_items')
        .insert(newItem);

      if (error) {
        console.error('❌ Error adding inventory item:', error);
        throw error;
      }

      console.log('✅ Inventory item added successfully');
      showToast('Item added successfully', 'success');
      
      // Refresh data to show the new item
      await loadInventoryData();
      
      setShowAddModal(false);
      setNewItemForm({
        name: '',
        category: 'cleaning-supplies',
        current_stock: '0',
        min_stock: '10',
        max_stock: '100',
        unit: 'units',
        location: 'Main Storage',
        cost: '0',
        supplier: '',
        auto_reorder_enabled: false,
        reorder_quantity: '50',
      });
    } catch (error) {
      console.error('❌ Failed to add inventory item:', error);
      showToast('Failed to add item', 'error');
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditItemForm({
      name: item.name,
      category: item.category,
      current_stock: item.current_stock.toString(),
      min_stock: item.min_stock.toString(),
      max_stock: item.max_stock.toString(),
      unit: item.unit,
      location: item.location,
      cost: item.cost.toString(),
      supplier: item.supplier,
      auto_reorder_enabled: item.auto_reorder_enabled,
      reorder_quantity: item.reorder_quantity.toString(),
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !editItemForm.name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    try {
      console.log('🔄 Updating inventory item:', selectedItem.id);

      const updates = {
        name: editItemForm.name.trim(),
        category: editItemForm.category,
        current_stock: parseInt(editItemForm.current_stock) || 0,
        min_stock: parseInt(editItemForm.min_stock) || 10,
        max_stock: parseInt(editItemForm.max_stock) || 100,
        unit: editItemForm.unit.trim(),
        location: editItemForm.location.trim(),
        cost: parseFloat(editItemForm.cost) || 0,
        supplier: editItemForm.supplier.trim(),
        auto_reorder_enabled: editItemForm.auto_reorder_enabled,
        reorder_quantity: parseInt(editItemForm.reorder_quantity) || 50,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', selectedItem.id);

      if (error) {
        console.error('❌ Error updating inventory item:', error);
        throw error;
      }

      console.log('✅ Inventory item updated successfully');
      showToast('Item updated successfully', 'success');
      
      // Refresh data to show the updated item
      await loadInventoryData();
      
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('❌ Failed to update inventory item:', error);
      showToast('Failed to update item', 'error');
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete ${itemName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Deleting inventory item:', itemId);

              const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', itemId);

              if (error) {
                console.error('❌ Error deleting inventory item:', error);
                throw error;
              }

              console.log('✅ Inventory item deleted successfully');
              showToast('Item deleted successfully', 'success');
              
              // Refresh data to remove the deleted item
              await loadInventoryData();
            } catch (error) {
              console.error('❌ Failed to delete inventory item:', error);
              showToast('Failed to delete item', 'error');
            }
          },
        },
      ]
    );
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      console.log('🔄 Approving restock request:', requestId);

      const { error } = await supabase
        .from('restock_requests')
        .update({
          status: 'approved',
          approved_by: 'Supervisor',
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('❌ Error approving restock request:', error);
        throw error;
      }

      console.log('✅ Restock request approved successfully');
      showToast('Request approved', 'success');
      
      // Refresh data to show the updated request
      await loadInventoryData();
    } catch (error) {
      console.error('❌ Failed to approve restock request:', error);
      showToast('Failed to approve request', 'error');
    }
  };

  const confirmRejectRequest = (requestId: string) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this restock request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 Rejecting restock request:', requestId);

              const { error } = await supabase
                .from('restock_requests')
                .delete()
                .eq('id', requestId);

              if (error) {
                console.error('❌ Error rejecting restock request:', error);
                throw error;
              }

              console.log('✅ Restock request rejected successfully');
              showToast('Request rejected', 'success');
              
              // Refresh data to remove the rejected request
              await loadInventoryData();
            } catch (error) {
              console.error('❌ Failed to reject restock request:', error);
              showToast('Failed to reject request', 'error');
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cleaning-supplies':
        return 'water';
      case 'equipment':
        return 'construct';
      case 'safety':
        return 'shield-checkmark';
      default:
        return 'cube';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'approved':
        return colors.success;
      case 'ordered':
        return colors.primary;
      case 'delivered':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalItems: items.length,
    lowStock: items.filter(item => item.current_stock <= item.min_stock).length,
    pendingRequests: restockRequests.filter(req => req.status === 'pending').length,
    totalValue: items.reduce((sum, item) => sum + (item.current_stock * item.cost), 0),
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.background} />
        </TouchableOpacity>
        <CompanyLogo />
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="add-circle" size={32} color={colors.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'all' && styles.filterChipActive]}
          onPress={() => setFilterCategory('all')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'cleaning-supplies' && styles.filterChipActive]}
          onPress={() => setFilterCategory('cleaning-supplies')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'cleaning-supplies' && styles.filterChipTextActive]}>
            Supplies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'equipment' && styles.filterChipActive]}
          onPress={() => setFilterCategory('equipment')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'equipment' && styles.filterChipTextActive]}>
            Equipment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterCategory === 'safety' && styles.filterChipActive]}
          onPress={() => setFilterCategory('safety')}
        >
          <Text style={[styles.filterChipText, filterCategory === 'safety' && styles.filterChipTextActive]}>
            Safety
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.error }]}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>${stats.totalValue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Value</Text>
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No items found' : 'No inventory items yet'}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <AnimatedCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Icon name={getCategoryIcon(item.category)} size={24} color={colors.primary} />
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEditModal(item)}>
                      <Icon name="create" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(item.id, item.name)}>
                      <Icon name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.itemInfo}>
                  <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
                    <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                      {item.current_stock} {item.unit}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Icon name="location" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{item.location}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Icon name="business" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{item.supplier}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Icon name="cash" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>${item.cost.toFixed(2)}</Text>
                  </View>
                </View>
              </AnimatedCard>
            );
          })
        )}

        {restockRequests.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[styles.modalTitle, { marginBottom: spacing.md }]}>Restock Requests</Text>
            {restockRequests.map((request) => (
              <AnimatedCard key={request.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{request.item_name}</Text>
                  <View style={[styles.stockBadge, { backgroundColor: getPriorityColor(request.priority) + '20' }]}>
                    <Text style={[styles.stockBadgeText, { color: getPriorityColor(request.priority) }]}>
                      {request.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemInfo}>
                  <View style={styles.infoItem}>
                    <Icon name="cube" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>Qty: {request.quantity}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Icon name="person" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{request.requested_by}</Text>
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                    <Text style={[styles.stockBadgeText, { color: getStatusColor(request.status) }]}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {request.notes && (
                  <Text style={[styles.infoText, { marginTop: spacing.sm }]}>{request.notes}</Text>
                )}

                {request.status === 'pending' && (
                  <View style={[styles.itemActions, { marginTop: spacing.md, justifyContent: 'flex-end' }]}>
                    <Button
                      title="Reject"
                      onPress={() => confirmRejectRequest(request.id)}
                      variant="secondary"
                      style={{ marginRight: spacing.sm }}
                    />
                    <Button
                      title="Approve"
                      onPress={() => handleApproveRequest(request.id)}
                      variant="primary"
                    />
                  </View>
                )}
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Inventory Item</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter item name"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.name}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {['cleaning-supplies', 'equipment', 'safety'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        newItemForm.category === cat && styles.filterChipActive,
                      ]}
                      onPress={() => setNewItemForm({ ...newItemForm, category: cat as any })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          newItemForm.category === cat && styles.filterChipTextActive,
                        ]}
                      >
                        {cat === 'cleaning-supplies' ? 'Supplies' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.current_stock}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, current_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Min Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.min_stock}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, min_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Max Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.max_stock}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, max_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="units, boxes, etc."
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.unit}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, unit: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Main Storage"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.location}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, location: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost per Unit ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.cost}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, cost: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  placeholderTextColor={colors.textSecondary}
                  value={newItemForm.supplier}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, supplier: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Add Item"
                onPress={handleAddItem}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Inventory Item</Text>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter item name"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.name}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {['cleaning-supplies', 'equipment', 'safety'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        editItemForm.category === cat && styles.filterChipActive,
                      ]}
                      onPress={() => setEditItemForm({ ...editItemForm, category: cat as any })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          editItemForm.category === cat && styles.filterChipTextActive,
                        ]}
                      >
                        {cat === 'cleaning-supplies' ? 'Supplies' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.current_stock}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, current_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Min Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.min_stock}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, min_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Max Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.max_stock}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, max_stock: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="units, boxes, etc."
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.unit}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, unit: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Main Storage"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.location}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, location: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cost per Unit ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.cost}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, cost: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter supplier name"
                  placeholderTextColor={colors.textSecondary}
                  value={editItemForm.supplier}
                  onChangeText={(text) => setEditItemForm({ ...editItemForm, supplier: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleUpdateItem}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
}
